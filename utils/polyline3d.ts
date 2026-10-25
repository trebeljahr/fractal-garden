import type { FractalFrame } from "./fractalFrame";
import { type Orientation, viewRotation } from "./orientation";
import {
  CAMERA_DISTANCE,
  cameraTarget,
  FOCAL_SCALE,
  relativeNumber,
  type SpatialCamera,
} from "./spatial/camera";
import { spatialProjection } from "./spatial/projection";

export type Polyline3D = {
  // Packed xyz triples: [x0, y0, z0, x1, y1, z1, ...]
  points: Float32Array | Float64Array;
  /** A set bit starts a new visible piece without drawing a false connecting segment. */
  breaks?: Uint8Array;
  count: number;
};

export type Polyline3DDrawOptions = {
  spatialCamera?: SpatialCamera;
  framing?: FractalFrame;
  rotationX: number;
  rotationY: number;
  grab?: Orientation;
  cameraDistance: number;
  background: string;
  nearColor: string;
  farColor: string;
  farAlpha: number;
  /** Fraction of the shorter canvas side used for a unit of model space. */
  viewScale?: number;
  lineWidth: number;
};

export type Derivative = (x: number, y: number, z: number, out: Float64Array) => void;

const DEPTH_BINS = 32;
const PROJECTION_FOCAL_LENGTH = 4;
// Points closer to the camera than this are clipped instead of projected.
const NEAR_PLANE = 0.05;
const CLIPPED = 255;
const MIN_NORMALIZATION_STEPS = 20000;

/**
 * Advances `state` by one classic fourth-order Runge-Kutta step in place.
 * Returns false once the orbit escapes to infinity.
 */
export function stepRK4(
  derivative: Derivative,
  state: Float64Array,
  dt: number,
  scratch: Float64Array[],
) {
  const [k1, k2, k3, k4] = scratch;
  const x = state[0];
  const y = state[1];
  const z = state[2];

  derivative(x, y, z, k1);
  derivative(x + (dt / 2) * k1[0], y + (dt / 2) * k1[1], z + (dt / 2) * k1[2], k2);
  derivative(x + (dt / 2) * k2[0], y + (dt / 2) * k2[1], z + (dt / 2) * k2[2], k3);
  derivative(x + dt * k3[0], y + dt * k3[1], z + dt * k3[2], k4);

  for (let axis = 0; axis < 3; axis++) {
    state[axis] += (dt / 6) * (k1[axis] + 2 * k2[axis] + 2 * k3[axis] + k4[axis]);
  }

  const sum = state[0] + state[1] + state[2];
  return (
    Number.isFinite(sum) && Math.abs(state[0]) + Math.abs(state[1]) + Math.abs(state[2]) <= 1e6
  );
}

export function createScratch() {
  return [new Float64Array(3), new Float64Array(3), new Float64Array(3), new Float64Array(3)];
}

/**
 * Integrates a 3D ODE with classic fourth-order Runge-Kutta and stores every
 * step in a packed Float32Array. Integration stops early if the orbit escapes
 * to infinity, so wild parameter choices just produce a shorter polyline.
 */
export function integrateRK4(
  derivative: Derivative,
  start: [number, number, number],
  dt: number,
  steps: number,
): Polyline3D {
  const points = new Float32Array((steps + 1) * 3);
  const scratch = createScratch();
  const state = Float64Array.from(start);
  let count = 1;

  points.set(state, 0);

  for (let i = 0; i < steps; i++) {
    if (!stepRK4(derivative, state, dt, scratch)) break;
    points.set(state, count * 3);
    count++;
  }

  return { points, count };
}

/**
 * Integrates an orbit like integrateRK4 and normalizes it, but also returns an
 * `extend` function that keeps integrating from where the orbit left off.
 * Extended points reuse the normalization of the first `steps`, so the
 * picture never rescales while it grows. Each extend call appends to the
 * polyline it is given, growing the buffer with spare capacity as needed.
 */
export function createEndlessOrbit(
  derivative: Derivative,
  start: [number, number, number],
  dt: number,
  steps: number,
  axisOrder: [number, number, number] = [0, 1, 2],
) {
  // Fit the picture to a long enough orbit even when `steps` is short, so the
  // trail does not grow out of view once it reaches the attractor.
  const fullOrbit = integrateRK4(derivative, start, dt, Math.max(steps, MIN_NORMALIZATION_STEPS));
  const orbit = { points: fullOrbit.points, count: Math.min(fullOrbit.count, steps + 1) };
  const normalization = getNormalization(fullOrbit, axisOrder);
  const polyline = applyNormalization(orbit, normalization);
  const scratch = createScratch();
  const state = Float64Array.from(orbit.points.subarray((orbit.count - 1) * 3, orbit.count * 3));
  let escaped = orbit.count < steps + 1;

  const extend = ({ points, count }: Polyline3D, extraSteps: number): Polyline3D => {
    if (escaped) return { points, count };

    let buffer = points;
    if ((count + extraSteps) * 3 > buffer.length) {
      buffer = new Float32Array(Math.max(buffer.length * 2, (count + extraSteps) * 3));
      buffer.set(points.subarray(0, count * 3));
    }

    let next = count;
    for (let i = 0; i < extraSteps; i++) {
      if (!stepRK4(derivative, state, dt, scratch)) {
        escaped = true;
        break;
      }
      writeNormalized(state, normalization, buffer, next);
      next++;
    }

    return { points: buffer, count: next };
  };

  return { polyline, extend };
}

/**
 * Drops the oldest points so at most `maxCount` remain. Shifts the buffer in
 * place and returns how many points were dropped.
 */
export function trimPolyline(polyline: Polyline3D, maxCount: number): number {
  const dropped = polyline.count - maxCount;
  if (dropped <= 0) return 0;

  polyline.points.copyWithin(0, dropped * 3, polyline.count * 3);
  polyline.count = maxCount;
  return dropped;
}

type Normalization = {
  center: number[];
  scale: number;
  axisOrder: [number, number, number];
};

/**
 * Finds the bounding-box center and the uniform scale that puts the farthest
 * point on the unit sphere.
 */
export function getNormalization(
  { points, count }: Polyline3D,
  axisOrder: [number, number, number],
): Normalization {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];

  for (let i = 0; i < count; i++) {
    for (let axis = 0; axis < 3; axis++) {
      const value = points[i * 3 + axis];
      if (value < min[axis]) min[axis] = value;
      if (value > max[axis]) max[axis] = value;
    }
  }

  const center = [0, 1, 2].map((axis) => (min[axis] + max[axis]) / 2);
  let radius = 0;

  for (let i = 0; i < count; i++) {
    const dx = points[i * 3] - center[0];
    const dy = points[i * 3 + 1] - center[1];
    const dz = points[i * 3 + 2] - center[2];
    radius = Math.max(radius, Math.hypot(dx, dy, dz));
  }

  return { center, scale: radius > 0 ? 1 / radius : 1, axisOrder };
}

function writeNormalized(
  source: ArrayLike<number>,
  { center, scale, axisOrder }: Normalization,
  target: Float32Array | Float64Array,
  index: number,
  sourceOffset = 0,
) {
  for (let axis = 0; axis < 3; axis++) {
    const from = axisOrder[axis];
    target[index * 3 + axis] = (source[sourceOffset + from] - center[from]) * scale;
  }
}

function applyNormalization(
  { points, count }: Polyline3D,
  normalization: Normalization,
): Polyline3D {
  const normalized = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    writeNormalized(points, normalization, normalized, i, i * 3);
  }

  return { points: normalized, count };
}

/**
 * Centers the polyline on its bounding box and scales it uniformly so the
 * farthest point lies on the unit sphere. Keeps the aspect ratio intact.
 */
export function normalizePolyline(
  polyline: Polyline3D,
  axisOrder: [number, number, number] = [0, 1, 2],
): Polyline3D {
  return applyNormalization(polyline, getNormalization(polyline, axisOrder));
}

/**
 * Generates the 3D Hilbert curve of the given order (8^order points) with
 * Skilling's transpose-to-axes algorithm: every index along the curve is
 * Gray-decoded and then rotated/reflected into its octant.
 */
export function generateHilbertCurve3D(order: number): Polyline3D {
  const count = 1 << (3 * order);
  const points = new Float32Array(count * 3);
  const axes = new Uint32Array(3);
  const top = 1 << order;

  for (let index = 0; index < count; index++) {
    axes.fill(0);
    for (let bit = 0; bit < order; bit++) {
      for (let axis = 0; axis < 3; axis++) {
        const sourceBit = bit * 3 + (2 - axis);
        axes[axis] |= ((index >> sourceBit) & 1) << bit;
      }
    }

    let t = axes[2] >> 1;
    for (let axis = 2; axis > 0; axis--) {
      axes[axis] ^= axes[axis - 1];
    }
    axes[0] ^= t;

    for (let q = 2; q !== top; q <<= 1) {
      const p = q - 1;
      for (let axis = 2; axis >= 0; axis--) {
        if (axes[axis] & q) {
          axes[0] ^= p;
        } else {
          t = (axes[0] ^ axes[axis]) & p;
          axes[0] ^= t;
          axes[axis] ^= t;
        }
      }
    }

    points[index * 3] = axes[0];
    points[index * 3 + 1] = axes[1];
    points[index * 3 + 2] = axes[2];
  }

  return { points, count };
}

function hexToRgb(hex: string) {
  const cleaned = hex.replace("#", "");
  const full =
    cleaned.length === 3
      ? cleaned
          .split("")
          .map((char) => char + char)
          .join("")
      : cleaned;
  const value = Number.parseInt(full, 16);

  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

type PolylineDrawScratch = {
  capacity: number;
  projected: Float32Array;
  clipped: Uint8Array;
  segmentBins: Uint8Array;
  binStarts: Uint32Array;
  cursor: Uint32Array;
  sorted: Uint32Array;
};
// Scratch follows the canvas lifetime and contains no source geometry references.
const polylineDrawScratch = new WeakMap<CanvasRenderingContext2D, PolylineDrawScratch>();

function drawScratch(ctx: CanvasRenderingContext2D, count: number) {
  let scratch = polylineDrawScratch.get(ctx);
  if (!scratch || scratch.capacity < count) {
    const capacity = Math.max(count, (scratch?.capacity ?? 128) * 2);
    scratch = {
      capacity,
      projected: new Float32Array(capacity * 3),
      clipped: new Uint8Array(capacity),
      segmentBins: new Uint8Array(capacity),
      binStarts: new Uint32Array(129),
      cursor: new Uint32Array(128),
      sorted: new Uint32Array(capacity),
    };
    polylineDrawScratch.set(ctx, scratch);
  }
  return scratch;
}

/**
 * Draws a normalized polyline with perspective projection. Segments are
 * bucketed by depth so the whole curve is drawn with DEPTH_BINS stroke calls,
 * far bins first, each bin tinted between farColor and nearColor.
 */
export function drawPolyline3D(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  polyline: Polyline3D,
  visibleCount: number,
  options: Polyline3DDrawOptions,
): { x: number; y: number } | null {
  const { points } = polyline;
  const spatial = options.spatialCamera;
  const depthBins = spatial ? 128 : DEPTH_BINS;
  const spatialTarget = spatial
    ? cameraTarget(spatial).map((v) => relativeNumber(v, spatial.bits, 0))
    : [0, 0, 0];
  const spatialScale = spatial ? 2 ** spatial.zoom : 1;
  const count = Math.min(visibleCount, polyline.count);
  const [m0, m1, m2, m3, m4, m5, m6, m7, m8] = viewRotation(
    options.rotationX,
    options.rotationY,
    options.grab,
  );
  const projection = spatialProjection(width, height, options.framing);
  const scale = (projection.focal / FOCAL_SCALE) * (options.viewScale ?? 0.42);

  ctx.fillStyle = options.background;
  ctx.fillRect(0, 0, width, height);

  if (count < 2) return null;

  const { projected, clipped, segmentBins, binStarts, cursor, sorted } = drawScratch(ctx, count);
  clipped.fill(0, 0, count);
  binStarts.fill(0, 0, depthBins + 1);

  for (let i = 0; i < count; i++) {
    const x = (points[i * 3] - spatialTarget[0]) * spatialScale;
    const y = (points[i * 3 + 1] - spatialTarget[1]) * spatialScale;
    const z = (points[i * 3 + 2] - spatialTarget[2]) * spatialScale;

    const rx = m0 * x + m1 * y + m2 * z;
    const ry = m3 * x + m4 * y + m5 * z;
    const rz = m6 * x + m7 * y + m8 * z;
    const cameraDepth = (spatial ? CAMERA_DISTANCE : options.cameraDistance) - rz;
    if (cameraDepth < NEAR_PLANE) clipped[i] = 1;
    const perspective =
      (spatial ? FOCAL_SCALE / (options.viewScale ?? 0.42) : PROJECTION_FOCAL_LENGTH) /
      Math.max(cameraDepth, NEAR_PLANE);

    projected[i * 3] = projection.centerX + rx * scale * perspective;
    projected[i * 3 + 1] = projection.centerY - ry * scale * perspective;
    projected[i * 3 + 2] = rz;
  }

  // Counting sort of segment indices into depth bins.
  const segmentCount = count - 1;

  for (let i = 0; i < segmentCount; i++) {
    if (clipped[i] || clipped[i + 1] || polyline.breaks?.[i + 1]) {
      segmentBins[i] = CLIPPED;
      continue;
    }
    const depth = (projected[i * 3 + 2] + projected[i * 3 + 5]) / 2;
    const t = Math.min(
      Math.max(
        spatial
          ? 1 - Math.log2(1 + Math.max(0, CAMERA_DISTANCE - depth)) / Math.log2(129)
          : (depth + 1) / 2,
        0,
      ),
      0.9999,
    );
    const bin = Math.floor(t * depthBins);
    segmentBins[i] = bin;
    binStarts[bin + 1]++;
  }

  for (let bin = 0; bin < depthBins; bin++) {
    binStarts[bin + 1] += binStarts[bin];
  }

  for (let bin = 0; bin < depthBins; bin++) cursor[bin] = binStarts[bin];
  for (let i = 0; i < segmentCount; i++) {
    if (segmentBins[i] === CLIPPED) continue;
    sorted[cursor[segmentBins[i]]++] = i;
  }

  const near = hexToRgb(options.nearColor);
  const far = hexToRgb(options.farColor);

  ctx.lineWidth = options.lineWidth;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  for (let bin = 0; bin < depthBins; bin++) {
    const start = binStarts[bin];
    const end = binStarts[bin + 1];
    if (start === end) continue;

    const t = (bin + 0.5) / depthBins;
    const r = Math.round(far[0] + (near[0] - far[0]) * t);
    const g = Math.round(far[1] + (near[1] - far[1]) * t);
    const b = Math.round(far[2] + (near[2] - far[2]) * t);
    let alpha = options.farAlpha + (1 - options.farAlpha) * t;
    if (spatial) {
      const distance =
        ((2 ** ((1 - t) * Math.log2(129)) - 1) *
          2 ** ((spatial.atmosphereZoom ?? spatial.zoom) - spatial.zoom)) /
        96;
      const fog = Math.min(
        1,
        (1 - Math.exp(-4 * Math.max(0, distance - 0.2 / 96))) / (1 - Math.exp(-4 * (1 - 0.2 / 96))),
      );
      alpha *= 1 - fog;
    }

    ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
    ctx.beginPath();

    let previous = -2;
    for (let j = start; j < end; j++) {
      const i = sorted[j];
      if (i !== previous + 1) {
        ctx.moveTo(projected[i * 3], projected[i * 3 + 1]);
      }
      ctx.lineTo(projected[i * 3 + 3], projected[i * 3 + 4]);
      previous = i;
    }

    ctx.stroke();
  }

  if (clipped[count - 1]) return null;
  return { x: projected[(count - 1) * 3], y: projected[(count - 1) * 3 + 1] };
}
