import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import ts from "typescript";

const require = createRequire(import.meta.url);
require.extensions[".ts"] = (module, filename) =>
  module._compile(
    ts.transpileModule(readFileSync(filename, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText,
    filename,
  );
const {
  nearestVicsekSquare,
  VICSEK_LEAD,
  vicsekNeighbors,
  vicsekPieces,
  vicsekSquares,
} = require("../utils/lessons/vicsekJoins.ts");

const joins = (neighbors) => neighbors.reduce((sum, list) => sum + list.length, 0) / 2;
const pieces = (neighbors, removed) => vicsekPieces(neighbors, removed).count;

test("both crosses join their squares with one fewer join than squares, in one piece", () => {
  for (const variant of ["saltire", "cross"])
    for (let level = 0; level <= 6; level++) {
      const squares = vicsekSquares(variant, level);
      assert.equal(squares.length, 5 ** level);
      const neighbors = vicsekNeighbors(variant, squares);
      assert.equal(joins(neighbors), 5 ** level - 1);
      // One piece: take out a square at the end of a branch and the rest stays together.
      if (level) {
        const tip = neighbors.findIndex((list) => list.length === 1);
        assert.equal(pieces(neighbors, tip), 1);
      }
    }
});

test("the diagonal cross shares no side, and the Greek cross's corner touches do not last", () => {
  for (let level = 1; level <= 5; level++) {
    const diagonal = vicsekSquares("saltire", level);
    const cells = new Set(diagonal.map((cell) => cell.join()));
    for (const [x, y] of diagonal) {
      assert.ok(!cells.has(`${x + 1},${y}`));
      assert.ok(!cells.has(`${x},${y + 1}`));
    }
    // Two squares of the Greek cross that touch only at a corner leave nothing at that corner.
    const plus = vicsekSquares("cross", level);
    const kept = new Set(plus.map((cell) => cell.join()));
    const next = vicsekSquares("cross", level + 1);
    for (const [x, y] of plus)
      if (kept.has(`${x + 1},${y + 1}`)) {
        const [px, py] = [3 * (x + 1), 3 * (y + 1)];
        assert.ok(
          !next.some(([cx, cy]) => (cx === px || cx === px - 1) && (cy === py || cy === py - 1)),
        );
      }
  }
});

test("a 45 degree turn sends the diagonal cross's joins onto the Greek cross's", () => {
  // Each corner copy goes to the arm next to it, level after level.
  const turn = [
    [
      [0, 0],
      [1, 0],
    ],
    [
      [2, 0],
      [2, 1],
    ],
    [
      [2, 2],
      [1, 2],
    ],
    [
      [0, 2],
      [0, 1],
    ],
    [
      [1, 1],
      [1, 1],
    ],
  ];
  for (let level = 1; level <= 5; level++) {
    let pairs = [
      [
        [0, 0],
        [0, 0],
      ],
    ];
    for (let i = 0; i < level; i++)
      pairs = pairs.flatMap(([d, p]) =>
        turn.map(([from, to]) => [
          [3 * d[0] + from[0], 3 * d[1] + from[1]],
          [3 * p[0] + to[0], 3 * p[1] + to[1]],
        ]),
      );
    const diagonal = pairs.map(([d]) => d);
    const plus = pairs.map(([, p]) => p);
    assert.deepEqual(
      new Set(plus.map((cell) => cell.join())),
      new Set(vicsekSquares("cross", level).map((cell) => cell.join())),
    );
    const sorted = (lists) => lists.map((list) => [...list].sort((a, b) => a - b));
    assert.deepEqual(
      sorted(vicsekNeighbors("saltire", diagonal)),
      sorted(vicsekNeighbors("cross", plus)),
    );
  }
});

test("every square except the tips splits the diagonal cross, into as many pieces as it has joins", () => {
  for (let level = 1; level <= 4; level++) {
    const squares = vicsekSquares("saltire", level);
    const neighbors = vicsekNeighbors("saltire", squares);
    neighbors.forEach((list, square) => {
      assert.equal(pieces(neighbors, square), list.length);
    });
  }
});

test("taking one square out of the Sierpinski carpet leaves one piece", () => {
  const kept = (x, y) => {
    for (; x || y; x = Math.floor(x / 3), y = Math.floor(y / 3))
      if (x % 3 === 1 && y % 3 === 1) return false;
    return true;
  };
  for (let level = 1; level <= 3; level++) {
    const width = 3 ** level;
    const squares = [];
    for (let x = 0; x < width; x++)
      for (let y = 0; y < width; y++) if (kept(x, y)) squares.push([x, y]);
    assert.equal(squares.length, 8 ** level);
    const neighbors = vicsekNeighbors("cross", squares);
    for (let square = 0; square < squares.length; square++)
      assert.equal(pieces(neighbors, square), 1);
  }
});

test("pieces are ranked by size and the pointer picks the nearest square", () => {
  const squares = vicsekSquares("saltire", 2);
  const neighbors = vicsekNeighbors("saltire", squares);
  const center = squares.findIndex(([x, y]) => x === 4 && y === 4);
  const { piece, count } = vicsekPieces(neighbors, center);
  assert.equal(count, 4);
  assert.equal(piece[center], -1);
  assert.equal(nearestVicsekSquare(squares, 2, 0.5, 0.5), center);
  // The lesson opens on the center of the top right copy.
  const opening = nearestVicsekSquare(squares, 2, 5 / 6, 1 / 6);
  assert.deepEqual(squares[opening], [7, 1]);
  assert.equal(pieces(neighbors, opening), 4);
});

test("the lead counts squares and joins for the chosen layout", () => {
  const read = (variant, level) => VICSEK_LEAD.readout({ variant }, level).map((row) => row.value);
  assert.deepEqual(read("saltire", 0), ["1", "0 corners"]);
  assert.deepEqual(read("saltire", 3), ["125", "124 corners"]);
  assert.deepEqual(read("cross", 3), ["125", "124 sides"]);
  assert.deepEqual(read("cross", 6), ["15,625", "15,624 sides"]);
});
