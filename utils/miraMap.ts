// The Mira map. A step goes from (x, y) to (b y + F(x), -x + F(x')). Pure functions,
// so the page and the lesson draw the same orbit.

export type MiraSettings = { a: number; b: number; x0: number; y0: number };

export function miraBend(a: number, x: number) {
  return a * x + (2 * (1 - a) * x * x) / (1 + x * x);
}

export function miraStep({ a, b }: MiraSettings, x: number, y: number): [number, number] {
  const nextX = b * y + miraBend(a, x);
  return [nextX, -x + miraBend(a, nextX)];
}

const DIVERGED = 1e6;

/** Continues filling [x, y, x, y, ...] from `done` points. Returns the new point count. */
export function extendMiraOrbit(
  settings: MiraSettings,
  points: Float32Array | Float64Array,
  done: number,
  target: number,
  resume: [number, number],
) {
  const { a, b } = settings;
  let [x, y] = resume;
  let count = done;
  while (count < target) {
    const nextX = b * y + a * x + (2 * (1 - a) * x * x) / (1 + x * x);
    y = -x + a * nextX + (2 * (1 - a) * nextX * nextX) / (1 + nextX * nextX);
    x = nextX;
    if (!(Math.abs(x) < DIVERGED && Math.abs(y) < DIVERGED)) break;
    points[count * 2] = x;
    points[count * 2 + 1] = y;
    count++;
  }
  resume[0] = x;
  resume[1] = y;
  return count;
}

export function miraOrbit(settings: MiraSettings, count: number) {
  const points = new Float64Array(count * 2);
  const done = extendMiraOrbit(settings, points, 0, count, [settings.x0, settings.y0]);
  return points.subarray(0, done * 2);
}

export type OrbitBounds = { minX: number; maxX: number; minY: number; maxY: number };

export function orbitBounds(points: ArrayLike<number>, count: number): OrbitBounds {
  const bounds = { minX: 0, maxX: 0, minY: 0, maxY: 0 };
  if (count > 0) {
    bounds.minX = bounds.maxX = points[0];
    bounds.minY = bounds.maxY = points[1];
  }
  for (let i = 1; i < count; i++) {
    const x = points[i * 2];
    const y = points[i * 2 + 1];
    if (x < bounds.minX) bounds.minX = x;
    if (x > bounds.maxX) bounds.maxX = x;
    if (y < bounds.minY) bounds.minY = y;
    if (y > bounds.maxY) bounds.maxY = y;
  }
  return bounds;
}

export type OrbitFrame = { scale: number; originX: number; originY: number };

export function hexColor(hex: string): [number, number, number] {
  const value = Number.parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

/**
 * Paints orbit points into an RGBA buffer. "density" brightens where points pile up;
 * "age" colors each point by when the orbit reached it.
 */
export function paintOrbit(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  points: ArrayLike<number>,
  count: number,
  frame: OrbitFrame,
  {
    background,
    color,
    colorEnd,
    coloring,
    pointSize,
  }: {
    background: string;
    color: string;
    colorEnd: string;
    coloring: "density" | "age";
    pointSize: number;
  },
) {
  const [backR, backG, backB] = hexColor(background);
  const [r0, g0, b0] = hexColor(color);
  const [r1, g1, b1] = hexColor(colorEnd);
  const size = Math.max(1, Math.round(pointSize));
  const hits = new Uint32Array(width * height);
  const ages = coloring === "age" ? new Float32Array(width * height) : null;
  let most = 0;
  for (let i = 0; i < count; i++) {
    const left = Math.floor(frame.originX + points[i * 2] * frame.scale);
    const top = Math.floor(frame.originY - points[i * 2 + 1] * frame.scale);
    if (left < -size || top < -size || left >= width || top >= height) continue;
    for (let py = Math.max(top, 0); py < Math.min(top + size, height); py++) {
      for (let px = Math.max(left, 0); px < Math.min(left + size, width); px++) {
        const at = py * width + px;
        const seen = ++hits[at];
        if (seen > most) most = seen;
        if (ages) ages[at] = i / Math.max(1, count - 1);
      }
    }
  }
  const logMost = Math.log(most + 1) || 1;
  for (let at = 0; at < hits.length; at++) {
    const offset = at * 4;
    const seen = hits[at];
    if (!seen) {
      pixels[offset] = backR;
      pixels[offset + 1] = backG;
      pixels[offset + 2] = backB;
    } else {
      const t = ages ? ages[at] : Math.log(seen + 1) / logMost;
      pixels[offset] = r0 + (r1 - r0) * t;
      pixels[offset + 1] = g0 + (g1 - g0) * t;
      pixels[offset + 2] = b0 + (b1 - b0) * t;
    }
    pixels[offset + 3] = 255;
  }
}

export type MiraPlace = {
  label: string;
  detail: string;
  group: string;
  settings: MiraSettings;
};

export const MIRA_PLACES: MiraPlace[] = [
  {
    label: "Twenty-petal ring",
    detail: "a = 0.2, b = 1, starting at (12, 0).",
    group: "On a closed loop",
    settings: { a: 0.2, b: 1, x0: 12, y0: 0 },
  },
  {
    label: "Five-petal flower",
    detail: "a = 0.31, b = 1, starting at (12, 0).",
    group: "On a closed loop",
    settings: { a: 0.31, b: 1, x0: 12, y0: 0 },
  },
  {
    label: "One thin line",
    detail: "a = 0.4, b = 1, starting at (12, 0).",
    group: "On a closed loop",
    settings: { a: 0.4, b: 1, x0: 12, y0: 0 },
  },
  {
    label: "Eight arms, start 9",
    detail: "a = 0.7, b = 0.9998, starting at (9, 0).",
    group: "Slowly falling inward",
    settings: { a: 0.7, b: 0.9998, x0: 9, y0: 0 },
  },
  {
    label: "Eight arms, start 12.1",
    detail: "a = 0.7, b = 0.9998, starting at (12.1, 0).",
    group: "Slowly falling inward",
    settings: { a: 0.7, b: 0.9998, x0: 12.1, y0: 0 },
  },
  {
    label: "Eight arms, start 15",
    detail: "a = 0.7, b = 0.9998, starting at (15, 0).",
    group: "Slowly falling inward",
    settings: { a: 0.7, b: 0.9998, x0: 15, y0: 0 },
  },
];
