/**
 * A circle as three numbers: its curvature, and its curvature times each center coordinate. The
 * gap rule is linear in all three, so a start of whole numbers stays exact.
 */
export type Disc = { curvature: number; weightedX: number; weightedY: number };

export type Gap = {
  /** The three touching circles around the gap. */
  around: [number, number, number];
  /** The circle on the far side of those three, which also touches all of them. */
  known: number;
  filled: number | null;
  /** The largest circle that fits in the gap. */
  next: Disc;
  /** A circle through the three touching points, signed to be positive on this gap's side. */
  side: [number, number, number, number];
};

export type Packing = {
  circles: Disc[];
  gaps: Gap[];
  /** For each circle, the gap whose rule gives that circle. */
  gapOf: number[];
};

/** A place in the picture: a gap with nothing in it yet, or a circle and the gap it belongs to. */
export type Spot = { gap: number; circle: number | null };

export type Start = "whole" | "equal";

// A smaller circle would be under a pixel wide, and its gap can't be seen or picked.
export const LARGEST_CURVATURE = 1000;

const INNER_EQUAL = 1 / (2 * Math.sqrt(3) - 3);
// The same three equal circles the explorer draws, with one at the top.
const equalCircle = (index: number): Disc => {
  const angle = Math.PI / 2 + (2 * Math.PI * index) / 3;
  return {
    curvature: INNER_EQUAL,
    weightedX: (INNER_EQUAL - 1) * Math.cos(angle),
    weightedY: (INNER_EQUAL - 1) * Math.sin(angle),
  };
};

const OUTER: Disc = { curvature: -1, weightedX: 0, weightedY: 0 };
const STARTS: Record<Start, Disc[]> = {
  whole: [
    OUTER,
    { curvature: 2, weightedX: 1, weightedY: 0 },
    { curvature: 2, weightedX: -1, weightedY: 0 },
    { curvature: 3, weightedX: 0, weightedY: 2 },
  ],
  equal: [OUTER, equalCircle(0), equalCircle(1), equalCircle(2)],
};

export const centerOf = ({ curvature, weightedX, weightedY }: Disc) => ({
  x: weightedX / curvature,
  y: weightedY / curvature,
});
export const radiusOf = ({ curvature }: Disc) => 1 / Math.abs(curvature);

/** The point where two touching circles meet. */
export function touchPoint(a: Disc, b: Disc) {
  const total = a.curvature + b.curvature;
  return { x: (a.weightedX + b.weightedX) / total, y: (a.weightedY + b.weightedY) / total };
}

/** Add the three, double the result and subtract the known one. */
export function otherCircle(known: Disc, a: Disc, b: Disc, c: Disc): Disc {
  const rule = (value: (disc: Disc) => number) =>
    2 * (value(a) + value(b) + value(c)) - value(known);
  return {
    curvature: rule((disc) => disc.curvature),
    weightedX: rule((disc) => disc.weightedX),
    weightedY: rule((disc) => disc.weightedY),
  };
}

// Outside three touching circles there are two curved triangles, one on each side of the circle
// through the three touching points. That circle can be a straight line, as it is for -1, 2, 2.
function sideOf(a: Disc, b: Disc, c: Disc, next: Disc): Gap["side"] {
  const { x: x1, y: y1 } = touchPoint(a, b);
  const { x: x2, y: y2 } = touchPoint(b, c);
  const { x: x3, y: y3 } = touchPoint(c, a);
  const s1 = x1 * x1 + y1 * y1;
  const s2 = x2 * x2 + y2 * y2;
  const s3 = x3 * x3 + y3 * y3;
  const side: Gap["side"] = [
    x1 * (y2 - y3) - y1 * (x2 - x3) + x2 * y3 - x3 * y2,
    s1 * (y3 - y2) + s2 * (y1 - y3) + s3 * (y2 - y1),
    s1 * (x2 - x3) + s2 * (x3 - x1) + s3 * (x1 - x2),
    s1 * (x3 * y2 - x2 * y3) + s2 * (x1 * y3 - x3 * y1) + s3 * (x2 * y1 - x1 * y2),
  ];
  const { x, y } = centerOf(next);
  return sideValue(side, x, y) < 0 ? (side.map((value) => -value) as Gap["side"]) : side;
}

const sideValue = ([a, b, c, d]: Gap["side"], x: number, y: number) =>
  a * (x * x + y * y) + b * x + c * y + d;

function addGap({ circles, gaps }: Packing, around: Gap["around"], known: number) {
  const [a, b, c] = around.map((index) => circles[index]);
  const next = otherCircle(circles[known], a, b, c);
  if (next.curvature > LARGEST_CURVATURE) return;
  gaps.push({ around, known, filled: null, next, side: sideOf(a, b, c, next) });
}

// Changes the packing it is given. Callers pass a copy.
function addCircle(packing: Packing, index: number) {
  const gap = packing.gaps[index];
  const added = packing.circles.length;
  packing.circles.push(gap.next);
  packing.gapOf.push(index);
  packing.gaps[index] = { ...gap, filled: added };
  const [a, b, c] = gap.around;
  addGap(packing, [added, b, c], a);
  addGap(packing, [a, added, c], b);
  addGap(packing, [a, b, added], c);
}

const copy = ({ circles, gaps, gapOf }: Packing): Packing => ({
  circles: [...circles],
  gaps: [...gaps],
  gapOf: [...gapOf],
});

export function startPacking(start: Start): Packing {
  const packing: Packing = { circles: [...STARTS[start]], gaps: [], gapOf: [0, 1, 2, 3] };
  for (let index = 0; index < 4; index++) {
    const [a, b, c] = [0, 1, 2, 3].filter((other) => other !== index);
    addGap(packing, [a, b, c], index);
  }
  return packing;
}

/** Open gaps, largest circle first. */
export function openGaps({ gaps }: Packing) {
  const open: number[] = [];
  gaps.forEach(({ filled }, index) => {
    if (filled === null) open.push(index);
  });
  return open.sort((a, b) => gaps[a].next.curvature - gaps[b].next.curvature || a - b);
}

export function fillGap(packing: Packing, index: number) {
  const next = copy(packing);
  addCircle(next, index);
  return next;
}

export function fillEveryGap(packing: Packing) {
  const next = copy(packing);
  for (const index of openGaps(packing)) addCircle(next, index);
  return next;
}

/** What sits at a point: a circle, an open gap, or nothing for a gap too small to fill. */
export function locate({ circles, gaps, gapOf }: Packing, x: number, y: number): Spot | null {
  // The outer circle's own side is everything beyond its edge.
  if (x * x + y * y > 1) return { gap: gapOf[0], circle: 0 };
  for (let index = 1; index < circles.length; index++) {
    const disc = circles[index];
    const center = centerOf(disc);
    if (Math.hypot(x - center.x, y - center.y) <= radiusOf(disc))
      return { gap: gapOf[index], circle: index };
  }
  // Now the point is outside every circle, so the side alone decides which gap holds it.
  for (let index = 0; index < gaps.length; index++) {
    const gap = gaps[index];
    if (gap.filled === null && sideValue(gap.side, x, y) > 0) return { gap: index, circle: null };
  }
  return null;
}

/** The two circles that touch the same three, with the pointed-at one as the rule's result. */
export function readSpot({ circles, gaps }: Packing, spot: Spot) {
  const gap = gaps[spot.gap];
  const fill = gap.filled === null ? gap.next : circles[gap.filled];
  const known = circles[gap.known];
  const pointedAtKnown = spot.circle === gap.known;
  return {
    around: gap.around.map((index) => circles[index]).sort((a, b) => a.curvature - b.curvature) as [
      Disc,
      Disc,
      Disc,
    ],
    result: pointedAtKnown ? known : fill,
    other: pointedAtKnown ? fill : known,
    ghost: gap.filled === null ? gap.next : null,
  };
}

/** The edge of a gap, as points along the three arcs between its touching points. */
export function gapOutline({ circles, gaps }: Packing, index: number, pointsPerArc = 48) {
  const { around, next } = gaps[index];
  const [a, b, c] = around.map((circle) => circles[circle]);
  const turn = (angle: number) => ((angle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  const points: { x: number; y: number }[] = [];
  for (const [disc, from, to] of [
    [b, a, c],
    [c, b, a],
    [a, c, b],
  ]) {
    const center = centerOf(disc);
    const angleTo = ({ x, y }: { x: number; y: number }) => Math.atan2(y - center.y, x - center.x);
    const start = angleTo(touchPoint(disc, from));
    const counterclockwise = turn(angleTo(touchPoint(disc, to)) - start);
    // The new circle touches this one on the arc that borders the gap.
    const sweep =
      turn(angleTo(touchPoint(disc, next)) - start) < counterclockwise
        ? counterclockwise
        : counterclockwise - 2 * Math.PI;
    const radius = radiusOf(disc);
    for (let step = 0; step < pointsPerArc; step++) {
      const angle = start + (sweep * step) / pointsPerArc;
      points.push({
        x: center.x + radius * Math.cos(angle),
        y: center.y + radius * Math.sin(angle),
      });
    }
  }
  return points;
}

/** A curvature as the picture writes it, with a real minus sign. */
export function formatCurvature(curvature: number) {
  const text = Number.isInteger(curvature) ? String(curvature) : curvature.toFixed(2);
  return text.replace("-", "−");
}

export function formatRadius(disc: Disc) {
  const curvature = Math.abs(disc.curvature);
  if (!Number.isInteger(curvature)) return radiusOf(disc).toFixed(3);
  return curvature === 1 ? "1" : `1/${curvature}`;
}

// A negative number being subtracted needs brackets.
export const subtracted = (curvature: number) =>
  curvature < 0 ? `(${formatCurvature(curvature)})` : formatCurvature(curvature);
