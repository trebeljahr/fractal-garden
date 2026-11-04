import { octahedronMesh, polygonsToScene } from "../polyhedronFractals";

type Vec3 = [number, number, number];
type Copy = { x: number; y: number; z: number; size: number };

export const OCTAHEDRON_CUT_LEVELS = 5;

const MESH = octahedronMesh();
// Everything here measures in corner heights, so 0.5 and 0.25 stay exact. The explorer's solid is
// the same one, scaled up by this.
export const CORNER = Math.max(...MESH.vertices.map((vertex) => vertex[1]));
const CORNERS = MESH.vertices.map((vertex) => vertex.map((value) => value / CORNER) as Vec3);

/** Six half-size copies hold 6/8 of the solid they replace. */
export const flakeVolumeLeft = (level: number) => 0.75 ** level;

/** The explorer's rule: half size, shrunk towards each corner. A copy holds all of its own copies. */
function copiesWhere(level: number, keep: (copy: Copy) => boolean) {
  const found: Copy[] = [];
  const walk = (copy: Copy, left: number) => {
    if (!keep(copy)) return;
    if (left === 0) {
      found.push(copy);
      return;
    }
    const size = copy.size / 2;
    for (const [x, y, z] of CORNERS) {
      walk({ x: copy.x + x * size, y: copy.y + y * size, z: copy.z + z * size, size }, left - 1);
    }
  };
  walk({ x: 0, y: 0, z: 0, size: 1 }, level);
  return found;
}

/** Each copy the height passes through leaves a square on its corner, |x| + |z| <= radius. */
export function cutSquares(level: number, height: number) {
  return copiesWhere(level, (copy) => Math.abs(copy.y - height) < copy.size).map((copy) => ({
    x: copy.x,
    z: copy.z,
    radius: copy.size - Math.abs(copy.y - height),
  }));
}

/** The share of the whole octahedron's cut that the flake still fills. At height 1 it has no area. */
export function cutFilled(level: number, height: number) {
  if (height >= 1) return null;
  const area = cutSquares(level, height).reduce((sum, { radius }) => sum + radius * radius, 0);
  return area / (1 - height) ** 2;
}

function clipBelow(points: Vec3[], height: number) {
  const kept: Vec3[] = [];
  points.forEach((point, index) => {
    const next = points[(index + 1) % points.length];
    const from = point[1] - height;
    const to = next[1] - height;
    if (from <= 0) kept.push(point);
    if (from * to < 0) {
      const along = from / (from - to);
      kept.push([
        point[0] + (next[0] - point[0]) * along,
        height,
        point[2] + (next[2] - point[2]) * along,
      ]);
    }
  });
  return kept;
}

/** The flake's faces with everything above the height removed. `cutSquares` closes the top. */
export function cutFlakeScene(level: number, height: number) {
  const polygons: Vec3[][] = [];
  for (const { x, y, z, size } of copiesWhere(level, (copy) => copy.y - copy.size < height)) {
    for (const face of MESH.faces) {
      const placed = face.map((index): Vec3 => {
        const corner = CORNERS[index];
        return [x + corner[0] * size, y + corner[1] * size, z + corner[2] * size];
      });
      const clipped = clipBelow(placed, height);
      if (clipped.length >= 3) {
        polygons.push(clipped.map((p): Vec3 => [p[0] * CORNER, p[1] * CORNER, p[2] * CORNER]));
      }
    }
  }
  return polygonsToScene(polygons);
}
