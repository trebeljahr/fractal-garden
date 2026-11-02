// Gosper island geometry. No DOM access here: the drawing runs in the render worker.

export type IslandPoint = [number, number];

const SHRINK = 1 / Math.sqrt(7);
// The three-line bend keeps its ends fixed only if it starts this far off the old line.
const BEND = Math.asin(Math.sqrt(3) / (2 * Math.sqrt(7)));
export const GOSPER_BEND_DEGREES = (BEND * 180) / Math.PI;
export const GOSPER_MAX_ROUND = 8;
// How far the opening view reaches from the center, in hexagon sides.
export const ISLAND_VIEW_REACH = {
  one: 1.12,
  seven: Math.sqrt(7) * 1.08,
  plane: Math.sqrt(7) * 1.08,
};

function bend([ax, ay]: IslandPoint, [bx, by]: IslandPoint): IslandPoint[] {
  const dx = (bx - ax) * SHRINK;
  const dy = (by - ay) * SHRINK;
  const firstX = dx * Math.cos(BEND) - dy * Math.sin(BEND);
  const firstY = dx * Math.sin(BEND) + dy * Math.cos(BEND);
  const secondX = firstX * Math.cos(Math.PI / 3) + firstY * Math.sin(Math.PI / 3);
  const secondY = -firstX * Math.sin(Math.PI / 3) + firstY * Math.cos(Math.PI / 3);
  const first: IslandPoint = [ax + firstX, ay + firstY];
  return [first, [first[0] + secondX, first[1] + secondY]];
}

/** Outline of the island around a hexagon of side 1, without repeating the first point. */
export function gosperIsland(round: number): IslandPoint[] {
  let outline: IslandPoint[] = Array.from({ length: 6 }, (_, corner) => {
    const angle = (corner * Math.PI) / 3;
    return [Math.cos(angle), Math.sin(angle)];
  });
  for (let i = 0; i < round; i++) {
    const next: IslandPoint[] = [];
    outline.forEach((point, index) => {
      next.push(point, ...bend(point, outline[(index + 1) % outline.length]));
    });
    outline = next;
  }
  return outline;
}

/** Centers of a hexagon grid, as multiples of two neighbor directions. */
export function latticeCenter(a: number, b: number): IslandPoint {
  return [1.5 * a, Math.sqrt(3) * (b + a / 2)];
}

// Neighbors in a hexagon grid always get different numbers, so seven tints make clusters.
export function latticeTint(a: number, b: number) {
  return (((a + 3 * b) % 7) + 7) % 7;
}

export const SEVEN_ISLANDS: [number, number][] = [
  [0, 0],
  [1, 0],
  [0, 1],
  [-1, 1],
  [-1, 0],
  [0, -1],
  [1, -1],
];

// The outer edge of seven islands is one island this much larger and turned this far.
export const BIG_ISLAND_SCALE = Math.sqrt(7);
export const BIG_ISLAND_TURN = -BEND;

/** The next round's outline, scaled and turned so it runs along seven small islands. */
export function bigGosperIsland(round: number): IslandPoint[] {
  const cos = Math.cos(BIG_ISLAND_TURN) * BIG_ISLAND_SCALE;
  const sin = Math.sin(BIG_ISLAND_TURN) * BIG_ISLAND_SCALE;
  return gosperIsland(round + 1).map(([x, y]) => [x * cos - y * sin, x * sin + y * cos]);
}

export function polygonArea(points: IslandPoint[]) {
  let sum = 0;
  points.forEach(([x, y], index) => {
    const [nextX, nextY] = points[(index + 1) % points.length];
    sum += x * nextY - nextX * y;
  });
  return Math.abs(sum) / 2;
}

export function polygonPerimeter(points: IslandPoint[]) {
  let sum = 0;
  points.forEach(([x, y], index) => {
    const [nextX, nextY] = points[(index + 1) % points.length];
    sum += Math.hypot(nextX - x, nextY - y);
  });
  return sum;
}
