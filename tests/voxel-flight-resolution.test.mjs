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
  flightRenderSize,
  MIN_FLIGHT_DETAIL_DISTANCE,
  FLIGHT_DETAIL_PIXELS,
} = require("../utils/voxelZoom/resolution.ts");

test("fine geometry follows display pixels once the framebuffer can sample it", () => {
  const css = flightResolution(0.1, 1200, 800, 0, 0, 1200, 800);
  const reference = flightResolution(0.1, 2400, 1600, 0, 0, 1200, 800);
  for (const scale of [2, 3, 4]) {
    const detail = flightResolution(0.1, 1200 * scale, 800 * scale, 0, 0, 1200, 800);
    assert.equal(detail.detailScale, FLIGHT_DETAIL_PIXELS * scale);
    assert.ok(
      Math.abs(
        detail.pixelAngle * detail.detailScale - reference.pixelAngle * reference.detailScale,
      ) < 1e-15,
    );
    assert.ok(
      Math.abs(
        detail.nearFootprint * detail.detailScale - reference.nearFootprint * reference.detailScale,
      ) < 1e-15,
    );
    assert.ok(Math.abs(detail.pixelAngle * scale - css.pixelAngle) < 1e-15);
  }
});

test("reduced flight resolution cannot request geometry below its own sampling footprint", () => {
  for (const scale of [0.25, 0.5, 0.75, 1, 1.5, 2]) {
    const detail = flightResolution(0.1, 1200 * scale, 800 * scale, 0, 0, 1200, 800);
    const framebufferPixels = detail.detailScale;
    const displayPixels = framebufferPixels / scale;
    assert.ok(framebufferPixels >= 1, `only ${framebufferPixels} samples at scale ${scale}`);
    assert.ok(displayPixels >= FLIGHT_DETAIL_PIXELS);
  }
});

test("a stationary Retina view restores native pixels after an adaptive flight frame", () => {
  const moving = flightRenderSize(1440, 900, 2, 160_000);
  const still = flightRenderSize(1440, 900, 2, 8_000_000);
  assert.ok(moving.width < 1440 && moving.height < 900);
  assert.deepEqual(still, { width: 2880, height: 1800 });
  assert.deepEqual(flightRenderSize(390, 844, 2, 8_000_000), { width: 780, height: 1688 });
  const capped = flightRenderSize(4000, 3000, 2, 8_000_000);
  assert.ok(capped.width * capped.height < 8_010_000);
});

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
    const offset = (one * 2n) / (3n ** BigInt(level) * 10n);
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

test("approaching a snowflake boundary reveals finer detail without wheel zoom", () => {
  const one = 1n << 600n;
  let previousPhysicalFootprint = Infinity;
  for (const level of [0, 10, 40, 150, 243]) {
    const camera = {
      position: [0n, (4n * one) / 5n, one + (2n * one) / (5n * 3n ** BigInt(level))],
      bits: 600,
      level,
      viewLevel: 0,
      yaw: 0,
      pitch: 0,
    };
    const frame = buildGridFrame(camera, "mosely-heavy", flightDetailDepth(0, level));
    const detail = flightResolution(frame.clearance, 1200, 800, level, 0);
    const physicalFootprint = detail.nearFootprint / 3 ** level;
    assert.ok(physicalFootprint < previousPhysicalFootprint, `detail stopped at level ${level}`);
    assert.ok(Math.abs(detail.nearFootprint - 0.2 * detail.pixelAngle) < 1e-8);
    previousPhysicalFootprint = physicalFootprint;
  }
});

test("numerical detail floor follows local precision instead of a fixed world scale", () => {
  const reference = flightResolution(0, 1200, 800, 0, 0);
  for (const level of [0, 1, 12, 40, 150, 244]) {
    const detail = flightResolution(0, 1200, 800, level, 0);
    assert.equal(detail.nearFootprint, reference.nearFootprint);
  }
});

test("explicit zoom refines the minimum physical detail at deep addresses", () => {
  const before = flightResolution(0, 1200, 800, 150, 150);
  const after = flightResolution(0, 1200, 800, 150, 151);
  assert.ok(Math.abs(after.nearFootprint * 3 - before.nearFootprint) < 1e-15);
});

test("render grids follow both proximity and explicit zoom with a subpixel terminator", () => {
  for (const [viewLevel, level] of [
    [0, 0],
    [0.5, 0],
    [0, 40],
    [8, 0],
    [0, 150],
    [150, 150],
    [243, 244],
  ]) {
    const depth = flightDetailDepth(viewLevel, level);
    assert.ok(depth <= 256);
    if (depth < 256)
      assert.ok(
        3 ** (level - depth) <
          (MIN_FLIGHT_DETAIL_DISTANCE * Math.min(1, 3 ** (level - viewLevel)) * 1.16) /
            Math.sqrt(2500000),
      );
    assert.ok(depth > Math.max(viewLevel, level));
  }
  assert.equal(flightDetailDepth(0), 12);
  assert.ok(flightDetailDepth(0, 40) > 40);
});

test("extreme saved precision gaps still produce finite GPU detail uniforms", () => {
  const detail = flightResolution(0, 1920, 1080, 244, 0);
  assert.ok(Number.isFinite(Math.fround(detail.nearFootprint)));
  assert.ok(detail.nearFootprint > 0);
});
