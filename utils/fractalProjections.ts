import { type Cube, generateMengerSponge, generateVicsekFractal3D } from "./voxelFractals";

export type Point3 = [number, number, number];
export type Point2 = [number, number];
export type ProjectionKind = "menger" | "vicsek" | "tetrahedron";
export const TETRA_VERTICES: Point3[] = [
  [1, 1, 1],
  [1, -1, -1],
  [-1, 1, -1],
  [-1, -1, 1],
];

export function tetrahedra(depth: number): Point3[][] {
  let cells = [TETRA_VERTICES];
  for (let n = 0; n < depth; n++)
    cells = cells.flatMap((cell) =>
      cell.map((anchor) => cell.map((p) => p.map((v, i) => (v + anchor[i]) / 2) as Point3)),
    );
  return cells;
}

export function tetrahedronProjection(point: Point3, triangular: boolean): Point2 {
  return triangular ? [point[0], (point[1] - point[2]) / Math.sqrt(2)] : [point[0], point[1]];
}

export function tetrahedronPieces(depth: number, triangular: boolean) {
  const perCorner = 4 ** Math.max(0, depth - 1);
  return tetrahedra(depth).map((vertices, index) => ({
    vertices,
    corner: depth === 0 ? 0 : Math.floor(index / perCorner),
    shadow: hull(vertices.map((point) => tetrahedronProjection(point, triangular))),
  }));
}

export function hull(points: Point2[]): Point2[] {
  const sorted = Array.from(
    new Map(points.map((p) => [p.map((v) => v.toFixed(10)).join(","), p])).values(),
  ).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (sorted.length < 3) return [];
  const cross = (a: Point2, b: Point2, c: Point2) =>
    (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  const chain = (list: Point2[]) => {
    const out: Point2[] = [];
    for (const p of list) {
      while (out.length > 1 && cross(out[out.length - 2], out[out.length - 1], p) <= 1e-12)
        out.pop();
      out.push(p);
    }
    return out.slice(0, -1);
  };
  return [...chain(sorted), ...chain([...sorted].reverse())];
}

export function cubeCorners(cube: Cube): Point3[] {
  return Array.from({ length: 8 }, (_, i) => [
    cube.x + ((i & 1 ? 1 : -1) * cube.size) / 2,
    cube.y + ((i & 2 ? 1 : -1) * cube.size) / 2,
    cube.z + ((i & 4 ? 1 : -1) * cube.size) / 2,
  ]);
}
export const diagonalPlane = (p: Point3): Point2 => [
  (p[0] - p[1]) / Math.sqrt(2),
  (p[0] + p[1] - 2 * p[2]) / Math.sqrt(6),
];

// Intersect the cube's twelve edges with x+y+z=offset, then order the cut polygon.
export function sliceCube(cube: Cube, offset: number): Point2[] {
  const corners = cubeCorners(cube),
    cut: Point3[] = [];
  for (let i = 0; i < 8; i++)
    for (const bit of [1, 2, 4]) {
      const j = i ^ bit;
      if (j < i) continue;
      const a = corners[i],
        b = corners[j];
      const da = a[0] + a[1] + a[2] - offset,
        db = b[0] + b[1] + b[2] - offset;
      if (Math.abs(da) < 1e-10) cut.push(a);
      if (Math.abs(db) < 1e-10) cut.push(b);
      if (da * db < 0) cut.push(a.map((v, k) => v + ((b[k] - v) * da) / (da - db)) as Point3);
    }
  return hull(cut.map(diagonalPlane));
}

export function projectionPolygons(
  kind: ProjectionKind,
  depth: number,
  alternate: boolean,
  offset = 0,
): Point2[][] {
  const cells =
    kind === "tetrahedron"
      ? tetrahedra(depth)
      : kind === "menger"
        ? generateMengerSponge(depth)
        : generateVicsekFractal3D(depth);
  const polygons =
    kind === "tetrahedron"
      ? (cells as Point3[][]).map((cell) =>
          hull(cell.map((p) => tetrahedronProjection(p, alternate))),
        )
      : (cells as Cube[]).map((cube) =>
          alternate ? sliceCube(cube, offset) : hull(cubeCorners(cube).map((p) => [p[0], p[1]])),
        );
  return Array.from(
    new Map(
      polygons
        .filter((p) => p.length > 2)
        .map((p) => [p.map((v) => v.map((n) => n.toFixed(8)).join(",")).join(" "), p]),
    ).values(),
  );
}
