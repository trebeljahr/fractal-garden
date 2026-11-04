export type GridPoint3 = [number, number, number];

export const MIRROR_LEVEL = 2;
export const SMALL_CUBES = 8;
export const SMALL_PATH_POINTS = SMALL_CUBES ** (MIRROR_LEVEL - 1);

// Which small cube each eighth of the route fills, as the corner of the big cube it sits in.
const CUBE_CORNERS: GridPoint3[] = [
  [0, 0, 0],
  [0, 0, 1],
  [0, 1, 1],
  [0, 1, 0],
  [1, 1, 0],
  [1, 1, 1],
  [1, 0, 1],
  [1, 0, 0],
];

// How generateHilbertCurve3D turns the whole route to fit each small cube. Axis `i` of the whole
// route becomes axis |n| - 1 of the small cube, running the other way when n is negative.
const COPIES = [
  [3, 1, 2],
  [2, 1, 3],
  [1, 2, 3],
  [-3, 2, -1],
  [3, 2, 1],
  [1, 2, 3],
  [-2, -1, 3],
  [-3, -1, 2],
];

/**
 * This page's route, with the small cubes in the `mirrored` bit mask using a mirrored copy. The
 * whole route's ends differ only along its first axis, so swapping the other two axes keeps both
 * ends where they are: that swap is the mirror in the diagonal plane through them.
 */
export function hilbertMirrorRoute(level: number, mirrored = 0): GridPoint3[] {
  if (level === 0) return [[0, 0, 0]];
  const inner = hilbertMirrorRoute(level - 1, mirrored);
  const side = 2 ** (level - 1);
  return COPIES.flatMap((copy, cube) => {
    const turn = mirrored & (1 << cube) ? [copy[0], copy[2], copy[1]] : copy;
    return inner.map((point) => {
      const placed: GridPoint3 = [0, 0, 0];
      turn.forEach((target, from) => {
        const axis = Math.abs(target) - 1;
        const along = target > 0 ? point[from] : side - 1 - point[from];
        placed[axis] = CUBE_CORNERS[cube][axis] * side + along;
      });
      return placed;
    });
  });
}

/** What the readout reports: positions reached, and the longest single move in grid steps. */
export function routeCheck(route: GridPoint3[]) {
  let longestMove = 0;
  for (let i = 1; i < route.length; i++) {
    const move = route[i].reduce(
      (sum, value, axis) => sum + Math.abs(value - route[i - 1][axis]),
      0,
    );
    longestMove = Math.max(longestMove, move);
  }
  return { visited: new Set(route.map((point) => point.join())).size, longestMove };
}

export const smallPath = (route: GridPoint3[], cube: number) =>
  route.slice(cube * SMALL_PATH_POINTS, (cube + 1) * SMALL_PATH_POINTS);

/** The corners of the box around a small path, and the four where its mirror plane meets the box. */
export function smallCubeShape(path: GridPoint3[]) {
  const low = [0, 1, 2].map((axis) => Math.min(...path.map((point) => point[axis])));
  const high = [0, 1, 2].map((axis) => Math.max(...path.map((point) => point[axis])));
  const start = path[0];
  const end = path[path.length - 1];
  const opposite = (point: GridPoint3) =>
    point.map((value, axis) =>
      start[axis] === end[axis] ? low[axis] + high[axis] - value : value,
    ) as GridPoint3;
  const corners: GridPoint3[] = [];
  for (const x of [low[0], high[0]])
    for (const y of [low[1], high[1]]) for (const z of [low[2], high[2]]) corners.push([x, y, z]);
  return { corners, plane: [start, end, opposite(end), opposite(start)] };
}
