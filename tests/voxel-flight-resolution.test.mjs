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
const {
  flightResolution,
  flightDetailDepth,
  MIN_FLIGHT_DETAIL_DISTANCE,
} = require("../utils/voxelZoom/resolution.ts");

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
    const before = flightResolution(beforeFrame.clearance, 1200, 800, level, level);
    const after = flightResolution(afterFrame.clearance, 1200, 800, level + 1, level);
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

test("wall contact cannot demand finer pixels at a fixed exploration scale", () => {
  const reference = flightResolution(0, 1200, 800, 0, 0);
  for (const clearance of [0, 1e-12, 1e-8, 1e-5, 0.01]) {
    assert.equal(
      flightResolution(clearance, 1200, 800, 0, 0).nearFootprint,
      reference.nearFootprint,
    );
  }
  for (const level of [0, 1, 12, 16]) {
    const detail = flightResolution(0, 1200, 800, level, 0);
    assert.ok(Math.abs(detail.nearFootprint / 3 ** level - reference.nearFootprint) < 1e-15);
  }
});

test("explicit zoom refines the minimum physical detail at deep addresses", () => {
  const before = flightResolution(0, 1200, 800, 150, 150);
  const after = flightResolution(0, 1200, 800, 150, 151);
  assert.ok(Math.abs(after.nearFootprint * 3 - before.nearFootprint) < 1e-15);
});

test("render grids include a subpixel terminator without following collision precision", () => {
  for (const viewLevel of [0, 0.5, 8, 150, 243]) {
    const depth = flightDetailDepth(viewLevel);
    assert.ok(depth <= 256);
    if (depth < 256)
      assert.ok(
        3 ** (viewLevel - depth) < (MIN_FLIGHT_DETAIL_DISTANCE * 1.16) / Math.sqrt(2500000),
      );
  }
  assert.equal(flightDetailDepth(0), 12);
});

test("extreme saved precision gaps still produce finite GPU detail uniforms", () => {
  const detail = flightResolution(0, 1920, 1080, 244, 0);
  assert.ok(Number.isFinite(Math.fround(detail.nearFootprint)));
  assert.ok(detail.nearFootprint > 0);
});
