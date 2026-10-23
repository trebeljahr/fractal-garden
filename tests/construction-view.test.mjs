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
  initialConstructionView,
  constructionViewParams,
  constructionIs3D,
} = require("../utils/constructionView.ts");
const { constructionFrame } = require("../utils/constructionFrame.ts");

test("construction cameras and material edits remain independent from the explorer", () => {
  const source = {
    spec: { kind: "menger" },
    iterations: 3,
    view: {
      cameraDistance: 3,
      rotationX: 32,
      rotationY: 18,
      grab: [1, 0, 0, 0],
      autoRotate: true,
      fillColor: "#00ffaa",
      background: "#111111",
      strokeColor: "#eeeeee",
      showFaces: true,
      showWireframe: true,
      lineWidth: 0.7,
    },
  };
  const original = structuredClone(source);
  const view = initialConstructionView(source);
  assert.equal(view.cameraDistance, 7.5);
  assert.equal(view.autoRotate, false);
  assert.equal(view.grab, undefined);
  const local = { ...view, cameraDistance: 4, grab: [0, 1, 0, 0], fillColor: "#ccaa66" };
  const frame = constructionFrame("scene3d", source, 1, 1440, 900, 1200, 650);
  const params = constructionViewParams("scene3d", frame, local);
  assert.equal(params.iterations, 1);
  assert.equal(params.view.cameraDistance, 4);
  assert.deepEqual(params.view.grab, local.grab);
  assert.equal(params.view.fillColor, "#ccaa66");
  assert.deepEqual(source, original);
});

test("3D path controls preserve the selected construction order and main path state", () => {
  const source = {
    source: { kind: "hilbert3d", order: 4 },
    config: {
      rotationX: 20,
      rotationY: 30,
      autoRotate: true,
      animateTrail: true,
      background: "#121212",
      nearColor: "#abcdef",
      farColor: "#fedcba",
      lineWidth: 1,
    },
  };
  const original = structuredClone(source);
  const view = { ...initialConstructionView(source), rotationX: 80, cameraDistance: 5 };
  const params = constructionViewParams(
    "polylineScene",
    constructionFrame("polylineScene", source, 2, 900, 600),
    view,
  );
  assert.equal(params.source.order, 2);
  assert.equal(params.config.rotationX, 80);
  assert.equal(params.config.cameraDistance, 5);
  assert.equal(params.config.animateTrail, false);
  assert.deepEqual(source, original);
});

test("2D construction parameters and viewport have separate state", () => {
  const source = {
    iterations: 5,
    ratio: 0.5,
    sides: 5,
    includeCenter: true,
    color: "#aabbcc",
    background: "#121212",
    lineWidth: 1,
  };
  const original = structuredClone(source);
  const local = {
    ...initialConstructionView(source),
    zoom: 4,
    x: 0.3,
    y: -0.2,
    ratio: 0.7,
    includeCenter: false,
  };
  const params = constructionViewParams(
    "nFlake",
    constructionFrame("nFlake", source, 2, 1440, 900),
    local,
  );
  assert.equal(params.iterations, 2);
  assert.equal(params.ratio, 0.7);
  assert.equal(params.includeCenter, false);
  assert.equal(params.viewport, undefined);
  assert.equal(params.zoom, undefined);
  assert.deepEqual(source, original);
});

test("L-system construction frames fit the actual responsive canvas dimensions", () => {
  const source = { iterations: 6, initialLength: 300, translation: [640, 550] };
  for (const [width, height] of [
    [1200, 650],
    [360, 570],
    [1920, 1080],
  ]) {
    const frame = constructionFrame("lsystem2d", source, 2, 1440, 900, width, height);
    const scale = Math.min(width / 1440, height / 900);
    assert.equal(frame.initialLength, 300 * scale);
    assert.deepEqual(frame.translation, [width / 2 - 80 * scale, height / 2 + 100 * scale]);
  }
});

test("custom spatial L-systems expose local orbit parameters without changing their rules", () => {
  const source = {
    dimension: "3d",
    axiom: "F",
    rules: [["F", "F[+F]F"]],
    iterations: 2,
    color: "#ffffff",
    background: "#111111",
    lineWidth: 1,
  };
  const view = initialConstructionView(source);
  const params = constructionViewParams("lsystemConstruction", source, {
    ...view,
    cameraDistance: 4,
    rotationY: 90,
  });
  assert.equal(constructionIs3D("lsystemConstruction", source), true);
  assert.equal(constructionIs3D("lsystemConstruction", { dimension: "2d" }), false);
  assert.equal(params.constructionView.rotationY, 90);
  assert.equal(params.constructionView.cameraDistance, 4);
  assert.deepEqual(params.rules, source.rules);
  assert.equal(source.constructionView, undefined);
});
