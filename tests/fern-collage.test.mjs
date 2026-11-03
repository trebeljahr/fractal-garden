import assert from "node:assert/strict";
import test from "node:test";
import { CLASSIC_FERN_MATRIX } from "../utils/barnsleyFern.ts";
import {
  coverMoves,
  FERN_BOX,
  FernPlot,
  FernWalk,
  fernExtent,
  HANDLE_CORNERS,
  moveCorners,
  moveWithCorner,
} from "../utils/lessons/fernCollage.ts";

const FERN = CLASSIC_FERN_MATRIX.map((row) => row.slice(0, 6));
const CLASSIC = CLASSIC_FERN_MATRIX.map((row) => row[6]);
const EQUAL = [0.25, 0.25, 0.25, 0.25];
const WIDTH = 375;
const HEIGHT = 560;
const plot = () => new FernPlot(WIDTH, HEIGHT, new Uint32Array(WIDTH * HEIGHT), [1, 2, 3, 4], 0);
const lit = ({ pixels }) => pixels.reduce((count, pixel) => count + (pixel ? 1 : 0), 0);
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} != ${b}`);

test("the fern is 24 numbers, six per move", () => {
  assert.equal(FERN.flat().length, 24);
  assert.ok(FERN.every((move) => move.length === 6));
  close(
    CLASSIC.reduce((sum, chance) => sum + chance, 0),
    1,
  );
});

test("three corners give back a move's six numbers", () => {
  for (const move of FERN) {
    const corners = moveCorners(move);
    const rebuilt = moveWithCorner(move, 2, corners[2]);
    for (let index = 0; index < 6; index++) close(rebuilt[index], move[index]);
  }
});

test("dragging a corner leaves the other two handles alone and the fourth corner follows", () => {
  for (const move of FERN) {
    for (const corner of HANDLE_CORNERS) {
      const before = moveCorners(move);
      const spot = { x: before[corner].x + 0.3, y: before[corner].y - 0.2 };
      const after = moveCorners(moveWithCorner(move, corner, spot));
      close(after[corner].x, spot.x);
      close(after[corner].y, spot.y);
      for (const other of HANDLE_CORNERS.filter((handle) => handle !== corner)) {
        close(after[other].x, before[other].x);
        close(after[other].y, before[other].y);
      }
      close(after[0].x, after[1].x + after[3].x - after[2].x);
      close(after[0].y, after[1].y + after[3].y - after[2].y);
    }
  }
});

test("the rectangle holds the whole fern", () => {
  const all = plot();
  new FernWalk(FERN, all).run();
  const { left, right, bottom, top } = FERN_BOX;
  const { window, scaleX, scaleY } = all;
  for (let row = 0; row < HEIGHT; row++)
    for (let column = 0; column < WIDTH; column++) {
      if (!all.pixels[row * WIDTH + column]) continue;
      const x = window.left + (column + 0.5) / scaleX;
      const y = window.top - (row + 0.5) / scaleY;
      assert.ok(x > left && x < right && y > bottom && y < top, `${x}, ${y}`);
    }
});

test("every chance setting lands on the same fern, at very different speeds", () => {
  const all = plot();
  assert.equal(new FernWalk(FERN, all).run(), true);
  const onFern = (row, column) => {
    for (let r = Math.max(0, row - 1); r <= Math.min(HEIGHT - 1, row + 1); r++)
      for (let c = Math.max(0, column - 1); c <= Math.min(WIDTH - 1, column + 1); c++)
        if (all.pixels[r * WIDTH + c]) return true;
    return false;
  };
  const counts = [CLASSIC, EQUAL].map((chances) => {
    const dots = plot();
    dots.sow(FERN, chances, 1_000_000);
    for (let row = 0; row < HEIGHT; row++)
      for (let column = 0; column < WIDTH; column++)
        if (dots.pixels[row * WIDTH + column])
          assert.ok(onFern(row, column), `dot off the fern at ${column}, ${row}`);
    return lit(dots);
  });
  assert.ok(counts[0] > 0.9 * lit(all), `${counts[0]} of ${lit(all)}`);
  assert.ok(counts[1] < 0.5 * counts[0], `${counts[1]} against ${counts[0]}`);
});

test("four quarter copies fill the rectangle", () => {
  const all = plot();
  new FernWalk(coverMoves(), all).run();
  const dots = plot();
  dots.sow(coverMoves(), EQUAL, 4_000_000);
  const { scaleX, scaleY } = all;
  const area =
    (FERN_BOX.right - FERN_BOX.left) * scaleX * (FERN_BOX.top - FERN_BOX.bottom) * scaleY;
  assert.ok(lit(all) > 0.98 * area, `${lit(all)} of ${area}`);
  assert.ok(lit(dots) > 0.98 * area, `${lit(dots)} of ${area}`);
});

test("moves that stop shrinking neither overflow nor hang", () => {
  const growing = FERN.map((move) => move.map((value) => value * 1.6));
  const dots = plot();
  dots.sow(growing, CLASSIC, 100_000);
  assert.ok(dots.dots > 0);
  const extent = fernExtent(growing);
  assert.ok(Number.isFinite(extent.rx) && Number.isFinite(extent.ry));
  assert.equal(new FernWalk(growing, plot()).run(), true);
});
