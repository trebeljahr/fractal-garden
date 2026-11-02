import type { ComplexPoint } from "../orbitLesson";

export const SWARM_JUMPS = 48;
export const SWARM_BOUNDS = [-1.8, 1.8, -1.5, 1.5] as const;
const SWARM_COLUMNS = 48;
const SWARM_ROWS = 40;
const LEFT_VIEW = 4;
// Slow approaches near a bulb's rim count as "no loop found" rather than a wrong loop.
const SETTLE_STEPS = 20000;
const LONGEST_LOOP = 128;
const SAME_PLACE = 1e-9;

function jump(x: number, y: number, c: ComplexPoint): [number, number] {
  return [x * x - y * y + c.real, 2 * x * y + c.imaginary];
}

/** Follows zero to the loop it settles on. Null if it escapes, or if that loop pushes points away. */
export function attractingLoop(c: ComplexPoint): ComplexPoint[] | null {
  let [x, y] = [0, 0];
  for (let i = 0; i < SETTLE_STEPS; i++) {
    [x, y] = jump(x, y, c);
    if (x * x + y * y > LEFT_VIEW * LEFT_VIEW) return null;
  }
  const places = [{ real: x, imaginary: y }];
  let [u, v] = jump(x, y, c);
  // The product of 2z around the loop scales a small distance from it on every trip.
  let [scaleX, scaleY] = [2 * x, 2 * y];
  while (Math.hypot(u - x, v - y) > SAME_PLACE) {
    if (places.length === LONGEST_LOOP) return null;
    places.push({ real: u, imaginary: v });
    [scaleX, scaleY] = [2 * (scaleX * u - scaleY * v), 2 * (scaleX * v + scaleY * u)];
    [u, v] = jump(u, v, c);
  }
  return Math.hypot(scaleX, scaleY) < 1 ? places : null;
}

export function swarmStarts(columns = SWARM_COLUMNS, rows = SWARM_ROWS) {
  const [left, right, bottom, top] = SWARM_BOUNDS;
  const starts = new Float64Array(columns * rows * 2);
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      const at = (row * columns + column) * 2;
      starts[at] = left + ((column + 0.5) / columns) * (right - left);
      starts[at + 1] = bottom + ((row + 0.5) / rows) * (top - bottom);
    }
  }
  return starts;
}

/** Every dot's position after each jump, as x, y pairs. NaN once a dot has left for good. */
export function traceSwarm(c: ComplexPoint, starts: Float64Array, jumps = SWARM_JUMPS) {
  const dots = starts.length / 2;
  const trace = new Float64Array((jumps + 1) * starts.length).fill(Number.NaN);
  trace.set(starts);
  for (let dot = 0; dot < dots; dot++) {
    let [x, y] = [starts[dot * 2], starts[dot * 2 + 1]];
    for (let step = 1; step <= jumps; step++) {
      if (x * x + y * y > LEFT_VIEW * LEFT_VIEW) break;
      [x, y] = jump(x, y, c);
      const at = (step * dots + dot) * 2;
      trace[at] = x;
      trace[at + 1] = y;
    }
  }
  return trace;
}

/** A small bulb's number sits beside it, so a pick on the number means the bulb. */
export function pickBulb(point: ComplexPoint): ComplexPoint {
  for (const { c, at } of BULB_LOOPS) {
    const beside = Math.hypot(at.real - c.real, at.imaginary - c.imaginary) > 0.05;
    if (beside && Math.hypot(point.real - at.real, point.imaginary - at.imaginary) < 0.05) return c;
  }
  return point;
}

// Each c is the bulb's center, where zero itself is on the loop. "at" is where the number sits.
export const BULB_LOOPS = [
  { places: 1, c: { real: 0, imaginary: 0 }, at: { real: 0, imaginary: 0 } },
  { places: 2, c: { real: -1, imaginary: 0 }, at: { real: -1, imaginary: 0 } },
  { places: 3, c: { real: -0.12256, imaginary: 0.74486 }, at: { real: -0.12, imaginary: 0.745 } },
  { places: 3, c: { real: -0.12256, imaginary: -0.74486 }, at: { real: -0.12, imaginary: -0.745 } },
  { places: 4, c: { real: -1.3107, imaginary: 0 }, at: { real: -1.31, imaginary: 0.14 } },
  { places: 4, c: { real: 0.28227, imaginary: 0.53006 }, at: { real: 0.35, imaginary: 0.6 } },
  { places: 4, c: { real: 0.28227, imaginary: -0.53006 }, at: { real: 0.35, imaginary: -0.6 } },
  { places: 5, c: { real: 0.37951, imaginary: 0.33493 }, at: { real: 0.5, imaginary: 0.37 } },
  { places: 5, c: { real: 0.37951, imaginary: -0.33493 }, at: { real: 0.5, imaginary: -0.37 } },
  { places: 5, c: { real: -0.50434, imaginary: 0.56277 }, at: { real: -0.57, imaginary: 0.65 } },
  { places: 5, c: { real: -0.50434, imaginary: -0.56277 }, at: { real: -0.57, imaginary: -0.65 } },
] as const;
