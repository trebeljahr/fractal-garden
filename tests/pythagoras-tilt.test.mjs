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
const { drawPythagorasTree } = require("../utils/render/drawings/pythagorasTree.ts");
const { formatShare } = require("../utils/constructionLead.ts");
const {
  levelSquares,
  leftShare,
  rightShare,
  PYTHAGORAS_LEAD,
} = require("../utils/lessons/pythagorasTilt.ts");

const close = (a, b, tolerance = 1e-9) => assert.ok(Math.abs(a - b) < tolerance, `${a} vs ${b}`);

// Run the generator and return its squares in the order it draws them, in first-square units.
function squares(angle, iterations) {
  const polygons = [];
  let current = null;
  let dy = 0;
  const ctx = {
    getTransform: () => ({ a: 1 }),
    fillRect() {},
    translate(_x, y) {
      dy = y;
    },
    beginPath() {
      current = [];
    },
    moveTo(x, y) {
      current.push([x, y]);
    },
    lineTo(x, y) {
      current.push([x, y]);
    },
    closePath() {
      polygons.push(current);
    },
    fill() {},
    stroke() {},
  };
  drawPythagorasTree(ctx, 900, 500, {
    iterations,
    angle,
    background: "",
    fillTriangles: true,
    fillSquares: true,
  });
  const size = 100;
  return { all: polygons.filter((p) => p.length === 4), size, lift: 500 - dy };
}

const area = ([a, b]) => Math.hypot(a[0] - b[0], a[1] - b[1]) ** 2;

test("each pair of new squares splits its parent's area as the readout says", () => {
  for (const angle of [30, 37, 45, 52, 60]) {
    const { all, size } = squares(angle, 1);
    assert.equal(all.length, 3);
    const parent = area(all[0]);
    close(parent, size * size);
    close(area(all[1]) / parent, leftShare(angle));
    close(area(all[2]) / parent, rightShare(angle));
  }
});

test("each level's squares add up to the first square, from the biggest down to the smallest", () => {
  for (const angle of [30, 45, 60]) {
    for (const level of [1, 2, 5, 10]) {
      const { all, size } = squares(angle, level);
      // The generator draws a branch depth first; a square's level follows from its place in that order.
      const shares = [];
      let index = 0;
      const walk = (depth) => {
        const share = area(all[index++]) / (size * size);
        if (depth === level) shares.push(share);
        else {
          walk(depth + 1);
          walk(depth + 1);
        }
      };
      walk(0);
      const summary = levelSquares(angle, level);
      assert.equal(shares.length, summary.count);
      close(
        shares.reduce((sum, value) => sum + value, 0),
        summary.total,
      );
      close(summary.total, 1);
      close(Math.max(...shares), summary.biggest);
      close(Math.min(...shares), summary.smallest);
    }
  }
});

test("the article's numbers at 30 degrees", () => {
  assert.equal(formatShare(leftShare(30)), "75.0%");
  assert.equal(formatShare(rightShare(30)), "25.0%");
  const level10 = levelSquares(30, 10);
  assert.equal(level10.count, 1024);
  assert.equal(formatShare(level10.biggest), "5.6%");
  assert.equal(formatShare(level10.smallest), "0.000095%");
  assert.equal(formatShare(level10.total), "100.0%");
  close(Math.cos(Math.PI / 6), 0.866, 1e-3);
});

test("at 30 degrees the chain of biggest squares has turned 180 degrees by level 6", () => {
  const { all } = squares(30, 6);
  // Depth first, always left: the first seven squares drawn are that chain.
  const chain = all.slice(0, 7);
  const direction = ([a, b]) => (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI;
  for (let level = 0; level < 7; level++) {
    const turned = (((direction(chain[level]) + 360) % 360) + 30 * level) % 360;
    close(turned, 0, 1e-6);
    close(Math.sqrt(area(chain[level]) / area(chain[0])), Math.cos(Math.PI / 6) ** level);
  }
});

test("a tilted tree stays inside the drawing, including the part that curls below its first square", () => {
  for (const angle of [30, 35, 40, 45, 50, 55, 60]) {
    const { all, lift, size } = squares(angle, 11);
    const ys = all.flat().map(([, y]) => y);
    assert.ok(Math.max(...ys) <= lift + 1e-9, `${angle}: below the bottom`);
    assert.ok(-Math.min(...ys) + lift <= 500 + 1e-9, `${angle}: above the top`);
    assert.ok(size > 0);
  }
  assert.equal(squares(45, 2).lift, 0);
});

test("the lead shows the tilt with its readout", () => {
  const rows = PYTHAGORAS_LEAD.readout({ angle: 45 }, 2);
  assert.deepEqual(
    rows.map((row) => row.value),
    ["50.0%", "50.0%", "25.0%", "25.0%", "100.0%"],
  );
  assert.equal(rows[4].label, "All 4 squares");
  assert.equal(PYTHAGORAS_LEAD.readout({ angle: 45 }, 0)[4].label, "The first square");
  assert.equal(PYTHAGORAS_LEAD.control.min, 30);
  assert.equal(PYTHAGORAS_LEAD.control.max, 60);
});
