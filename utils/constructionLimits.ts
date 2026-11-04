// How deep a construction figure goes. Articles name its levels, so each limit is a fixed number
// for that figure. Speed never lowers one. Work is counted instead of timed, so a slow machine
// gets the same levels and no level is heavy enough to stall its tab.

/** No level a construction figure offers draws more lines than this. */
export const MAX_CONSTRUCTION_LINES = 200_000;

// Figures whose explorer limit is over that count. The explorer can still reach those levels.

/** Level 16 draws 262,144 lines. */
export const LEVY_TAPESTRY_CONSTRUCTION_MAX = 15;

/** Level 4 draws 419,904 lines, each shorter than a pixel. */
export const QUADRATIC_KOCH_ISLAND_CONSTRUCTION_MAX = 3;

/** With its eight neighbors filled, level 3 draws 209,952 lines. */
export const QUADRATIC_KOCH_ISLAND_NEIGHBORS_MAX = 2;

/** With the tiling on, the player draws the path up to 289 times: 295,936 lines at level 9. */
export const TWINDRAGON_TILING_CONSTRUCTION_MAX = 8;

/** With six copies, level 10 draws 354,294 lines. */
export const TERDRAGON_CONSTRUCTION_MAX = 9;

/** Lines in a star fractal: every star down to `depth`, each with one line per tip. */
export function starLines(points: number, depth: number) {
  let lines = 0;
  let stars = 1;
  for (let level = 0; level <= depth; level++) {
    lines += stars * points;
    stars *= points;
  }
  return lines;
}

export function starConstructionMax(points: number) {
  let depth = 0;
  while (starLines(points, depth + 1) <= MAX_CONSTRUCTION_LINES) depth++;
  return depth;
}

/** The most islands the player's canvas shows at once in each view, up to a 4K window. */
export const GOSPER_CONSTRUCTION_ISLANDS = { one: 1, seven: 7, plane: 120 };

export function gosperIslandLines(view: keyof typeof GOSPER_CONSTRUCTION_ISLANDS, round: number) {
  return GOSPER_CONSTRUCTION_ISLANDS[view] * 6 * 3 ** round;
}

/** The page's own limit may be lower. */
export function gosperIslandConstructionMax(view: keyof typeof GOSPER_CONSTRUCTION_ISLANDS) {
  let round = 1;
  while (gosperIslandLines(view, round + 1) <= MAX_CONSTRUCTION_LINES) round++;
  return round;
}
