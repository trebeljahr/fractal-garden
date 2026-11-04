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
const { FERN2_LEAD, fern2Lines, fern2Parts } = require("../utils/lessons/fern2OldPlant.ts");

const SPEC = {
  ...DEFAULT_SPEC,
  axiom: "Y",
  rules: [
    { symbol: "X", replacement: "X[-FFF][+FFF]FX" },
    { symbol: "Y", replacement: "YFX[+Y][-Y]" },
  ],
  angle: 25.7,
  startAngle: 0,
};

const sentence = (rounds) => expand(SPEC, rounds).sentence;
const draw = (rounds) => interpret(sentence(rounds), SPEC, { legacy2d: true });

test("each level's string starts with the whole string before it", () => {
  assert.equal(sentence(1), "YFX[+Y][-Y]");
  assert.ok(sentence(2).startsWith("YFX[+Y][-Y]F"));
  for (let rounds = 1; rounds <= 8; rounds++)
    assert.ok(sentence(rounds).startsWith(sentence(rounds - 1)), `round ${rounds}`);
});

test("each level redraws every old line first, in the same place at the same length", () => {
  for (let rounds = 2; rounds <= 8; rounds++) {
    const before = draw(rounds - 1);
    const whole = draw(rounds);
    assert.deepEqual(
      Array.from(whole.positions.subarray(0, before.count * 6)),
      Array.from(before.positions.subarray(0, before.count * 6)),
    );
  }
});

test("the parts are the old plant, more stem and two turned copies of the old plant", () => {
  for (let rounds = 2; rounds <= 8; rounds++) {
    const before = draw(rounds - 1);
    const whole = draw(rounds);
    const { ends } = fern2Parts("tint", rounds);
    assert.equal(ends[0], before.count);
    assert.equal(ends.at(-1), whole.count);
    assert.equal(fern2Lines(rounds).y, whole.count);
    assert.equal(ends[3] - ends[2], before.count);
    assert.equal(ends[2] - ends[1], before.count);

    for (const [from, degrees] of [
      [ends[1], 25.7],
      [ends[2], -25.7],
    ]) {
      const turn = (degrees * Math.PI) / 180;
      const [ox, oy] = [whole.positions[from * 6], whole.positions[from * 6 + 1]];
      for (let i = 0; i < before.count * 6; i += 3) {
        const [x, y] = [before.positions[i], before.positions[i + 1]];
        const rx = x * Math.cos(turn) + y * Math.sin(turn);
        const ry = -x * Math.sin(turn) + y * Math.cos(turn);
        // The positions are 32-bit floats, far from zero at these sizes.
        assert.ok(Math.abs(whole.positions[from * 6 + i] - (ox + rx)) < 1e-2);
        assert.ok(Math.abs(whole.positions[from * 6 + i + 1] - (oy + ry)) < 1e-2);
      }
    }
  }
});

test("all new lines start at the top of the old main stem and stay at or above it", () => {
  for (let rounds = 2; rounds <= 8; rounds++) {
    const before = draw(rounds - 1);
    const whole = draw(rounds);
    const stem = 2 ** (rounds - 1) - 1;
    const o = before.count * 6;
    assert.ok(Math.abs(whole.positions[o]) < 1e-3);
    assert.ok(Math.abs(whole.positions[o + 1] - stem) < 1e-3);
    for (let i = o + 1; i < whole.count * 6; i += 3)
      assert.ok(whole.positions[i] >= stem - 1e-3, `round ${rounds}`);
  }
});

test("the readout splits each level into its old plant, new stem and two copies", () => {
  const read = (level) =>
    Object.fromEntries(
      FERN2_LEAD.readout({ oldPlant: "tint" }, level).map(({ label, value }) => [label, value]),
    );
  assert.deepEqual(read(3), { "Old plant": "1", "New stem": "8", "Two copies": "2" });
  assert.deepEqual(read(4), { "Old plant": "11", "New stem": "22", "Two copies": "22" });
  for (let level = 3; level <= 9; level++) {
    const total = FERN2_LEAD.readout({ oldPlant: "tint" }, level)
      .map(({ value }) => Number(value.replaceAll(",", "")))
      .reduce((a, b) => a + b);
    assert.equal(total, draw(level - 1).count, `level ${level}`);
  }
});
