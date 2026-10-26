import {
  cubeCorners,
  diagonalPlane,
  hull,
  type Point2,
  type Point3,
  sliceCube,
} from "../fractalProjections";
import { exposedCubeFaces, generateMengerSponge } from "../voxelFractals";

export function liftSlice([u, v]: Point2, offset: number): Point3 {
  return [
    u / Math.SQRT2 + v / Math.sqrt(6) + offset / 3,
    -u / Math.SQRT2 + v / Math.sqrt(6) + offset / 3,
    (-2 * v) / Math.sqrt(6) + offset / 3,
  ];
}

// Keep the part behind the same plane used by sliceCube. No level-of-detail change.
export function clipAtSlice(points: Point3[], offset: number): Point3[] {
  const result: Point3[] = [];
  for (let i = 0; i < points.length; i++) {
    const a = points[i],
      b = points[(i + 1) % points.length];
    const da = a[0] + a[1] + a[2] - offset;
    const db = b[0] + b[1] + b[2] - offset;
    if (da <= 1e-10) result.push(a);
    if ((da < 0 && db > 0) || (da > 0 && db < 0))
      result.push(a.map((v, k) => v + ((b[k] - v) * da) / (da - db)) as Point3);
  }
  return result;
}

export function mengerSliceGeometry(depth: number, offset: number) {
  const cubes = generateMengerSponge(depth);
  return {
    faces: exposedCubeFaces(cubes)
      .map((face) =>
        clipAtSlice(
          face.corners.map((p) => [p.x, p.y, p.z] as Point3),
          offset,
        ),
      )
      .filter((p) => p.length >= 3),
    sections: cubes.map((cube) => sliceCube(cube, offset)).filter((p) => p.length >= 3),
    boundary: sliceCube(generateMengerSponge(0)[0], offset),
  };
}

export function tunnelCorners(axis: number): Point3[] {
  return cubeCorners(generateMengerSponge(0)[0]).map(
    (p) => p.map((v, i) => (i === axis ? v : v / 3)) as Point3,
  );
}

// The three first-round square tunnels are rectangular boxes through the cube.
export function tunnelSection(axis: number, offset: number): Point2[] {
  const corners = tunnelCorners(axis),
    cuts: Point3[] = [];
  for (let i = 0; i < 8; i++)
    for (const bit of [1, 2, 4]) {
      const j = i ^ bit;
      if (j < i) continue;
      const a = corners[i],
        b = corners[j];
      const da = a[0] + a[1] + a[2] - offset,
        db = b[0] + b[1] + b[2] - offset;
      if (Math.abs(da) < 1e-10) cuts.push(a);
      if (Math.abs(db) < 1e-10) cuts.push(b);
      if (da * db < 0) cuts.push(a.map((v, k) => v + ((b[k] - v) * da) / (da - db)) as Point3);
    }
  return hull(cuts.map(diagonalPlane));
}

export const sliceView = ([x, y, z]: Point3): Point2 => [
  200 + 85 * (1.1 * x - 0.7 * y),
  190 + 85 * (0.35 * x + 0.55 * y - z),
];
export const sliceDepth = (points: Point3[]) =>
  points.reduce((sum, [x, y, z]) => sum + (0.7 * x + 1.1 * y + 0.85 * z) / points.length, 0);
