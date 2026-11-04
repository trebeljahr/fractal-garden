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
const { createZoomGlide } = require("../utils/deepZoom/zoomGlide.ts");

function harness(run, limit = Number.POSITIVE_INFINITY) {
  const saved = [globalThis.requestAnimationFrame, globalThis.cancelAnimationFrame];
  const frames = new Map();
  let serial = 0;
  let now = 0;
  globalThis.requestAnimationFrame = (callback) => {
    frames.set(++serial, callback);
    return serial;
  };
  globalThis.cancelAnimationFrame = (id) => frames.delete(id);
  const steps = [];
  let position = 0;
  const glide = createZoomGlide((bits, anchor) => {
    const next = Math.min(limit, position + bits);
    const moved = next - position;
    position = next;
    steps.push({ bits, moved, anchor });
    return moved;
  });
  const tick = (ms = 1000 / 60) => {
    now += ms;
    const callbacks = [...frames.values()];
    frames.clear();
    for (const callback of callbacks) callback(now);
  };
  try {
    run({
      glide,
      steps,
      tick,
      get pending() {
        return frames.size;
      },
      get position() {
        return position;
      },
    });
  } finally {
    glide.stop();
    [globalThis.requestAnimationFrame, globalThis.cancelAnimationFrame] = saved;
  }
}

const anchor = { x: 0.25, y: -0.5 };

test("one wheel jump becomes many small steps that add up exactly and then stop", () =>
  harness((h) => {
    h.glide.add(-0.2, anchor);
    for (let i = 0; h.pending && i < 500; i++) h.tick();
    assert.equal(h.pending, 0, "the glide finishes");
    assert.ok(h.steps.length > 10);
    assert.ok(Math.abs(h.steps[0].bits) < 0.05, "the first frame moves a small share");
    assert.ok(Math.abs(h.position + 0.2) < 1e-12);
    assert.deepEqual(h.steps[0].anchor, anchor);
  }));

test("frequent wheel events reach a steady speed", () =>
  harness((h) => {
    for (let i = 0; i < 90; i++) {
      h.glide.add(-0.01, anchor);
      h.tick();
    }
    const late = h.steps.slice(-30).map(({ bits }) => bits);
    const spread = (Math.max(...late) - Math.min(...late)) / Math.abs(late[0]);
    assert.ok(spread < 0.01, `steps vary by ${spread}`);
  }));

test("a late frame covers more distance but cannot jump", () =>
  harness((h) => {
    h.glide.add(-1, anchor);
    h.tick();
    const before = h.position;
    h.tick(2000);
    assert.ok(before - h.position < 0.5);
  }));

test("reversing direction drops the old distance", () =>
  harness((h) => {
    h.glide.add(-1, anchor);
    h.tick();
    h.glide.add(0.1, anchor);
    h.tick();
    assert.ok(h.steps.at(-1).bits > 0);
  }));

test("the zoom limit ends the glide", () =>
  harness((h) => {
    h.glide.add(1, anchor);
    for (let i = 0; h.pending && i < 500; i++) h.tick();
    assert.equal(h.position, 0.1);
    assert.equal(h.pending, 0);
  }, 0.1));

test("stopping cancels the remaining distance", () =>
  harness((h) => {
    h.glide.add(-1, anchor);
    h.tick();
    h.glide.stop();
    const { length } = h.steps;
    h.tick();
    assert.equal(h.steps.length, length);
    assert.equal(h.pending, 0);
  }));
