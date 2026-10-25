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
const { spatialReliefFront } = require("../utils/spatial/lighting.ts");
const { INITIAL_SPATIAL_CAMERA, moveSpatialCamera } = require("../utils/spatial/camera.ts");
const { IDENTITY, viewRotation } = require("../utils/orientation.ts");

test("mesh relief reference follows the camera without depending on visible detail", () => {
  assert.ok(Math.abs(spatialReliefFront(INITIAL_SPATIAL_CAMERA, IDENTITY) - 4.4) < 1e-12);
  const rotated = spatialReliefFront(INITIAL_SPATIAL_CAMERA, viewRotation(24, 28));
  assert.ok(rotated > 0 && rotated < 4.4);
  const inside = moveSpatialCamera(INITIAL_SPATIAL_CAMERA, [0, 0, -5]);
  assert.equal(spatialReliefFront(inside, IDENTITY), 0);
  for (const zoom of [4, 40, 150, 240]) {
    const camera = moveSpatialCamera(INITIAL_SPATIAL_CAMERA, [0, 0, 0], zoom);
    assert.equal(spatialReliefFront(camera, IDENTITY), 0);
  }
});

test("mesh reference changes continuously when entering its volume", () => {
  const values = [-1e-6, 0, 1e-6].map((delta) =>
    spatialReliefFront(moveSpatialCamera(INITIAL_SPATIAL_CAMERA, [0, 0, -4.4 + delta]), IDENTITY),
  );
  assert.ok(values.every(Number.isFinite));
  assert.ok(Math.max(...values) - Math.min(...values) < 2e-6);
});

test("a nearby mesh reference plane survives level-150 coordinates", () => {
  const { fixedFromNumber } = require("../utils/deepZoom/math.ts");
  const bits = 400,
    zoom = 150,
    unit = 1n << BigInt(bits - zoom);
  const bound = fixedFromNumber(1.6, bits);
  for (const [offset, expected] of [
    [1, 7],
    [-1, 5],
    [-7, 0],
  ]) {
    const camera = { bits, zoom, target: ["0", "0", String(bound + BigInt(offset) * unit)] };
    assert.equal(spatialReliefFront(camera, IDENTITY), expected);
  }
});
