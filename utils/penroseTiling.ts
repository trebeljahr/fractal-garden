export type PenroseVariant = "p2" | "p3";
export type PenroseStart = "sun" | "star";

type Point = [number, number];

// A Robinson half-tile. Type 0 is the acute golden triangle (half kite in P2,
// half thin rhombus in P3); type 1 is the obtuse golden gnomon (half dart in
// P2, half thick rhombus in P3). A is always the apex of the isosceles triangle.
export type RobinsonTriangle = {
  type: 0 | 1;
  a: Point;
  b: Point;
  c: Point;
};

export const PHI = (1 + Math.sqrt(5)) / 2;
const INV_PHI = 1 / PHI;
export const MAX_ITERATIONS = 8;
// Each start patch reappears at its own center after four deflations of a copy
// scaled up by PHI^4 (the P3 sun from its first deflation on). Growing the seed
// in steps of PHI^4 therefore extends one and the same infinite tiling.
const SEED_PERIOD = 4;

function lerp(p: Point, q: Point, t: number): Point {
  return [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];
}

function polar(radius: number, angle: number): Point {
  return [radius * Math.cos(angle), radius * Math.sin(angle)];
}

function tri(type: 0 | 1, a: Point, b: Point, c: Point): RobinsonTriangle {
  return { type, a, b, c };
}

// P2 halves are glued along the leg AB (the symmetry axis of kite and dart).
function deflateP2({ type, a, b, c }: RobinsonTriangle): RobinsonTriangle[] {
  if (type === 0) {
    const d = lerp(a, b, INV_PHI);
    const e = lerp(c, a, INV_PHI);
    return [tri(0, c, d, b), tri(0, c, d, e), tri(1, e, a, d)];
  }

  const d = lerp(b, c, INV_PHI);
  return [tri(0, b, a, d), tri(1, d, c, a)];
}

// P3 halves are glued along the base BC (a diagonal of the rhombus).
function deflateP3({ type, a, b, c }: RobinsonTriangle): RobinsonTriangle[] {
  if (type === 0) {
    const p = lerp(a, b, INV_PHI);
    return [tri(0, c, p, b), tri(1, p, c, a)];
  }

  const q = lerp(b, a, INV_PHI);
  const r = lerp(b, c, INV_PHI);
  return [tri(1, r, c, a), tri(1, q, r, b), tri(0, r, q, a)];
}

function wheel(make: (inner: number, outer: number) => RobinsonTriangle) {
  const triangles: RobinsonTriangle[] = [];

  for (let i = 0; i < 10; i++) {
    const first = ((2 * i - 1) * Math.PI) / 10 - Math.PI / 2;
    const second = ((2 * i + 1) * Math.PI) / 10 - Math.PI / 2;
    // Mirror every other triangle so neighbours share an edge.
    triangles.push(i % 2 === 0 ? make(first, second) : make(second, first));
  }

  return triangles;
}

export function getStartTriangles(variant: PenroseVariant, start: PenroseStart) {
  const center: Point = [0, 0];

  if (start === "sun") {
    // Ten acute halves with their 36° apex in the middle: five kites in P2,
    // a decagon of half thin rhombi in P3.
    return wheel((u, v) => tri(0, center, polar(1, u), polar(1, v)));
  }

  if (variant === "p2") {
    // Five darts meeting at their tips.
    return wheel((u, v) => tri(1, polar(INV_PHI, u), center, polar(1, v)));
  }

  // Five thick rhombi meeting at their acute corners.
  return wheel((u, v) => tri(1, polar(INV_PHI, v), center, polar(1, u)));
}

// The start patch as drawn on top of the deflated tiles: its outer boundary,
// ordered around the center, and every edge of its tiles. Deflation keeps
// each child inside its parent, so the finer tiles always fill this frame.
export function getStartOutline(variant: PenroseVariant, start: PenroseStart) {
  const triangles = getStartTriangles(variant, start);
  const edges = triangles.flatMap(({ a, b, c }) => [
    { edge: [a, b], glue: variant === "p2" },
    { edge: [b, c], glue: variant === "p3" },
    { edge: [c, a], glue: false },
  ]);
  const key = ([p, q]: Point[]) => [pointKey(p), pointKey(q)].sort().join("|");
  const counts = new Map<string, number>();
  for (const { edge } of edges) counts.set(key(edge), (counts.get(key(edge)) ?? 0) + 1);

  const seen = new Set<string>();
  const tileEdges: Point[][] = [];
  const boundary = new Map<string, Point>();
  for (const { edge, glue } of edges) {
    const outer = counts.get(key(edge)) === 1;
    if (outer) for (const p of edge) boundary.set(pointKey(p), p);
    // Inner seams where two halves meet are not tile edges.
    if ((outer || !glue) && !seen.has(key(edge))) {
      seen.add(key(edge));
      tileEdges.push(edge);
    }
  }

  // Every start patch is star-shaped around the origin.
  const outline = Array.from(boundary.values()).sort(
    (p, q) => Math.atan2(p[1], p[0]) - Math.atan2(q[1], q[0]),
  );
  return { outline, edges: tileEdges };
}

export type Bounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

function distanceToSegment([px, py]: Point, [ax, ay]: Point, [bx, by]: Point) {
  const dx = bx - ax;
  const dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - ax - t * dx, py - ay - t * dy);
}

// Radius of the largest disc around the origin that the patch covers.
function coveredRadius(triangles: RobinsonTriangle[]) {
  const edges = triangles.flatMap(({ a, b, c }) => [
    [a, b],
    [b, c],
    [c, a],
  ]);
  const key = ([p, q]: Point[]) => [pointKey(p), pointKey(q)].sort().join("|");
  const counts = new Map<string, number>();
  for (const edge of edges) counts.set(key(edge), (counts.get(key(edge)) ?? 0) + 1);

  let radius = Number.POSITIVE_INFINITY;
  for (const edge of edges) {
    if (counts.get(key(edge)) === 1) {
      radius = Math.min(radius, distanceToSegment([0, 0], edge[0], edge[1]));
    }
  }
  return radius;
}

function pointKey([x, y]: Point) {
  return `${Math.round(x * 1e7)},${Math.round(y * 1e7)}`;
}

function touches({ a, b, c }: RobinsonTriangle, bounds: Bounds) {
  return (
    Math.max(a[0], b[0], c[0]) >= bounds.minX &&
    Math.min(a[0], b[0], c[0]) <= bounds.maxX &&
    Math.max(a[1], b[1], c[1]) >= bounds.minY &&
    Math.min(a[1], b[1], c[1]) <= bounds.maxY
  );
}

// The part of the infinite tiling inside `bounds` whose tile edges are
// PHI^-level long. Level 0 tiles match the start patch, so negative levels give
// the inflated supertiles seen when zooming far out.
export function getVisibleTriangles(
  variant: PenroseVariant,
  start: PenroseStart,
  level: number,
  bounds: Bounds,
) {
  const seed = getStartTriangles(variant, start);
  const reach = Math.max(
    ...[bounds.minX, bounds.maxX].flatMap((x) =>
      [bounds.minY, bounds.maxY].map((y) => Math.hypot(x, y)),
    ),
  );
  const radius = coveredRadius(seed);

  let growth = SEED_PERIOD;
  while (growth + level < 1 || radius * PHI ** growth < reach) growth += SEED_PERIOD;

  const factor = PHI ** growth;
  const grow = ([x, y]: Point): Point => [x * factor, y * factor];
  let triangles = seed
    .map(({ type, a, b, c }) => tri(type, grow(a), grow(b), grow(c)))
    .filter((triangle) => touches(triangle, bounds));

  const split = variant === "p2" ? deflateP2 : deflateP3;
  for (let i = 0; i < growth + level; i++) {
    const next: RobinsonTriangle[] = [];
    for (const triangle of triangles) {
      for (const child of split(triangle)) {
        if (touches(child, bounds)) next.push(child);
      }
    }
    triangles = next;
  }

  return triangles;
}
