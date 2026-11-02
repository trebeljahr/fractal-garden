import { expandLSystem, traceTurtle } from "../turtleCurve";

export type UnitPoint = [number, number];

/** The route of round `round` through the centers of a grid, inside the unit square. */
export function peanoRoute(round: number): UnitPoint[] {
  const word = expandLSystem(
    "X",
    { X: "XFYFX+F+YFXFY-F-XFYFX", Y: "YFXFY-F-XFYFX+F+YFXFY" },
    round,
  );
  const { points } = traceTurtle(word, { "+": 90, "-": -90 }, 0);
  const cells = 3 ** round;
  const route: UnitPoint[] = [];
  for (let i = 0; i < points.length; i += 2)
    route.push([(Math.round(points[i]) + 0.5) / cells, (Math.round(points[i + 1]) + 0.5) / cells]);
  return route;
}

const DIGITS = 40;

/**
 * Where the finished curve is at position t from 0 to 1. Peano's base-3 digit rule,
 * with x and y swapped to match the route above, which starts along the bottom edge.
 */
export function peanoPoint(t: number): UnitPoint {
  const digits: number[] = [];
  let rest = Math.max(0, Math.min(1, t));
  for (let i = 0; i < DIGITS; i++) {
    rest *= 3;
    const digit = Math.min(2, Math.floor(rest + 1e-12));
    digits.push(digit);
    rest = Math.max(0, rest - digit);
  }
  let x = 0;
  let y = 0;
  let scale = 1 / 3;
  let oddSum = 0;
  let evenSum = 0;
  for (let i = 0; i + 1 < digits.length; i += 2) {
    const first = digits[i];
    const second = digits[i + 1];
    y += (evenSum % 2 ? 2 - first : first) * scale;
    x += ((oddSum + first) % 2 ? 2 - second : second) * scale;
    oddSum += first;
    evenSum += second;
    scale /= 3;
  }
  return [x, y];
}

// Exact positions found by following the digit rule. Each list lands on one point.
export const PEANO_SHARED_POINTS = [
  { label: "Visited twice", positions: [1 / 9, 5 / 9] },
  { label: "Visited four times", positions: [17 / 36, 23 / 36, 25 / 36, 31 / 36] },
];
