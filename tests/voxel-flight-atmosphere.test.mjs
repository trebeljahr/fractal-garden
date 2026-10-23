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
  flightAtmosphere,
  FLIGHT_FAR_DISTANCE,
  FLIGHT_FOG_START,
} = require("../utils/voxelZoom/atmosphere.ts");

test("fog and horizon retain their physical density through render-level changes", () => {
  for (const viewLevel of [0, 8, 60, 150, 243]) {
    const reference = flightAtmosphere(viewLevel, viewLevel);
    for (const level of [viewLevel, Math.min(244, viewLevel + 1)]) {
      const atmosphere = flightAtmosphere(level, viewLevel);
      const factor = 3 ** (level - viewLevel);
      assert.ok(Math.abs(atmosphere.farDistance / factor - reference.farDistance) < 1e-10);
      assert.ok(
        Math.abs(atmosphere.fogDistanceScale * factor - reference.fogDistanceScale) < 1e-10,
      );
      assert.equal(atmosphere.fogDensity, 7);
      assert.equal(atmosphere.fogStart, FLIGHT_FOG_START / FLIGHT_FAR_DISTANCE);
    }
  }
});

test("ordinary flight changes precision without morphing the atmosphere", () => {
  const { initialFlightCamera, moveFlightCamera } = require("../utils/voxelZoom/camera.ts");
  let camera = initialFlightCamera();
  const start = flightAtmosphere(camera.level, camera.viewLevel);
  for (let i = 0; i < 60; i++) {
    camera = moveFlightCamera(camera, "vicsek", [0, 0, 0.05]);
    const atmosphere = flightAtmosphere(camera.level, camera.viewLevel);
    assert.equal(camera.viewLevel, 0);
    assert.ok(
      Math.abs(atmosphere.fogDistanceScale * 3 ** camera.level - start.fogDistanceScale) < 1e-10,
    );
  }
  assert.ok(camera.level > 0);
});

test("explicit zoom selects a continuous exploration scale", () => {
  const { initialFlightCamera, dollyFlightCamera } = require("../utils/voxelZoom/camera.ts");
  const before = initialFlightCamera();
  const after = dollyFlightCamera(before, "vicsek", 0.2);
  assert.ok(after.viewLevel > before.viewLevel);
  assert.ok(after.viewLevel < 1);
  assert.notEqual(
    flightAtmosphere(after.level, after.viewLevel).fogDistanceScale,
    flightAtmosphere(before.level, before.viewLevel).fogDistanceScale,
  );
});
