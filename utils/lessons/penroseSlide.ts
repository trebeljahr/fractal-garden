import type { RobinsonTriangle } from "../penroseTiling";

type Point = [number, number];
export type SlideTile = {
  /** 0 is a kite, 1 a dart and 2 a square. */
  kind: 0 | 1 | 2;
  // Two corners fix where a tile is and which way it faces.
  tip: Point;
  tail: Point;
  corners: Point[];
  center: Point;
};
export type SlideCandidate = { tile: SlideTile; hits: number };

const round = (value: number) => Math.round(value * 1e5);
const key = (kind: number, tip: Point, tail: Point) =>
  [kind, round(tip[0]), round(tip[1]), round(tail[0]), round(tail[1])].join();
const direction = ({ kind, tip, tail }: SlideTile) =>
  [kind, round(tail[0] - tip[0]), round(tail[1] - tip[1])].join();

function makeTile(kind: SlideTile["kind"], tip: Point, tail: Point, corners: Point[]): SlideTile {
  const center: Point = [
    corners.reduce((sum, [x]) => sum + x, 0) / corners.length,
    corners.reduce((sum, [, y]) => sum + y, 0) / corners.length,
  ];
  return { kind, tip, tail, corners, center };
}

/** Joins half-tiles along their shared line into whole kites and darts. */
export function tilesFromHalves(triangles: RobinsonTriangle[]) {
  const halves = new Map<string, RobinsonTriangle>();
  const tiles: SlideTile[] = [];
  for (const triangle of triangles) {
    const seam = key(triangle.type, triangle.a, triangle.b);
    const other = halves.get(seam);
    if (!other) {
      halves.set(seam, triangle);
      continue;
    }
    tiles.push(
      makeTile(triangle.type, triangle.a, triangle.b, [
        triangle.a,
        triangle.c,
        triangle.b,
        other.c,
      ]),
    );
  }
  return tiles;
}

export function squareTiles(half: number, perSide: number) {
  const size = (2 * half) / perSide;
  const tiles: SlideTile[] = [];
  for (let row = 0; row < perSide; row++) {
    for (let column = 0; column < perSide; column++) {
      const x = -half + column * size;
      const y = -half + row * size;
      tiles.push(
        makeTile(
          2,
          [x, y],
          [x + size, y + size],
          [
            [x, y],
            [x + size, y],
            [x + size, y + size],
            [x, y + size],
          ],
        ),
      );
    }
  }
  return tiles;
}

/** The tiles that fit fully inside a square around the center. */
export function tilesWithin(tiles: SlideTile[], half: number) {
  const reach = half + 1e-9;
  return tiles.filter(({ corners }) =>
    corners.every(([x, y]) => Math.abs(x) <= reach && Math.abs(y) <= reach),
  );
}

// Tiles can sit at the same distance from the center. Rounding stops the last digit of a
// square root from choosing between them, which differs between browsers.
export function nearestToCenter(tiles: SlideTile[]) {
  return tiles.reduce((best, tile) =>
    round(Math.hypot(...tile.center)) < round(Math.hypot(...best.center)) ? tile : best,
  );
}

export function tileKeys(tiles: SlideTile[]) {
  return new Set(tiles.map(({ kind, tip, tail }) => key(kind, tip, tail)));
}

/** Slides the shown tiles by one vector and reports which land on an identical tile. */
export function slideMatches(shown: SlideTile[], present: Set<string>, dx: number, dy: number) {
  const lit = new Set<SlideTile>();
  for (const tile of shown) {
    const { kind, tip, tail } = tile;
    if (present.has(key(kind, [tip[0] + dx, tip[1] + dy], [tail[0] + dx, tail[1] + dy])))
      lit.add(tile);
  }
  return lit;
}

/** Every shown tile the marked tile can land on: the same shape, facing the same way. */
export function slideCandidates(shown: SlideTile[], present: Set<string>, marked: SlideTile) {
  const facing = direction(marked);
  const candidates: SlideCandidate[] = [];
  for (const tile of shown) {
    if (tile === marked || direction(tile) !== facing) continue;
    const dx = tile.tip[0] - marked.tip[0];
    const dy = tile.tip[1] - marked.tip[1];
    candidates.push({ tile, hits: slideMatches(shown, present, dx, dy).size });
  }
  return candidates;
}
