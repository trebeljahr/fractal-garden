export type AttractorSystem = "lorenz" | "rossler";
export type AttractorPoint = [number, number, number];
export type AttractorFlow = (point: AttractorPoint) => AttractorPoint;
export type AttractorProjection = "xz" | "xy";

export const ATTRACTOR_LESSONS: Record<
  AttractorSystem,
  {
    name: string;
    dt: number;
    batchSteps: number;
    batches: number;
    start: AttractorPoint;
    projection: AttractorProjection;
    pathStride: number;
  }
> = {
  lorenz: {
    name: "Lorenz",
    dt: 0.005,
    batchSteps: 200,
    batches: 32,
    start: [0.1, 0, 0],
    projection: "xz",
    pathStride: 8,
  },
  rossler: {
    name: "Rössler",
    dt: 0.02,
    batchSteps: 250,
    batches: 32,
    start: [1, 1, 0],
    projection: "xy",
    // Its time step is four times longer, and z rises quickly.
    pathStride: 2,
  },
};

export const NEARBY_START_OFFSET = 0.001;
export const MAX_ATTRACTOR_STEPS = 8000;

export function attractorFlow(system: AttractorSystem, [x, y, z]: AttractorPoint): AttractorPoint {
  return system === "lorenz"
    ? [10 * (y - x), x * (28 - z) - y, x * y - (8 / 3) * z]
    : [-y - z, x + 0.2 * y, 0.2 + z * (x - 5.7)];
}

export function rk4Step(flow: AttractorFlow, point: AttractorPoint, dt: number): AttractorPoint {
  const shifted = (slope: AttractorPoint, amount: number): AttractorPoint => [
    point[0] + slope[0] * amount,
    point[1] + slope[1] * amount,
    point[2] + slope[2] * amount,
  ];
  const a = flow(point);
  const b = flow(shifted(a, dt / 2));
  const c = flow(shifted(b, dt / 2));
  const d = flow(shifted(c, dt));
  return [0, 1, 2].map(
    (axis) => point[axis] + (dt * (a[axis] + 2 * b[axis] + 2 * c[axis] + d[axis])) / 6,
  ) as AttractorPoint;
}

export function traceAttractor(
  system: AttractorSystem,
  start: AttractorPoint,
  steps: number,
  dt: number,
) {
  const points: AttractorPoint[] = [[...start]];
  const count = Math.min(MAX_ATTRACTOR_STEPS, Math.max(0, Math.floor(steps)));
  for (let index = 0; index < count; index++) {
    const next = rk4Step((point) => attractorFlow(system, point), points[index], dt);
    if (!next.every(Number.isFinite) || next.some((value) => Math.abs(value) > 1e6)) break;
    points.push(next);
  }
  return points;
}

export function pointSeparation(a: AttractorPoint, b: AttractorPoint) {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

// Keep every numerical step; thin only the vertices sent to the SVG path.
export function sampleTrace(points: AttractorPoint[], end: number, stride = 8) {
  const last = Math.min(Math.max(0, Math.floor(end)), points.length - 1);
  const sampled: AttractorPoint[] = [];
  const every = Math.max(1, Math.floor(stride));
  for (let index = 0; index <= last; index += every) sampled.push(points[index]);
  if (last > 0 && last % every !== 0) sampled.push(points[last]);
  return sampled;
}

// Lorenz's restart, tried on this page's three equations. A settled point with x = 0.506127.
export const RESTART_POINT: AttractorPoint = [0.506127, 4.411434, 25.859555];
// Each notch is ten times smaller. The fourth is the rounding from 0.506127 to 0.506.
export const RESTART_NOTCHES = 12;
export const LORENZ_ROUNDING_NOTCH = 3;
export const RESTART_STEPS = 7000;
// At this distance between the points, their two x curves are visibly different.
export const APART_DISTANCE = 5;

export function restartDifference(notch: number) {
  return 0.127 / 10 ** notch;
}

/** The difference as a decimal, in full. Exponents would hide how small it is. */
export function restartDifferenceLabel(notch: number) {
  return restartDifference(notch).toFixed(3 + notch);
}

export function restartStartLabel(notch: number) {
  const decimals = Math.max(6, 3 + notch);
  return String(Number((RESTART_POINT[0] - restartDifference(notch)).toFixed(decimals)));
}

export function restartRuns() {
  const { dt } = ATTRACTOR_LESSONS.lorenz;
  const original = traceAttractor("lorenz", RESTART_POINT, RESTART_STEPS, dt);
  const restarts = Array.from({ length: RESTART_NOTCHES }, (_, notch) => {
    const start: AttractorPoint = [
      RESTART_POINT[0] - restartDifference(notch),
      RESTART_POINT[1],
      RESTART_POINT[2],
    ];
    const run = traceAttractor("lorenz", start, RESTART_STEPS, dt);
    const gaps = run.map((point, index) => pointSeparation(point, original[index]));
    const apart = gaps.findIndex((gap) => gap > APART_DISTANCE);
    return { notch, run, gaps, apartTime: apart < 0 ? null : apart * dt };
  });
  return { original, restarts };
}
