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
const { LOCAL_COORDINATE_LIMIT } = require("../utils/voxelZoom/camera.ts");

test("fog and cutoff stay at fixed physical distances across zoom levels", () => {
  for (const level of [0, 1, 8, 30, 58]) {
    const atmosphere = flightAtmosphere(level);
    const units = 2 / 3 ** level;
    assert.ok(Math.abs(atmosphere.farDistance * units - FLIGHT_FAR_DISTANCE) < 1e-12);
    for (const distance of [0.5, 1, 4, 8, 16]) {
      const normalized = (distance / units) * atmosphere.fogDistanceScale;
      assert.ok(Math.abs(normalized - distance / FLIGHT_FAR_DISTANCE) < 1e-12);
    }
    assert.equal(atmosphere.fogStart, FLIGHT_FOG_START / FLIGHT_FAR_DISTANCE);
  }
});

test("deep zoom retains finite limits without pulling fog into the local detail", () => {
  for (const level of [100, 150, 244]) {
    const atmosphere = flightAtmosphere(level);
    assert.equal(atmosphere.farDistance, LOCAL_COORDINATE_LIMIT);
    assert.ok(atmosphere.fogDistanceScale >= 0);
    assert.ok(Number.isFinite(atmosphere.fogDistanceScale));
    assert.ok(atmosphere.farDistance * atmosphere.fogDistanceScale < atmosphere.fogStart);
  }
});
