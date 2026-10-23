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
const {
  INITIAL_CANVAS_VIEW,
  MAX_CANVAS_ZOOM,
  moveCanvasViewport,
  restoreCanvasViewport,
} = require("../utils/canvasViewport.ts");
const { BuddhabrotRenderer } = require("../utils/render/buddhabrot.ts");

function scenePoint(view, width, height, x, y) {
  const side = Math.min(width, height);
  return [
    view.x + (x - width / 2) / (side * view.zoom),
    view.y + (y - height / 2) / (side * view.zoom),
  ];
}

test("zoom preserves the scene point under an off-center cursor on wide and tall screens", () => {
  for (const [width, height] of [
    [1200, 700],
    [390, 750],
  ]) {
    let view = INITIAL_CANVAS_VIEW;
    for (const factor of [2, 3, 1.5, 0.8]) {
      const x = width * 0.3,
        y = height * 0.7;
      const before = scenePoint(view, width, height, x, y);
      view = moveCanvasViewport(view, width, height, factor, x, y);
      const after = scenePoint(view, width, height, x, y);
      before.forEach((value, i) => {
        assert.ok(Math.abs(value - after[i]) < 1e-12);
      });
    }
  }
});

test("dragging and a moving pinch keep the grabbed point under the fingers", () => {
  const width = 1000,
    height = 700,
    x = 420,
    y = 310,
    dx = 60,
    dy = -30;
  const view = { x: 0.2, y: -0.3, zoom: 3 };
  for (const factor of [1, 1.7, 0.8]) {
    const next = moveCanvasViewport(view, width, height, factor, x, y, dx, dy);
    const before = scenePoint(view, width, height, x, y);
    const after = scenePoint(next, width, height, x + dx, y + dy);
    before.forEach((value, i) => {
      assert.ok(Math.abs(value - after[i]) < 1e-12);
    });
  }
});

test("zoom limits remain finite and returning to the opening scale resets panning", () => {
  const view = moveCanvasViewport(INITIAL_CANVAS_VIEW, 1000, 700, 1e20, 300, 500);
  assert.equal(view.zoom, MAX_CANVAS_ZOOM);
  assert.deepEqual(moveCanvasViewport(view, 1000, 700, 1e-20, 300, 500), INITIAL_CANVAS_VIEW);
});

test("shared camera state round-trips and rejects invalid or excessive values", () => {
  const view = { x: 0.25, y: -0.4, zoom: 8 };
  assert.deepEqual(restoreCanvasViewport(JSON.parse(JSON.stringify(view))), view);
  for (const invalid of [
    null,
    {},
    { ...view, x: NaN },
    { ...view, y: Infinity },
    { ...view, zoom: 0 },
    { ...view, zoom: 65 },
  ]) {
    assert.deepEqual(restoreCanvasViewport(invalid), INITIAL_CANVAS_VIEW);
  }
});

test("Buddhabrot opens as a populated still and samples only when playback is enabled", () => {
  const renderer = new BuddhabrotRenderer();
  const labels = [];
  const ctx = {
    canvas: { width: 80, height: 60 },
    createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }),
    putImageData() {},
    setTransform() {},
    measureText: () => ({ width: 20 }),
    fillText: (text) => labels.push(text),
  };
  const params = {
    maxIterations: 40,
    minOrbitLength: 5,
    samplesPerFrame: 50,
    exposure: 0.9,
    background: "#252424",
    color: "#b8f4ff",
    paused: true,
  };
  renderer.update(params);
  assert.equal(renderer.draw(ctx, 80, 60), false);
  assert.equal(labels.at(-1), "Samples: 12,000");
  assert.equal(renderer.draw(ctx, 80, 60), false);
  assert.equal(labels.at(-1), "Samples: 12,000");
  renderer.update({ ...params, paused: false });
  assert.equal(renderer.draw(ctx, 80, 60), true);
  renderer.update(params);
  assert.equal(renderer.draw(ctx, 80, 60), false);
  assert.equal(labels.at(-1), "Samples: 12,050");
});
