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
const { flightBasis } = require("../utils/voxelZoom/camera.ts");
const { flightScreenBounds } = require("../utils/voxelZoom/view.ts");
const basis = flightBasis({ yaw: 0, pitch: 0 });

test("opening view shades only the projected root; unseen roots need no draw", () => {
  const visible = flightScreenBounds(
    { low: [-0.5, -0.5, -2.1], high: [0.5, 0.5, -1.1] },
    basis,
    1280,
    720,
    32,
  );
  assert.ok(visible);
  assert.ok(visible.width * visible.height < (1280 * 720) / 2);
  for (const scale of [1e-20, 3 ** 20, 1e20])
    assert.deepEqual(
      flightScreenBounds(
        {
          low: [-0.5, -0.5, -2.1].map((v) => v * scale),
          high: [0.5, 0.5, -1.1].map((v) => v * scale),
        },
        basis,
        1280,
        720,
        32 * scale,
      ),
      visible,
    );
  for (const bounds of [
    { low: [-1, -1, 1], high: [1, 1, 2] },
    { low: [20, -1, -2], high: [21, 1, -1] },
    { low: [-1, -1, -40], high: [1, 1, -33] },
  ])
    assert.equal(flightScreenBounds(bounds, basis, 1280, 720, 32), null);
});

test("camera-plane crossings keep the whole viewport", () => {
  for (const bounds of [
    { low: [-1, -1, -1], high: [1, 1, 1] },
    { low: [-3, -1, -2], high: [-2, 1, 0] },
  ])
    assert.deepEqual(flightScreenBounds(bounds, basis, 640, 480, 32), {
      x: 0,
      y: 0,
      width: 640,
      height: 480,
    });
});

// Independent ray/box intersections verify that no visible surface pixel is
// clipped, including oblique views, portrait frames and fog-boundary boxes.
test("screen bounds include every root-intersecting pixel across flight views", () => {
  let intersections = 0;
  let clippedViews = 0;
  for (const [width, height] of [
    [96, 64],
    [64, 96],
    [128, 32],
  ]) {
    for (let index = 0; index < 24; index++) {
      const basis = flightBasis({ yaw: index * 0.73, pitch: Math.sin(index * 1.13) * 1.5 });
      const center = [Math.sin(index * 2.2) * 3, Math.cos(index * 0.83) * 3, -2];
      const halfSize = 0.2 + (index % 5) * 0.4;
      const bounds = {
        low: center.map((v) => v - halfSize),
        high: center.map((v) => v + halfSize),
      };
      const farDistance = 1 + (index % 7);
      const visible = flightScreenBounds(bounds, basis, width, height, farDistance);
      if (!visible || visible.width * visible.height < width * height) clippedViews++;
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const u = (2 * (x + 0.5) - width) / Math.min(width, height);
          const v = (2 * (y + 0.5) - height) / Math.min(width, height);
          const direction = basis.forward.map(
            (value, axis) => value + 0.58 * (u * basis.right[axis] + v * basis.up[axis]),
          );
          const length = Math.hypot(...direction);
          const ray = direction.map((value) => value / length);
          let near = 0;
          let far = farDistance;
          for (let axis = 0; axis < 3; axis++) {
            if (Math.abs(ray[axis]) < 1e-15) {
              if (bounds.low[axis] > 0 || bounds.high[axis] < 0) far = -1;
              continue;
            }
            const a = bounds.low[axis] / ray[axis];
            const b = bounds.high[axis] / ray[axis];
            near = Math.max(near, Math.min(a, b));
            far = Math.min(far, Math.max(a, b));
          }
          if (far <= near) continue;
          intersections++;
          assert.ok(visible, `view ${index} lost visible root`);
          assert.ok(x >= visible.x && x < visible.x + visible.width);
          assert.ok(y >= visible.y && y < visible.y + visible.height);
        }
      }
    }
  }
  assert.ok(intersections > 1000);
  assert.ok(clippedViews > 20);
});
