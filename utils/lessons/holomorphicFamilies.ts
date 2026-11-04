import type { ComplexPoint } from "../orbitLesson";

const point = (real: number, imaginary: number): ComplexPoint => ({ real, imaginary });

export type FamilyPlace = {
  name: string;
  /** A value of the free number inside the heart of this copy. */
  at: ComplexPoint;
  /** Half the width of a view that holds the whole copy. */
  half: number;
};

export type FamilyRule = {
  /** The rule's number in family-explorer.frag. */
  shader: number;
  name: string;
  /** What the free number is called in the demo. */
  free: string;
  /** What a point on the right picture is called. */
  start: string;
  whole: { center: ComplexPoint; half: number };
  startsHalf: number;
  /** Half the width of the right picture while looking at a copy. */
  startsCloseHalf: number;
  places: FamilyPlace[];
};

// Found by scanning for black regions. tests/holomorphic-families.test.mjs checks each one.
export const FAMILY_RULES: FamilyRule[] = [
  {
    shader: 0,
    name: "Newton's method",
    free: "third root",
    start: "first guess",
    whole: { center: point(0, 0), half: 3.4 },
    startsHalf: 3.4,
    startsCloseHalf: 0.3,
    places: [
      { name: "A", at: point(0.81285, 0.84417), half: 0.04 },
      { name: "B", at: point(0.00793, 2.94476), half: 0.06 },
      { name: "C", at: point(0.58643, 1.21796), half: 0.025 },
      { name: "D", at: point(0.0027, 2.39893), half: 0.018 },
      { name: "E", at: point(0.40748, 1.42079), half: 0.012 },
      { name: "F", at: point(0.27818, 1.53773), half: 0.006 },
    ],
  },
  {
    shader: 1,
    name: "z² + c",
    free: "value of c",
    start: "starting point",
    whole: { center: point(-0.6, 0), half: 1.6 },
    startsHalf: 1.8,
    startsCloseHalf: 1.8,
    places: [
      { name: "A", at: point(-1.7549, 0), half: 0.04 },
      { name: "B", at: point(-0.1565, 1.0322), half: 0.03 },
    ],
  },
  {
    shader: 2,
    name: "z² + c/z²",
    free: "value of c",
    start: "starting point",
    whole: { center: point(0, 0), half: 0.8 },
    startsHalf: 2,
    startsCloseHalf: 2,
    places: [
      { name: "A", at: point(-0.15841, 0.13179), half: 0.06 },
      { name: "B", at: point(-0.06191, 0.20763), half: 0.016 },
    ],
  },
  {
    shader: 3,
    name: "c · sin z",
    free: "value of c",
    start: "starting point",
    whole: { center: point(0, 0), half: 3.4 },
    startsHalf: 4,
    startsCloseHalf: 4,
    places: [
      { name: "A", at: point(0, 1.73538), half: 0.06 },
      { name: "B", at: point(2.16579, 1.2909), half: 0.07 },
    ],
  },
];

/** The pictures beside McMullen's theorem, as [rule, place] pairs. */
export const COPY_GALLERY: [number, number][] = [
  [0, 0],
  [0, 1],
  [0, 3],
  [1, 0],
  [1, 1],
  [2, 0],
  [2, 1],
  [3, 0],
  [3, 1],
];

export const MOST_ZOOMED_HALF = 3e-4;

function times(x: number, y: number, u: number, v: number): [number, number] {
  return [x * u - y * v, x * v + y * u];
}
function over(x: number, y: number, u: number, v: number): [number, number] {
  const size = u * u + v * v;
  return [(x * u + y * v) / size, (y * u - x * v) / size];
}

/** The place of zero slope that the family test starts from. */
export function familyStart(rule: number, c: ComplexPoint): ComplexPoint {
  if (rule === 0) return point(c.real / 3, c.imaginary / 3);
  if (rule === 3) return point(Math.PI / 2, 0);
  if (rule === 2) {
    const size = Math.hypot(c.real, c.imaginary) ** 0.25;
    const angle = Math.atan2(c.imaginary, c.real) / 4;
    return point(size * Math.cos(angle), size * Math.sin(angle));
  }
  return point(0, 0);
}

/** One jump of the rule, or null if it can't go on. */
export function familyJump(rule: number, c: ComplexPoint, x: number, y: number) {
  const a = c.real;
  const b = c.imaginary;
  if (rule === 0) {
    const [sx, sy] = times(x, y, x, y);
    const [vx, vy] = times(sx - 1, sy, x - a, y - b);
    const [ax, ay] = times(a, b, x, y);
    const slopeX = 3 * sx - 2 * ax - 1;
    const slopeY = 3 * sy - 2 * ay;
    if (slopeX * slopeX + slopeY * slopeY < 1e-30) return null;
    const [dx, dy] = over(vx, vy, slopeX, slopeY);
    return [x - dx, y - dy] as const;
  }
  if (rule === 1) {
    const [sx, sy] = times(x, y, x, y);
    return [sx + a, sy + b] as const;
  }
  if (rule === 3) {
    const [ux, uy] = times(a, b, Math.sin(x) * Math.cosh(y), Math.cos(x) * Math.sinh(y));
    return [ux, uy] as const;
  }
  const [sx, sy] = times(x, y, x, y);
  if (sx * sx + sy * sy < 1e-30) return null;
  const [dx, dy] = over(a, b, sx, sy);
  return [sx + dx, sy + dy] as const;
}

export type StartOutcome =
  | { kind: "root"; root: 0 | 1 | 2 }
  | { kind: "escape" }
  | { kind: "repeat"; length: number }
  | { kind: "unknown" };

const SETTLE_JUMPS = 4000;
const LONGEST_REPEAT = 128;

/** What the route from the place of zero slope does. */
export function startOutcome(rule: number, c: ComplexPoint): StartOutcome {
  let { real: x, imaginary: y } = familyStart(rule, c);
  for (let jumps = 0; jumps < SETTLE_JUMPS; jumps++) {
    if (rule === 0) {
      if (Math.hypot(x + 1, y) < 1e-3) return { kind: "root", root: 0 };
      if (Math.hypot(x - 1, y) < 1e-3) return { kind: "root", root: 1 };
      if (Math.hypot(x - c.real, y - c.imaginary) < 1e-3) return { kind: "root", root: 2 };
    } else if (rule === 3 ? Math.abs(y) > 40 : Math.hypot(x, y) > 1000) {
      return { kind: "escape" };
    }
    const next = familyJump(rule, c, x, y);
    if (!next) return rule === 2 ? { kind: "escape" } : { kind: "unknown" };
    [x, y] = next;
  }
  const fromX = x;
  const fromY = y;
  for (let length = 1; length <= LONGEST_REPEAT; length++) {
    const next = familyJump(rule, c, x, y);
    if (!next) return { kind: "unknown" };
    [x, y] = next;
    if (Math.hypot(x - fromX, y - fromY) < 1e-7) return { kind: "repeat", length };
  }
  return { kind: "unknown" };
}

export type PlaneView = { center: ComplexPoint; half: number };

/** Zooming keeps the point under `at`, a place in the view, where it is. */
export function zoomViewAbout(view: PlaneView, at: ComplexPoint, factor: number, widest: number) {
  const half = Math.min(widest, Math.max(MOST_ZOOMED_HALF, view.half * factor));
  const kept = half / view.half;
  return {
    half,
    center: point(
      at.real + (view.center.real - at.real) * kept,
      at.imaginary + (view.center.imaginary - at.imaginary) * kept,
    ),
  };
}

/** A view along a flight, with t from 0 to 1. The zoom is steady and the target drifts into place. */
export function flightView(from: PlaneView, to: PlaneView, t: number): PlaneView {
  const half = from.half * (to.half / from.half) ** t;
  const share = from.half === to.half ? t : (from.half - half) / (from.half - to.half);
  return {
    half,
    center: point(
      from.center.real + (to.center.real - from.center.real) * share,
      from.center.imaginary + (to.center.imaginary - from.center.imaginary) * share,
    ),
  };
}
