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
const { DRAGON_LEAD } = require("../utils/lessons/dragonLevy.ts");

const LEFT = -90;
const RIGHT = 90;

/** The path as the figure draws it, with screen y pointing down. */
function path(rule, level) {
  const { spec, legacy, turns, repeat, fibonacci } = playbackSource("dragonCurve", {
    color: "#fff",
    background: "#000",
    lineWidth: 1,
    iterations: level,
    rule,
  });
  const { geometry } = buildPlayback(spec, level, legacy, turns, repeat, fibonacci);
  const points = [[geometry.positions[0], -geometry.positions[1]]];
  for (let i = 0; i < geometry.count; i++)
    points.push([geometry.positions[i * 6 + 3], -geometry.positions[i * 6 + 4]]);
  return points;
}

/** The turn at each corner as you walk the path. Negative is left on screen. */
function corners(rule, level) {
  const points = path(rule, level);
  return points.slice(0, -2).map(([ax, ay], i) => {
    const [bx, by] = points[i + 1];
    const [cx, cy] = points[i + 2];
    const cross = (bx - ax) * (cy - by) - (by - ay) * (cx - bx);
    const dot = (bx - ax) * (cx - bx) + (by - ay) * (cy - by);
    const turn = Math.round((Math.atan2(cross, dot) * 180) / Math.PI);
    // Rounding can leave -0, and a turn back along the line can come out as either sign.
    return Math.abs(turn) === 180 ? 180 : turn + 0;
  });
}

test("the dragon's new corners turn left, right, left. The Lévy curve's always turn left", () => {
  for (let level = 1; level <= 10; level++) {
    const dragon = corners("dragon", level).filter((_, i) => i % 2 === 0);
    dragon.forEach((turn, i) => assert.equal(turn, i % 2 === 0 ? LEFT : RIGHT));
    const levy = corners("levy", level).filter((_, i) => i % 2 === 0);
    levy.forEach((turn) => assert.equal(turn, LEFT));
  }
});

test("the halves turn opposite ways at their middles in the dragon, and match in the Lévy curve", () => {
  for (let level = 2; level <= 10; level++) {
    const dragon = corners("dragon", level);
    const half = (dragon.length - 1) / 2;
    const first = dragon.slice(0, half);
    const second = dragon.slice(half + 1);
    const middle = (half - 1) / 2;
    assert.equal(first[middle], LEFT);
    assert.equal(second[middle], RIGHT);
    first.forEach((turn, i) => {
      if (i !== middle) assert.equal(turn, second[i], `only the middle differs at level ${level}`);
    });
    const levy = corners("levy", level);
    assert.deepEqual(levy.slice(0, half), levy.slice(half + 1));
  }
});

test("both rules double the lines and keep right-angle corners", () => {
  for (let level = 1; level <= 10; level++)
    for (const rule of ["dragon", "levy"]) {
      assert.equal(path(rule, level).length, 2 ** level + 1);
      const allowed = [0, LEFT, RIGHT, 180];
      assert.ok(corners(rule, level).every((turn) => allowed.includes(turn)));
    }
});

test("the Lévy curve keeps its ends level, as on its own page", () => {
  for (let level = 1; level <= 8; level++) {
    const points = path("levy", level);
    const [ax, ay] = points[0];
    const [bx, by] = points.at(-1);
    assert.ok(Math.abs(ay - by) < 1e-3 * Math.abs(ax - bx), "the two ends stay level");
    assert.ok(bx < ax);
    const top = Math.min(...points.map(([, y]) => y));
    assert.ok(top < ay, "it arches upward from its ends");
  }
});

test("the readout says what the switch changes", () => {
  const value = (rule, level) => DRAGON_LEAD.readout({ rule }, level)[0].value;
  assert.equal(value("dragon", 1), "left");
  assert.equal(value("levy", 1), "left");
  assert.equal(value("dragon", 5), "left, right in turn");
  assert.equal(value("levy", 5), "always left");
});
