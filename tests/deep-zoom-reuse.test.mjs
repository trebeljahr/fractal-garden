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
const { createMandelbrotReuse, PHASES } = require("../utils/deepZoom/reuse.ts");
const { createViewportAtLog, zoomViewport } = require("../utils/deepZoom/math.ts");

function harness(run) {
  const saved = [globalThis.requestAnimationFrame, globalThis.cancelAnimationFrame];
  const frames = new Map();
  let serial = 0;
  globalThis.requestAnimationFrame = (callback) => {
    frames.set(++serial, callback);
    return serial;
  };
  globalThis.cancelAnimationFrame = (id) => frames.delete(id);
  const paints = [];
  const completions = [];
  let depthTest = false;
  let clears = 0;
  const gl = new Proxy(
    {
      TEXTURE0: 100,
      TEXTURE3: 103,
      getExtension: () => null,
      getShaderParameter: () => true,
      getProgramParameter: () => true,
      getAttribLocation: () => 0,
      getUniformLocation: (_, name) => name,
      checkFramebufferStatus: () => "FRAMEBUFFER_COMPLETE",
      enable: (cap) => {
        if (cap === "DEPTH_TEST") depthTest = true;
      },
      disable: (cap) => {
        if (cap === "DEPTH_TEST") depthTest = false;
      },
      clear: (bits) => {
        if (bits === "COLOR_BUFFER_BIT") clears++;
      },
      readPixels: () => assert.fail("reuse must not read GPU pixels"),
    },
    {
      get(target, key) {
        if (key in target) return target[key];
        if (/^[A-Z_0-9]+$/.test(key)) return key;
        if (key.startsWith("create")) return () => ({ id: ++serial });
        return () => {};
      },
    },
  );
  const [width, height] = [640, 360];
  let snapshot = {
    state: {
      view: createViewportAtLog([-0.75, 0.125], -20),
      c: [0, 0],
      width,
      height,
      config: { iterations: 200, palette: "classic" },
    },
    orbit: {},
    orbitView: createViewportAtLog([-0.75, 0.125], -20),
    version: 1,
    iterations: 440,
    width,
    height,
  };
  const motion = createMandelbrotReuse(gl, {
    paint(source, target) {
      paints.push({ source, target, depthTest });
    },
    complete: (version) => completions.push(version),
  });
  const tick = () => {
    const callbacks = [...frames.values()];
    frames.clear();
    for (const callback of callbacks) callback(0);
  };
  try {
    run({
      motion,
      paints,
      completions,
      tick,
      flush() {
        for (let i = 0; frames.size && i < 200; i++) tick();
        assert.equal(frames.size, 0, "reuse must stop asking for frames");
      },
      update(moving = false, change = {}, canPaint = true) {
        snapshot = { ...snapshot, ...change };
        motion.update(snapshot, moving, canPaint);
      },
      get snapshot() {
        return snapshot;
      },
      get clears() {
        return clears;
      },
    });
  } finally {
    motion.destroy();
    [globalThis.requestAnimationFrame, globalThis.cancelAnimationFrame] = saved;
  }
}

test("a resting view recalculates every phase once at native size, then stops", () =>
  harness((h) => {
    h.update(false);
    h.flush();
    assert.equal(h.motion.getStats().paintedPhases, PHASES);
    assert.deepEqual(h.completions, [1]);
    for (const { target, depthTest } of h.paints) {
      assert.deepEqual(target.tile, { x: 0, y: 0, width: 640, height: 360 });
      assert.equal(target.pixelRatio, 1);
      assert.ok(depthTest, "only the masked pixels are calculated");
    }
    const painted = h.paints.length;
    h.update(false, { version: 2 });
    h.flush();
    assert.equal(h.paints.length, painted, "the same camera needs no new pixels");
    assert.deepEqual(h.completions, [1, 2]);
  }));

test("moving the camera moves stored pixels and starts a new cycle", () =>
  harness((h) => {
    h.update(false);
    h.flush();
    const clears = h.clears;
    const state = { ...h.snapshot.state, view: zoomViewport(h.snapshot.state.view, -20.2, 0, 0) };
    h.update(true, { state, version: 2 });
    h.tick();
    const stats = h.motion.getStats();
    assert.equal(stats.reprojections, 1);
    assert.equal(h.clears, clears, "stored pixels are kept");
    assert.ok(stats.freshPhases < PHASES);
    assert.deepEqual(h.completions, [1], "moving never reports completion");
    h.update(false);
    h.flush();
    assert.deepEqual(h.completions, [1, 2]);
    assert.equal(h.motion.getStats().freshPhases, PHASES);
  }));

test("a camera without a usable reference still moves pixels but calculates none", () =>
  harness((h) => {
    h.update(false);
    h.flush();
    const painted = h.paints.length;
    const state = { ...h.snapshot.state, view: zoomViewport(h.snapshot.state.view, -21, 0, 0) };
    h.update(true, { state, version: 2 }, false);
    h.tick();
    assert.equal(h.motion.getStats().reprojections, 1);
    assert.equal(h.paints.length, painted);
  }));

test("a color change forgets stored pixels", () =>
  harness((h) => {
    h.update(false);
    h.flush();
    const clears = h.clears;
    const state = {
      ...h.snapshot.state,
      config: { ...h.snapshot.state.config, palette: "fire" },
    };
    h.update(false, { state, version: 2 });
    h.tick();
    assert.ok(h.clears > clears);
    assert.equal(h.motion.getStats().reprojections, 0);
  }));
