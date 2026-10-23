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
  FLIGHT_FOG_DENSITY,
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
      assert.equal(atmosphere.fogDensity, FLIGHT_FOG_DENSITY);
      assert.equal(atmosphere.fogStart, FLIGHT_FOG_START / FLIGHT_FAR_DISTANCE);
    }
  }
});

test("automatic navigation scale changes the horizon continuously at all depths", () => {
  for (const level of [0, 10, 150, 243]) {
    const before = flightAtmosphere(level, level);
    const after = flightAtmosphere(level, level + 0.01);
    assert.ok(after.farDistance < before.farDistance);
    assert.ok(Math.abs(after.farDistance / before.farDistance - 3 ** -0.01) < 1e-12);
    assert.equal(after.fogDensity, before.fogDensity);
  }
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
