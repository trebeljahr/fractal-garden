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
const { buildPlayback, playbackSource } = require("../utils/lsystem/playback.ts");
const { FERN4_LEAD, fern4Rules, fern4StemTurn } = require("../utils/lessons/fern4Plus.ts");

function model(finalPlus, generation) {
  const { spec } = playbackSource("lsystem2d", {
    axiom: "X",
    replace: fern4Rules({ finalPlus }),
    angle: 20,
    startAngle: 0,
    color: "#fff",
    background: "#000",
    lineWidth: 1,
  });
  return buildPlayback(spec, generation, true);
}

/** The direction of the last line drawn outside every bracket, against the first line. */
function stemTurn(finalPlus, generation) {
  const { word, poses } = model(finalPlus, generation);
  const heading = (index) => [poses[index * 6 + 3], poses[index * 6 + 4]];
  let depth = 0;
  let first = -1;
  let last = -1;
  for (let i = 0; i < word.length; i++) {
    if (word[i] === "[") depth++;
    if (word[i] === "]") depth--;
    if (word[i] === "F" && depth === 0) {
      if (first < 0) first = i;
      last = i;
    }
  }
  const [ax, ay] = heading(first + 1);
  const [bx, by] = heading(last + 1);
  return Math.abs((Math.atan2(ax * by - ay * bx, ax * bx + ay * by) * 180) / Math.PI);
}

test("the plus outside turns the main stem 20 degrees a round, and inside it stays straight", () => {
  for (let generation = 1; generation <= 8; generation++) {
    assert.ok(Math.abs(stemTurn("inside", generation)) < 1e-3, `inside ${generation}`);
    assert.equal(fern4StemTurn("inside", generation), 0);
    assert.ok(
      Math.abs(stemTurn("outside", generation) - 20 * (generation - 1)) < 1e-3,
      `outside ${generation}`,
    );
    assert.equal(fern4StemTurn("outside", generation), 20 * (generation - 1));
  }
});

test("both rules draw the same number of lines, so only the turn changes", () => {
  for (let generation = 1; generation <= 7; generation++)
    assert.equal(
      model("outside", generation).geometry.count,
      model("inside", generation).geometry.count,
    );
});

test("the readout names the figure's level, one above the rewriting generation", () => {
  assert.deepEqual(FERN4_LEAD.readout({ finalPlus: "outside" }, 7), [
    { label: "Top of main stem", value: "turned 100°" },
  ]);
  assert.deepEqual(FERN4_LEAD.readout({ finalPlus: "inside" }, 7), [
    { label: "Top of main stem", value: "turned 0°" },
  ]);
});
