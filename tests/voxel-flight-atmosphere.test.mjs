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

const { easeFlightAtmosphere } = require("../utils/voxelZoom/smoothing.ts");

test("fog rejects brief scale pulses and follows sustained refinement without overshoot", () => {
  const dt = 1 / 120;
  let state = { level: 10, velocity: 0 };
  let maximum = state.level;
  for (let step = 0; step < 600; step++) {
    const target = step < 36 ? 10.45 : 10;
    state = easeFlightAtmosphere(state.level, state.velocity, target, target, dt);
    maximum = Math.max(maximum, state.level);
    assert.ok(state.level >= 10 - 1e-10);
  }
  assert.ok(maximum < 10.2, "short-lived travel changes must be attenuated");
  assert.ok(Math.abs(state.level - 10) < 1e-6);
  for (const depth of [1, 150, 243]) {
    state = { level: depth, velocity: 0 };
    for (let step = 0; step < 240; step++) {
      const before = depth + 2.7 * step * dt;
      state = easeFlightAtmosphere(state.level, state.velocity, before, before + 2.7 * dt, dt);
      assert.ok(state.level <= before + 2.7 * dt + 1e-10);
    }
    assert.ok(state.level > depth + 3.9, "fog must keep following automatic deep zoom");
  }
});

test("fog handles sharp turns and slow frames consistently", () => {
  let reference;
  for (const rate of [4, 30, 60, 120]) {
    let state = { level: 0, velocity: 0 };
    for (let frame = 0; frame < rate * 4; frame++) {
      const before = state;
      state = easeFlightAtmosphere(state.level, state.velocity, 12, 12, 1 / rate);
      assert.ok(state.level >= before.level && state.level <= 12);
      assert.ok(state.level - before.level <= 4.1 / rate);
    }
    reference ??= state.level;
    assert.ok(Math.abs(reference - state.level) < 1e-9);
  }
});
