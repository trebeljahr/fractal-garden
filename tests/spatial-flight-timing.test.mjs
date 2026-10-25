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
const { advanceSpatialFlightElapsed } = require("../utils/spatial/flight.ts");
const { INITIAL_SPATIAL_CAMERA, reframeSpatialPoint } = require("../utils/spatial/camera.ts");
const { IDENTITY } = require("../utils/orientation.ts");
const eye = (camera) =>
  reframeSpatialPoint([0, 0, 6], camera, IDENTITY, INITIAL_SPATIAL_CAMERA, IDENTITY);
const options = {
  camera: INITIAL_SPATIAL_CAMERA,
  rotation: IDENTITY,
  motion: [0, 0, -1],
  speed: 1.5,
  clearance: () => 2,
};

for (const elapsed of [0.14, 0.65, 1.3]) {
  test(`spatial flight consumes a ${elapsed * 1000} ms frame`, () => {
    const result = advanceSpatialFlightElapsed({ ...options, elapsed });
    assert.ok(Math.abs(6 - eye(result.camera)[2] - 1.5 * elapsed) < 1e-10);
  });
}

test("a slow boosted frame rechecks clearance and cannot pass through a wall", () => {
  const wallZ = 5.9;
  const clearance = (camera) => Math.max(0, eye(camera)[2] - wallZ) * 2 ** camera.zoom;
  const slow = advanceSpatialFlightElapsed({ ...options, clearance, elapsed: 0.65, boost: true });
  let regular = { camera: options.camera, speed: options.speed };
  for (let i = 0; i < 13; i++) {
    regular = advanceSpatialFlightElapsed({
      ...options,
      ...regular,
      clearance,
      elapsed: 0.05,
      boost: true,
    });
  }
  assert.ok(eye(slow.camera)[2] > wallZ);
  assert.ok(eye(slow.camera)[2] < 6);
  assert.ok(Math.abs(eye(slow.camera)[2] - eye(regular.camera)[2]) < 1e-10);
});

test("unavailable collision data holds position until a valid query exists", () => {
  const next = advanceSpatialFlightElapsed({ ...options, elapsed: 0.65, clearance: () => null });
  assert.deepEqual(next.camera, INITIAL_SPATIAL_CAMERA);
});

test("flight resumes when a conservative closed gap resolves into open space", () => {
  const stopped = advanceSpatialFlightElapsed({ ...options, elapsed: 0.05, clearance: () => 0 });
  const resumed = advanceSpatialFlightElapsed({ ...options, ...stopped, elapsed: 0.05 });
  assert.ok(resumed.speed > 0);
  assert.ok(eye(resumed.camera)[2] < eye(stopped.camera)[2]);
});
