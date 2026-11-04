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
const { VICSEK_OFFSETS } = require("../utils/render/drawings/vicsekFractal2D.ts");
const {
  notchTriangleTip,
  QUADRATIC_LEAD,
  QUADRATIC_STARTS,
  quadraticAreaLeft,
} = require("../utils/lessons/quadraticStart.ts");

const RULE = { F: "F+F-F-F+F" };
const STARTS = [
  [QUADRATIC_STARTS.two, 2],
  [QUADRATIC_STARTS.one, 1],
];

// The walk the figure draws, in whole steps and screen directions (y pointing down).
function walk(axiom, replacements) {
  const source = playbackSource("lsystem2d", {
    axiom,
    replace: RULE,
    angle: 90,
    startAngle: 0,
    color: "#fff",
    background: "#000",
    lineWidth: 1,
  });
  const { positions, count } = buildPlayback(source.spec, replacements, source.legacy).geometry;
  const points = [[Math.round(positions[0]), Math.round(-positions[1])]];
  for (let i = 0; i < count; i++)
    points.push([Math.round(positions[i * 6 + 3]), Math.round(-positions[i * 6 + 4])]);
  const minX = points.reduce((low, [x]) => Math.min(low, x), Infinity);
  const minY = points.reduce((low, [, y]) => Math.min(low, y), Infinity);
  return points.map(([x, y]) => [x - minX, y - minY]);
}
const area = (points) =>
  points.reduce(
    (sum, [x, y], i) => (i ? sum + (points[i - 1][0] * y - x * points[i - 1][1]) / 2 : sum),
    0,
  );
const lineKey = ([ax, ay], [bx, by]) =>
  ax + ay < bx + by ? `${ax},${ay}|${bx},${by}` : `${bx},${by}|${ax},${ay}`;

test("the figure opens on the page's own rule and start", () => {
  const page = readFileSync(
    new URL("../pages/l-system/quadratic-snowflake.tsx", import.meta.url),
    "utf8",
  );
  assert.ok(page.includes(`axiom: "${QUADRATIC_STARTS.two}"`));
  assert.ok(page.includes(`F: "${RULE.F}"`));
  assert.equal(QUADRATIC_LEAD.initial.start, "two");
});

test("the line closes, walks clockwise, and the readout is the area inside it", () => {
  for (const [axiom, steps] of STARTS)
    for (let n = 0; n <= 6; n++) {
      const points = walk(axiom, n);
      assert.equal(points.length - 1, 4 * steps * 5 ** n);
      assert.deepEqual(points[0], points.at(-1));
      const lines = new Set(points.slice(1).map((point, i) => lineKey(points[i], point)));
      assert.equal(lines.size, points.length - 1, "no line is drawn twice");
      const side = steps * 3 ** n;
      // Positive with y pointing down means clockwise, which keeps the inside on the line's right.
      assert.ok(area(points) > 0);
      assert.ok(Math.abs(area(points) / side ** 2 - quadraticAreaLeft(steps, n)) < 1e-12);
    }
  assert.ok(Math.abs(quadraticAreaLeft(2, 1) - 0.7778) < 1e-4);
  assert.ok(Math.abs(quadraticAreaLeft(1, 1) - 0.5556) < 1e-4);
});

test("a line's triangle is exactly its notch plus the triangles on its five new lines", () => {
  const inTriangle = ([px, py], [a, b, c]) => {
    const side = (p, q) => (q[0] - p[0]) * (py - p[1]) - (q[1] - p[1]) * (px - p[0]);
    const signs = [side(a, b), side(b, c), side(c, a)];
    return signs.every((s) => s > 0) || signs.every((s) => s < 0);
  };
  const triangle = (a, b) => [a, b, notchTriangleTip(a[0], a[1], b[0], b[1])];
  const before = walk(QUADRATIC_STARTS.two, 1);
  const after = walk(QUADRATIC_STARTS.two, 2);
  for (let line = 0; line < before.length - 1; line++) {
    // One line of 1/3 is three of the next level's lines.
    const [a, b] = [before[line], before[line + 1]].map(([x, y]) => [3 * x, 3 * y]);
    const whole = triangle(a, b);
    const pieces = after
      .slice(5 * line + 1, 5 * line + 6)
      .map((point, i) => triangle(after[5 * line + i], point));
    const corners = after.slice(5 * line + 1, 5 * line + 5);
    const notch = [Math.min(...corners.map(([x]) => x)), Math.min(...corners.map(([, y]) => y))];
    for (let i = 0; i < 300; i++)
      for (let j = 0; j < 300; j++) {
        const point = [
          Math.min(a[0], b[0], whole[2][0]) + (i + 0.37) / 100,
          Math.min(a[1], b[1], whole[2][1]) + (j + 0.41) / 100,
        ];
        const inNotch =
          point[0] > notch[0] &&
          point[0] < notch[0] + 1 &&
          point[1] > notch[1] &&
          point[1] < notch[1] + 1;
        const holders = pieces.filter((piece) => inTriangle(point, piece)).length + +inNotch;
        assert.equal(holders, inTriangle(point, whole) ? 1 : 0);
      }
  }
});

test("two steps per side leave the diamond whole; one step leaves no room", () => {
  for (let n = 0; n <= 6; n++) {
    const half = 3 ** n;
    const reach = walk(QUADRATIC_STARTS.two, n).map(
      ([x, y]) => Math.abs(x - half) + Math.abs(y - half),
    );
    assert.ok(
      reach.every((distance) => distance >= half),
      "no point is inside the diamond",
    );
    if (n) assert.ok(reach.includes(half), "notches reach the diamond's edge");
  }
  // Eight triangles on lines of half a side fill half the square, and four on whole sides fill it.
  for (const [axiom, steps] of STARTS) {
    const points = walk(axiom, 0);
    const tips = points.slice(1).map((b, i) => notchTriangleTip(...points[i], ...b));
    for (const [x, y] of tips) assert.ok(x > 0 && y > 0 && x < steps && y < steps, "tip inside");
    assert.equal(tips.length / 4 / steps ** 2, 1 / steps);
  }
});

test("one step per side is the outline of the diagonal Vicsek squares, edge for edge", () => {
  let cells = [[0, 0]];
  for (let n = 0; n <= 6; n++) {
    const outline = new Set();
    for (const [x, y] of cells)
      for (const [a, b] of [
        [
          [x, y],
          [x + 1, y],
        ],
        [
          [x + 1, y],
          [x + 1, y + 1],
        ],
        [
          [x, y + 1],
          [x + 1, y + 1],
        ],
        [
          [x, y],
          [x, y + 1],
        ],
      ]) {
        assert.ok(!outline.has(lineKey(a, b)), "squares share no edge");
        outline.add(lineKey(a, b));
      }
    const points = walk(QUADRATIC_STARTS.one, n);
    const line = new Set(points.slice(1).map((point, i) => lineKey(points[i], point)));
    assert.deepEqual(line, outline);
    cells = cells.flatMap(([x, y]) =>
      VICSEK_OFFSETS.saltire.map(([ox, oy]) => [3 * x + ox, 3 * y + oy]),
    );
  }
});

test("the lead reads the area for each start, with level 1 as the square itself", () => {
  const read = (start, level) => QUADRATIC_LEAD.readout({ start }, level)[0].value;
  assert.equal(read("two", 1), "100.0%");
  assert.equal(read("two", 2), "77.8%");
  assert.equal(read("two", 3), "65.4%");
  assert.equal(read("two", 4), "58.6%");
  assert.equal(read("two", 7), "51.5%");
  assert.equal(read("one", 2), "55.6%");
  assert.equal(read("one", 7), "2.9%");
});
