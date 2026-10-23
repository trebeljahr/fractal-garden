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

const { canopyFrame, buildCanopyGeometry } = require("../utils/canopyZoom.ts");
const { movePatternCamera, restorePatternCamera } = require("../utils/recursiveZoom.ts");
const { fixedFromNumber, fixedToNumber } = require("../utils/lsystem/bigfixed.ts");
const defaults = {
  iterations: 7,
  angle: 43,
  branches: 3,
  background: "#252424",
  lengthFactor: 0.6,
  widthFactor: 0.8,
  rootWidth: 16,
};
const count = (geometry) =>
  Array.from(geometry.levels.values()).reduce((n, level) => n + level.lines.length, 0);

test("opening trees retain all branches and fit their complete ink bounds", () => {
  for (const [width, height] of [
    [1440, 740],
    [390, 620],
  ]) {
    for (const branches of [2, 3, 6]) {
      for (const angle of [0, 43, 90, 152, 180, 360]) {
        const config = { ...defaults, iterations: 3, branches, angle };
        const camera = canopyFrame(config, width, height).camera;
        const geometry = buildCanopyGeometry(config, camera, width, height);
        assert.equal(count(geometry), (branches ** 4 - 1) / (branches - 1));
        for (const level of geometry.levels.values()) {
          for (const line of level.lines)
            line.forEach((value, i) => {
              const side = i % 2 ? height : width;
              assert.ok(value - level.width / 2 >= side * 0.05 - 1e-8);
              assert.ok(value + level.width / 2 <= side * 0.95 + 1e-8);
            });
        }
      }
    }
  }
});

test("zoom adds generations and remains bounded beyond the old 64x limit", () => {
  const config = { ...defaults, iterations: 2, rootWidth: 1 };
  const opening = canopyFrame(config, 1000, 800).camera;
  const camera = movePatternCamera(opening, 1000, 800, 128);
  // Follow the central branch toward its persistent tip.
  camera.x = BigInt(0);
  camera.y = fixedFromNumber(-1 / (1 - config.lengthFactor), camera.bits);
  const detail = buildCanopyGeometry(config, camera, 1000, 800);
  assert.ok(detail.generation > 10);
  assert.ok(count(detail) > 10);
  // Dense overlapping canopies may lower the complete generation to budget.
  assert.ok(detail.generation > config.iterations);
  assert.ok(detail.visited <= 60001);
});

test("deep tip detail and one-pixel panning survive fixed-point zoom", () => {
  const config = { ...defaults, branches: 2, angle: 0, rootWidth: 1 };
  for (const zoom of [1e30, 1e100, 1e280]) {
    const camera = movePatternCamera(canopyFrame(config, 640, 480).camera, 640, 480, zoom);
    // Exact fixed-point tip sum, using the same ratio as the generator.
    const one = BigInt(1) << BigInt(camera.bits);
    const ratio = fixedFromNumber(config.lengthFactor, camera.bits);
    camera.x = BigInt(0);
    camera.y = (-one * one) / (one - ratio);
    const geometry = buildCanopyGeometry(config, camera, 640, 480);
    assert.ok(geometry.generation > 100);
    assert.ok(count(geometry) > 2);
    assert.equal(geometry.limited, false);
    const moved = movePatternCamera(camera, 640, 480, 1, 0, 0, 1, -2);
    assert.notEqual(moved.x, camera.x);
    assert.notEqual(moved.y, camera.y);
    const scale = camera.frame * 480 * camera.zoom;
    assert.ok(Math.abs(fixedToNumber(moved.x - camera.x, camera.bits) * scale + 1) < 1e-10);
    assert.deepEqual(
      restorePatternCamera({ ...moved, x: moved.x.toString(), y: moved.y.toString() }),
      moved,
    );
    for (const level of geometry.levels.values())
      for (const line of level.lines) {
        assert.ok(level.width > 0 && Number.isFinite(level.width));
        line.forEach((v, i) => {
          assert.ok(
            Number.isFinite(v) && v >= -level.width && v <= (i % 2 ? 480 : 640) + level.width,
          );
        });
      }
  }
});

test("zero and noncontracting branch lengths keep a finite complete tree", () => {
  for (const lengthFactor of [0, 1]) {
    const config = { ...defaults, iterations: 3, lengthFactor };
    const camera = movePatternCamera(canopyFrame(config, 390, 620).camera, 390, 620, 1000);
    const geometry = buildCanopyGeometry(config, camera, 390, 620);
    assert.equal(geometry.generation, 3);
    assert.equal(geometry.limited, false);
  }
});

test("dense classic-canopy detail stays visible when the work budget lowers its depth", () => {
  for (const zoom of [1e100, 1e280]) {
    const camera = movePatternCamera(canopyFrame(defaults, 640, 480).camera, 640, 480, zoom);
    const one = BigInt(1) << BigInt(camera.bits);
    const ratio = fixedFromNumber(defaults.lengthFactor, camera.bits);
    camera.x = BigInt(0);
    camera.y = (-one * one) / (one - ratio);
    const geometry = buildCanopyGeometry(defaults, camera, 640, 480);
    assert.ok(geometry.generation > 100);
    assert.ok(count(geometry) > 10, "coarsening must retain local tip detail");
    assert.ok(geometry.visited <= 60001);
  }
});
