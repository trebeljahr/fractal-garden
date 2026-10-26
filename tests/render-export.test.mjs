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
const { RenderHost } = require("../utils/render/host.ts");
const { PolylineSceneRenderer } = require("../utils/render/polylineScene.ts");
const { Scene3DRenderer } = require("../utils/render/scene3d.ts");
const { BuddhabrotRenderer } = require("../utils/render/buddhabrot.ts");
const polyline = require("../utils/polyline3d.ts");
const polyhedra = require("../utils/polyhedronFractals.ts");

function context(width = 32, height = 24) {
  const calls = [];
  const ctx = new Proxy(
    {
      canvas: { width, height },
      calls,
      createImageData: (w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }),
      measureText: () => ({ width: 1 }),
    },
    {
      get: (target, name) =>
        name in target ? target[name] : (...args) => calls.push([name, ...args]),
    },
  );
  return ctx;
}

async function hostHarness(run) {
  const saved = Object.fromEntries(
    ["OffscreenCanvas", "requestAnimationFrame", "cancelAnimationFrame"].map((name) => [
      name,
      globalThis[name],
    ]),
  );
  const frames = new Map();
  const outputs = [];
  let next = 0;
  globalThis.OffscreenCanvas = class {
    constructor(width, height) {
      this.width = width;
      this.height = height;
      this.ctx = context(width, height);
      this.ctx.canvas = this;
      outputs.push(this);
    }
    getContext() {
      return this.ctx;
    }
    convertToBlob() {
      return Promise.resolve(new Blob(["png"], { type: "image/png" }));
    }
  };
  globalThis.requestAnimationFrame = (callback) => {
    const id = ++next;
    frames.set(id, callback);
    return id;
  };
  globalThis.cancelAnimationFrame = (id) => frames.delete(id);
  const live = new OffscreenCanvas(32, 24);
  let host;
  try {
    await run({
      create(renderer) {
        host = new RenderHost(live, renderer, () => {}, false);
        host.resize(32, 24, 2);
        return host;
      },
      tick() {
        const [id, callback] = frames.entries().next().value;
        frames.delete(id);
        callback(performance.now());
      },
      live,
      outputs,
    });
  } finally {
    host?.dispose();
    Object.assign(globalThis, saved);
  }
}

test("stateful export receives pending parameters without flushing or mutating the live renderer", () =>
  hostHarness(async (h) => {
    const seen = [];
    const renderer = {
      value: null,
      update(value) {
        this.value = value;
      },
      draw() {
        return false;
      },
      describe() {
        return null;
      },
      drawExport(ctx, width, height, pending) {
        seen.push({
          live: this.value,
          pending,
          width,
          height,
          pixels: [ctx.canvas.width, ctx.canvas.height],
        });
      },
    };
    const host = h.create(renderer);
    host.setParams({ color: "red" });
    h.tick();
    host.setParams({ color: "blue" });
    const blob = await host.exportPng(4, () => {
      throw new Error("must reuse displayed state");
    });
    assert.equal(blob.type, "image/png");
    assert.deepEqual(seen, [
      {
        live: { color: "red" },
        pending: { color: "blue" },
        width: 32,
        height: 24,
        pixels: [128, 96],
      },
    ]);
    assert.deepEqual(renderer.value, { color: "red" });
    assert.deepEqual([h.live.width, h.live.height], [64, 48]);
    h.tick();
    assert.deepEqual(
      renderer.value,
      { color: "blue" },
      "queued edit still reaches the live renderer",
    );
  }));

test("stateless export builds pending settings with the displayed view in an isolated renderer", () =>
  hostHarness(async (h) => {
    const draws = [];
    const make = () => ({
      params: null,
      view: 7,
      update(params) {
        this.params = params;
      },
      restoreView(view) {
        this.view = view;
      },
      snapshotView() {
        return this.view;
      },
      describe() {
        return null;
      },
      draw() {
        draws.push([this.params, this.view]);
        this.view++;
        return false;
      },
    });
    const live = make();
    const host = h.create(live);
    host.setParams("old");
    h.tick();
    host.setParams("new");
    await host.exportPng(3, make);
    assert.deepEqual(draws.at(-1), ["new", 8]);
    assert.equal(live.params, "old");
    assert.equal(live.view, 8);
  }));

const trailParams = {
  source: { kind: "lorenz", sigma: 10, rho: 28, beta: 8 / 3, dt: 0.005, steps: 8 },
  config: {
    animateTrail: true,
    trailSpeed: 5,
    showHead: false,
    autoRotate: true,
    rotationX: 8,
    rotationY: 2,
    cameraDistance: 4,
    background: "#252424",
    nearColor: "#ffd166",
    farColor: "#ef476f",
    farAlpha: 0.25,
    lineWidth: 0.6,
  },
};

test("an extended animated trail exports the same points, head position and rotation without advancing", () => {
  const original = polyline.drawPolyline3D;
  const calls = [];
  polyline.drawPolyline3D = (_ctx, _w, _h, drawing, visible, config) => {
    calls.push({
      points: Array.from(drawing.points),
      count: drawing.count,
      visible,
      rotation: config.rotationY,
      color: config.nearColor,
    });
    return null;
  };
  try {
    const renderer = new PolylineSceneRenderer();
    renderer.update(trailParams);
    for (let i = 0; i < 5; i++) renderer.draw(context(), 32, 24);
    const displayed = calls.at(-1);
    assert.ok(
      displayed.count > trailParams.source.steps,
      "trail extended beyond its initial geometry",
    );
    const before = structuredClone({
      points: renderer.polyline.points,
      visible: renderer.visible,
      yaw: renderer.yawOffset,
    });
    renderer.drawExport(context(128, 96), 32, 24);
    assert.deepEqual(calls.at(-1), displayed);
    renderer.drawExport(context(128, 96), 32, 24, {
      ...trailParams,
      config: { ...trailParams.config, nearColor: "#ffffff" },
    });
    assert.deepEqual(calls.at(-1), { ...displayed, color: "#ffffff" });
    renderer.drawExport(context(128, 96), 32, 24, {
      ...trailParams,
      source: { kind: "hilbert3d", order: 1 },
    });
    assert.equal(calls.at(-1).count, 8, "a queued source change exports the new curve");
    assert.equal(calls.at(-1).visible, 6, "a restarted trail includes its opening frame");
    assert.deepEqual(
      { points: renderer.polyline.points, visible: renderer.visible, yaw: renderer.yawOffset },
      before,
    );
    renderer.draw(context(), 32, 24);
    assert.ok(calls.at(-1).visible > displayed.visible, "normal playback still advances afterward");
  } finally {
    polyline.drawPolyline3D = original;
  }
});

test("3D export keeps the last displayed rotation rather than the next animation frame", () => {
  const original = polyhedra.drawPolyhedronScene;
  const rotations = [];
  polyhedra.drawPolyhedronScene = (_ctx, _w, _h, _scene, options) =>
    rotations.push(options.rotationY);
  try {
    const renderer = new Scene3DRenderer();
    renderer.update({
      spec: { kind: "menger" },
      iterations: 0,
      view: { autoRotate: true, rotationY: 10, rotationSpeed: 2 },
    });
    renderer.draw(context(), 32, 24);
    renderer.draw(context(), 32, 24);
    renderer.drawExport(context(), 32, 24);
    assert.deepEqual(rotations, [10, 12, 12]);
    assert.equal(renderer.yawOffset, 4);
  } finally {
    polyhedra.drawPolyhedronScene = original;
  }
});

test("Buddhabrot exports cumulative samples and pending settings without mutating the live drawing", async () => {
  const renderer = new BuddhabrotRenderer();
  const params = {
    maxIterations: 10,
    minOrbitLength: 2,
    samplesPerFrame: 50000,
    exposure: 1,
    background: "#000000",
    color: "#ffffff",
    paused: false,
  };
  renderer.update(params);
  for (let i = 0; i < 10; i++) renderer.draw(context(), 32, 24);
  assert.equal(renderer.samples, 500000);
  const before = structuredClone(renderer.state);
  const rng = renderer.rng.value;
  const exported = context(128, 96);
  await renderer.drawExport(exported, 32, 24, { ...params, color: "#ffaa00" });
  const pixels = exported.calls.find(([name]) => name === "putImageData")[1].data;
  assert.ok(pixels.some((value, i) => i % 4 === 0 && value > 0));
  assert.ok(pixels.every((value, i) => i % 4 !== 2 || value === 0));
  assert.deepEqual(renderer.state, before);
  assert.equal(renderer.rng.value, rng);
  assert.equal(renderer.samples, 500000);
  const changedOrbit = context(128, 96);
  await renderer.drawExport(changedOrbit, 32, 24, { ...params, maxIterations: 11 });
  assert.ok(changedOrbit.calls.some(([name]) => name === "putImageData"));
  assert.deepEqual(renderer.state, before);
  assert.equal(renderer.samples, 500000);
});

test("PNG encoding waits for asynchronous renderer reconstruction", () =>
  hostHarness(async (h) => {
    let finish;
    const renderer = {
      update() {},
      draw() {
        return false;
      },
      describe() {
        return null;
      },
      drawExport() {
        return new Promise((resolve) => {
          finish = resolve;
        });
      },
    };
    const host = h.create(renderer);
    host.setParams({});
    h.tick();
    let encoded = false;
    const pending = host
      .exportPng(1, () => renderer)
      .then(() => {
        encoded = true;
      });
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.equal(encoded, false);
    finish();
    await pending;
    assert.equal(encoded, true);
  }));
