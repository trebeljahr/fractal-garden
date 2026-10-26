import { SEED_ANCHORS, type SeedPoint } from "./sierpinskiSeeds";

export const MAX_PASCAL_NUMBER_ROWS = 16;
export const MAX_PATTERN_ROWS = 128;
export const MAX_CHAOS_POINTS = 20_000;

function rowCount(count: number, maximum: number) {
  if (!Number.isInteger(count) || count < 1 || count > maximum)
    throw new Error(`Row count must be an integer from 1 through ${maximum}.`);
}

export function pascalRows(count: number): number[][] {
  rowCount(count, MAX_PASCAL_NUMBER_ROWS);
  const rows = [[1]];
  for (let row = 1; row < count; row++) {
    const previous = rows[row - 1];
    rows.push(
      Array.from(
        { length: row + 1 },
        (_, column) => (previous[column - 1] ?? 0) + (previous[column] ?? 0),
      ),
    );
  }
  return rows;
}

export function pascalResidues(count: number, modulus = 2): number[][] {
  rowCount(count, MAX_PATTERN_ROWS);
  if (!Number.isInteger(modulus) || modulus < 2 || modulus > 16)
    throw new Error("Modulus must be an integer from 2 through 16.");
  const rows = [[1]];
  // Reduce after every addition: the full binomial coefficients grow beyond
  // exact JavaScript integers long before the last displayed row.
  for (let row = 1; row < count; row++) {
    const previous = rows[row - 1];
    rows.push(
      Array.from(
        { length: row + 1 },
        (_, column) => ((previous[column - 1] ?? 0) + (previous[column] ?? 0)) % modulus,
      ),
    );
  }
  return rows;
}

export function elementaryRows(rule: number, count: number): number[][] {
  rowCount(count, MAX_PATTERN_ROWS);
  if (!Number.isInteger(rule) || rule < 0 || rule > 255)
    throw new Error("Rule must be an integer from 0 through 255.");
  const width = 2 * count - 1;
  const first = Array<number>(width).fill(0);
  first[count - 1] = 1;
  const rows = [first];
  let background = 0;
  for (let row = 1; row < count; row++) {
    const previous = rows[row - 1];
    rows.push(
      previous.map((center, column) => {
        const left = previous[column - 1] ?? background;
        const right = previous[column + 1] ?? background;
        return (rule >> (left * 4 + center * 2 + right)) & 1;
      }),
    );
    // The seed cannot reach beyond this viewport in the displayed row count.
    // Its exterior stays uniform, but rules such as 1 can change its color.
    background = (rule >> (background ? 7 : 0)) & 1;
  }
  return rows;
}

function finitePoint(point: SeedPoint) {
  if (point.length !== 2 || !point.every(Number.isFinite))
    throw new Error("Point must contain two finite coordinates.");
}

export function midpoint(point: SeedPoint, corner: SeedPoint): SeedPoint {
  finitePoint(point);
  finitePoint(corner);
  // Divide before adding so two finite coordinates cannot overflow their sum.
  return [point[0] / 2 + corner[0] / 2, point[1] / 2 + corner[1] / 2];
}

export function chaosPoints(start: SeedPoint, choices: number[]): SeedPoint[] {
  finitePoint(start);
  if (choices.length > MAX_CHAOS_POINTS)
    throw new Error(`At most ${MAX_CHAOS_POINTS} chaos-game choices are allowed.`);
  let point: SeedPoint = [...start];
  return choices.map((choice) => {
    if (!Number.isInteger(choice) || choice < 0 || choice >= SEED_ANCHORS.length)
      throw new Error("Corner choice must be 0, 1 or 2.");
    point = midpoint(point, SEED_ANCHORS[choice]);
    return point;
  });
}
