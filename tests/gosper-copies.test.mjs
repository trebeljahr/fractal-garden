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
const { GOSPER_COPY_TINTS, GOSPER_LEAD } = require("../utils/lessons/gosperCopies.ts");

const SETTINGS = { color: "#fff", background: "#000", lineWidth: 1 };

function path(level) {
  const { spec, legacy, turns, repeat, fibonacci } = playbackSource("gosperCurve", {
    ...SETTINGS,
    iterations: level,
  });
  const { geometry } = buildPlayback(spec, level, legacy, turns, repeat, fibonacci);
  const points = [[geometry.positions[0], geometry.positions[1]]];
  for (let i = 0; i < geometry.count; i++)
    points.push([geometry.positions[i * 6 + 3], geometry.positions[i * 6 + 4]]);
  return points;
}

/** Turns the whole of `shape` onto `run` without mirroring it, or says it can't be done. */
function fits(shape, run) {
  const dx = shape[1][0] - shape[0][0];
  const dy = shape[1][1] - shape[0][1];
  const ex = run[1][0] - run[0][0];
  const ey = run[1][1] - run[0][1];
  const c = dx * ex + dy * ey;
  const s = dx * ey - dy * ex;
  const size = dx * dx + dy * dy;
  return shape.every(([x, y], i) => {
    const px = x - shape[0][0];
    const py = y - shape[0][1];
    const qx = run[0][0] + (c * px - s * py) / size;
    const qy = run[0][1] + (s * px + c * py) / size;
    return Math.hypot(qx - run[i][0], qy - run[i][1]) < 1e-3;
  });
}

test("every round is seven copies of the last: four run forward and three backward", () => {
  for (let level = 2; level <= 5; level++) {
    const whole = path(level);
    const last = path(level - 1);
    const size = 7 ** (level - 1);
    assert.equal(whole.length, 7 ** level + 1);
    const directions = Array.from({ length: 7 }, (_, copy) => {
      const run = whole.slice(copy * size, (copy + 1) * size + 1);
      assert.deepEqual(run[0], whole[copy * size], "each copy starts where the last one ended");
      if (fits(last, run)) return "forward";
      if (fits(last, [...run].reverse())) return "backward";
      return "neither";
    });
    assert.deepEqual(directions, [
      "forward",
      "backward",
      "backward",
      "forward",
      "forward",
      "forward",
      "backward",
    ]);
  }
});

test("the whole path spans the square root of seven times the last round's span", () => {
  const span = (points) =>
    Math.hypot(points.at(-1)[0] - points[0][0], points.at(-1)[1] - points[0][1]);
  for (let level = 1; level <= 5; level++)
    assert.ok(Math.abs(span(path(level)) / span(path(level - 1)) - Math.sqrt(7)) < 1e-3);
});

test("every line keeps to multiples of 60 degrees, and the path never revisits a point", () => {
  const points = path(4);
  const seen = new Set();
  for (let i = 0; i < points.length; i++) {
    seen.add(points[i].map((value) => value.toFixed(2)).join());
    if (!i) continue;
    const angle =
      (Math.atan2(points[i][1] - points[i - 1][1], points[i][0] - points[i - 1][0]) * 180) /
      Math.PI;
    assert.ok(Math.abs(angle / 60 - Math.round(angle / 60)) < 1e-3, `${angle}`);
  }
  assert.equal(seen.size, points.length);
});

test("seven tints, and the readout's size and line count are the copies'", () => {
  assert.equal(new Set(GOSPER_COPY_TINTS).size, 7);
  assert.deepEqual(GOSPER_LEAD.readout({}, 3), [
    { label: "Lines in each copy", value: "49" },
    { label: "Each copy's size", value: "37.8%" },
  ]);
});
