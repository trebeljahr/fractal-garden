/**
 * A horizontal line across the carpet, at a height up the square given as an exact fraction. A
 * pixel-rounded float would never be exactly 1/4, and the answer depends on being exact.
 */
export type CarpetHeight = { top: number; bottom: number };

/** A hole on a grid 3^level squares wide, with columns from the left and rows from the top. */
export type LineHole = { level: number; column: number; row: number };

export const NAMED_HEIGHTS: CarpetHeight[] = [
  { top: 1, bottom: 2 },
  { top: 1, bottom: 3 },
  { top: 1, bottom: 4 },
];
// The carpet is the same upside down, so these two behave like 1/3 and 1/4.
const SNAP_HEIGHTS = [...NAMED_HEIGHTS, { top: 2, bottom: 3 }, { top: 3, bottom: 4 }];
const GRID = 1000;

const greatestDivisor = (a: number, b: number): number => (b ? greatestDivisor(b, a % b) : a);

function lowest(top: number, bottom: number): CarpetHeight {
  const divisor = greatestDivisor(top, bottom);
  return { top: top / divisor, bottom: bottom / divisor };
}

/**
 * Each level's row of three: 0 bottom, 1 middle, 2 top. It stops where the line lands on the border
 * between two rows, because from there on it runs along edges and enters no more holes.
 */
export function carpetLineRows({ top, bottom }: CarpetHeight, levels: number) {
  const rows: number[] = [];
  let position = top;
  for (let level = 1; level <= levels; level++) {
    const scaled = 3 * position;
    if (scaled % bottom === 0) break;
    rows.push(Math.floor(scaled / bottom));
    position = scaled % bottom;
  }
  return rows;
}

/** The holes the line passes through, down to a level. Holes sit only in a middle row. */
export function carpetLineHoles(height: CarpetHeight, level: number) {
  const holes: LineHole[] = [];
  // The squares still there in the line's row, by column.
  let columns = [0];
  carpetLineRows(height, level).forEach((row, index) => {
    const depth = index + 1;
    const fromTop = Math.floor(((height.bottom - height.top) * 3 ** depth) / height.bottom);
    if (row === 1)
      for (const column of columns)
        holes.push({ level: depth, column: 3 * column + 1, row: fromTop });
    columns = columns.flatMap((column) =>
      row === 1 ? [3 * column, 3 * column + 2] : [3 * column, 3 * column + 1, 3 * column + 2],
    );
  });
  return holes;
}

/**
 * The first level whose holes the line enters, and the level whose holes it runs along the edge of.
 * Null means never. The position in the row can only take finitely many values, so once one comes
 * back the rest repeats, and this is a proof for that height and not a search that gave up.
 */
export function carpetLineFate({ top, bottom }: CarpetHeight) {
  const seen = new Set<number>();
  let firstHole: number | null = null;
  let position = top;
  for (let level = 1; ; level++) {
    const scaled = 3 * position;
    if (scaled % bottom === 0) return { firstHole, edge: level };
    if (firstHole === null && Math.floor(scaled / bottom) === 1) firstHole = level;
    position = scaled % bottom;
    if (seen.has(position)) return { firstHole, edge: null };
    seen.add(position);
  }
}

/** The height under a pointer, `up` of the way up the square, with named heights easy to land on. */
export function carpetHeightAt(up: number, snap: number): CarpetHeight {
  const near = SNAP_HEIGHTS.find((height) => Math.abs(height.top / height.bottom - up) <= snap);
  if (near) return near;
  // Kept off the outer border, which is neither a hole nor a hole's edge.
  return lowest(Math.max(1, Math.min(GRID - 1, Math.round(up * GRID))), GRID);
}

/** One small step up or down from a height, for the arrow keys. */
export function carpetHeightStep({ top, bottom }: CarpetHeight, direction: 1 | -1): CarpetHeight {
  const on = (top * GRID) / bottom;
  const next = Number.isInteger(on)
    ? on + direction
    : direction > 0
      ? Math.ceil(on)
      : Math.floor(on);
  return lowest(Math.max(1, Math.min(GRID - 1, next)), GRID);
}

/** Small fractions as fractions, and anything else to three decimals. */
export function formatCarpetHeight({ top, bottom }: CarpetHeight) {
  return bottom <= 12 ? `${top}/${bottom}` : (top / bottom).toFixed(3);
}
