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
const {
  createSceneMotion,
  setSceneProgress,
  CONSTRUCTION_MOTION_MS,
} = require("../utils/constructionMotion.ts");
const { buildScene, Scene3DRenderer } = require("../utils/render/scene3d.ts");
const { ConstructionRenderer } = require("../utils/render/construction.ts");

function constructionCanvas(t) {
  const original = Object.getOwnPropertyDescriptor(globalThis, "OffscreenCanvas");
  class Canvas {
    constructor(width, height) {
      this.width = width;
      this.height = height;
      this.frame = null;
      this.context = { drawImage: (source) => (this.frame = source.frame) };
    }
    getContext() {
      return this.context;
    }
  }
  Object.defineProperty(globalThis, "OffscreenCanvas", { configurable: true, value: Canvas });
  t.after(() => {
    if (original) Object.defineProperty(globalThis, "OffscreenCanvas", original);
    else delete globalThis.OffscreenCanvas;
  });
  const composites = [];
  const ctx = {
    canvas: new Canvas(480, 320),
    globalAlpha: 1,
    drawImage(image) {
      composites.push({ frame: image.frame, alpha: this.globalAlpha });
    },
  };
  return { ctx, composites };
}

test("construction restores the source view and discards frames from the old view", (t) => {
  const { ctx, composites } = constructionCanvas(t);
  let yaw = 12;
  let level = 0;
  let created = 0;
  const views = [];
  const source = {
    update: (params) => (level = params.iterations),
    draw: () => {
      views.push(yaw);
      ctx.canvas.frame = { yaw, level };
      return false;
    },
    describe: () => ({ level, work: level + 1 }),
    snapshotView: () => yaw,
    restoreView: (state) => (yaw = state),
  };
  const renderer = new ConstructionRenderer(() => {
    created++;
    return source;
  });
  renderer.update({ kind: "polylineScene", params: { iterations: 0 }, level: 0, animate: true });
  assert.equal(renderer.draw(ctx, 480, 320), false);
  assert.equal(renderer.snapshotView(), 12);
  renderer.update({ kind: "polylineScene", params: { iterations: 1 }, level: 1, animate: true });
  assert.equal(renderer.draw(ctx, 480, 320), true);
  assert.equal(created, 1);
  assert.deepEqual(renderer.describe(), { level: 1, work: 2 });
  composites.length = 0;
  renderer.restoreView(0);
  assert.equal(renderer.snapshotView(), 0);
  assert.equal(renderer.draw(ctx, 480, 320), false);
  assert.deepEqual(views, [12, 12, 0]);
  assert.deepEqual(ctx.canvas.frame, { yaw: 0, level: 1 });
  assert.equal(composites.length, 0, "reset must not blend in a stale camera view");
});

test("construction keeps live polyline frames running through a finite growth blend", (t) => {
  const { ctx, composites } = constructionCanvas(t);
  let time = 100;
  t.mock.method(performance, "now", () => time);
  let running = true;
  let frames = 0;
  const renderer = new ConstructionRenderer(() => ({
    update() {},
    draw() {
      ctx.canvas.frame = ++frames;
      return running;
    },
    describe: () => null,
  }));
  renderer.update({ kind: "polylineScene", params: {}, level: 0, animate: true });
  assert.equal(renderer.draw(ctx, 480, 320), true);
  assert.equal(renderer.draw(ctx, 480, 320), true);
  assert.equal(frames, 2, "auto-rotation must render each requested frame");
  renderer.update({ kind: "polylineScene", params: {}, level: 1, animate: true });
  assert.equal(renderer.draw(ctx, 480, 320), true);
  assert.deepEqual(composites.slice(-2), [
    { frame: 2, alpha: 1 },
    { frame: 3, alpha: 0 },
  ]);
  time += CONSTRUCTION_MOTION_MS / 2;
  assert.equal(renderer.draw(ctx, 480, 320), true);
  assert.deepEqual(composites.slice(-2), [
    { frame: 2, alpha: 1 },
    { frame: 4, alpha: 0.5 },
  ]);
  time += CONSTRUCTION_MOTION_MS;
  assert.equal(renderer.draw(ctx, 480, 320), true);
  composites.length = 0;
  assert.equal(renderer.draw(ctx, 480, 320), true);
  assert.equal(composites.length, 0, "continuous frames must not restart the growth blend");
  running = false;
  assert.equal(renderer.draw(ctx, 480, 320), false);
  assert.equal(frames, 7);
  assert.equal(ctx.globalAlpha, 1);
});

test("construction delegates native scene motion and view state without a cached blend", (t) => {
  const { ctx, composites } = constructionCanvas(t);
  let params;
  let view = 24;
  let frames = 0;
  const renderer = new ConstructionRenderer(() => ({
    update: (next) => (params = next),
    draw: () => ++frames < 2,
    describe: () => ({ level: params.iterations, work: 20 }),
    snapshotView: () => view,
    restoreView: (next) => (view = next),
  }));
  renderer.update({ kind: "scene3d", params: { iterations: 1 }, level: 1, animate: true });
  assert.deepEqual(params, { iterations: 1, constructionMotion: true });
  assert.equal(renderer.draw(ctx, 480, 320), true);
  assert.equal(renderer.draw(ctx, 480, 320), false);
  assert.equal(renderer.snapshotView(), 24);
  renderer.restoreView(0);
  assert.equal(renderer.snapshotView(), 0);
  assert.deepEqual(renderer.describe(), { level: 1, work: 20 });
  assert.equal(composites.length, 0);
});

const specs = [
  { kind: "menger" },
  { kind: "vicsek3d" },
  { kind: "mosely", variant: "lighter" },
  { kind: "mosely", variant: "heavier" },
  { kind: "jerusalem" },
  { kind: "flake", mesh: "tetrahedron", ratio: 0.5 },
  { kind: "flake", mesh: "icosahedron", ratio: 1 / (1 + (1 + Math.sqrt(5)) / 2) },
  { kind: "kochSurface", start: "triangle" },
  { kind: "kochSurface", start: "tetrahedron" },
  { kind: "quadraticKoch3d" },
];
for (const spec of specs)
  test(`${JSON.stringify(spec)} transitions end at the exact next geometry`, () => {
    for (const level of [1, 2]) {
      const motion = createSceneMotion(spec, level);
      const final = buildScene(spec, level);
      assert.ok(motion);
      const positions = motion.type === "faces" ? motion.scene.positions : motion.scene.boxes;
      const expected = final.type === "faces" ? final.scene.positions : final.scene.boxes;
      setSceneProgress(motion, 0);
      assert.deepEqual(positions, motion.start);
      setSceneProgress(motion, 0.5);
      assert.ok(positions.some((p, i) => p !== motion.start[i] && p !== motion.end[i]));
      assert.ok(positions.every(Number.isFinite));
      setSceneProgress(motion, 1);
      assert.deepEqual(positions, motion.end);
      // Carved voxels append the disappearing pieces after the surviving surface.
      assert.deepEqual(positions.subarray(0, expected.length), expected);
      if (spec.kind === "menger" || spec.kind === "vicsek3d" || spec.kind === "mosely") {
        for (let offset = expected.length; offset < positions.length; offset += 72) {
          for (let v = 1; v < 24; v++)
            assert.deepEqual(
              positions.subarray(offset + v * 3, offset + v * 3 + 3),
              positions.subarray(offset, offset + 3),
            );
        }
      }
    }
  });

test("new quadratic bumps start on their parent planes", () => {
  const motion = createSceneMotion({ kind: "quadraticKoch3d" }, 1);
  for (let i = 0; i < motion.start.length; i += 3)
    assert.ok(motion.start.subarray(i, i + 3).some((x) => Math.abs(Math.abs(x) - 0.5) < 1e-6));
  assert.ok(motion.end.some((x) => Math.abs(x) > 0.5));
});

test("the explorer remains static; only forward construction steps animate", (t) => {
  let time = 100;
  t.mock.method(performance, "now", () => time);
  const ctx = new Proxy(
    { getTransform: () => ({ a: 1 }) },
    { get: (target, key) => target[key] ?? (() => {}) },
  );
  const view = {
    rotationX: 24,
    rotationY: 30,
    cameraDistance: 6,
    background: "#10151a",
    fillColor: "#b7c9bd",
    strokeColor: "#f5c56d",
    lineWidth: 0.5,
    showFaces: true,
    showWireframe: false,
    autoRotate: false,
    rotationSpeed: 0,
  };
  const r = new Scene3DRenderer();
  const params = { spec: { kind: "menger" }, iterations: 0, view };
  r.update(params);
  assert.equal(r.draw(ctx, 480, 320), false);
  r.update({ ...params, iterations: 1 });
  assert.equal(r.draw(ctx, 480, 320), false);
  r.update({ ...params, iterations: 2, constructionMotion: true });
  assert.equal(r.draw(ctx, 480, 320), true);
  time += CONSTRUCTION_MOTION_MS + 1;
  assert.equal(r.draw(ctx, 480, 320), false);
  r.update({ ...params, iterations: 1, constructionMotion: true });
  assert.equal(r.draw(ctx, 480, 320), false);
});
