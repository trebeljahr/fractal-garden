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
  createViewport,
  createViewportAtLog,
  moveViewport,
  zoomViewport,
} = require("../utils/deepZoom/math.ts");
const fern = require("../utils/fernViewport.ts");
const { FernViewportRenderer, fernFramePlacement } = require("../utils/fernRenderer.ts");

test("retained fern pixels stay anchored through zoom, pan and precision changes", () => {
  for (const log of [1, -60, -2000]) {
    const start = createViewportAtLog([0, 1], log);
    const frame = { view: start, width: 800, height: 600 };
    assert.deepEqual(fernFramePlacement(frame, start, 800, 600), {
      x: 0,
      y: 0,
      width: 800,
      height: 600,
    });
    const closer = zoomViewport(start, log - 1, 0.25, -0.125);
    const placed = fernFramePlacement(frame, closer, 800, 600);
    // A scene point 75 px right and 37.5 px below the center remains under the cursor.
    assert(Math.abs(placed.x + 475 * 2 - 475) < 1e-4);
    assert(Math.abs(placed.y + 337.5 * 2 - 337.5) < 1e-4);
    const panned = fernFramePlacement(frame, moveViewport(start, 0.1, -0.2), 800, 600);
    assert(Math.abs(panned.x + 30) < 1e-4);
    assert(Math.abs(panned.y + 60) < 1e-4);
  }
});

function harness(t) {
  let now = 0,
    serial = 0;
  const frames = new Map(),
    jobs = [],
    paint = [],
    progress = [];
  const saved = Object.fromEntries(
    ["OffscreenCanvas", "requestAnimationFrame", "cancelAnimationFrame"].map((k) => [
      k,
      globalThis[k],
    ]),
  );
  class Canvas {
    id = ++serial;
    constructor(width, height) {
      this.width = width;
      this.height = height;
    }
    getContext() {
      return { setTransform() {}, fillRect() {} };
    }
  }
  globalThis.OffscreenCanvas = Canvas;
  globalThis.requestAnimationFrame = (fn) => {
    const id = ++serial;
    frames.set(id, fn);
    return id;
  };
  globalThis.cancelAnimationFrame = (id) => frames.delete(id);
  t.mock.method(performance, "now", () => now);
  const original = fern.createFernWalker;
  fern.createFernWalker = (...args) => {
    let samples = 0;
    jobs.push(args);
    return {
      get samples() {
        return samples;
      },
      get pending() {
        return samples < 300000 ? 1 : 0;
      },
      get tiles() {
        return 1;
      },
      get visited() {
        return samples / 100;
      },
      get resolution() {
        return 24;
      },
      step() {
        now += 1;
        samples += 50000;
        return [20, 30];
      },
    };
  };
  t.after(() => {
    fern.createFernWalker = original;
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete globalThis[k];
      else globalThis[k] = v;
    }
  });
  const ctx = {
    globalAlpha: 1,
    setTransform() {},
    fillRect() {
      paint.push({ clear: true });
    },
    drawImage(canvas, ...bounds) {
      paint.push({ id: canvas.id, alpha: this.globalAlpha, bounds });
    },
  };
  const renderer = new FernViewportRenderer(ctx, {
    matrix: [],
    view: createViewport([0, 0], 1),
    width: 800,
    height: 600,
    ratio: 1,
    method: "chaos",
    background: "#252424",
    color: "#96f78e",
    paused: true,
    reducedMotion: false,
    onProgress: (p) => progress.push(p),
  });
  const tick = (elapsed = 16) => {
    now += elapsed;
    const pending = [...frames.values()];
    frames.clear();
    for (const fn of pending) fn(now);
  };
  return { renderer, frames, jobs, paint, progress, tick };
}

test("fern gestures move the retained drawing without restarting random sampling each time", (t) => {
  const h = harness(t);
  h.tick();
  h.tick();
  assert.equal(h.jobs.length, 1);
  const first = h.paint.at(-1).id;
  assert(h.progress.at(-1).complete);
  for (let i = 0; i < 20; i++) h.renderer.setView(createViewport([0, 0], 1 / (1 + i * 0.01)));
  assert.equal(h.frames.size, 1, "gestures coalesce into one presentation frame");
  h.tick(16);
  assert.equal(h.jobs.length, 1, "no rebuild during the gesture");
  assert.equal(h.paint.at(-1).id, first, "old dots remain visible in the new camera");
  h.tick(80);
  assert.equal(h.jobs.length, 2);
  assert.equal(h.paint.at(-1).id, first, "partial traversal must never wipe the visible fern");
  h.tick();
  assert.notEqual(h.paint.at(-1).id, first);
  assert.equal(h.paint.at(-1).alpha, 0, "completed detail blends in from the retained image");
  h.tick(70);
  assert(h.paint.at(-1).alpha > 0 && h.paint.at(-1).alpha < 1);
  h.tick(160);
  assert.equal(h.paint.at(-1).alpha, 1);
  assert.equal(h.frames.size, 0, "paused completed fern becomes idle");
  assert(
    h.jobs.every((args) => args[5] === 42),
    "camera changes keep the same seed",
  );
  h.renderer.dispose();
});

test("resuming fills the existing fern and disposal cancels its pending frame", (t) => {
  const h = harness(t);
  h.tick();
  h.tick();
  const source = h.paint.at(-1).id;
  h.renderer.setPaused(false);
  h.tick();
  assert.equal(h.jobs.length, 1);
  assert.equal(h.paint.at(-1).id, source);
  assert(h.frames.size > 0);
  h.renderer.dispose();
  assert.equal(h.frames.size, 0);
  const calls = h.paint.length;
  h.tick();
  assert.equal(h.paint.length, calls);
});

test("continuous zoom keeps receiving completed detail between gestures", (t) => {
  const h = harness(t);
  h.tick();
  h.tick();
  const first = h.paint.at(-1).id;
  h.renderer.setView(createViewport([0, 0], 1 / 1.8));
  h.tick(16);
  assert.equal(h.jobs.length, 2, "enlarged preview requests detail during the gesture");
  h.renderer.setView(createViewport([0, 0], 1 / 2));
  h.tick(16);
  assert.equal(h.jobs.length, 2, "new gesture must not throw away unfinished traversal");
  assert.notEqual(h.paint.at(-1).id, first, "refinement arrives before the gesture ends");
  h.renderer.dispose();
});
