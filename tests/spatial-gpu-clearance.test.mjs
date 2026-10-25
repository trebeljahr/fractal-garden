import assert from "node:assert/strict";
import test from "node:test";
import { require, style } from "./helpers/spatial-gpu-fixtures.mjs";

const { createGpuClearanceCache } = require("../../utils/spatialGpu/clearance.ts");
const {
  INITIAL_SPATIAL_CAMERA,
  moveSpatialCamera,
  rotationOf,
} = require("../../utils/spatial/camera.ts");
const { reframeSpatialEye } = require("../../utils/spatial/flight.ts");
const { fixedFromNumber } = require("../../utils/deepZoom/math.ts");
const view = { ...style, rotationX: 0, rotationY: 0 };
const key = "romanesco|1000|1";

for (const zoom of [0, 80, 240])
  test(`GPU clearance cache stays conservative through small moves at zoom ${zoom}`, () => {
    const bits = zoom + 160;
    const camera = {
      ...INITIAL_SPATIAL_CAMERA,
      bits,
      zoom,
      target: [fixedFromNumber(1, bits).toString(), "0", "0"],
    };
    const cache = createGpuClearanceCache();
    cache.write(camera, view, key, 5);
    // Independent obstacle: radius-one sphere centred at this camera's target.
    // All quantities below use the anchor camera's local scale.
    for (let i = 0; i < 32; i++) {
      const delta = [0.3 * Math.sin(i), 0.2 * Math.cos(i * 2), -0.4 * (i / 32)];
      const moved = moveSpatialCamera(camera, delta);
      const lower = cache.read(moved, view, key);
      const actual = Math.hypot(delta[0], delta[1], 6 + delta[2]) - 1;
      assert.ok(lower > 0 && lower <= actual, `${lower} must not exceed ${actual}`);
      assert.ok(lower >= 5 - Math.hypot(...delta) - 0.0001);
    }
  });

test("GPU clearance cache rescales its fixed-point safe ball without moving the eye", () => {
  const cache = createGpuClearanceCache(),
    camera = INITIAL_SPATIAL_CAMERA;
  cache.write(camera, view, key, 5);
  const rotation = rotationOf(view);
  const zoomed = reframeSpatialEye(camera, rotation, rotation, 4);
  const lower = cache.read(zoomed, view, key);
  assert.ok(lower > 79.99 && lower <= 80);
  const turnedView = { ...view, rotationX: 31, rotationY: -63 };
  const turned = reframeSpatialEye(camera, rotation, rotationOf(turnedView));
  const turnedLower = cache.read(turned, turnedView, key);
  assert.ok(turnedLower > 4.999 && turnedLower <= 5);
  assert.equal(cache.read(camera, turnedView, key), null, "an actual orbit consumes the ball");
});

test("GPU clearance cache refreshes after consuming its travel budget and geometry changes", () => {
  const cache = createGpuClearanceCache();
  cache.write(INITIAL_SPATIAL_CAMERA, view, key, 5);
  const near = moveSpatialCamera(INITIAL_SPATIAL_CAMERA, [0.5, 0, 0]);
  assert.ok(cache.read(near, view, key) > 0);
  assert.equal(cache.read(near, view, "romanesco|1|0.5"), null);
  assert.equal(cache.read(moveSpatialCamera(INITIAL_SPATIAL_CAMERA, [1.1, 0, 0]), view, key), null);
  const first = cache.read(near, view, key);
  assert.equal(cache.read(near, view, key), first, "reads retain the original certified anchor");
});

test("GPU clearance cache never reuses zero, failed or unresolved queries", () => {
  const cache = createGpuClearanceCache();
  for (const value of [0, -1, NaN, Infinity, 0.000001]) {
    cache.write(INITIAL_SPATIAL_CAMERA, view, key, value);
    assert.equal(cache.read(INITIAL_SPATIAL_CAMERA, view, key), null);
  }
});
