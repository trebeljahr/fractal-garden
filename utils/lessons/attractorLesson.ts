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

// Turn counting on the Rössler system. With a = b = 0.1, c alone sets the count.
export const ROSSLER_TURNS = { a: 0.1, b: 0.1, dt: 0.02, settleTime: 20000, peakTime: 2400 };
export const SAME_PEAK = 0.001;
export const LONGEST_REPEAT = 64;
const NO_REPEAT_ROUTE_TURNS = 30;
const MAX_ROUTE_STEPS = 1_000_000;

/** One fourth-order Runge–Kutta step in place. Millions run per reading, so nothing allocates. */
export function advanceRossler(state: AttractorPoint, c: number) {
  const { a, b, dt } = ROSSLER_TURNS;
  const half = dt / 2;
  const [x, y, z] = state;
  const k1x = -y - z;
  const k1y = x + a * y;
  const k1z = b + z * (x - c);
  const x2 = x + k1x * half;
  const y2 = y + k1y * half;
  const z2 = z + k1z * half;
  const k2x = -y2 - z2;
  const k2y = x2 + a * y2;
  const k2z = b + z2 * (x2 - c);
  const x3 = x + k2x * half;
  const y3 = y + k2y * half;
  const z3 = z + k2z * half;
  const k3x = -y3 - z3;
  const k3y = x3 + a * y3;
  const k3z = b + z3 * (x3 - c);
  const x4 = x + k3x * dt;
  const y4 = y + k3y * dt;
  const z4 = z + k3z * dt;
  const k4x = -y4 - z4;
  const k4y = x4 + a * y4;
  const k4z = b + z4 * (x4 - c);
  state[0] = x + (dt * (k1x + 2 * k2x + 2 * k3x + k4x)) / 6;
  state[1] = y + (dt * (k1y + 2 * k2y + 2 * k3y + k4y)) / 6;
  state[2] = z + (dt * (k1z + 2 * k2z + 2 * k3z + k4z)) / 6;
}

/** The smallest number of turns after which every peak matches, or null if none does. */
export function repeatingTurns(peaks: number[]) {
  for (let length = 1; length <= LONGEST_REPEAT && length * 3 <= peaks.length; length++) {
    let matches = true;
    for (let i = 0; matches && i + length < peaks.length; i++)
      matches = Math.abs(peaks[i] - peaks[i + length]) <= SAME_PEAK;
    if (matches) return length;
  }
  return null;
}

/**
 * Lets the route settle, measures how many turns it takes to repeat, then records the route for
 * that many turns. A peak is where x stops rising. Its height comes from a parabola through the
 * last three steps, because the steps rarely land exactly on it.
 */
export function measureRosslerTurns(c: number) {
  const { dt, settleTime, peakTime } = ROSSLER_TURNS;
  const state: AttractorPoint = [1, 1, 0];
  for (let step = Math.round(settleTime / dt); step > 0; step--) advanceRossler(state, c);

  const peaks: number[] = [];
  let before = state[0];
  advanceRossler(state, c);
  let middle = state[0];
  for (let step = Math.round(peakTime / dt); step > 0; step--) {
    advanceRossler(state, c);
    const after = state[0];
    if (middle > before && middle >= after) {
      const curve = before - 2 * middle + after;
      peaks.push(curve ? middle - (before - after) ** 2 / (8 * curve) : middle);
    }
    before = middle;
    middle = after;
  }
  const repeat = repeatingTurns(peaks);

  // The route starts on a peak and ends on the peak that closes it.
  const turns = repeat ?? NO_REPEAT_ROUTE_TURNS;
  const route: AttractorPoint[] = [];
  const routePeaks: AttractorPoint[] = [];
  let earlier = before;
  for (let order = 0; routePeaks.length <= turns && order < MAX_ROUTE_STEPS; order++) {
    const previous: AttractorPoint = [state[0], state[1], state[2]];
    advanceRossler(state, c);
    const isPeak = previous[0] > earlier && previous[0] >= state[0];
    if (isPeak) routePeaks.push(previous);
    if (isPeak || (routePeaks.length > 0 && order % 2 === 0)) route.push(previous);
    earlier = previous[0];
  }
  return { peaks, repeat, route, routePeaks: routePeaks.slice(0, turns) };
}
