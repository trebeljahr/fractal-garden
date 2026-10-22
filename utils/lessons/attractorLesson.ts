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
  }
> = {
  lorenz: {
    name: "Lorenz",
    dt: 0.005,
    batchSteps: 200,
    batches: 32,
    start: [0.1, 0, 0],
    projection: "xz",
  },
  rossler: {
    name: "Rössler",
    dt: 0.02,
    batchSteps: 250,
    batches: 32,
    start: [1, 1, 0],
    projection: "xy",
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
