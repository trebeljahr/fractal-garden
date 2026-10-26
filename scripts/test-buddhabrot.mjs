import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import ts from "typescript";

const require = createRequire(import.meta.url);
require.extensions[".ts"] = (module, filename) => {
  module._compile(
    ts.transpileModule(readFileSync(filename, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText,
    filename,
  );
};
const { BuddhabrotRenderer } = require("../utils/render/buddhabrot.ts");
const {
  getBuddhabrotViewport,
  normalizeBuddhabrotParams,
} = require("../utils/render/buddhabrotMath.ts");
const { moveCanvasViewport } = require("../utils/canvasViewport.ts");
const settings = {
  maxIterations: 20,
  minOrbitLength: 0,
  samplesPerFrame: 16384,
  paused: true,
  exposure: 0.9,
  background: "#000000",
  color: "#ffffff",
};
const context = (width = 160, height = 120) => ({
  canvas: { width, height },
  createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }),
  putImageData(image) {
    this.pixels = image.data.slice();
  },
});

test("20-step paths are accepted and non-escaping paths contribute nothing", () => {
  const renderer = new BuddhabrotRenderer(),
    ctx = context();
  renderer.update(settings);
  renderer.draw(ctx, 160, 120);
  const expected = new Int32Array(160 * 120);
  const viewport = getBuddhabrotViewport(160, 120);
  let rng = 42;
  const random = () => {
    rng ^= rng << 13;
    rng ^= rng >>> 17;
    rng ^= rng << 5;
    return (rng >>> 0) / 4294967296;
  };
  for (let sample = 0; sample < settings.samplesPerFrame; sample++) {
    const cr = -2 + random() * 4,
      ci = random() * 2;
    let real = 0,
      imag = 0;
    const path = [];
    let escaped = false;
    for (let iteration = 0; iteration < 20; iteration++) {
      [real, imag] = [real * real - imag * imag + cr, 2 * real * imag + ci];
      path.push([real, imag]);
      if (real * real + imag * imag > 4) {
        escaped = true;
        break;
      }
    }
    if (!escaped) continue;
    for (const [r, i] of path.slice(0, -1)) {
      const y = Math.floor(((viewport.maxY + r) / (viewport.maxY - viewport.minY)) * 120);
      if (y < 0 || y >= 120) continue;
      for (const imaginary of [i, -i]) {
        const x = Math.floor(((imaginary - viewport.minX) / (viewport.maxX - viewport.minX)) * 160);
        if (x >= 0 && x < 160) expected[y * 160 + x]++;
      }
    }
  }
  assert.deepEqual(renderer.state.counts, expected);
  assert.ok(renderer.cached > 1000);
});

test("paused zoom and resize retain seeds; returning to the same view returns identical pixels", () => {
  const renderer = new BuddhabrotRenderer(),
    ctx = context();
  renderer.update(settings);
  renderer.draw(ctx, 160, 120);
  const original = ctx.pixels,
    count = renderer.cached,
    samples = renderer.samples;
  const seeds = renderer.seeds.slice();
  renderer.update({ ...settings, viewport: { x: 0.1, y: -0.2, zoom: 4 } });
  renderer.draw(ctx, 160, 120);
  assert.notDeepEqual(ctx.pixels, original);
  assert.equal(renderer.cached, count);
  assert.equal(renderer.samples, samples);
  assert.deepEqual(renderer.seeds, seeds);
  renderer.update(settings);
  renderer.draw(ctx, 160, 120);
  assert.deepEqual(ctx.pixels, original);
  const output = context(320, 240);
  renderer.drawExport(output, 160, 120);
  assert.equal(output.pixels.length, 320 * 240 * 4);
  assert.equal(renderer.cached, count);
  renderer.draw(ctx, 160, 120);
  assert.deepEqual(ctx.pixels, original);
});

test("replacing a full cache and replaying it produce identical nonnegative counts", () => {
  const renderer = new BuddhabrotRenderer(),
    ctx = context(64, 48);
  renderer.update({ ...settings, paused: false, samplesPerFrame: 50000 });
  for (let n = 0; n < 10; n++) renderer.draw(ctx, 64, 48);
  const counts = renderer.state.counts.slice();
  assert.equal(renderer.cached, 262144);
  assert.ok(counts.every((n) => n >= 0));
  renderer.update(settings);
  renderer.state = null;
  renderer.draw(ctx, 64, 48);
  assert.deepEqual(renderer.state.counts, counts);
});

test("zoom stays anchored under the pointer with asymmetric header/footer framing", () => {
  const width = 1200,
    height = 800,
    framing = { top: 100, bottom: 30 };
  const view = { x: 0.13, y: -0.07, zoom: 2 },
    px = 875,
    py = 246;
  const next = moveCanvasViewport(view, width, height, 1.7, px, py);
  const point = (v) => {
    const b = getBuddhabrotViewport(width, height, v, framing);
    return [b.minX + (px / width) * (b.maxX - b.minX), b.maxY - (py / height) * (b.maxY - b.minY)];
  };
  const a = point(view),
    b = point(next);
  assert.ok(Math.abs(a[0] - b[0]) < 1e-12);
  assert.ok(Math.abs(a[1] - b[1]) < 1e-12);
});

test("invalid and restored orbit ranges stay bounded and finite", () => {
  const normalized = normalizeBuddhabrotParams({
    ...settings,
    maxIterations: 20,
    minOrbitLength: 100,
  });
  assert.equal(normalized.minOrbitLength, 20);
  assert.equal(normalizeBuddhabrotParams({ ...settings, maxIterations: NaN }).maxIterations, 20);
  assert.equal(
    normalizeBuddhabrotParams({ ...settings, samplesPerFrame: Infinity }).samplesPerFrame,
    16384,
  );
});
