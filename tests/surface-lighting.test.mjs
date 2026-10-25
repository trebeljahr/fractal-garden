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
const { surfaceBrightness } = require("../utils/render/surfaceLighting.ts");
const { drawPolyhedronScene, quadsToScene } = require("../utils/polyhedronFractals.ts");
const { drawBoxScene, generateJerusalemCube } = require("../utils/voxelFractals.ts");
const options = {
  rotationX: 0,
  rotationY: 0,
  cameraDistance: 6,
  background: "#252424",
  fillColor: "#8fb0ff",
  strokeColor: "#dce9ff",
  lineWidth: 0.7,
  showFaces: true,
  showWireframe: true,
};
function context() {
  return {
    fills: [],
    strokes: [],
    fillRect() {},
    beginPath() {},
    moveTo() {},
    lineTo() {},
    closePath() {},
    fill() {
      this.fills.push(this.fillStyle);
    },
    stroke() {
      this.strokes.push(this.strokeStyle);
    },
  };
}
const red = (style) => Number(/rgba\((\d+)/.exec(style)[1]);
function quad(x, z, normal = { x: 0, y: 0, z: 1 }) {
  return {
    corners: [
      { x, y: -0.2, z },
      { x: x + 0.4, y: -0.2, z },
      { x: x + 0.4, y: 0.2, z },
      { x, y: 0.2, z },
    ],
    normal,
  };
}

test("parallel construction faces separate by depth, while coplanar tiles match", () => {
  const scene = quadsToScene([quad(-0.6, -0.7), quad(0, 0.7), quad(0.6, 0.7)]);
  const ctx = context();
  drawPolyhedronScene(ctx, 800, 600, scene, options);
  assert.ok(red(ctx.fills[1]) > red(ctx.fills[0]) * 1.6);
  assert.equal(ctx.fills[1], ctx.fills[2]);
  const zoomed = context();
  drawPolyhedronScene(zoomed, 800, 600, scene, { ...options, cameraDistance: 3 });
  assert.deepEqual(zoomed.fills, ctx.fills, "zoom changes projection, not surface brightness");
});

test("Jerusalem's box renderer separates front-facing ledges by their depth", () => {
  const ctx = context();
  drawBoxScene(ctx, 800, 600, generateJerusalemCube(2), options);
  assert.ok(new Set(ctx.fills).size > 3, "same face direction needs more than one shade");
  assert.ok(ctx.fills.every((color) => red(color) > 0));
});

test("solid outlines soften, while a wire-only drawing stays opaque", () => {
  const scene = quadsToScene([quad(0, 0)]);
  const solid = context(),
    wire = context();
  drawPolyhedronScene(solid, 800, 600, scene, options);
  drawPolyhedronScene(wire, 800, 600, scene, { ...options, showFaces: false });
  assert.match(solid.strokes[0], /, 0\.45\)$/);
  assert.match(wire.strokes[0], /, 1\)$/);
  assert.equal(wire.fills.length, 0);
});

test("degenerate depth ranges stay finite and visible; reverse normals still cull", () => {
  for (const depth of [-100, 0, 100]) {
    const shade = surfaceBrightness(0, 0, 1, depth, depth, depth);
    assert.ok(Number.isFinite(shade) && shade > 0 && shade <= 1);
  }
  const scene = quadsToScene([quad(0, 0, { x: 0, y: 0, z: -1 })]);
  const hidden = context(),
    double = context();
  drawPolyhedronScene(hidden, 800, 600, scene, options);
  drawPolyhedronScene(double, 800, 600, scene, { ...options, doubleSided: true });
  assert.equal(hidden.fills.length, 0);
  assert.equal(double.fills.length, 1);
});
