import type { ComplexPoint } from "../orbitLesson";

// Long enough for nearly every Rabbit dot to join the loop. Playback keeps going past this.
export const ATTRACTOR_JUMPS = 60;
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
const LONGEST_LOOP = 128;
const SAME_PLACE = 1e-9;
// Closer than this and a point stays with the attractor, and it looks like it has landed.
export const LANDED = 1e-3;
const MOST_JUMPS_TO_LAND = 1000;

function jump(x: number, y: number, c: ComplexPoint): [number, number] {
  return [x * x - y * y + c.real, 2 * x * y + c.imaginary];
}

const wrap = (value: number, length: number) => ((value % length) + length) % length;

/** Follows zero to its attractor, in jump order from the place nearest zero. Null if there is none. */
export function attractingLoop(c: ComplexPoint): ComplexPoint[] | null {
  let [x, y] = [0, 0];
  for (let i = 0; i < SETTLE_STEPS; i++) {
    [x, y] = jump(x, y, c);
    if (x * x + y * y > LEFT_FOR_GOOD * LEFT_FOR_GOOD) return null;
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
  if (Math.hypot(scaleX, scaleY) >= 1) return null;
  const size = (p: ComplexPoint) => p.real * p.real + p.imaginary * p.imaginary;
  const nearest = places.reduce((best, p, i) => (size(p) < size(places[best]) ? i : best), 0);
  return [...places.slice(nearest), ...places.slice(0, nearest)];
}

/** A point's color: points with one color land on the same place on the same jump. */
export function fateOf(
  startX: number,
  startY: number,
  c: ComplexPoint,
  loop: ComplexPoint[] | null,
) {
  let [x, y] = [startX, startY];
  const limit = loop ? MOST_JUMPS_TO_LAND : MOST_JUMPS_TO_LAND / 4;
  for (let step = 0; step <= limit; step++) {
    if (x * x + y * y > LEFT_FOR_GOOD * LEFT_FOR_GOOD) return ESCAPES;
    if (loop) {
      for (let place = 0; place < loop.length; place++) {
        if (
          Math.abs(x - loop[place].real) < LANDED &&
          Math.abs(y - loop[place].imaginary) < LANDED
        ) {
          return wrap(place - step, loop.length);
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
  loop: ComplexPoint[] | null,
  columns: number,
  rows: number,
) {
  const [left, right, bottom, top] = ATTRACTOR_BOUNDS;
  const fates = new Int16Array(columns * rows);
  for (let row = 0; row < rows; row++) {
    const y = top - ((row + 0.5) / rows) * (top - bottom);
    for (let column = 0; column < columns; column++) {
      const x = left + ((column + 0.5) / columns) * (right - left);
      fates[row * columns + column] = fateOf(x, y, c, loop);
    }
  }
  return fates;
}

/** The moving dots: every grid point that stays, and a thinner set of the ones that escape. */
export function attractorDots(c: ComplexPoint, loop: ComplexPoint[] | null) {
  const [left, right, bottom, top] = ATTRACTOR_BOUNDS;
  const fates = fateGrid(c, loop, DOT_COLUMNS, DOT_ROWS);
  const starts: number[] = [];
  const colors: number[] = [];
  for (let row = 0; row < DOT_ROWS; row++) {
    for (let column = 0; column < DOT_COLUMNS; column++) {
      const fate = fates[row * DOT_COLUMNS + column];
      if (fate === ESCAPES && (row % ESCAPING_DOT_STRIDE || column % ESCAPING_DOT_STRIDE)) continue;
      starts.push(
        left + ((column + 0.5) / DOT_COLUMNS) * (right - left),
        top - ((row + 0.5) / DOT_ROWS) * (top - bottom),
      );
      colors.push(fate);
    }
  }
  return { starts: Float64Array.from(starts), colors: Int16Array.from(colors) };
}

/** Every dot's position after a number of jumps, as x, y pairs. NaN once it has left for good. */
export function dotsAfter(c: ComplexPoint, starts: Float64Array, jumps: number) {
  const positions = new Float64Array(starts.length);
  for (let dot = 0; dot < starts.length; dot += 2) {
    let [x, y] = [starts[dot], starts[dot + 1]];
    let gone = false;
    for (let step = 0; step < jumps; step++) {
      if (x * x + y * y > LEFT_FOR_GOOD * LEFT_FOR_GOOD) {
        gone = true;
        break;
      }
      [x, y] = jump(x, y, c);
    }
    positions[dot] = gone ? Number.NaN : x;
    positions[dot + 1] = gone ? Number.NaN : y;
  }
  return positions;
}

/** Which place each dot has landed on, or -1. Counts every dot as landed, escaped or still moving. */
export function tallyDots(c: ComplexPoint, positions: Float64Array, loop: ComplexPoint[] | null) {
  // Past this circle a point only moves farther away.
  const escapedAt = Math.max(2, Math.hypot(c.real, c.imaginary));
  const landedOn = new Int16Array(positions.length / 2).fill(-1);
  const onPlace = new Array<number>(loop?.length ?? 0).fill(0);
  let escaped = 0;
  let moving = 0;
  for (let dot = 0; dot < landedOn.length; dot++) {
    const x = positions[dot * 2];
    const y = positions[dot * 2 + 1];
    if (Number.isNaN(x) || Math.hypot(x, y) > escapedAt) {
      escaped++;
      continue;
    }
    const place = loop
      ? loop.findIndex((p) => Math.abs(x - p.real) < LANDED && Math.abs(y - p.imaginary) < LANDED)
      : -1;
    if (place < 0) {
      moving++;
    } else {
      landedOn[dot] = place;
      onPlace[place]++;
    }
  }
  return { landedOn, onPlace, escaped, moving };
}

// Each c is the bulb's center, where zero itself is on the attractor. "at" is where the number sits.
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

/** A small bulb's number sits beside it, so a pick on the number means the bulb. */
export function pickBulb(point: ComplexPoint): ComplexPoint {
  for (const { c, at } of BULB_LOOPS) {
    const beside = Math.hypot(at.real - c.real, at.imaginary - c.imaginary) > 0.05;
    if (beside && Math.hypot(point.real - at.real, point.imaginary - at.imaginary) < 0.05) return c;
  }
  return point;
}
