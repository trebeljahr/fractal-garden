import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import ts from "typescript";

const require = createRequire(import.meta.url);
require.extensions[".ts"] = (m, f) =>
  m._compile(
    ts.transpileModule(readFileSync(f, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText,
    f,
  );
const {
  dragonCreases,
  openedDragon,
  dragonOpeningBounds,
} = require("../utils/lessons/dragonFold.ts");
const { hilbertGrid, hilbertChunks, hilbertLinks } = require("../utils/lessons/hilbertJoin.ts");
const { lessonWord, walkLessonWord } = require("../utils/lessons/lsystemLesson.ts");
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} != ${b}`);

test("the dragon's crease directions obey repeated same-direction paper folding", () => {
  let previous = [];
  for (let folds = 1; folds <= 5; folds++) {
    const expected = [...previous, 1, ...previous.toReversed().map((turn) => -turn)];
    assert.deepEqual(dragonCreases(folds), expected);
    previous = expected;
  }
});

test("opening every crease preserves the strip sections and reaches the exact production dragon", () => {
  for (let folds = 1; folds <= 5; folds++) {
    const bounds = dragonOpeningBounds(folds);
    for (const opening of [0, 15, 45, 75, 90]) {
      const points = openedDragon(folds, opening);
      assert.equal(points.length, 2 ** folds + 1);
      for (let i = 1; i < points.length; i++)
        close(Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]), 1);
      for (const [x, y] of points)
        assert.ok(
          x >= bounds.minX - 1e-9 &&
            x <= bounds.maxX + 1e-9 &&
            y >= bounds.minY - 1e-9 &&
            y <= bounds.maxY + 1e-9,
        );
      if (opening === 0)
        points.forEach((point, i) => {
          close(point[0], i % 2 ? Math.SQRT1_2 : 0);
          close(point[1], i % 2 ? Math.SQRT1_2 : 0);
        });
      if (opening === 90) {
        const states = walkLessonWord("dragon", lessonWord("dragon", folds));
        const actual = [
          [0, 0],
          ...states.flatMap((state) => (state.segment ? [[state.point.x, state.point.y]] : [])),
        ];
        points.forEach((p, i) => {
          close(p[0], actual[i][0]);
          close(p[1], actual[i][1]);
        });
      }
    }
  }
});

test("fitted Hilbert quadrants join into the actual one-visit grid traversal", () => {
  for (const round of [2, 3]) {
    const chunks = hilbertChunks(round);
    const joined = chunks.flatMap((chunk) => chunk.points);
    assert.deepEqual(joined, hilbertGrid(round));
    assert.equal(joined.length, 4 ** round);
    assert.equal(new Set(joined.map((p) => p.join(","))).size, 4 ** round);
    assert.ok(hilbertLinks(chunks).every((link) => link.fits));
    for (let i = 1; i < joined.length; i++)
      assert.equal(
        Math.abs(joined[i][0] - joined[i - 1][0]) + Math.abs(joined[i][1] - joined[i - 1][1]),
        1,
      );
  }
});

test("turning and reversing a quadrant preserve its grid points while moving its entry and exit", () => {
  const fitted = hilbertChunks(3);
  for (let quadrant = 0; quadrant < 4; quadrant++)
    for (let turn = 0; turn < 4; turn++) {
      const rotations = [0, 0, 0, 0];
      rotations[quadrant] = turn;
      const reversed = [false, false, false, false];
      reversed[quadrant] = true;
      const changed = hilbertChunks(3, rotations, reversed);
      assert.deepEqual(
        new Set(changed[quadrant].points.map((p) => p.join(","))),
        new Set(fitted[quadrant].points.map((p) => p.join(","))),
      );
      for (let i = 0; i < 4; i++) if (i !== quadrant) assert.deepEqual(changed[i], fitted[i]);
    }
  assert.ok(hilbertLinks(hilbertChunks(2, [1, 0, 0, 0])).some((link) => !link.fits));
});
