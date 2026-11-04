import type { ConstructionLead } from "../constructionLead";

export type Spot = [number, number];

/**
 * A number here is a row of 0s and 1s held in one integer: the lowest FRACTION_DIGITS bits are the
 * digits after the point, the bits above them are the whole part. Each place is a step on the
 * plane. Moving one place to the left multiplies the step by -1 - i, which makes it 1.41 times as
 * long and turns it 135 degrees clockwise.
 *
 * In the coordinates where the first dragon runs from (0, 0) to (1, 0), the place before the point
 * is one grid step up and the fractions fill the page's tile. Base -1 + i gives the mirror image.
 */
export const FRACTION_DIGITS = 12;
export const MAX_WHOLE_DIGITS = 4;

/** Where the row of all zeros lands. */
export const ORIGIN: Spot = [0.6, 0.2];

const times = ([a, b]: Spot, [c, d]: Spot): Spot => [a * c - b * d, a * d + b * c];
const BASE: Spot = [-1, -1];
const INVERSE: Spot = [-0.5, 0.5];

/** The step a digit 1 takes at this place. Place 0 is just before the point, -1 just after it. */
export function placeStep(place: number): Spot {
  let step: Spot = [0, 1];
  for (let i = 0; i < Math.abs(place); i++) step = times(step, place > 0 ? BASE : INVERSE);
  return step;
}

/** Each number's grid point before scaling: its digits read as a whole number in this base. */
export function latticeCells(bits: number) {
  const cells = new Int32Array(2 ** (bits + 1));
  let place: Spot = [1, 0];
  for (let bit = 0; bit < bits; bit++) {
    const count = 2 ** bit;
    for (let n = 0; n < count; n++) {
      cells[2 * (n + count)] = cells[2 * n] + place[0];
      cells[2 * (n + count) + 1] = cells[2 * n + 1] + place[1];
    }
    place = times(place, BASE);
  }
  return cells;
}

/**
 * The digits of a grid point a + bi. Each round reads the lowest digit, which is the parity of
 * a + b, then takes it away and divides by the base. Null when it needs more than `limit` digits.
 */
export function digitsOf(a: number, b: number, limit = 53) {
  let n = 0;
  let scale = 1;
  let [x, y] = [a, b];
  for (let bit = 0; x !== 0 || y !== 0; bit++) {
    if (bit >= limit) return null;
    const digit = (x + y) & 1;
    if (digit) n += scale;
    scale *= 2;
    [x, y] = [(digit - x - y) / 2, (x - digit - y) / 2];
  }
  return n;
}

// Twelve places after the point scale by 1 / (-1 - i)^12 = -1/64, then the point turns a quarter
// turn to meet the drawing: (a, b) lands at (b, -a) / 64 from the origin.
const SCALE = 64;

// The picture of the tile keeps two more places than the row of digits does. By the same steps
// (-1 - i)^14 = -128i puts (a, b) at (-a, -b) / 128 from the origin, a square grid again.
export const FILL_DIGITS = 14;
export const FILL_CELLS_PER_UNIT = 128;

/** Where a number lands in the drawing's coordinates. */
export function spotOf(n: number): Spot {
  let [x, y] = ORIGIN;
  for (let bit = 0, rest = n; rest > 0; bit++, rest = Math.floor(rest / 2)) {
    if (rest % 2) {
      const [dx, dy] = placeStep(bit - FRACTION_DIGITS);
      x += dx;
      y += dy;
    }
  }
  return [x, y];
}

/** The number closest to a spot, or null when reaching it takes too many whole digits. */
export function numberAt([x, y]: Spot, wholeDigits: number) {
  return digitsOf(
    Math.round((ORIGIN[1] - y) * SCALE),
    Math.round((x - ORIGIN[0]) * SCALE),
    FRACTION_DIGITS + wholeDigits,
  );
}

export const TWINDRAGON_LEAD: ConstructionLead = {
  control: {
    kind: "options",
    path: "showTiling",
    label: "View",
    options: [
      { value: false, label: "One tile" },
      { value: true, label: "Tiling" },
    ],
  },
  readout: () => [],
};
