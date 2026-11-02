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

const RATIO = 2;
const base = {
  iterations: 3,
  angle: 45,
  background: "#252424",
  fillTriangles: true,
  fillSquares: true,
};

// Records each stroke with the width it would paint on the canvas.
function recordStrokes(zoom, config) {
  const strokes = [];
  let corners = 0;
  let filled = false;
  const ctx = {
    getTransform: () => ({ a: RATIO * zoom }),
    fillRect() {},
    translate() {},
    beginPath() {
      corners = 0;
      filled = false;
    },
    moveTo() {
      corners = 1;
    },
    lineTo() {
      corners++;
    },
    closePath() {},
    fill() {
      filled = true;
    },
    stroke() {
      strokes.push({
        corners,
        filled,
        lineJoin: ctx.lineJoin,
        pixels: ctx.lineWidth * RATIO * zoom,
      });
    },
  };
  drawPythagorasTree(ctx, 1000, 800, { ...base, ...config, viewport: { x: 0, y: 0, zoom } });
  return strokes;
}

test("filled shapes keep a one device pixel seam at every zoom", () => {
  for (const zoom of [1, 6, 64]) {
    const strokes = recordStrokes(zoom);
    assert.ok(strokes.length > 0);
    for (const stroke of strokes) assert.equal(stroke.pixels, 1);
  }
});

test("unfilled shapes keep the same outline on screen at every zoom", () => {
  for (const zoom of [1, 6, 64]) {
    const strokes = recordStrokes(zoom, { fillTriangles: false, fillSquares: false });
    assert.ok(strokes.length > 0);
    for (const stroke of strokes) assert.equal(stroke.pixels, RATIO);
  }
});

test("each shape gets the width for its own fill setting", () => {
  const strokes = recordStrokes(6, { fillSquares: false });
  for (const stroke of strokes) {
    assert.equal(stroke.filled, stroke.corners === 3);
    assert.equal(stroke.pixels, stroke.filled ? 1 : RATIO);
  }
});

test("sharp triangle corners do not stick out as miter spikes", () => {
  for (const stroke of recordStrokes(6)) assert.equal(stroke.lineJoin, "round");
});
