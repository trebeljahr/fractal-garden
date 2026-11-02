import type { ComplexPoint } from "../orbitLesson";

export const ATTRACTOR_BOUNDS = [-1.8, 1.8, -1.5, 1.5] as const;
export const ESCAPES = -1;
export const STAYS_UNSETTLED = -2;
// Validated all-pairs for three colors on the lesson background; past three, labels back them up.
export const ATTRACTOR_COLORS = [
  "#3987e5",
  "#d95926",
  "#199e70",
  "#c98500",
  "#d55181",
  "#008300",
  "#9085e9",
  "#e66767",
];
const DOT_COLUMNS = 150;
const DOT_ROWS = 125;
// Every bounded grid point gets a dot. Escaping ones only need to show that they leave.
const ESCAPING_DOT_STRIDE = 3;
const LEFT_FOR_GOOD = 4;
// Slow approaches near a bulb's rim count as "no attractor found" rather than a wrong one.
const SETTLE_STEPS = 20000;
const LONGEST_ORBIT = 128;
const SAME_PLACE = 1e-9;
// Closer than this and a point stays with the orbit, and it looks like it has joined.
const JOINED = 1e-3;
const MOST_JUMPS_TO_JOIN = 1000;
// A run stops when every dot has settled, or here if some never do.
const MOST_SHOWN_JUMPS = 300;
const UNSETTLED_SHOWN_JUMPS = 120;

function jump(x: number, y: number, c: ComplexPoint): [number, number] {
  return [x * x - y * y + c.real, 2 * x * y + c.imaginary];
}

const wrap = (value: number, length: number) => ((value % length) + length) % length;

/** Follows zero to its attractor, in jump order from the place nearest zero. Null if there is none. */
export function attractingOrbit(c: ComplexPoint): ComplexPoint[] | null {
  let [x, y] = [0, 0];
  for (let i = 0; i < SETTLE_STEPS; i++) {
    [x, y] = jump(x, y, c);
    if (x * x + y * y > LEFT_FOR_GOOD * LEFT_FOR_GOOD) return null;
  }
  const places = [{ real: x, imaginary: y }];
  let [u, v] = jump(x, y, c);
  // The product of 2z around the orbit scales a small distance from it on every trip.
  let [scaleX, scaleY] = [2 * x, 2 * y];
  while (Math.hypot(u - x, v - y) > SAME_PLACE) {
    if (places.length === LONGEST_ORBIT) return null;
    places.push({ real: u, imaginary: v });
    [scaleX, scaleY] = [2 * (scaleX * u - scaleY * v), 2 * (scaleX * v + scaleY * u)];
    [u, v] = jump(u, v, c);
  }
  if (Math.hypot(scaleX, scaleY) >= 1) return null;
  const size = (p: ComplexPoint) => p.real * p.real + p.imaginary * p.imaginary;
  const nearest = places.reduce((best, p, i) => (size(p) < size(places[best]) ? i : best), 0);
  return [...places.slice(nearest), ...places.slice(0, nearest)];
}

/**
 * A point's color: points with one color reach the same place on the same jump.
 * The clock, if given, receives the jump on which the point joined the orbit or left.
 */
export function fateOf(
  startX: number,
  startY: number,
  c: ComplexPoint,
  orbit: ComplexPoint[] | null,
  clock?: { jump: number },
) {
  let [x, y] = [startX, startY];
  const limit = orbit ? MOST_JUMPS_TO_JOIN : MOST_JUMPS_TO_JOIN / 4;
  for (let step = 0; step <= limit; step++) {
    if (clock) clock.jump = step;
    if (x * x + y * y > LEFT_FOR_GOOD * LEFT_FOR_GOOD) return ESCAPES;
    if (orbit) {
      for (let place = 0; place < orbit.length; place++) {
        if (
          Math.abs(x - orbit[place].real) < JOINED &&
          Math.abs(y - orbit[place].imaginary) < JOINED
        ) {
          return wrap(place - step, orbit.length);
        }
      }
    }
    [x, y] = jump(x, y, c);
  }
  return STAYS_UNSETTLED;
}

/** Fates for a grid across the picture, row by row from the top. */
export function fateGrid(
  c: ComplexPoint,
  orbit: ComplexPoint[] | null,
  columns: number,
  rows: number,
) {
  const [left, right, bottom, top] = ATTRACTOR_BOUNDS;
  const fates = new Int16Array(columns * rows);
  for (let row = 0; row < rows; row++) {
    const y = top - ((row + 0.5) / rows) * (top - bottom);
    for (let column = 0; column < columns; column++) {
      const x = left + ((column + 0.5) / columns) * (right - left);
      fates[row * columns + column] = fateOf(x, y, c, orbit);
    }
  }
  return fates;
}

export type AttractorDots = {
  starts: Float64Array;
  colors: Int16Array;
  /** The jump on which each dot joined the orbit or left. */
  arrivals: Int32Array;
  /** The first jump with every dot settled, within the most this demo shows. */
  lastJump: number;
};

/** The moving dots: every grid point that stays, and a thinner set of the ones that escape. */
export function attractorDots(c: ComplexPoint, orbit: ComplexPoint[] | null): AttractorDots {
  const [left, right, bottom, top] = ATTRACTOR_BOUNDS;
  const starts: number[] = [];
  const colors: number[] = [];
  const arrivals: number[] = [];
  const clock = { jump: 0 };
  let settledBy = 0;
  let unsettled = false;
  for (let row = 0; row < DOT_ROWS; row++) {
    const y = top - ((row + 0.5) / DOT_ROWS) * (top - bottom);
    for (let column = 0; column < DOT_COLUMNS; column++) {
      const x = left + ((column + 0.5) / DOT_COLUMNS) * (right - left);
      const fate = fateOf(x, y, c, orbit, clock);
      if (fate === ESCAPES && (row % ESCAPING_DOT_STRIDE || column % ESCAPING_DOT_STRIDE)) continue;
      starts.push(x, y);
      colors.push(fate);
      arrivals.push(clock.jump);
      if (fate === STAYS_UNSETTLED) unsettled = true;
      else settledBy = Math.max(settledBy, clock.jump);
    }
  }
  return {
    starts: Float64Array.from(starts),
    colors: Int16Array.from(colors),
    arrivals: Int32Array.from(arrivals),
    lastJump: Math.min(
      MOST_SHOWN_JUMPS,
      unsettled ? Math.max(settledBy, UNSETTLED_SHOWN_JUMPS) : settledBy,
    ),
  };
}

/**
 * Every dot's position after a number of jumps, as x, y pairs. NaN once it has left.
 * Only dots still on the way are calculated: a dot on the orbit has a known place.
 */
export function dotsAfter(
  c: ComplexPoint,
  { starts, colors, arrivals }: AttractorDots,
  orbit: ComplexPoint[] | null,
  jumps: number,
) {
  const positions = new Float64Array(starts.length);
  for (let dot = 0; dot < colors.length; dot++) {
    const at = dot * 2;
    if (colors[dot] === ESCAPES && arrivals[dot] < jumps) {
      positions[at] = Number.NaN;
      positions[at + 1] = Number.NaN;
    } else if (orbit && colors[dot] >= 0 && arrivals[dot] <= jumps) {
      const place = orbit[(colors[dot] + jumps) % orbit.length];
      positions[at] = place.real;
      positions[at + 1] = place.imaginary;
    } else {
      let [x, y] = [starts[at], starts[at + 1]];
      for (let step = 0; step < jumps; step++) [x, y] = jump(x, y, c);
      positions[at] = x;
      positions[at + 1] = y;
    }
  }
  return positions;
}

/** How many dots are on the orbit, have escaped or are still on the way after a number of jumps. */
export function tallyDots({ colors, arrivals }: AttractorDots, jumps: number) {
  let joined = 0;
  let escaped = 0;
  let moving = 0;
  for (let dot = 0; dot < colors.length; dot++) {
    if (colors[dot] === STAYS_UNSETTLED || arrivals[dot] > jumps) moving++;
    else if (colors[dot] === ESCAPES) escaped++;
    else joined++;
  }
  return { joined, escaped, moving };
}

// Each c is the bulb's center, where zero itself is on the orbit. "at" is where the number sits.
export const BULB_ORBITS = [
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

/** A small bulb's number sits beside it, so a pick on the number means the bulb. */
export function pickBulb(point: ComplexPoint): ComplexPoint {
  for (const { c, at } of BULB_ORBITS) {
    const beside = Math.hypot(at.real - c.real, at.imaginary - c.imaginary) > 0.05;
    if (beside && Math.hypot(point.real - at.real, point.imaginary - at.imaginary) < 0.05) return c;
  }
  return point;
}
