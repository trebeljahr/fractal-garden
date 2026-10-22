import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import ts from "typescript";

const require = createRequire(import.meta.url);
require.extensions[".ts"] = (module, filename) => {
  const { outputText } = ts.transpileModule(readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  module._compile(outputText, filename);
};
const {
  MAX_DEPTH_BITS,
  createViewport,
  createViewportAtLog,
  deserializeViewport,
  fixedFromDecimal,
  fixedFromNumber,
  fixedOffset,
  fixedToFloatExp,
  moveViewport,
  matchesDeepViewport,
  rescaleFixed,
  serializeViewport,
  viewportDelta,
  zoomViewport,
} = require("../utils/deepZoom/math.ts");
const { buildReference, sampleEscape } = require("../utils/deepZoom/orbit.ts");

test("panning keeps adjacent points distinct beyond double precision and exponent range", () => {
  for (const depth of [80, 1100, 4096, MAX_DEPTH_BITS]) {
    const view = createViewportAtLog([-0.75, 0.125], -depth);
    const moved = moveViewport(view, 1 / 1024, -1 / 1024);
    const step = BigInt(1) << BigInt(view.bits - depth - 10);
    assert.equal(moved.x - view.x, step);
    assert.equal(moved.y - view.y, -step);
    assert.deepEqual(viewportDelta(moved, view), {
      x: [1, -depth - 10],
      y: [-1, -depth - 10],
      scale: [1, -depth],
    });
  }
});

test("zoom keeps a pointer anchor fixed, including when precision grows", () => {
  const view = createViewportAtLog([-0.75, 0.125], -1100);
  const next = zoomViewport(view, -1400.25, 0.75, -0.125);
  for (const [axis, normalized] of [
    ["x", 0.75],
    ["y", -0.125],
  ]) {
    const before =
      rescaleFixed(view[axis], view.bits, next.bits) +
      fixedOffset(normalized, view.logZoom, next.bits);
    const after = next[axis] + fixedOffset(normalized, next.logZoom, next.bits);
    assert.equal(after, before);
  }
});

test("decimal camera input and shared views retain digits through a JSON roundtrip", () => {
  const center = [
    "-0.743643887037151007923796441434256376153",
    "0.131825904205311970493132056385139",
  ];
  const view = createViewportAtLog(center, -300);
  assert.notEqual(view.x, fixedFromNumber(Number(center[0]), view.bits));
  const saved = JSON.parse(JSON.stringify(serializeViewport(view)));
  assert.deepEqual(deserializeViewport(saved), view);
  assert.deepEqual(
    deserializeViewport({ center: [-0.5, 0.125], zoomSize: 1.5 }),
    createViewport([-0.5, 0.125], 1.5),
  );
  assert.equal(fixedFromDecimal("-1.25e-2", 200), -fixedFromDecimal("0.0125", 200));
});

test("view links reject invalid scales, unsafe allocations, and out-of-range positions", () => {
  const valid = serializeViewport(createViewportAtLog([-0.5, 0], -200));
  for (const invalid of [
    { ...valid, bits: 1e9 },
    { ...valid, logZoom: -MAX_DEPTH_BITS - 1 },
    { ...valid, logZoom: Number.NaN },
    { ...valid, bits: 128 },
    { ...valid, x: "not hexadecimal" },
    { ...valid, y: "f".repeat(6000) },
    { center: [0, 0], zoomSize: 0 },
    { center: [0, 0], zoomSize: Infinity },
    { center: [1e9, 0], zoomSize: 1 },
    null,
  ])
    assert.throws(() => deserializeViewport(invalid));
});

test("reference samples preserve tiny components beside order-one components", () => {
  const view = moveViewport(createViewportAtLog([-2, 0], -4096), 0, 0.5);
  const reference = buildReference(view, "mandelbrot", [0, 0], 4);
  assert.deepEqual(Array.from(reference.orbit.slice(0, 4)), [0, 0, 0, 0]);
  assert.deepEqual(Array.from(reference.orbit.slice(4, 8)), [-1, 1, 1, -4097]);
  assert.ok(reference.orbit.every(Number.isFinite));
  assert.deepEqual(fixedToFloatExp(-(BigInt(1) << BigInt(100)), 20000), [-1, -19900]);
});

test("high precision distinguishes either side of the Mandelbrot antenna beyond float ranges", () => {
  for (const depth of [100 * Math.log2(10), 1000 * Math.log2(10), 4096]) {
    const view = createViewportAtLog([-2, 0], -depth);
    const iterations = Math.ceil(depth / 2) + 100;
    assert.equal(sampleEscape(view, "mandelbrot", [0, 0], iterations, -1, 0).escaped, true);
    assert.equal(sampleEscape(view, "mandelbrot", [0, 0], iterations, 1, 0).escaped, false);
    assert.equal(sampleEscape(view, "mandelbrot", [0, 0], iterations, 0, 0).escaped, false);
  }
});

test("Julia perturbs the initial point while Mandelbrot and Ship perturb their constant", () => {
  const view = createViewportAtLog([0.5, -0.25], -80);
  const julia = buildReference(view, "julia", [-0.75, 0.125], 2);
  const mandelbrot = buildReference(view, "mandelbrot", [0, 0], 2);
  const ship = buildReference(view, "burning-ship", [0, 0], 2);
  const number = (orbit, index, component) =>
    orbit[index * 4 + component] * 2 ** orbit[index * 4 + component + 1];
  assert.equal(number(julia.orbit, 0, 0), 0.5);
  assert.equal(number(julia.orbit, 1, 0), -0.5625);
  assert.equal(number(julia.orbit, 1, 2), -0.125);
  assert.equal(number(mandelbrot.orbit, 0, 0), 0);
  assert.equal(number(mandelbrot.orbit, 2, 2), -0.5);
  assert.equal(number(ship.orbit, 2, 2), 0);
});

test("Julia near z=1 retains initial deltas at 10^-1000", () => {
  // For c=0, z->z² has a unit-circle boundary. Reusing Mandelbrot's zero
  // seed or rebasing to the camera seed would erase this distinction.
  const depth = 1000 * Math.log2(10);
  const view = createViewportAtLog([1, 0], -depth);
  const iterations = Math.ceil(depth) + 100;
  assert.equal(sampleEscape(view, "julia", [0, 0], iterations, 1, 0).escaped, true);
  assert.equal(sampleEscape(view, "julia", [0, 0], iterations, -1, 0).escaped, false);
  assert.equal(sampleEscape(view, "julia", [0, 0], iterations, 0, 0).escaped, false);
});

test("reference includes the first escaping iterate and agrees with the direct oracle", () => {
  for (const formula of ["mandelbrot", "julia", "burning-ship"]) {
    const view = createViewport([1.2, -0.4], 0.001);
    const c = [-0.8, 0.156];
    const reference = buildReference(view, formula, c, 100);
    const direct = sampleEscape(view, formula, c, 100);
    assert.equal(reference.escaped, true);
    assert.equal(reference.length, direct.iteration + 2);
    assert.deepEqual(Array.from(reference.orbit.slice(-4)), direct.z.flat());
  }
});

test("deep destination highlighting clears after a sub-ulp pan", () => {
  const target = createViewportAtLog([-0.75, 0.125], -4096);
  assert.equal(matchesDeepViewport(target, { ...target }), true);
  assert.equal(matchesDeepViewport(moveViewport(target, 1 / 1024, 0), target), false);
  assert.equal(matchesDeepViewport(zoomViewport(target, target.logZoom - 1), target), false);
});
