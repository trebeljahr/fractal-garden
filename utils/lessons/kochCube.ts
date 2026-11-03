import { type Orientation, viewRotation } from "../orientation";

type Vec3 = [number, number, number];

export const KOCH_CUBE_ROUNDS = 5;

/** The tetrahedron takes 1/3 of the cube, and every round removes a quarter of the empty part. */
export const kochCubeEmpty = (round: number) => (2 / 3) * 0.75 ** round;
/** Each triangle becomes six with a quarter of its area. The start has 1/√3 of the cube's area. */
export const kochSurfaceOverCube = (round: number) => 1.5 ** round / Math.sqrt(3);

const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const minus = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];

export type CubeFrame = { center: Vec3; axes: [Vec3, Vec3, Vec3]; half: number };

/** A regular tetrahedron's corners are four corners of a cube, with the same center. */
export function cubeAroundTetrahedron(vertices: Vec3[]): CubeFrame {
  const center = [0, 1, 2].map(
    (axis) => vertices.reduce((sum, vertex) => sum + vertex[axis], 0) / vertices.length,
  ) as Vec3;
  const [first, ...others] = vertices.map((vertex) => minus(vertex, center));
  // Two corners of the tetrahedron share one face of the cube, so their sum points at its center.
  const [x, y, z] = others.map(([a, b, c]): Vec3 => [a + first[0], b + first[1], c + first[2]]);
  const half = Math.sqrt(dot(x, x)) / 2;
  const unit = ([a, b, c]: Vec3): Vec3 => [a / (2 * half), b / (2 * half), c / (2 * half)];
  const handed = dot(cross(x, y), z) > 0 ? 1 : -1;
  return {
    center,
    axes: [unit(x), unit(y), unit([handed * z[0], handed * z[1], handed * z[2]])],
    half,
  };
}

/** Rotation that faces the cube square-on, then turns and tilts it, in degrees. */
export function cubeOrientation({ axes }: CubeFrame, tilt: number, turn: number): Orientation {
  const view = viewRotation(tilt, turn);
  const rows: Vec3[] = [
    [view[0], view[1], view[2]],
    [view[3], view[4], view[5]],
    [view[6], view[7], view[8]],
  ];
  const columns = [0, 1, 2].map((index): Vec3 => [axes[0][index], axes[1][index], axes[2][index]]);
  return rows.flatMap((row) => columns.map((column) => dot(row, column)));
}

/** Which of a mesh's faces points most towards the viewer. */
export function frontFace(
  { vertices, faces }: { vertices: Vec3[]; faces: number[][] },
  orientation: Orientation,
) {
  const towardViewer = (point: Vec3) =>
    orientation[6] * point[0] + orientation[7] * point[1] + orientation[8] * point[2];
  const nearness = faces.map((corners) =>
    corners.reduce((sum, corner) => sum + towardViewer(vertices[corner]), 0),
  );
  return nearness.indexOf(Math.max(...nearness));
}

export type CubeEdge = { from: Vec3; to: Vec3; hidden: boolean };

/**
 * The cube's twelve edges around its own center. An edge is hidden when both faces beside it point
 * away from a camera on the view's z axis, so the solid inside can cover it.
 */
export function cubeEdges(
  { axes, half }: CubeFrame,
  orientation: Orientation,
  cameraDistance: number,
): CubeEdge[] {
  const towardCamera = axes.map(
    ([x, y, z]) => orientation[6] * x + orientation[7] * y + orientation[8] * z,
  );
  const faceShows = (axis: number, sign: number) =>
    sign * towardCamera[axis] * cameraDistance > half;
  const corner = (signs: number[]): Vec3 =>
    [0, 1, 2].map(
      (index) =>
        half * (signs[0] * axes[0][index] + signs[1] * axes[1][index] + signs[2] * axes[2][index]),
    ) as Vec3;
  const edges: CubeEdge[] = [];
  for (let along = 0; along < 3; along++)
    for (const a of [-1, 1])
      for (const b of [-1, 1]) {
        const [first, second] = [0, 1, 2].filter((axis) => axis !== along);
        const signs = [0, 0, 0];
        signs[first] = a;
        signs[second] = b;
        signs[along] = -1;
        const from = corner(signs);
        signs[along] = 1;
        edges.push({
          from,
          to: corner(signs),
          hidden: !faceShows(first, a) && !faceShows(second, b),
        });
      }
  return edges;
}
