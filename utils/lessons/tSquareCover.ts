export const T_SQUARE_ROUNDS = 8;

/** Share of the box still uncovered after a round. Round 0 is the first square. */
export const tSquareUncovered = (round: number) => 0.75 ** (round + 1);
/** The areas of all the squares added up, overlaps counted again, as a share of the box. */
export const tSquareSummedArea = (round: number) => (round + 1) / 4;

export type TSquare = { x: number; y: number; size: number; round: number };

const CORNERS = [
  [-1, -1],
  [1, -1],
  [-1, 1],
  [1, 1],
];

/**
 * The squares through a round, in a box from -1 to 1, with a first square of side 1. Without
 * `hidden`, leaves out the copy on a square's corner nearest its parent: that copy and everything
 * grown from it stay inside the parent, so they never show in a filled drawing.
 */
export function tSquareSquares(round: number, { hidden = false } = {}) {
  const squares: TSquare[] = [];
  const grow = (x: number, y: number, size: number, depth: number, fromX = 0, fromY = 0) => {
    squares.push({ x, y, size, round: depth });
    if (depth === round) return;
    const half = size / 2;
    for (const [dx, dy] of CORNERS) {
      if (!hidden && dx === -fromX && dy === -fromY) continue;
      grow(x + dx * half, y + dy * half, half, depth + 1, dx, dy);
    }
  };
  grow(0, 0, 1, 0);
  return squares;
}
