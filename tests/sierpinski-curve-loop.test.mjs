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
  diamondSquares,
  loopFarthest,
  loopInside,
  loopWidth,
  SIERPINSKI_CURVE_LEAD,
  staircaseDiamond,
} = require("../utils/lessons/sierpinskiCurveLoop.ts");

const AXIOM = "F+XF+F+XF";
const RULE = { X: "XF-F+F-XF+F+XF-F+F-X" };
const LEVELS = [1, 2, 3, 4, 5, 6, 7];

// The walk the figure draws at a level, in whole steps. Level 1 is the start, with no replacement.
function walk(level) {
  const source = playbackSource("lsystem2d", {
    axiom: AXIOM,
    replace: RULE,
    angle: 90,
    startAngle: 0,
    color: "#fff",
    background: "#000",
    lineWidth: 1,
  });
  const { positions, count } = buildPlayback(source.spec, level - 1, source.legacy).geometry;
  const points = [[Math.round(positions[0]), Math.round(positions[1])]];
  for (let i = 0; i < count; i++)
    points.push([Math.round(positions[i * 6 + 3]), Math.round(positions[i * 6 + 4])]);
  const minX = points.reduce((low, [x]) => Math.min(low, x), Infinity);
  const minY = points.reduce((low, [, y]) => Math.min(low, y), Infinity);
  return points.map(([x, y]) => [x - minX, y - minY]);
}
const WALKS = new Map(LEVELS.map((level) => [level, walk(level)]));

const size = (points) => Math.max(...points.flat());

/** Small squares, as distances from the diamond's center, that the line encloses. */
function insideSquares(points) {
  const width = size(points);
  const across = new Set();
  const along = new Set();
  for (let i = 1; i < points.length; i++) {
    const [ax, ay] = points[i - 1];
    const [bx, by] = points[i];
    if (ay === by) across.add(`${Math.min(ax, bx)},${ay}`);
    else along.add(`${ax},${Math.min(ay, by)}`);
  }
  const reached = new Set(["-1,-1"]);
  const stack = [[-1, -1]];
  const go = (x, y, wall) => {
    if (x < -1 || y < -1 || x > width || y > width || wall || reached.has(`${x},${y}`)) return;
    reached.add(`${x},${y}`);
    stack.push([x, y]);
  };
  while (stack.length) {
    const [x, y] = stack.pop();
    go(x + 1, y, along.has(`${x + 1},${y}`));
    go(x - 1, y, along.has(`${x},${y}`));
    go(x, y + 1, across.has(`${x},${y + 1}`));
    go(x, y - 1, across.has(`${x},${y}`));
  }
  const reach = (width - 1) / 2;
  const inside = new Set();
  for (let y = 0; y < width; y++)
    for (let x = 0; x < width; x++)
      if (!reached.has(`${x},${y}`)) inside.add(`${x - reach},${y - reach}`);
  return inside;
}

test("the figure draws the page's own rule, and every step is one length at any level", () => {
  const page = readFileSync(
    new URL("../pages/l-system/sierpinski-curve.tsx", import.meta.url),
    "utf8",
  );
  assert.ok(page.includes(`axiom: "${AXIOM}"`));
  assert.ok(page.includes(`X: "${RULE.X}"`));
  assert.ok(page.includes("angle: 90"));
  assert.ok(page.includes("constructionLead={SIERPINSKI_CURVE_LEAD}"));
  // The page's 2.05 only shrinks the whole drawing: lsystem2d divides every step by it alike.
  const render = readFileSync(new URL("../utils/render/lsystem2d.ts", import.meta.url), "utf8");
  assert.ok(render.includes("params.initialLength / params.divideFactor ** generation"));
  for (const [level, points] of WALKS)
    for (let i = 1; i < points.length; i++) {
      const steps =
        Math.abs(points[i][0] - points[i - 1][0]) + Math.abs(points[i][1] - points[i - 1][1]);
      assert.equal(steps, 1, `level ${level}`);
    }
});

test("every level is one closed line that never touches itself", () => {
  for (const [level, points] of WALKS) {
    assert.deepEqual(points.at(-1), points[0], `level ${level} closes`);
    const seen = new Set(points.slice(1).map(String));
    assert.equal(seen.size, points.length - 1, `level ${level} visits each point once`);
  }
});

test("the width and the inside are what the readout says, by shoelace and by count", () => {
  for (const [level, points] of WALKS) {
    const width = size(points);
    assert.equal(width, loopWidth(level), `level ${level} width`);
    let doubled = 0;
    for (let i = 1; i < points.length; i++)
      doubled += points[i - 1][0] * points[i][1] - points[i][0] * points[i - 1][1];
    assert.equal(Math.abs(doubled) / 2, loopInside(level), `level ${level} shoelace`);
    assert.equal(insideSquares(points).size, loopInside(level), `level ${level} count`);
  }
});

test("each level is four copies of the last around a 3 by 3 square, one step removed per copy", () => {
  const edges = (points, dx = 0, dy = 0) => {
    const set = new Set();
    for (let i = 1; i < points.length; i++) {
      const a = [2 * points[i - 1][0] + dx, 2 * points[i - 1][1] + dy];
      const b = [2 * points[i][0] + dx, 2 * points[i][1] + dy];
      set.add(`${(a[0] + b[0]) / 2},${(a[1] + b[1]) / 2}`);
    }
    return set;
  };
  for (const level of LEVELS.slice(1)) {
    const last = loopWidth(level - 1);
    const middle = loopWidth(level) / 2;
    const offset = (last + 3) / 2;
    // Line midpoints, doubled so they stay whole, around the center of the new level.
    const line = edges(WALKS.get(level), -2 * middle, -2 * middle);
    const copies = [
      [offset, 0],
      [-offset, 0],
      [0, offset],
      [0, -offset],
    ].map(([x, y]) => edges(WALKS.get(level - 1), 2 * (x - last / 2), 2 * (y - last / 2)));
    const square = new Set();
    for (const along of [-2, 0, 2])
      for (const side of [-3, 3]) {
        square.add(`${along},${side}`);
        square.add(`${side},${along}`);
      }
    const shared = ["0,3", "0,-3", "3,0", "-3,0"];
    const expected = new Set([...square].filter((edge) => !shared.includes(edge)));
    for (const copy of copies) {
      const touching = [...copy].filter((edge) => square.has(edge));
      assert.equal(touching.length, 1, `level ${level}: a copy touches the square along one step`);
      assert.ok(shared.includes(touching[0]), `level ${level}: at the middle of a side`);
      for (const edge of copy) if (edge !== touching[0]) expected.add(edge);
    }
    assert.equal(expected.size, line.size, `level ${level} line count`);
    for (const edge of expected) assert.ok(line.has(edge), `level ${level} has ${edge}`);
  }
});

test("adding 3 turns the numbers in the article into doubling and quadrupling", () => {
  for (const level of LEVELS) {
    assert.equal(loopWidth(level) + 3, 2 ** (level + 1));
    assert.equal(loopInside(level) + 3, 4 ** level);
    assert.equal(loopInside(level) + 3, (loopWidth(level) + 3) ** 2 / 4);
    if (level > 1) {
      assert.equal(loopWidth(level), 2 * loopWidth(level - 1) + 3);
      assert.equal(loopInside(level), 4 * loopInside(level - 1) + 9);
    }
  }
});

test("the article's lists of numbers are this line's widths and insides", () => {
  const article = readFileSync(
    new URL("../fractal-descriptions/sierpinski-curve.md", import.meta.url),
    "utf8",
  );
  const levels = [1, 2, 3, 4, 5];
  for (const list of [
    levels.map(loopWidth),
    levels.map(loopInside),
    levels.map((level) => loopWidth(level) + 3),
    levels.map((level) => loopInside(level) + 3),
  ])
    assert.ok(article.includes(list.join(", ")), list.join(", "));
});

test("the line stays inside the staircase, and the inside's share falls toward half", () => {
  let last = Infinity;
  for (const [level, points] of WALKS) {
    const width = size(points);
    const reach = (width - 1) / 2;
    for (const square of insideSquares(points)) {
      const [x, y] = square.split(",").map(Number);
      assert.ok(Math.abs(x) + Math.abs(y) <= reach, `level ${level}: ${square}`);
    }
    const corners = staircaseDiamond(width);
    let doubled = 0;
    corners.forEach(([x, y], i) => {
      const [nextX, nextY] = corners[(i + 1) % corners.length];
      doubled += x * nextY - nextX * y;
    });
    assert.equal(doubled / 2, diamondSquares(width), `level ${level} staircase area`);
    const share = loopInside(level) / diamondSquares(width);
    assert.ok(share > 0.5, `level ${level} stays above half`);
    assert.ok(share <= last, `level ${level} falls`);
    last = share;
  }
  // The gap to one half shrinks about as fast as a step does, and the limit is exactly one half.
  for (const level of [10, 20, 26]) {
    const share = loopInside(level) / diamondSquares(loopWidth(level));
    assert.ok(share - 0.5 < 4 / 2 ** (level + 1), `level ${level}`);
  }
});

test("no spot in the diamond is farther from the line than the readout says", () => {
  // Fine sampling at the lower levels, and every half step, where the farthest spot sits, above.
  for (const [level, perStep] of [
    [1, 16],
    [2, 16],
    [3, 16],
    [4, 8],
    [5, 8],
    [6, 2],
    [7, 2],
  ]) {
    const points = WALKS.get(level);
    const width = size(points);
    const reach = (width - 1) / 2;
    const across = new Set();
    const along = new Set();
    for (let i = 1; i < points.length; i++) {
      const [ax, ay] = points[i - 1];
      const [bx, by] = points[i];
      if (ay === by) across.add(Math.min(ax, bx) * 65536 + ay);
      else along.add(ax * 65536 + Math.min(ay, by));
    }
    const distance = (x, y) => {
      let best = Infinity;
      const [cx, cy] = [Math.floor(x), Math.floor(y)];
      for (let b = cy - 4; b <= cy + 4; b++)
        for (let a = cx - 4; a <= cx + 4; a++) {
          if (a < 0 || b < 0) continue;
          if (across.has(a * 65536 + b)) {
            const t = Math.max(0, Math.min(1, x - a));
            best = Math.min(best, (a + t - x) ** 2 + (b - y) ** 2);
          }
          if (along.has(a * 65536 + b)) {
            const t = Math.max(0, Math.min(1, y - b));
            best = Math.min(best, (a - x) ** 2 + (b + t - y) ** 2);
          }
        }
      return Math.sqrt(best);
    };
    let farthest = 0;
    for (let y = 0; y < width; y++)
      for (let x = 0; x < width; x++) {
        if (Math.abs(x - reach) + Math.abs(y - reach) > reach) continue;
        for (let v = 0; v <= perStep; v++)
          for (let u = 0; u <= perStep; u++)
            farthest = Math.max(farthest, distance(x + u / perStep, y + v / perStep));
      }
    assert.ok(Math.abs(farthest - loopFarthest(level)) < 1e-9, `level ${level}: ${farthest}`);
  }
});

test("the readout gives the width, the farthest spot and both shares", () => {
  const read = (level) =>
    Object.fromEntries(
      SIERPINSKI_CURVE_LEAD.readout({ loopRegions: true }, level).map((row) => [
        row.label,
        row.value,
      ]),
    );
  assert.deepEqual(read(1), {
    Width: "1 step",
    "Farthest from the line": "0.5 steps",
    Inside: "100.0%",
    Outside: "0%",
  });
  assert.deepEqual(read(3), {
    Width: "13 steps",
    "Farthest from the line": "1.6 steps",
    Inside: "71.8%",
    Outside: "28.2%",
  });
  assert.equal(read(7).Inside, "51.2%");
  assert.equal(read(7).Outside, "48.8%");
});
