import type { Geometry } from "./engine";
import type { ColorMode, Dimension } from "./spec";

export type Camera = {
  yaw: number;
  pitch: number;
  zoom: number;
  panX: number;
  panY: number;
};

export const DEFAULT_CAMERA: Camera = { yaw: 0.6, pitch: -0.35, zoom: 1, panX: 0, panY: 0 };
export const FLAT_CAMERA: Camera = { yaw: 0, pitch: 0, zoom: 1, panX: 0, panY: 0 };

export type Style = {
  color: string;
  colorEnd: string;
  colorMode: ColorMode;
  background: string;
  lineWidth: number;
};

const COLOR_STEPS = 32;
const WIDTH_STEPS = 8;
const SHADE_STEPS = 4;
const PADDING = 0.08;

function parseHex(hex: string): [number, number, number] {
  const n = Number.parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function palette(from: string, to: string) {
  const a = parseHex(from);
  const b = parseHex(to);
  return Array.from({ length: COLOR_STEPS }, (_, i) => {
    const t = i / (COLOR_STEPS - 1);
    const c = a.map((v, k) => Math.round(v + (b[k] - v) * t));
    return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
  });
}

// Per-segment data that depends on the geometry and style, but not on the
// camera. Computed once, then reused for every frame while orbiting.
export type Prepared = {
  geometry: Geometry;
  colorIndex: Uint8Array;
  widthIndex: Uint8Array;
  widthValues: number[];
  colors: string[];
  center: [number, number, number];
  radius: number;
  // Scratch buffers reused across frames.
  keys: Uint16Array;
  order: Uint32Array;
  projected: Float32Array;
};

export function prepare(geometry: Geometry, style: Style): Prepared {
  const { count, widths, depths, maxDepth, min, max } = geometry;
  const colorIndex = new Uint8Array(count);
  const widthIndex = new Uint8Array(count);

  for (let i = 0; i < count; i++) {
    let t = 0;
    if (style.colorMode === "gradient") t = count > 1 ? i / (count - 1) : 0;
    if (style.colorMode === "depth") t = maxDepth > 0 ? depths[i] / maxDepth : 0;
    colorIndex[i] = Math.round(t * (COLOR_STEPS - 1));
  }

  // Widths only ever change by a constant factor, so a log scale spreads
  // the distinct values across the buckets.
  let minW = Number.POSITIVE_INFINITY;
  let maxW = 0;
  for (let i = 0; i < count; i++) {
    if (widths[i] < minW) minW = widths[i];
    if (widths[i] > maxW) maxW = widths[i];
  }
  const logMin = Math.log(minW || 1);
  const logSpan = Math.log(maxW || 1) - logMin;
  const widthValues = Array.from({ length: WIDTH_STEPS }, (_, k) =>
    Math.exp(logMin + (logSpan * k) / Math.max(WIDTH_STEPS - 1, 1)),
  );
  for (let i = 0; i < count; i++) {
    widthIndex[i] =
      logSpan > 1e-9
        ? Math.round(((Math.log(widths[i]) - logMin) / logSpan) * (WIDTH_STEPS - 1))
        : 0;
  }

  const center: [number, number, number] = [
    (min[0] + max[0]) / 2,
    (min[1] + max[1]) / 2,
    (min[2] + max[2]) / 2,
  ];
  // The farthest endpoint from the center fits tighter than the bounding box
  // diagonal, which matters for wide, flat shapes such as tree crowns.
  let farthest = 0;
  const { positions } = geometry;
  for (let o = 0; o < count * 6; o += 3) {
    const d =
      (positions[o] - center[0]) ** 2 +
      (positions[o + 1] - center[1]) ** 2 +
      (positions[o + 2] - center[2]) ** 2;
    if (d > farthest) farthest = d;
  }
  const radius = Math.max(Math.sqrt(farthest), 1e-6);

  return {
    geometry,
    colorIndex,
    widthIndex,
    widthValues,
    colors:
      style.colorMode === "solid"
        ? palette(style.color, style.color)
        : palette(style.color, style.colorEnd),
    center,
    radius,
    keys: new Uint16Array(count),
    order: new Uint32Array(count),
    projected: new Float32Array(count * 4),
  };
}

type Projector = (x: number, y: number, z: number) => void;

// The part of the canvas the drawing is fitted into, so it can sit beside the
// editor panel instead of underneath it.
export type Viewport = { x: number; y: number; width: number; height: number };

export function render(
  ctx: CanvasRenderingContext2D,
  prepared: Prepared,
  style: Style,
  dimension: Dimension,
  camera: Camera,
  viewport: Viewport,
) {
  const ratio = window.devicePixelRatio || 1;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.fillStyle = style.background;
  ctx.fillRect(0, 0, ctx.canvas.width / ratio, ctx.canvas.height / ratio);
  const { width, height } = viewport;

  const { geometry, center, radius, colorIndex, widthIndex, keys, order, projected } = prepared;
  const { positions, count, min, max } = geometry;
  if (count === 0) return;

  const [cx, cy, cz] = center;
  let sx = 0;
  let sy = 0;
  let sz = 0;
  let project: Projector;

  if (dimension === "2d") {
    const spanX = Math.max(max[0] - min[0], 1e-6);
    const spanY = Math.max(max[1] - min[1], 1e-6);
    const scale =
      camera.zoom *
      Math.min((width * (1 - 2 * PADDING)) / spanX, (height * (1 - 2 * PADDING)) / spanY);
    const ox = viewport.x + width / 2 + camera.panX;
    const oy = viewport.y + height / 2 + camera.panY;
    project = (x, y) => {
      sx = ox + (x - cx) * scale;
      sy = oy - (y - cy) * scale;
      sz = 0;
    };
  } else {
    const cosY = Math.cos(camera.yaw);
    const sinY = Math.sin(camera.yaw);
    const cosP = Math.cos(camera.pitch);
    const sinP = Math.sin(camera.pitch);
    const distance = radius * 4;
    // Perspective enlarges the near side a little; most shapes are not a full
    // sphere, so fitting the radius without compensation still leaves margin.
    const fitScale = (Math.min(width, height) * (0.5 - PADDING) * camera.zoom) / radius;
    const ox = viewport.x + width / 2 + camera.panX;
    const oy = viewport.y + height / 2 + camera.panY;
    project = (x, y, z) => {
      const dx = x - cx;
      const dy = y - cy;
      const dz = z - cz;
      // Yaw around world y, then pitch around the view x axis.
      const x1 = dx * cosY + dz * sinY;
      const z1 = -dx * sinY + dz * cosY;
      const y2 = dy * cosP - z1 * sinP;
      const z2 = dy * sinP + z1 * cosP;
      const f = distance / (distance - z2);
      sx = ox + x1 * f * fitScale;
      sy = oy - y2 * f * fitScale;
      sz = z2;
    };
  }

  // Bucket segments by (color, width, shade) with a counting sort so each
  // bucket becomes a single stroke() call.
  const bucketCount = COLOR_STEPS * WIDTH_STEPS * SHADE_STEPS;
  const counts = new Uint32Array(bucketCount + 1);

  for (let i = 0; i < count; i++) {
    const o = i * 6;
    project(positions[o], positions[o + 1], positions[o + 2]);
    const ax = sx;
    const ay = sy;
    const az = sz;
    project(positions[o + 3], positions[o + 4], positions[o + 5]);
    projected[i * 4] = ax;
    projected[i * 4 + 1] = ay;
    projected[i * 4 + 2] = sx;
    projected[i * 4 + 3] = sy;

    let shadeIndex = SHADE_STEPS - 1;
    if (dimension === "3d") {
      // Nearer segments are brighter, which reads as depth without z-sorting.
      const t = Math.min(Math.max(((az + sz) / 2 / radius + 1) / 2, 0), 1);
      shadeIndex = Math.min(SHADE_STEPS - 1, Math.floor(t * SHADE_STEPS));
    }
    const key = (colorIndex[i] * WIDTH_STEPS + widthIndex[i]) * SHADE_STEPS + shadeIndex;
    keys[i] = key;
    counts[key + 1]++;
  }

  for (let k = 0; k < bucketCount; k++) counts[k + 1] += counts[k];
  const cursor = counts.slice(0, bucketCount);
  for (let i = 0; i < count; i++) order[cursor[keys[i]]++] = i;

  const shadeAlpha = [0.35, 0.55, 0.78, 1];
  ctx.lineJoin = "round";

  for (let key = 0; key < bucketCount; key++) {
    const from = counts[key];
    const to = counts[key + 1];
    if (from === to) continue;

    const s = key % SHADE_STEPS;
    const w = Math.floor(key / SHADE_STEPS) % WIDTH_STEPS;
    const c = Math.floor(key / SHADE_STEPS / WIDTH_STEPS);
    const lineWidth = Math.max(style.lineWidth * prepared.widthValues[w], 0.25);

    ctx.strokeStyle = prepared.colors[c];
    ctx.globalAlpha = shadeAlpha[s];
    ctx.lineWidth = lineWidth;
    ctx.lineCap = lineWidth > 2 ? "round" : "butt";
    ctx.beginPath();
    for (let j = from; j < to; j++) {
      const i = order[j] * 4;
      ctx.moveTo(projected[i], projected[i + 1]);
      ctx.lineTo(projected[i + 2], projected[i + 3]);
    }
    ctx.stroke();
  }

  ctx.globalAlpha = 1;
}
