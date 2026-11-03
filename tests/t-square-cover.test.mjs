import assert from "node:assert/strict";
import test from "node:test";
import {
  T_SQUARE_ROUNDS,
  tSquareSquares,
  tSquareSummedArea,
  tSquareUncovered,
} from "../utils/lessons/tSquareCover.ts";

// Every square's sides land on a grid of 2^-(round + 1) in the box from -1 to 1, so counting
// cells is exact.
function coveredCells(squares, cellsPerUnit) {
  const side = 2 * cellsPerUnit;
  const cells = new Uint8Array(side * side);
  for (const { x, y, size } of squares) {
    const [left, right] = [(x - size / 2 + 1) * cellsPerUnit, (x + size / 2 + 1) * cellsPerUnit];
    const [top, bottom] = [(y - size / 2 + 1) * cellsPerUnit, (y + size / 2 + 1) * cellsPerUnit];
    for (let row = top; row < bottom; row++) cells.fill(1, row * side + left, row * side + right);
  }
  return { cells, side };
}
const share = ({ cells }) => cells.reduce((sum, cell) => sum + cell, 0) / cells.length;

test("the uncovered part of the box is exactly (3/4) to the power of round + 1", () => {
  for (let round = 0; round <= T_SQUARE_ROUNDS; round++) {
    const grid = coveredCells(tSquareSquares(round, { hidden: true }), 2 ** (round + 1));
    assert.equal(1 - share(grid), tSquareUncovered(round));
  }
  assert.equal((100 * (1 - tSquareUncovered(8))).toFixed(1), "92.5");
});

test("leaving out hidden squares does not change what is covered", () => {
  for (let round = 0; round <= 6; round++) {
    const cells = 2 ** (round + 1);
    assert.deepEqual(
      coveredCells(tSquareSquares(round), cells).cells,
      coveredCells(tSquareSquares(round, { hidden: true }), cells).cells,
    );
  }
});

test("the next round covers one quarter of each uncovered small square", () => {
  for (let round = 0; round <= 6; round++) {
    const cells = 2 ** (round + 1);
    const now = coveredCells(tSquareSquares(round), cells);
    const next = coveredCells(tSquareSquares(round + 1), 2 * cells);
    for (let row = 0; row < now.side; row++)
      for (let column = 0; column < now.side; column++) {
        const quarters = [0, 1, next.side, next.side + 1].reduce(
          (sum, offset) => sum + next.cells[2 * row * next.side + 2 * column + offset],
          0,
        );
        assert.equal(quarters, now.cells[row * now.side + column] ? 4 : 1);
      }
  }
});

test("summed areas pass the whole box at round 3 and keep growing", () => {
  for (let round = 0; round <= T_SQUARE_ROUNDS; round++) {
    const summed = tSquareSquares(round, { hidden: true }).reduce(
      (sum, { size }) => sum + size * size,
      0,
    );
    assert.equal(summed / 4, tSquareSummedArea(round));
  }
  assert.equal(tSquareSummedArea(3), 1);
  assert.equal(tSquareSummedArea(8), 2.25);
});

test("a filled drawing shows 4 times 3 to the power of round - 1 new squares", () => {
  for (let round = 1; round <= 6; round++) {
    const fresh = tSquareSquares(round).filter((square) => square.round === round);
    assert.equal(fresh.length, 4 * 3 ** (round - 1));
    const all = tSquareSquares(round, { hidden: true }).filter((square) => square.round === round);
    assert.equal(all.length, 4 ** round);
  }
});
