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
const { buildGridFrame } = require("../utils/voxelZoom/camera.ts");
const { flightResolution } = require("../utils/voxelZoom/resolution.ts");

test("pixel cones grow with distance and shrink with framebuffer resolution", () => {
  const detail = flightResolution(0.1, 1200, 800);
  const footprint = (distance) => Math.max(detail.nearFootprint, distance * detail.pixelAngle);
  assert.equal(footprint(0), detail.nearFootprint);
  assert.equal(footprint(10) / footprint(1), 10);
  const finer = flightResolution(0.1, 2400, 1600);
  assert.equal(finer.pixelAngle, detail.pixelAngle / 2);
  assert.equal(finer.nearFootprint, detail.nearFootprint / 2);
});

test("projected detail stays continuous when camera units change at every zoom level", () => {
  for (const level of [0, 10, 150, 243]) {
    const one = 1n << 600n;
    const offset = (one * 2n) / (3n ** BigInt(level) * 100n);
    const camera = {
      position: [one + offset, one + offset, one + offset],
      bits: 600,
      level,
      yaw: 0,
      pitch: 0,
    };
    const beforeFrame = buildGridFrame(camera, "menger");
    const afterFrame = buildGridFrame({ ...camera, level: level + 1 }, "menger");
    assert.ok(Math.abs(afterFrame.clearance / beforeFrame.clearance - 3) < 1e-6);
    const before = flightResolution(beforeFrame.clearance, 1200, 800);
    const after = flightResolution(afterFrame.clearance, 1200, 800);
    for (const distance of [0, 0.01, 1, 1000, 1e20]) {
      const a = Math.max(before.nearFootprint, distance * before.pixelAngle);
      const b = Math.max(after.nearFootprint, distance * 3 * after.pixelAngle);
      assert.ok(Math.abs(b / 3 / a - 1) < 1e-6, `level ${level}, distance ${distance}`);
    }
  }
});

test("zero clearance and tiny framebuffers keep a finite nonnegative pixel cone", () => {
  for (const clearance of [0, 1e-12, 0.1, 100]) {
    const detail = flightResolution(clearance, 0, 0);
    assert.ok(Number.isFinite(detail.nearFootprint));
    assert.ok(detail.nearFootprint >= 0);
    assert.equal(detail.pixelAngle, 1.16);
  }
});
