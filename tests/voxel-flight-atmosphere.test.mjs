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

test("fog and horizon stay visible at every recursive viewing scale", () => {
  for (const level of [0, 1, 8, 60, 100, 150, 244]) {
    const atmosphere = flightAtmosphere(level);
    assert.equal(atmosphere.farDistance, FLIGHT_FAR_DISTANCE);
    assert.equal(atmosphere.fogStart / atmosphere.fogDistanceScale, FLIGHT_FOG_START);
    assert.equal(atmosphere.fogDensity, 7);
    assert.equal(atmosphere.settling, false);
  }
});

test("camera-unit changes cannot flash fog or move the physical horizon", () => {
  for (const level of [0, 10, 150, 243]) {
    const before = flightAtmosphere(level);
    const after = flightAtmosphere(level + 1, before.state, 0);
    assert.ok(Math.abs(after.farDistance / 3 - before.farDistance) < 1e-12);
    assert.ok(Math.abs(after.fogDistanceScale * 3 - before.fogDistanceScale) < 1e-12);
    assert.equal(after.settling, true);
  }
});

test("view-scale transitions settle smoothly at comparable rates across frame rates", () => {
  const distances = [];
  for (const rate of [30, 60, 120]) {
    let atmosphere = flightAtmosphere(0);
    let last = atmosphere.farDistance * 3;
    for (let frame = 0; frame < rate; frame++) {
      atmosphere = flightAtmosphere(1, atmosphere.state, 1 / rate);
      assert.ok(atmosphere.farDistance <= last);
      assert.ok(atmosphere.farDistance >= FLIGHT_FAR_DISTANCE);
      last = atmosphere.farDistance;
    }
    distances.push(atmosphere.farDistance);
    for (let frame = 0; frame < rate * 4; frame++)
      atmosphere = flightAtmosphere(1, atmosphere.state, 1 / rate);
    assert.equal(atmosphere.settling, false);
    assert.equal(atmosphere.farDistance, FLIGHT_FAR_DISTANCE);
  }
  assert.ok(Math.max(...distances) / Math.min(...distances) < 1.001);
});

test("a paused frame cannot skip through the visual transition", () => {
  const before = flightAtmosphere(0);
  assert.deepEqual(flightAtmosphere(1, before.state, 10), flightAtmosphere(1, before.state, 0.1));
});
