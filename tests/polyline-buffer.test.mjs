import assert from "node:assert/strict";
import test from "node:test";
import { require } from "./helpers/spatial-gpu-fixtures.mjs";

const { drawPolyline3D, normalizePolyline } = require("../../utils/polyline3d.ts");
const { INITIAL_SPATIAL_CAMERA } = require("../../utils/spatial/camera.ts");
const style = {
  rotationX: 23,
  rotationY: -37,
  cameraDistance: 6,
  background: "#252424",
  nearColor: "#f8bc75",
  farColor: "#516cad",
  farAlpha: 0.2,
  lineWidth: 0.8,
};

function context() {
  const calls = [];
  return {
    calls,
    fillRect(...args) {
      calls.push(["fill", this.fillStyle, ...args]);
    },
    beginPath() {
      calls.push(["begin"]);
    },
    moveTo(...args) {
      calls.push(["move", ...args]);
    },
    lineTo(...args) {
      calls.push(["line", ...args]);
    },
    stroke() {
      calls.push(["stroke", this.strokeStyle, this.lineWidth, this.lineJoin, this.lineCap]);
    },
  };
}
function geometry(count, breaks = false) {
  const points = new Float32Array(count * 3),
    gaps = new Uint8Array(count);
  for (let i = 0; i < count; i++) {
    points.set([Math.sin(i * 0.17), Math.cos(i * 0.11), Math.sin(i * 0.07)], i * 3);
    if (breaks && i % 7 === 0) gaps[i] = 1;
  }
  return { points, count, breaks: breaks ? gaps : undefined };
}
function draw(ctx, shape, options, visible = shape.count, width = 640, height = 480) {
  ctx.calls.length = 0;
  const head = drawPolyline3D(ctx, width, height, shape, visible, options);
  return { calls: ctx.calls.slice(), head };
}

test("scratch reuse preserves commands through clipping, growth, shrinkage and 32/128-bin switches", () => {
  const reused = context();
  const cases = [
    [geometry(400), { ...style, cameraDistance: 0.2 }],
    [geometry(400), style],
    [geometry(37, true), { ...style, spatialCamera: INITIAL_SPATIAL_CAMERA }],
    [
      geometry(1300, true),
      { ...style, rotationY: 137, spatialCamera: { ...INITIAL_SPATIAL_CAMERA, zoom: 2 } },
    ],
    [geometry(11), { ...style, rotationX: -67, farAlpha: 0.7, lineWidth: 2 }],
    [geometry(0), style],
    [geometry(1), style],
    [geometry(1300), style],
  ];
  for (const [shape, options] of cases) {
    assert.deepEqual(draw(reused, shape, options), draw(context(), shape, options));
    const visible = Math.max(0, shape.count - 3);
    assert.deepEqual(
      draw(reused, shape, options, visible, 390, 700),
      draw(context(), shape, options, visible, 390, 700),
    );
  }
});

test("interleaved canvases retain independent scratch and no stale strokes", () => {
  const a = context(),
    b = context(),
    large = geometry(600, true),
    small = geometry(9);
  const expected = draw(context(), large, style);
  draw(a, large, style);
  draw(b, small, { ...style, spatialCamera: INITIAL_SPATIAL_CAMERA });
  assert.deepEqual(draw(a, large, style), expected);
  assert.deepEqual(draw(b, small, style), draw(context(), small, style));
});

test("indexed normalization preserves Float32 values, axis order and the active point count", () => {
  for (const ArrayType of [Float32Array, Float64Array]) {
    const source = new ArrayType([1, -2, 3, 5, 4, -7, -3, 1, 2, 1e20, 1e20, 1e20]);
    const original = source.slice(),
      center = [1, 1, -2];
    const radius = Math.max(Math.hypot(0, -3, 5), Math.hypot(4, 3, -5), Math.hypot(-4, 0, 4));
    for (const axes of [
      [0, 1, 2],
      [0, 2, 1],
      [2, 0, 1],
    ]) {
      const expected = new Float32Array(9);
      for (let i = 0; i < 3; i++)
        for (let axis = 0; axis < 3; axis++)
          expected[i * 3 + axis] = (source[i * 3 + axes[axis]] - center[axes[axis]]) * (1 / radius);
      const actual = normalizePolyline({ points: source, count: 3 }, axes);
      assert.deepEqual(actual.points, expected);
      assert.equal(actual.count, 3);
    }
    assert.deepEqual(source, original);
  }
});
