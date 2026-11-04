import type { ComplexPoint } from "../orbitLesson";

const point = (real: number, imaginary: number): ComplexPoint => ({ real, imaginary });

export type FamilyPlace = {
  /** A value of the free number inside this copy. */
  at: ComplexPoint;
  /** Half the width of a view that holds the whole copy. */
  half: number;
  /** How much of the copy lies on the Mandelbrot set at the best turn and scale, measured. */
  overlap: number;
};

export type FamilyRule = {
  /** The rule's number in family-explorer.frag, and its place in this list. */
  shader: number;
  name: string;
  /** The whole rule, written out. */
  formula: string;
  /** The same rule, short enough for a small picture's caption. */
  caption: string;
  /** The letter for the free number. */
  symbol: "c" | "t";
  /** What the free number is called in the demo. */
  free: string;
  /** The headings of the two pictures. */
  allTitle: string;
  oneTitle: string;
  /** What a point on the right picture is called. */
  start: string;
  whole: { center: ComplexPoint; half: number };
  startsHalf: number;
  /** Half the width of the right picture while looking at a copy. */
  startsCloseHalf: number;
  places: FamilyPlace[];
};

const titles = {
  symbol: "c" as const,
  free: "value of c",
  allTitle: "All values of c · pick one",
  oneTitle: "That c · every starting point",
  start: "starting point",
};

// Found by scanning for black regions. tests/holomorphic-families.test.mjs checks each one and
// tests/copy-overlap.test.mjs checks each overlap.
export const FAMILY_RULES: FamilyRule[] = [
  {
    shader: 0,
    name: "Newton's method",
    formula: "z → z − p(z)/p′(z), where p(z) = (z² − 1)(z − t)",
    caption: "Newton on (z² − 1)(z − t)",
    symbol: "t",
    free: "third root t",
    allTitle: "All polynomials · pick the third root t",
    oneTitle: "That polynomial · every first guess",
    start: "first guess",
    whole: { center: point(0, 0), half: 3.4 },
    startsHalf: 3.4,
    startsCloseHalf: 0.3,
    places: [
      { at: point(0.81285, 0.84417), half: 0.04, overlap: 0.81 },
      { at: point(0.00793, 2.94476), half: 0.06, overlap: 0.85 },
      { at: point(0.0027, 2.39893), half: 0.018, overlap: 0.88 },
      { at: point(0.407705, 1.420702), half: 0.012, overlap: 0.88 },
      { at: point(0.27818, 1.53773), half: 0.006, overlap: 0.92 },
    ],
  },
  {
    shader: 1,
    name: "z² + c",
    formula: "z → z² + c",
    caption: "z² + c",
    ...titles,
    whole: { center: point(-0.6, 0), half: 1.6 },
    startsHalf: 1.8,
    startsCloseHalf: 1.8,
    places: [
      { at: point(-1.763288, 0), half: 0.04, overlap: 0.9 },
      { at: point(-0.158493, 1.033052), half: 0.014, overlap: 0.89 },
      { at: point(0.358653, 0.643949), half: 0.009, overlap: 0.87 },
    ],
  },
  {
    shader: 2,
    name: "z² + c/z²",
    formula: "z → z² + c/z²",
    caption: "z² + c/z²",
    ...titles,
    whole: { center: point(0, 0), half: 0.8 },
    startsHalf: 2,
    startsCloseHalf: 2,
    places: [
      { at: point(-0.053141, 0.100061), half: 0.0045, overlap: 0.95 },
      { at: point(0.136713, 0.128884), half: 0.0042, overlap: 0.94 },
    ],
  },
  {
    shader: 5,
    name: "z² + c/z",
    formula: "z → z² + c/z",
    caption: "z² + c/z",
    ...titles,
    whole: { center: point(0, 0), half: 1.2 },
    startsHalf: 2,
    startsCloseHalf: 2,
    places: [
      { at: point(-0.102796, 0.222326), half: 0.009, overlap: 0.94 },
      { at: point(-0.482095, 0.074116), half: 0.012, overlap: 0.92 },
    ],
  },
  {
    shader: 3,
    name: "c · sin z",
    formula: "z → c · sin z",
    caption: "c · sin z",
    ...titles,
    whole: { center: point(0, 0), half: 3.4 },
    startsHalf: 4,
    startsCloseHalf: 4,
    places: [
      { at: point(2.249858, 1.709596), half: 0.015, overlap: 0.96 },
      { at: point(2.771143, 0.489838), half: 0.009, overlap: 0.94 },
      { at: point(0, 1.73538), half: 0.06, overlap: 0.91 },
    ],
  },
  {
    shader: 4,
    name: "c · cos z",
    formula: "z → c · cos z",
    caption: "c · cos z",
    ...titles,
    whole: { center: point(0, 0), half: 3.4 },
    startsHalf: 4,
    startsCloseHalf: 4,
    places: [
      { at: point(1.098507, 2.08981), half: 0.012, overlap: 0.96 },
      { at: point(1.039301, 1.611785), half: 0.014, overlap: 0.94 },
      { at: point(1.867547, 0.391744), half: 0.014, overlap: 0.91 },
    ],
  },
  {
    shader: 6,
    name: "Magnet",
    formula: "z → ((z² + c − 1) / (2z + c − 2))²",
    caption: "Magnet rule",
    ...titles,
    whole: { center: point(1, 0), half: 3 },
    startsHalf: 3,
    startsCloseHalf: 3,
    places: [
      { at: point(2.17658, 1.30096), half: 0.026, overlap: 0.96 },
      { at: point(1.584018, 0.13952), half: 0.01, overlap: 0.93 },
    ],
  },
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
export function familyStart(shader: number, c: ComplexPoint): ComplexPoint {
  if (shader === 0) return point(c.real / 3, c.imaginary / 3);
  if (shader === 2) {
    const size = Math.hypot(c.real, c.imaginary) ** 0.25;
    const angle = Math.atan2(c.imaginary, c.real) / 4;
    return point(size * Math.cos(angle), size * Math.sin(angle));
  }
  if (shader === 3) return point(Math.PI / 2, 0);
  if (shader === 6) {
    const size = Math.hypot(1 - c.real, c.imaginary) ** 0.5;
    const angle = Math.atan2(-c.imaginary, 1 - c.real) / 2;
    return point(size * Math.cos(angle), size * Math.sin(angle));
  }
  if (shader === 5) {
    const size = (Math.hypot(c.real, c.imaginary) / 2) ** (1 / 3);
    const angle = Math.atan2(c.imaginary, c.real) / 3;
    return point(size * Math.cos(angle), size * Math.sin(angle));
  }
  return point(0, 0);
}

/** One jump of the rule, or null if it can't go on. */
export function familyJump(shader: number, c: ComplexPoint, x: number, y: number) {
  const a = c.real;
  const b = c.imaginary;
  const [sx, sy] = times(x, y, x, y);
  if (shader === 0) {
    const [vx, vy] = times(sx - 1, sy, x - a, y - b);
    const [ax, ay] = times(a, b, x, y);
    const slopeX = 3 * sx - 2 * ax - 1;
    const slopeY = 3 * sy - 2 * ay;
    if (slopeX * slopeX + slopeY * slopeY < 1e-30) return null;
    const [dx, dy] = over(vx, vy, slopeX, slopeY);
    return [x - dx, y - dy] as const;
  }
  if (shader === 1) return [sx + a, sy + b] as const;
  if (shader === 2) {
    if (sx * sx + sy * sy < 1e-30) return null;
    const [dx, dy] = over(a, b, sx, sy);
    return [sx + dx, sy + dy] as const;
  }
  if (shader === 3) return times(a, b, Math.sin(x) * Math.cosh(y), Math.cos(x) * Math.sinh(y));
  if (shader === 4) return times(a, b, Math.cos(x) * Math.cosh(y), -Math.sin(x) * Math.sinh(y));
  if (shader === 6) {
    const bottomX = 2 * x + a - 2;
    const bottomY = 2 * y + b;
    if (bottomX * bottomX + bottomY * bottomY < 1e-30) return null;
    const [px, py] = over(sx + a - 1, sy + b, bottomX, bottomY);
    return times(px, py, px, py);
  }
  if (x * x + y * y < 1e-30) return null;
  const [dx, dy] = over(a, b, x, y);
  return [sx + dx, sy + dy] as const;
}

const flewOff = (shader: number, x: number, y: number) =>
  shader === 3 || shader === 4 ? Math.abs(y) > 40 : Math.hypot(x, y) > 1000;

/** Whether the route stays for this many jumps without reaching a root or flying off. */
export function routeStays(shader: number, c: ComplexPoint, jumps: number) {
  let { real: x, imaginary: y } = familyStart(shader, c);
  for (let done = 0; done < jumps; done++) {
    if (shader === 0) {
      if (Math.hypot(x + 1, y) < 1e-3 || Math.hypot(x - 1, y) < 1e-3) return false;
      if (Math.hypot(x - c.real, y - c.imaginary) < 1e-3) return false;
    } else if (flewOff(shader, x, y) || (shader === 6 && Math.hypot(x - 1, y) < 1e-3)) return false;
    const next = familyJump(shader, c, x, y);
    if (!next) return false;
    [x, y] = next;
  }
  return true;
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
    } else if (rule === 6 && Math.hypot(x - 1, y) < 1e-3) {
      return { kind: "repeat", length: 1 };
    } else if (flewOff(rule, x, y)) {
      return { kind: "escape" };
    }
    const next = familyJump(rule, c, x, y);
    if (!next) return rule === 0 ? { kind: "unknown" } : { kind: "escape" };
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
