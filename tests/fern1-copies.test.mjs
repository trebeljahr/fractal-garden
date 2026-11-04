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
const { expand, interpret } = require("../utils/lsystem/engine.ts");
const { DEFAULT_SPEC } = require("../utils/lsystem/spec.ts");
const {
  FERN1_LEAD,
  fern1Lines,
  fern1Parts,
  fern1Rules,
} = require("../utils/lessons/fern1Copies.ts");

function draw(stems, rounds) {
  const spec = {
    ...DEFAULT_SPEC,
    axiom: "X",
    rules: Object.entries(fern1Rules({ stems })).map(([symbol, replacement]) => ({
      symbol,
      replacement,
    })),
    angle: -25,
    startAngle: 0,
  };
  return interpret(expand(spec, rounds).sentence, spec, { legacy2d: true });
}

/** Which way a pen stroke points, in degrees to the right of straight up. */
function heading({ positions }, stroke) {
  const o = stroke * 6;
  const [dx, dy] = [positions[o + 3] - positions[o], positions[o + 4] - positions[o + 1]];
  return (Math.atan2(dx, dy) * 180) / Math.PI;
}

function box({ positions, count }) {
  let [left, right, top] = [0, 0, 0];
  for (let i = 3; i < count * 6; i += 6) {
    left = Math.min(left, positions[i]);
    right = Math.max(right, positions[i]);
    top = Math.max(top, positions[i + 1]);
  }
  return { width: right - left, height: top };
}

for (const stems of ["double", "same"]) {
  test(`with ${stems} stems, a level is four exact copies of the level before and three stems`, () => {
    for (let rounds = 2; rounds <= 7; rounds++) {
      const whole = draw(stems, rounds);
      const before = draw(stems, rounds - 1);
      const { stem, copy, all } = fern1Lines(stems, rounds);
      assert.equal(whole.count, all);
      assert.equal(before.count, copy);

      const { ends, tints } = fern1Parts(stems, rounds);
      assert.equal(ends.at(-1), whole.count);
      assert.equal(new Set(tints).size, 5);

      // The tints mark where each copy starts, and the signs before it set its turn.
      const copyStarts = [ends[0], ends[1], ends[4], ends[5]];
      const turns = [-25, 0, 25, -25];
      copyStarts.forEach((start, index) => {
        const turn = (turns[index] * Math.PI) / 180;
        const [ox, oy] = [whole.positions[start * 6], whole.positions[start * 6 + 1]];
        for (let i = 0; i < before.count * 6; i += 3) {
          const [x, y] = [before.positions[i], before.positions[i + 1]];
          const rx = x * Math.cos(turn) + y * Math.sin(turn);
          const ry = -x * Math.sin(turn) + y * Math.cos(turn);
          // The positions are 32-bit floats, far from zero at these sizes.
          assert.ok(Math.abs(whole.positions[start * 6 + i] - (ox + rx)) < 1e-2, "x");
          assert.ok(Math.abs(whole.positions[start * 6 + i + 1] - (oy + ry)) < 1e-2, "y");
        }
      });

      // The three stems are straight runs, one from the foot and two after the first two copies.
      const stemRuns = [
        [0, ends[0]],
        [ends[2], ends[3]],
        [ends[3], ends[4]],
      ];
      for (const [from, to] of stemRuns) {
        assert.equal(to - from, stem);
        for (let line = from; line < to; line++)
          assert.ok(Math.abs(heading(whole, line) - heading(whole, from)) < 1e-3);
      }
      assert.ok(Math.abs(heading(whole, stemRuns[0][0])) < 1e-3);
      assert.ok(Math.abs(heading(whole, stemRuns[1][0])) < 1e-3);
      assert.ok(Math.abs(heading(whole, stemRuns[2][0]) - 25) < 1e-3);
    }
  });
}

test("level 2 is just the three stems, with nothing to copy yet", () => {
  assert.deepEqual(fern1Lines("double", 1), { stem: 1, copy: 0, all: 3 });
  assert.equal(draw("double", 1).count, 3);
});

test("F → FF doubles the stems, and a copy gets about twice as tall each round", () => {
  for (let rounds = 2; rounds <= 7; rounds++) {
    assert.equal(fern1Lines("double", rounds).stem, 2 * fern1Lines("double", rounds - 1).stem);
    const growth = box(draw("double", rounds + 1)).height / box(draw("double", rounds)).height;
    assert.ok(growth > 2 && growth < 2.2, `round ${rounds}: ${growth}`);
  }
});

test("without F → FF the stems stay one line long and the plant is wider than tall by level 5", () => {
  for (let rounds = 1; rounds <= 7; rounds++) assert.equal(fern1Lines("same", rounds).stem, 1);
  const level4 = box(draw("same", 3));
  assert.ok(level4.width < level4.height);
  for (let rounds = 4; rounds <= 7; rounds++) {
    const { width, height } = box(draw("same", rounds));
    assert.ok(width > height, `round ${rounds}`);
    const doubled = box(draw("double", rounds));
    assert.ok(doubled.width < doubled.height, `round ${rounds} doubled`);
  }
});

test("each copy in the readout equals all lines at the level before", () => {
  const read = (stems, level) =>
    Object.fromEntries(
      FERN1_LEAD.readout({ stems }, level).map(({ label, value }) => [label, value]),
    );
  for (const stems of ["double", "same"])
    for (let level = 3; level <= 8; level++)
      assert.equal(read(stems, level)["Each copy"], read(stems, level - 1)["All lines"]);
  assert.deepEqual(read("double", 4), { "All lines": "84", "Each copy": "18", "Each stem": "4" });
});
