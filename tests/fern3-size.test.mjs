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
const { FERN3_LEAD, fern3KeepsOldLine, fern3Size } = require("../utils/lessons/fern3Size.ts");

const RULE = "F[+FF][-FF]F[-F][+F]F";
const SPEC = {
  ...DEFAULT_SPEC,
  axiom: "F",
  rules: [{ symbol: "F", replacement: RULE }],
  angle: 22.5,
  startAngle: 0,
};
const draw = (rounds) => interpret(expand(SPEC, rounds).sentence, SPEC, { legacy2d: true });

/** The rule's nine lines on a line of length 1 pointing up: where each starts, and which way it points. */
function ruleLines() {
  const lines = [];
  let [x, y, turns] = [0, 0, 0];
  const stack = [];
  for (const symbol of RULE) {
    if (symbol === "F") {
      lines.push({ x, y, turns });
      x += Math.sin((turns * Math.PI) / 8) / 3;
      y += Math.cos((turns * Math.PI) / 8) / 3;
    } else if (symbol === "+") turns++;
    else if (symbol === "-") turns--;
    else if (symbol === "[") stack.push([x, y, turns]);
    else if (symbol === "]") [x, y, turns] = stack.pop();
  }
  return lines;
}

/**
 * How far a fern with a first line of length 1 reaches in the direction `turns` of 22.5 degrees from
 * its line, after any number of rounds. Each round only needs the round before, so this goes far
 * deeper than drawing can.
 */
function reach(rounds) {
  const lines = ruleLines();
  // Sixteen turns make a full circle.
  const wrap = (turns) => ((turns % 16) + 16) % 16;
  let reaches = Array.from({ length: 16 }, (_, turns) =>
    Math.max(0, Math.cos((turns * Math.PI) / 8)),
  );
  for (let round = 0; round < rounds; round++)
    reaches = reaches.map((_, turns) => {
      const angle = (turns * Math.PI) / 8;
      return Math.max(
        ...lines.map(
          (line) =>
            line.x * Math.sin(angle) +
            line.y * Math.cos(angle) +
            reaches[wrap(turns - line.turns)] / 3,
        ),
      );
    });
  return reaches;
}

test("the readout's height is the first line's length at every level the figure has", () => {
  for (let level = 1; level <= 6; level++)
    assert.ok(Math.abs(fern3Size(level).height - 1) < 1e-5, `level ${level}`);
  // The rule alone says so far past those levels.
  for (const rounds of [1, 5, 20, 40])
    assert.ok(Math.abs(reach(rounds)[0] - 1) < 1e-12, `${rounds} rounds`);
});

test("every old line stays in place, as the three stem steps of its replacement", () => {
  for (let rounds = 0; rounds <= 5; rounds++) {
    const before = draw(rounds);
    const next = draw(rounds + 1);
    assert.equal(next.count, before.count * 9);
    let kept = 0;
    for (let stroke = 0; stroke < next.count; stroke++) if (fern3KeepsOldLine(stroke)) kept++;
    assert.equal(kept, before.count * 3);
    for (let line = 0; line < before.count; line++) {
      const o = line * 6;
      const [ax, ay, bx, by] = [
        before.positions[o] * 3,
        before.positions[o + 1] * 3,
        before.positions[o + 3] * 3,
        before.positions[o + 4] * 3,
      ];
      [0, 5, 8].forEach((step, third) => {
        const s = (line * 9 + step) * 6;
        const along = (from, to, t) => from + ((to - from) * t) / 3;
        assert.ok(fern3KeepsOldLine(line * 9 + step));
        assert.ok(Math.abs(next.positions[s] - along(ax, bx, third)) < 1e-2);
        assert.ok(Math.abs(next.positions[s + 1] - along(ay, by, third)) < 1e-2);
        assert.ok(Math.abs(next.positions[s + 3] - along(ax, bx, third + 1)) < 1e-2);
        assert.ok(Math.abs(next.positions[s + 4] - along(ay, by, third + 1)) < 1e-2);
      });
    }
  }
});

test("every walk from the foot to a tip of level 2 is three steps, and no level has a longer one", () => {
  // Steps walked to the end of each F, in the rule.
  const walks = [];
  let steps = 0;
  const stack = [];
  for (const symbol of RULE) {
    if (symbol === "F") walks.push(++steps);
    else if (symbol === "[") stack.push(steps);
    else if (symbol === "]") steps = stack.pop();
  }
  assert.deepEqual(walks, [1, 2, 3, 2, 3, 2, 3, 3, 3]);
  // Tips are the ends of branches: F's followed by ], and the last F.
  const tips = [...RULE.matchAll(/F(?=\]|$)/g)].map(
    (match) => walks[RULE.slice(0, match.index + 1).split("F").length - 2],
  );
  assert.deepEqual(tips, [3, 3, 3, 3, 3]);

  // Longest walk, in lengths of the first line, measured along the drawn lines.
  for (let rounds = 1; rounds <= 5; rounds++) {
    const sentence = expand(SPEC, rounds).sentence;
    let [walked, longest] = [0, 0];
    const saved = [];
    for (const symbol of sentence) {
      if (symbol === "F") longest = Math.max(longest, ++walked);
      else if (symbol === "[") saved.push(walked);
      else if (symbol === "]") walked = saved.pop();
    }
    assert.equal(longest, 3 ** rounds, `round ${rounds}`);
  }
});

test("only the main stem reaches the top", () => {
  for (let rounds = 1; rounds <= 5; rounds++) {
    const { positions, count } = draw(rounds);
    let highest = 0;
    for (let i = 3; i < count * 6; i += 6)
      if (Math.abs(positions[i]) > 1e-3) highest = Math.max(highest, positions[i + 1]);
    assert.ok(highest / 3 ** rounds < 1, `round ${rounds}`);
  }
});

test("level 5 sets the width, at the tip of a line pointing straight sideways", () => {
  const widths = [1, 2, 3, 4, 5, 6].map((level) => fern3Size(level).width);
  assert.deepEqual(
    widths.map((width) => width.toFixed(3)),
    ["0.000", "0.510", "0.654", "0.687", "0.690", "0.690"],
  );

  // Half the width, reaching in the direction four turns of 22.5 degrees from the first line.
  const half = (rounds) => reach(rounds)[4];
  assert.ok(half(3) < half(4) - 1e-3);
  for (const rounds of [5, 6, 10, 20, 40])
    assert.ok(Math.abs(half(rounds) - half(4)) < 1e-12, `${rounds} rounds`);

  // The widest tip of level 5 belongs to a line four turns from upright.
  const { positions, count } = draw(4);
  let widest = 0;
  for (let i = 1; i < count; i++) if (positions[i * 6 + 3] > positions[widest * 6 + 3]) widest = i;
  const o = widest * 6;
  assert.ok(Math.abs(positions[o + 4] - positions[o + 1]) < 1e-3, "the line is level");
  assert.ok(positions[o + 3] > positions[o], "it points outward");
});

test("the readout names height, width and lines for a level", () => {
  assert.deepEqual(FERN3_LEAD.readout({}, 3), [
    { label: "Height", value: "1.000" },
    { label: "Width", value: "0.654" },
    { label: "Lines", value: "81" },
  ]);
});
