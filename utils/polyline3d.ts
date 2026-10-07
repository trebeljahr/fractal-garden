import { radians } from "./ctxHelpers";

export type Polyline3D = {
  // Packed xyz triples: [x0, y0, z0, x1, y1, z1, ...]
  points: Float32Array;
  count: number;
};

export type Polyline3DDrawOptions = {
  rotationX: number;
  rotationY: number;
  cameraDistance: number;
  background: string;
  nearColor: string;
  farColor: string;
  farAlpha: number;
  lineWidth: number;
};

type Derivative = (x: number, y: number, z: number, out: Float64Array) => void;

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
function stepRK4(derivative: Derivative, state: Float64Array, dt: number, scratch: Float64Array[]) {
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

function createScratch() {
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
function getNormalization(
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
  target: Float32Array,
  index: number,
) {
  for (let axis = 0; axis < 3; axis++) {
    const from = axisOrder[axis];
    target[index * 3 + axis] = (source[from] - center[from]) * scale;
  }
}

function applyNormalization(
  { points, count }: Polyline3D,
  normalization: Normalization,
): Polyline3D {
  const normalized = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    writeNormalized(points.subarray(i * 3, i * 3 + 3), normalization, normalized, i);
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
  const count = Math.min(visibleCount, polyline.count);
  const cosX = Math.cos(radians(options.rotationX));
  const sinX = Math.sin(radians(options.rotationX));
  const cosY = Math.cos(radians(options.rotationY));
  const sinY = Math.sin(radians(options.rotationY));
  const scale = Math.min(width, height) * 0.42;
  const projected = new Float32Array(count * 3);
  const clipped = new Uint8Array(count);

  ctx.fillStyle = options.background;
  ctx.fillRect(0, 0, width, height);

  if (count < 2) return null;

  for (let i = 0; i < count; i++) {
    const x = points[i * 3];
    const y = points[i * 3 + 1];
    const z = points[i * 3 + 2];

    const y1 = y * cosX - z * sinX;
    const z1 = y * sinX + z * cosX;
    const x2 = x * cosY + z1 * sinY;
    const z2 = -x * sinY + z1 * cosY;
    const cameraDepth = options.cameraDistance - z2;
    if (cameraDepth < NEAR_PLANE) clipped[i] = 1;
    const perspective = PROJECTION_FOCAL_LENGTH / Math.max(cameraDepth, NEAR_PLANE);

    projected[i * 3] = width / 2 + x2 * scale * perspective;
    projected[i * 3 + 1] = height / 2 - y1 * scale * perspective;
    projected[i * 3 + 2] = z2;
  }

  // Counting sort of segment indices into depth bins.
  const segmentCount = count - 1;
  const segmentBins = new Uint8Array(segmentCount);
  const binStarts = new Uint32Array(DEPTH_BINS + 1);

  let visibleSegments = 0;

  for (let i = 0; i < segmentCount; i++) {
    if (clipped[i] || clipped[i + 1]) {
      segmentBins[i] = CLIPPED;
      continue;
    }
    const depth = (projected[i * 3 + 2] + projected[i * 3 + 5]) / 2;
    const t = Math.min(Math.max((depth + 1) / 2, 0), 0.9999);
    const bin = Math.floor(t * DEPTH_BINS);
    segmentBins[i] = bin;
    binStarts[bin + 1]++;
    visibleSegments++;
  }

  for (let bin = 0; bin < DEPTH_BINS; bin++) {
    binStarts[bin + 1] += binStarts[bin];
  }

  const cursor = binStarts.slice(0, DEPTH_BINS);
  const sorted = new Uint32Array(visibleSegments);
  for (let i = 0; i < segmentCount; i++) {
    if (segmentBins[i] === CLIPPED) continue;
    sorted[cursor[segmentBins[i]]++] = i;
  }

  const near = hexToRgb(options.nearColor);
  const far = hexToRgb(options.farColor);

  ctx.lineWidth = options.lineWidth;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  for (let bin = 0; bin < DEPTH_BINS; bin++) {
    const start = binStarts[bin];
    const end = binStarts[bin + 1];
    if (start === end) continue;

    const t = (bin + 0.5) / DEPTH_BINS;
    const r = Math.round(far[0] + (near[0] - far[0]) * t);
    const g = Math.round(far[1] + (near[1] - far[1]) * t);
    const b = Math.round(far[2] + (near[2] - far[2]) * t);
    const alpha = options.farAlpha + (1 - options.farAlpha) * t;

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
