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
const {
  FIBONACCI_LEAD,
  fibonacciDistance,
  fibonacciEnd,
  fibonacciLines,
  fibonacciParts,
} = require("../utils/lessons/fibonacciPieces.ts");

const SILVER = 1 + Math.SQRT2;
const GOLDEN = (1 + Math.sqrt(5)) / 2;

/** The page's own word and path, in whole steps. */
function drawing(level, angle = 90) {
  const { spec, legacy, turns, repeat, fibonacci } = playbackSource("fibonacciWordFractal", {
    color: "#fff",
    background: "#000",
    lineWidth: 1,
    iterations: level,
    angle,
  });
  const { word, geometry } = buildPlayback(spec, level, legacy, turns, repeat, fibonacci);
  const points = [[geometry.positions[0], geometry.positions[1]]];
  for (let i = 0; i < geometry.count; i++)
    points.push([geometry.positions[i * 6 + 3], geometry.positions[i * 6 + 4]]);
  const unit = Math.hypot(points[1][0] - points[0][0], points[1][1] - points[0][1]);
  return { word, points: points.map(([x, y]) => [x / unit, y / unit]) };
}

const change = (run) => [run.at(-1)[0] - run[0][0], run.at(-1)[1] - run[0][1]];

/** Turns `shape` onto `run`, mirrored if asked, and counts the points that land in place. */
function matching(shape, run, mirrored) {
  const flip = mirrored ? -1 : 1;
  const [ax, ay] = [shape[1][0] - shape[0][0], (shape[1][1] - shape[0][1]) * flip];
  const [bx, by] = [run[1][0] - run[0][0], run[1][1] - run[0][1]];
  const [c, s] = [ax * bx + ay * by, ax * by - ay * bx];
  let points = 0;
  for (let i = 0; i < shape.length; i++) {
    const px = shape[i][0] - shape[0][0];
    const py = (shape[i][1] - shape[0][1]) * flip;
    const x = run[0][0] + c * px - s * py;
    const y = run[0][1] + s * px + c * py;
    if (Math.hypot(x - run[i][0], y - run[i][1]) > 1e-2) return points;
    points++;
  }
  return points;
}

test("the readout's line counts and distances are the generator's", () => {
  for (let level = 1; level <= 18; level++) {
    const { word, points } = drawing(level);
    assert.equal(fibonacciLines(level), word.length);
    assert.equal(points.length, word.length + 1);
    assert.ok(Math.abs(Math.hypot(...change(points)) - fibonacciDistance(level, 90)) < 1e-2);
  }
  for (const angle of [60, 72, 120]) {
    const { points } = drawing(9, angle);
    const distance = Math.hypot(...fibonacciEnd(9, angle));
    assert.ok(Math.abs(Math.hypot(...change(points)) - distance) < 1e-2);
  }
});

test("each string is the last two joined, and an odd first string mirrors the second", () => {
  const strings = { 0: "0" };
  for (let level = 1; level <= 16; level++) strings[level] = drawing(level).word;
  const even = [];
  for (let level = 2; level <= 16; level++) {
    const { word, points } = drawing(level);
    const first = strings[level - 1].length;
    assert.equal(word, strings[level - 1] + strings[level - 2]);
    assert.ok(strings[level - 1].startsWith(strings[level - 2]), "so the two compare on screen");
    const shape = drawing(level - 2).points;
    const run = points.slice(first);
    if (first % 2) assert.equal(matching(shape, run, true), shape.length, `level ${level}`);
    else {
      assert.equal(matching(shape, run, false), shape.length, `level ${level}`);
      even.push(level);
    }
  }
  // The article's beat: the first string has even length at every third level, and only there.
  assert.deepEqual(even, [2, 5, 8, 11, 14]);
});

test("from level 5, the path is five pieces: copies from three levels back and six levels back", () => {
  for (let level = 5; level <= 18; level++) {
    const { word, points } = drawing(level);
    const copy = drawing(level - 3);
    const small = level === 5 ? "1" : drawing(level - 6).word;
    const { ends } = fibonacciParts("five", level);
    assert.equal(ends.at(-1), word.length, "the pieces use every line");
    const pieces = ends.map((end, i) => word.slice(i ? ends[i - 1] : 0, end));
    assert.equal(pieces[0], copy.word);
    assert.equal(pieces[1], copy.word);
    assert.equal(pieces[2], small);
    // The last two pieces swap their last two digits, so only their final line differs.
    for (const piece of [pieces[3], pieces[4]]) {
      assert.equal(piece.slice(0, -2), copy.word.slice(0, -2));
      assert.equal(piece.slice(-2), [...copy.word.slice(-2)].reverse().join(""));
    }
    ends.forEach((end, i) => {
      if (i === 2) return;
      const run = points.slice(i ? ends[i - 1] : 0, end + 1);
      const best = Math.max(matching(copy.points, run, false), matching(copy.points, run, true));
      assert.equal(best, copy.points.length - (i > 2 ? 1 : 0), `level ${level}, piece ${i + 1}`);
    });
  }
});

test("at every third level, the first and last pieces cancel and three pieces reach the end", () => {
  for (let level = 6; level <= 18; level += 3) {
    const { points } = drawing(level);
    const { ends } = fibonacciParts("five", level);
    const moves = ends.map((end, i) => change(points.slice(i ? ends[i - 1] : 0, end + 1)));
    const whole = change(points);
    const distance = Math.hypot(...whole);
    const along = [whole[0] / distance, whole[1] / distance];
    const onward = ([x, y]) => x * along[0] + y * along[1];
    const sideways = ([x, y]) => x * along[1] - y * along[0];

    const before = fibonacciDistance(level - 3, 90);
    const small = fibonacciDistance(level - 6, 90);
    // The end lies straight along an axis, a whole number of lines away.
    assert.ok(Math.min(Math.abs(whole[0]), Math.abs(whole[1])) < 1e-2);
    assert.equal(fibonacciDistance(level, 90), 2 * before + small);

    // The first piece adds nothing onward and goes one copy's distance sideways.
    assert.ok(Math.abs(onward(moves[0])) < 1e-2);
    assert.ok(Math.abs(Math.abs(sideways(moves[0])) - before) < 1e-2);
    // The second and third go straight onward.
    assert.ok(Math.abs(onward(moves[1]) - before) < 1e-2);
    assert.ok(Math.abs(sideways(moves[1])) < 1e-2);
    assert.ok(Math.abs(onward(moves[2]) - small) < 1e-2);
    assert.ok(Math.abs(sideways(moves[2])) < 1e-2);
    // Each of the last two ends one step off a true copy's end, and the two steps cancel.
    assert.ok(Math.abs(onward(moves[3]) + onward(moves[4]) - before) < 1e-2);
    assert.ok(Math.abs(sideways(moves[3]) + sideways(moves[4]) + sideways(moves[0])) < 1e-2);
    assert.ok(Math.abs(onward(moves[3]) - (before - 1)) < 1e-2);
    assert.ok(Math.abs(onward(moves[4]) - 1) < 1e-2);
  }
  assert.deepEqual(
    [3, 6, 9, 12, 15, 18].map((level) => fibonacciDistance(level, 90)),
    [3, 7, 17, 41, 99, 239],
  );
});

test("lines grow by the golden ratio cubed, and size by one plus the square root of two", () => {
  assert.equal(fibonacciLines(12), 4 * fibonacciLines(9) + fibonacciLines(6));
  assert.ok(Math.abs(fibonacciLines(18) / fibonacciLines(15) - GOLDEN ** 3) < 1e-4);
  assert.ok(Math.abs(fibonacciDistance(18, 90) / fibonacciDistance(15, 90) - SILVER) < 1e-3);
  // The levels between grow at the same rate, though their ends lie off the axes.
  assert.ok(Math.abs(fibonacciDistance(22, 90) / fibonacciDistance(19, 90) - SILVER) < 5e-3);
  assert.ok(Math.abs(2 + 1 / SILVER - SILVER) < 1e-12);
  assert.ok(Math.abs(4 + 1 / GOLDEN ** 3 - GOLDEN ** 3) < 1e-12);
});

test("the readout names what the figure shows", () => {
  const rows = (parts, level, angle = 90) =>
    Object.fromEntries(
      FIBONACCI_LEAD.readout({ parts, angle }, level).map((row) => [row.label, row.value]),
    );
  assert.deepEqual(rows("two", 6), { Joined: "13 + 8 lines", "Second string": "mirror image" });
  assert.deepEqual(rows("two", 5), { Joined: "8 + 5 lines", "Second string": "same turns" });
  assert.deepEqual(rows("two", 2), { Joined: "2 + 1 lines", "Second string": "one line" });
  assert.deepEqual(rows("five", 12), {
    Lines: "377 = 4 × 89 + 21",
    "Start to end": "41 = 2 × 17 + 7",
    "In three levels": "lines × 4.236, distance × 2.412",
  });
  // The sum only holds at every third level, and only for square turns.
  assert.equal(rows("five", 13)["Start to end"], "74.85");
  assert.equal(rows("five", 12, 60)["Start to end"].includes("="), false);
  assert.equal(rows("five", 3).Lines, "5");
  assert.equal(fibonacciParts("five", 4), null);
  assert.equal(fibonacciParts("one", 12), null);
  assert.deepEqual(fibonacciParts("two", 6).ends, [13, 21]);
  assert.deepEqual(fibonacciParts("five", 12).ends, [89, 178, 199, 288, 377]);
});
