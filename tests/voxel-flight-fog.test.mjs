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
const { updateFlightFog } = require("../utils/voxelZoom/fog.ts");

test("fog preserves physical distance across recursive camera-unit changes", () => {
  for (const level of [0, 10, 150, 243]) {
    const before = updateFlightFog(undefined, 0.1, level, 1 / 60);
    const after = updateFlightFog(before.state, 0.3, level + 1, 1 / 60);
    assert.ok(Math.abs(after.distance / 3 - before.distance) < 1e-11);
    assert.equal(after.settling, false);
    const reversed = updateFlightFog(after.state, 0.1, level, 1 / 60);
    assert.ok(Math.abs(reversed.distance - before.distance) < 1e-11);
  }
});

test("large wheel jumps and resumed frames cannot abruptly change fog density", () => {
  const before = updateFlightFog(undefined, 1, 0, 0);
  for (const elapsed of [1 / 120, 1 / 60, 1 / 30, 10]) {
    for (const clearance of [0.001, 100]) {
      const after = updateFlightFog(before.state, clearance, 0, elapsed);
      assert.equal(after.settling, true);
      assert.ok(
        Math.abs(Math.log(after.distance / before.distance)) <= Math.min(elapsed, 0.1) * 2 + 1e-12,
      );
    }
  }
  assert.equal(updateFlightFog(before.state, 0.001, 0, 0).distance, before.distance);
});

test("fog settles after movement stops, at comparable rates across frame rates", () => {
  const distances = [];
  for (const rate of [30, 60, 120]) {
    let fog = updateFlightFog(undefined, 1, 0, 0);
    let previous = fog.distance;
    for (let frame = 0; frame < rate; frame++) {
      fog = updateFlightFog(fog.state, 0.1, 0, 1 / rate);
      assert.ok(fog.distance <= previous);
      assert.ok(fog.distance >= 2.4 - 1e-12);
      previous = fog.distance;
    }
    distances.push(fog.distance);
    for (let frame = 0; frame < rate * 5; frame++)
      fog = updateFlightFog(fog.state, 0.1, 0, 1 / rate);
    assert.equal(fog.settling, false);
    assert.ok(Math.abs(fog.distance - 2.4) < 1e-12);
  }
  assert.ok(Math.max(...distances) / Math.min(...distances) < 1.02);
});
