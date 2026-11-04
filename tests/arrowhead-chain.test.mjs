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
  ARROWHEAD_LEAD,
  arrowheadLines,
  lineToDot,
  untouchedCorner,
} = require("../utils/lessons/arrowheadChain.ts");

// The rule the page draws, read from the page itself.
const source = readFileSync(
  new URL("../pages/l-system/sierpinski-arrowhead.tsx", import.meta.url),
  "utf8",
);
const axiom = source.match(/axiom: "([^"]+)"/)[1];
const replace = { X: source.match(/X: "([^"]+)"/)[1], Y: source.match(/Y: "([^"]+)"/)[1] };
const angle = Number(source.match(/angle: (\d+)/)[1]);
const maxLevel = Number(source.match(/maxIterations: (\d+)/)[1]);
assert.equal(source.match(/divideFactor: (\d+)/)[1], "2");
assert.match(source, /rotate\(radians\(30\)\)/);
assert.match(source, /iterations % 2 === 0\) ctx\.rotate\(radians\(60\)\)/);

const HEIGHT = Math.sqrt(3) / 2;

/** Grid coordinates: x counts half steps, y counts rows of triangles. */
const grid = (x, y) => [Math.round(x * 2), Math.round(y / HEIGHT)];
const key = ([x, y]) => `${x},${y}`;

/** The lines the figure draws at a level, with the page's turn on even levels. */
function walk(level) {
  const { spec, legacy } = playbackSource("lsystem2d", {
    axiom,
    replace,
    angle,
    startAngle: 30 + (level % 2 === 0 ? 60 : 0),
    color: "#fff",
    background: "#000",
    lineWidth: 1,
  });
  const model = buildPlayback(spec, level - 1, legacy);
  const { positions, count } = model.geometry;
  const lines = [];
  for (let i = 0; i < count; i++) {
    const [ax, ay, bx, by] = [
      positions[i * 6],
      positions[i * 6 + 1],
      positions[i * 6 + 3],
      positions[i * 6 + 4],
    ];
    lines.push({
      from: grid(ax, ay),
      to: grid(bx, by),
      tip: grid(...untouchedCorner(ax, ay, bx, by, i, model.generation)),
    });
  }
  return { lines, generation: model.generation };
}

/** A triangle by its corners, whichever order they come in. */
const triangleKey = (corners) => corners.map(key).sort().join(" ");

/**
 * The Sierpinski triangle's stage, built the way its own page builds it and with no help from the
 * path: divide each triangle into four by joining the midpoints, then remove the middle one.
 */
function sierpinskiStage(corners, rounds) {
  if (rounds === 0) return [corners];
  const [p, q, r] = corners;
  const mid = ([ax, ay], [bx, by]) => [(ax + bx) / 2, (ay + by) / 2];
  return [
    [p, mid(p, q), mid(p, r)],
    [q, mid(p, q), mid(q, r)],
    [r, mid(p, r), mid(q, r)],
  ].flatMap((small) => sierpinskiStage(small, rounds - 1));
}

const levels = Array.from({ length: maxLevel }, (_, i) => i + 1);

test("every level has as many lines as the Sierpinski stage has triangles", () => {
  for (const level of levels) {
    const { lines } = walk(level);
    assert.equal(lines.length, arrowheadLines(level));
    assert.equal(lines.length, 3 ** (level - 1));
  }
});

test("each line is one side of its own triangle, and each triangle gets one line", () => {
  for (const level of levels) {
    const { lines } = walk(level);
    // The first level is one line and the big triangle, which every later level stays inside.
    const first = lines[0].from;
    const last = lines[lines.length - 1].to;
    const big = walk(1).lines[0];
    const scale = 2 ** (level - 1);
    assert.deepEqual(first, [big.from[0] * scale, big.from[1] * scale]);
    assert.deepEqual(last, [big.to[0] * scale, big.to[1] * scale]);
    const stage = sierpinskiStage(
      [
        [big.from[0] * scale, big.from[1] * scale],
        [big.to[0] * scale, big.to[1] * scale],
        [big.tip[0] * scale, big.tip[1] * scale],
      ],
      level - 1,
    ).map(triangleKey);
    assert.equal(new Set(stage).size, stage.length);
    const drawn = lines.map(({ from, to, tip }) => triangleKey([from, to, tip]));
    assert.equal(new Set(drawn).size, drawn.length);
    assert.deepEqual([...drawn].sort(), [...stage].sort(), `level ${level}`);
  }
});

test("the pen ends each line on a corner of the next triangle and never touches itself", () => {
  for (const level of levels) {
    const { lines } = walk(level);
    for (let i = 1; i < lines.length; i++) assert.deepEqual(lines[i - 1].to, lines[i].from);
    const visited = new Set([key(lines[0].from), ...lines.map(({ to }) => key(to))]);
    assert.equal(visited.size, lines.length + 1, `level ${level}`);
    for (const { tip } of lines) assert.ok(!visited.has(key(tip)), `level ${level}`);
  }
});

test("each line bends into its own triangle at the next level, one new line per smaller triangle", () => {
  const inside = ([x, y], [p, q, r]) => {
    const cross = (a, b) => (b[0] - a[0]) * (y - a[1]) - (b[1] - a[1]) * (x - a[0]);
    // x counts half steps and y rows, so the grid is sheared but sides stay straight.
    const signs = [cross(p, q), cross(q, r), cross(r, p)];
    return signs.every((s) => s >= 0) || signs.every((s) => s <= 0);
  };
  for (let level = 1; level < 9; level++) {
    const parents = walk(level).lines;
    const children = walk(level + 1).lines;
    parents.forEach((parent, i) => {
      const corners = [parent.from, parent.to, parent.tip].map(([x, y]) => [x * 2, y * 2]);
      for (const child of children.slice(i * 3, i * 3 + 3))
        for (const point of [child.from, child.to, child.tip])
          assert.ok(inside(point, corners), `level ${level} line ${i}`);
    });
    // The triangles lie on alternate sides of the line, so neighboring bends go opposite ways.
    parents.forEach((parent, i) => {
      if (i === 0) return;
      const side = ({ from, to, tip }) =>
        Math.sign((to[0] - from[0]) * (tip[1] - from[1]) - (to[1] - from[1]) * (tip[0] - from[0]));
      assert.equal(side(parent), -side(parents[i - 1]));
    });
  }
});

test("the dot is the untouched corner of two triangles, near one sixth and five sixths of the way", () => {
  for (const level of levels.slice(1)) {
    const { lines } = walk(level);
    const start = lines[0].from;
    const end = lines[lines.length - 1].to;
    const dot = key([(start[0] + end[0]) / 2, (start[1] + end[1]) / 2]);
    const missed = lines.flatMap((line, i) => (key(line.tip) === dot ? [i] : []));
    assert.deepEqual(missed, [Math.floor(lines.length / 6), Math.floor((5 * lines.length) / 6)]);
  }
});

test("the line stays one small triangle's height from the dot, as the readout says", () => {
  const distance = (px, py, ax, ay, bx, by) => {
    const dx = bx - ax;
    const dy = by - ay;
    const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
    return Math.hypot(px - ax - t * dx, py - ay - t * dy);
  };
  for (const level of levels.slice(1, 9)) {
    const { lines } = walk(level);
    const real = ([x, y]) => [x / 2, y * HEIGHT];
    const [sx, sy] = real(lines[0].from);
    const [ex, ey] = real(lines[lines.length - 1].to);
    const side = Math.hypot(ex - sx, ey - sy);
    const [dx, dy] = [(sx + ex) / 2, (sy + ey) / 2];
    const gaps = lines.map(({ from, to }) => distance(dx, dy, ...real(from), ...real(to)));
    const nearest = Math.min(...gaps);
    assert.ok(Math.abs(nearest / side - lineToDot(level)) < 1e-9, `level ${level}`);
    // Two lines get that close, one in each triangle, and they halve together.
    const closest = gaps.flatMap((gap, i) => (Math.abs(gap - nearest) < 1e-9 ? [i] : []));
    assert.ok(closest.includes(Math.floor(lines.length / 6)), `level ${level}`);
    assert.ok(closest.includes(Math.floor((5 * lines.length) / 6)), `level ${level}`);
  }
});

test("every untouched corner but the big triangle's own belongs to two triangles", () => {
  for (const level of levels) {
    const { lines } = walk(level);
    const counts = new Map();
    for (const { tip } of lines) counts.set(key(tip), (counts.get(key(tip)) ?? 0) + 1);
    const tally = [...counts.values()].reduce((sum, times) => {
      sum[times] = (sum[times] ?? 0) + 1;
      return sum;
    }, {});
    assert.deepEqual(
      tally,
      level === 1 ? { 1: 1 } : { 1: 1, 2: (lines.length - 1) / 2 },
      `level ${level}`,
    );
  }
});

test("the readout follows the level and the toggle", () => {
  const rows = (smallTriangles, level) =>
    Object.fromEntries(
      ARROWHEAD_LEAD.readout({ smallTriangles }, level).map(({ label, value }) => [label, value]),
    );
  assert.deepEqual(rows(true, 1), { Lines: "1", "Small triangles": "1" });
  assert.deepEqual(rows(true, 3), {
    Lines: "9",
    "Small triangles": "9",
    "Line to dot": "21.7% of side",
  });
  assert.deepEqual(rows(false, 3), { Lines: "9" });
  assert.deepEqual(rows(true, 11), {
    Lines: "59,049",
    "Small triangles": "59,049",
    "Line to dot": "0.085% of side",
  });
});
