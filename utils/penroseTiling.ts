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

export type PenroseTile = {
  type: 0 | 1;
  points: Point[];
  // Half-tiles on the edge of the patch have no partner. Their missing mirror
  // edge is not a real tile edge, so it must not be outlined.
  complete: boolean;
};

export const PHI = (1 + Math.sqrt(5)) / 2;
const INV_PHI = 1 / PHI;
export const MAX_TRIANGLES = 150000;

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

export function deflate(triangles: RobinsonTriangle[], variant: PenroseVariant) {
  return triangles.flatMap(variant === "p2" ? deflateP2 : deflateP3);
}

export function getMaxIterations(variant: PenroseVariant, start: PenroseStart) {
  let counts = [0, 0];
  for (const t of getStartTriangles(variant, start)) counts[t.type] += 1;

  let iterations = 0;
  while (iterations < 12) {
    const next =
      variant === "p2"
        ? [2 * counts[0] + counts[1], counts[0] + counts[1]]
        : [counts[0] + counts[1], counts[0] + 2 * counts[1]];
    if (next[0] + next[1] > MAX_TRIANGLES) break;
    counts = next;
    iterations += 1;
  }

  return iterations;
}

function pointKey([x, y]: Point) {
  return `${Math.round(x * 1e7)},${Math.round(y * 1e7)}`;
}

// Glue mirrored Robinson halves back into whole kites, darts and rhombi.
export function mergeTiles(triangles: RobinsonTriangle[], variant: PenroseVariant) {
  const halves = new Map<string, { join: [Point, Point]; other: Point; type: 0 | 1 }[]>();

  for (const { type, a, b, c } of triangles) {
    const join: [Point, Point] = variant === "p2" ? [a, b] : [b, c];
    const other = variant === "p2" ? c : a;
    const keys = [pointKey(join[0]), pointKey(join[1])].sort();
    const key = `${type}|${keys[0]}|${keys[1]}`;
    const list = halves.get(key);
    if (list) list.push({ join, other, type });
    else halves.set(key, [{ join, other, type }]);
  }

  const tiles: PenroseTile[] = [];

  for (const list of Array.from(halves.values())) {
    const [first, second] = list;
    if (second) {
      tiles.push({
        type: first.type,
        points: [first.join[0], first.other, first.join[1], second.other],
        complete: true,
      });
      continue;
    }

    tiles.push({
      type: first.type,
      points: [first.join[0], first.other, first.join[1]],
      complete: false,
    });
  }

  return tiles;
}
