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
const { drawFractalCanopy } = require("../utils/render/drawings/fractalCanopy.ts");

// Keep path bounds instead of allocating every segment of a deep canopy.
globalThis.Path2D = class {
  minX = Infinity;
  minY = Infinity;
  maxX = -Infinity;
  maxY = -Infinity;
  moveTo(x, y) {
    this.minX = Math.min(this.minX, x);
    this.minY = Math.min(this.minY, y);
    this.maxX = Math.max(this.maxX, x);
    this.maxY = Math.max(this.maxY, y);
  }
  lineTo(x, y) {
    this.moveTo(x, y);
  }
};

const defaults = {
  iterations: 7,
  angle: 43,
  branches: 3,
  background: "#252424",
  lengthFactor: 0.6,
  widthFactor: 0.8,
  rootWidth: 16,
};

function render(width, height, config, ratio = 1) {
  let transform = { x: 0, y: 0, scale: ratio };
  const stack = [];
  const strokes = [];
  const context = {
    lineWidth: 1,
    fillRect() {},
    save() {
      stack.push({ ...transform });
    },
    restore() {
      transform = stack.pop();
    },
    translate(x, y) {
      transform.x += x * transform.scale;
      transform.y += y * transform.scale;
    },
    scale(x, y) {
      assert.equal(x, y, "canopy must retain its aspect ratio");
      transform.scale *= x;
    },
    stroke(path) {
      const radius = (this.lineWidth * transform.scale) / 2;
      strokes.push({
        minX: (transform.x + path.minX * transform.scale - radius) / ratio,
        minY: (transform.y + path.minY * transform.scale - radius) / ratio,
        maxX: (transform.x + path.maxX * transform.scale + radius) / ratio,
        maxY: (transform.y + path.maxY * transform.scale + radius) / ratio,
      });
    },
  };
  const segments = drawFractalCanopy(context, width, height, config);
  assert.deepEqual(transform, { x: 0, y: 0, scale: ratio }, "restore the host's pixel ratio");
  assert.equal(stack.length, 0);
  for (const bounds of strokes) {
    for (const value of Object.values(bounds)) assert.ok(Number.isFinite(value));
    assert.ok(bounds.minX >= width * 0.05 - 1e-8, `left edge: ${bounds.minX}`);
    assert.ok(bounds.minY >= height * 0.05 - 1e-8, `top edge: ${bounds.minY}`);
    assert.ok(bounds.maxX <= width * 0.95 + 1e-8, `right edge: ${bounds.maxX}`);
    assert.ok(bounds.maxY <= height * 0.95 + 1e-8, `bottom edge: ${bounds.maxY}`);
  }
  return { segments, strokes };
}

test("the reported deep 152-degree canopy fits all branches above the bottom edge", () => {
  const { segments } = render(2048, 960, {
    ...defaults,
    angle: 152,
    iterations: 8,
    branches: 5,
    lengthFactor: 0.77,
    widthFactor: 0.6,
    rootWidth: 1,
  });
  assert.equal(segments, (5 ** 9 - 1) / 4, "fitting must retain every branch");
});

test("animated angles fit odd and even branching on desktop and phone", () => {
  for (const [width, height, ratio] of [
    [1440, 740, 1],
    [390, 620, 3],
    [320, 360, 2],
  ]) {
    for (const branches of [2, 3, 4, 5, 6]) {
      for (let angle = 0; angle <= 360; angle += 4) {
        render(width, height, { ...defaults, iterations: 3, branches, angle }, ratio);
      }
    }
  }
});

test("long branches and widening strokes also fit without clipping", () => {
  for (const lengthFactor of [0, 0.77, 1]) {
    for (const widthFactor of [0, 0.6, 2]) {
      render(320, 360, {
        ...defaults,
        iterations: 9,
        angle: 180,
        branches: 2,
        rootWidth: 60,
        lengthFactor,
        widthFactor,
      });
    }
  }
});
