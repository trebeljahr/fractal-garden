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
const { createMandelbrotMotion } = require("../utils/deepZoom/motion.ts");
const { createViewportAtLog, moveViewport, zoomViewport } = require("../utils/deepZoom/math.ts");

function harness(
  run,
  { timed = false, initial = false, size = [640, 360], reportErrors = true, backdrop = false } = {},
) {
  const [width, height] = size;
  const saved = [globalThis.requestAnimationFrame, globalThis.cancelAnimationFrame];
  const frames = new Map();
  let serial = 0;
  globalThis.requestAnimationFrame = (callback) => {
    frames.set(++serial, callback);
    return serial;
  };
  globalThis.cancelAnimationFrame = (id) => frames.delete(id);
  const paints = [],
    presents = [],
    completions = [],
    errors = [],
    allocated = [],
    deleted = [],
    queries = new Set();
  let available = false,
    disjoint = false,
    queryFailure = false,
    gpuMs = 5,
    framebufferComplete = true,
    paintError = null;
  let bound = null,
    active = 0,
    copies = 0,
    clears = 0;
  const uniforms = {};
  const extension = {
    TIME_ELAPSED_EXT: "elapsed",
    GPU_DISJOINT_EXT: "disjoint",
    QUERY_RESULT_AVAILABLE_EXT: "available",
    QUERY_RESULT_EXT: "result",
    createQueryEXT() {
      if (queryFailure) return null;
      const query = { id: ++serial };
      queries.add(query);
      return query;
    },
    beginQueryEXT() {
      assert.equal(queries.size, 1, "only one GPU batch may be in flight");
    },
    endQueryEXT() {},
    getQueryObjectEXT: (_, key) => (key === "available" ? available : gpuMs * 1e6),
    deleteQueryEXT(query) {
      assert.ok(queries.delete(query));
      deleted.push(query);
    },
  };
  const gl = new Proxy(
    {
      canvas: { width, height },
      TEXTURE0: 100,
      TEXTURE3: 103,
      getExtension: () => (timed ? extension : null),
      getParameter: () => disjoint,
      getShaderParameter: () => true,
      getProgramParameter: () => true,
      getAttribLocation: () => 0,
      getUniformLocation: (_, name) => name,
      checkFramebufferStatus: () =>
        framebufferComplete ? "FRAMEBUFFER_COMPLETE" : "FRAMEBUFFER_INCOMPLETE_ATTACHMENT",
      bindFramebuffer: (_, framebuffer) => {
        bound = framebuffer;
      },
      activeTexture: (unit) => {
        active = unit;
      },
      copyTexImage2D: () => {
        copies++;
      },
      clear: () => {
        clears++;
      },
      drawArrays: () => {
        assert.equal(bound, null);
        presents.push({ ...uniforms });
      },
      uniform1i: (key, ...values) => {
        uniforms[key] = values;
      },
      uniform1f: (key, ...values) => {
        uniforms[key] = values;
      },
      uniform2f: (key, ...values) => {
        uniforms[key] = values;
      },
      uniform3f: (key, ...values) => {
        uniforms[key] = values;
      },
      readPixels: () => assert.fail("motion must not read GPU pixels"),
      finish: () => assert.fail("motion must not block on GPU completion"),
    },
    {
      get(target, key) {
        if (key in target) return target[key];
        if (/^[A-Z_0-9]+$/.test(key)) return key;
        if (key.startsWith("create"))
          return () => {
            const resource = { kind: key, id: ++serial };
            allocated.push(resource);
            return resource;
          };
        if (key.startsWith("delete")) return (value) => deleted.push(value);
        return () => {};
      },
    },
  );
  let snapshot = {
    state: {
      view: createViewportAtLog([-0.75, 0.125], -20),
      c: [0, 0],
      width,
      height,
      config: {
        iterations: 200,
        look: "classic",
        colorMode: "smooth",
        palette: "classic",
        colorDensity: 1,
        colorOffset: 0,
        interior: "#000000",
      },
    },
    orbit: {},
    orbitView: createViewportAtLog([-0.75, 0.125], -20),
    version: 1,
    iterations: 440,
    width,
    height,
  };
  const motion = createMandelbrotMotion(gl, {
    backdrop,
    paint(source, target) {
      assert.ok(bound, "paint must target its offscreen framebuffer");
      if (paintError) throw paintError;
      paints.push({ source, target });
    },
    complete(version) {
      completions.push(version);
    },
    ...(reportErrors
      ? {
          error(error) {
            assert.equal(bound, null, "failure callback runs after framebuffer restoration");
            assert.equal(active, gl.TEXTURE0);
            assert.equal(queries.size, 0, "failure callback runs after query retirement");
            assert.ok(
              allocated.every((resource) => deleted.includes(resource)),
              "failure callback runs after resource cleanup",
            );
            errors.push(error);
          },
        }
      : {}),
    ...(initial ? { initialFrame: snapshot } : {}),
  });
  const tick = (timestamp = 0) => {
    const callbacks = [...frames.values()];
    frames.clear();
    const start = paints.length;
    for (const callback of callbacks) callback(timestamp);
    assert.equal(active, gl.TEXTURE0);
    assert.deepEqual([gl.canvas.width, gl.canvas.height], size);
    return paints.slice(start);
  };
  const flush = () => {
    for (let i = 0; frames.size && i < 200; i++) tick();
    assert.equal(frames.size, 0, "progressive rendering must eventually finish");
  };
  try {
    run({
      motion,
      paints,
      presents,
      completions,
      errors,
      allocated,
      queries,
      deleted,
      tick,
      flush,
      update(moving = false, change = {}, canPaint = true) {
        snapshot = { ...snapshot, ...change };
        motion.update(snapshot, moving, canPaint);
        return snapshot;
      },
      get snapshot() {
        return snapshot;
      },
      get copies() {
        return copies;
      },
      get clears() {
        return clears;
      },
      set available(value) {
        available = value;
      },
      set disjoint(value) {
        disjoint = value;
      },
      set queryFailure(value) {
        queryFailure = value;
      },
      set gpuMs(value) {
        gpuMs = value;
      },
      set framebufferComplete(value) {
        framebufferComplete = value;
      },
      set paintError(value) {
        paintError = value;
      },
    });
  } finally {
    motion.destroy();
    [globalThis.requestAnimationFrame, globalThis.cancelAnimationFrame] = saved;
  }
}

test("stopping at a new camera replaces an unfinished native pass with one final exact pass", () =>
  harness((h) => {
    h.update(false);
    h.tick();
    const originalSource = h.paints[0].source;
    const state = {
      ...h.snapshot.state,
      view: moveViewport(h.snapshot.state.view, 0.05, 0),
    };
    h.update(true, { state, version: 2 });
    h.tick();
    const beforeStop = h.paints.length;
    h.update(false);
    const firstSettledBatch = h.tick();
    assert.ok(firstSettledBatch.length > 0);
    assert.ok(firstSettledBatch.every(({ source }) => source !== originalSource));
    for (const { source, target } of firstSettledBatch) {
      assert.deepEqual(source.state.view, state.view);
      assert.deepEqual([target.width, target.height, target.pixelRatio], [640, 360, 1]);
    }
    h.flush();
    const settled = h.paints.slice(beforeStop);
    assert.equal(
      new Set(settled.map(({ source }) => source)).size,
      1,
      "only one final source is painted",
    );
    assert.equal(
      settled.reduce((sum, { target: { tile } }) => sum + tile.width * tile.height, 0),
      640 * 360,
      "the final camera is painted exactly once",
    );
    assert.ok(settled.every(({ source }) => source !== originalSource));
    assert.deepEqual(h.completions, [2]);
    assert.equal(h.motion.getStats().completedSources, 1);
  }));

test("no partial source paints over a finished one, moving or at rest", () =>
  harness(
    (h) => {
      const state = { ...h.snapshot.state, view: zoomViewport(h.snapshot.state.view, -23, 0, 0) };
      h.update(true, { state, version: 2 });
      h.tick();
      assert.ok(h.motion.getStats().workSubmittedFraction > 0);
      const shader = readFileSync(new URL("../utils/deepZoom/motion.ts", import.meta.url), "utf8");
      assert.match(
        shader,
        /work\.a > 0\.999 && history\.a <= 0\.999 && previous\.a <= 0\.999 && backdrop\.a <= 0\.999/,
        "partial work only fills space with no finished source",
      );
      h.update(false);
      h.tick();
      assert.ok(h.motion.getStats().workSubmittedFraction > 0);
      assert.equal(h.motion.getStats().historyVersion, null);
      assert.ok(h.motion.getStats().historyEffectiveDensity < 0.2, "history stays until replaced");
      h.flush();
      assert.deepEqual(h.completions, [2]);
      assert.equal(h.motion.getStats().historyEffectiveDensity, 1);
    },
    { initial: true },
  ));

test("a finished source fades in over the one it replaces, then frames stop", () =>
  harness(
    (h) => {
      const state = { ...h.snapshot.state, view: zoomViewport(h.snapshot.state.view, -23, 0, 0) };
      h.update(false, { state, version: 2 });
      while (h.motion.getStats().workSubmittedFraction < 1) h.tick();
      assert.equal(h.presents.at(-1).u_fade[0], 1);
      h.tick();
      assert.ok(h.presents.at(-1).u_fade[0] < 1, "the swap starts a fade");
      h.flush();
      assert.equal(h.presents.at(-1).u_fade[0], 1);
    },
    { initial: true },
  ));

test("a coarser moving source never replaces sharper history", () =>
  harness(
    (h) => {
      const near = { ...h.snapshot.state, view: moveViewport(h.snapshot.state.view, 0.3, 0) };
      h.update(true, { state: near, version: 2 });
      h.flush();
      const first = h.motion.getStats();
      assert.equal(first.completedSources, 1);
      assert.ok(first.historyEffectiveDensity === 1, "sharp history stays on top");
      assert.equal(first.historyCoversViewport, false);
    },
    { initial: true },
  ));

test("moving sources shrink to what the measured GPU rate can finish", () =>
  harness((h) => {
    const realNow = performance.now;
    let now = 1000;
    performance.now = () => now;
    try {
      h.update(true);
      h.tick();
      assert.equal(h.motion.getStats().sampleScale, 0.8);
      for (let i = 0; i < 8; i++) {
        now += 100;
        h.update(true, { version: 2 + i });
        h.tick();
      }
      assert.ok(h.motion.getStats().pixelRate < 1000);
      h.update(true, {
        state: { ...h.snapshot.state, view: zoomViewport(h.snapshot.state.view, -24, 0, 0) },
        version: 20,
      });
      h.tick();
      h.tick();
      assert.ok(h.motion.getStats().sampleScale < 0.8);
      assert.ok(h.motion.getStats().sampleScale >= 0.2);
    } finally {
      performance.now = realNow;
    }
  }));

test("settling finishes a moving source that alone fills edges exposed by zooming out", () =>
  harness(
    (h) => {
      const state = { ...h.snapshot.state, view: zoomViewport(h.snapshot.state.view, -19.8, 0, 0) };
      h.update(true, { state, version: 2 });
      const moving = h.tick();
      assert.equal(h.motion.getStats().historyCoversViewport, false);
      h.update(false);
      const next = h.tick();
      assert.equal(h.motion.getStats().discardedSources, 0);
      assert.ok(next.every(({ source }) => source === moving[0].source));
      h.flush();
      assert.equal(h.motion.getStats().completedSources, 2);
      const native = h.paints.filter(({ source }) => source !== moving[0].source);
      assert.equal(new Set(native.map(({ source }) => source)).size, 1);
      assert.equal(
        native.reduce((sum, { target: { tile } }) => sum + tile.width * tile.height, 0),
        640 * 360,
        "the native pass still paints the final camera exactly once",
      );
      assert.deepEqual(h.completions, [2]);
    },
    { initial: true },
  ));

test("settling drops a moving source that cannot fill the exposed edges either", () =>
  harness(
    (h) => {
      const first = { ...h.snapshot.state, view: zoomViewport(h.snapshot.state.view, -19.8, 0, 0) };
      h.update(true, { state: first, version: 2 });
      const moving = h.tick();
      const last = { ...first, view: zoomViewport(first.view, -19.4, 0, 0) };
      h.update(false, { state: last, version: 3 });
      const next = h.tick();
      assert.equal(h.motion.getStats().discardedSources, 1);
      assert.ok(next.every(({ source }) => source !== moving[0].source));
      assert.ok(next.every(({ target }) => target.width === 640 && target.height === 360));
    },
    { initial: true },
  ));

const isBackdrop = ({ target }) => Math.abs(target.pixelRatio - 1 / 12) < 1e-3;
const paintedArea = (paints) =>
  paints.reduce((sum, { target: { tile } }) => sum + tile.width * tile.height, 0);
const finishRest = (h) => {
  h.update(false);
  h.flush();
};

test("a resting view calculates its wide backdrop after the native pass", () =>
  harness(
    (h) => {
      h.update(false);
      const first = h.tick();
      assert.ok(first.every(isBackdrop), "an empty display fills with the backdrop first");
      h.flush();
      const backdrop = h.paints.filter(isBackdrop);
      const [{ source, target }] = backdrop;
      assert.deepEqual([target.width, target.height], [213, 120]);
      assert.equal(source.state.view.logZoom, h.snapshot.state.view.logZoom + 2);
      assert.equal(paintedArea(backdrop), 213 * 120);
      assert.equal(paintedArea(h.paints.filter((p) => !isBackdrop(p))), 640 * 360);
      assert.deepEqual(h.completions, [1]);
      assert.equal(h.motion.getStats().backdropCoversViewport, true);
      const painted = h.paints.length;
      h.update(false, { version: 2 });
      h.flush();
      assert.equal(h.paints.length, painted, "the same camera repaints nothing");
    },
    { backdrop: true },
  ));

test("a stopped camera refreshes its backdrop only after the native pass completes", () =>
  harness(
    (h) => {
      finishRest(h);
      const before = h.paints.length;
      const state = { ...h.snapshot.state, view: moveViewport(h.snapshot.state.view, 0.05, 0) };
      h.update(false, { state, version: 2 });
      h.flush();
      const next = h.paints.slice(before);
      const firstBackdrop = next.findIndex(isBackdrop);
      assert.equal(paintedArea(next.slice(0, firstBackdrop)), 640 * 360);
      assert.ok(next.slice(firstBackdrop).every(isBackdrop));
      assert.deepEqual(h.completions, [1, 2]);
    },
    { backdrop: true },
  ));

test("the backdrop keeps a zoom step ahead of a camera zooming out", () =>
  harness(
    (h) => {
      finishRest(h);
      const before = h.paints.length;
      const near = { ...h.snapshot.state, view: zoomViewport(h.snapshot.state.view, -19.5, 0, 0) };
      h.update(true, { state: near, version: 2 });
      assert.equal(h.tick().some(isBackdrop), false, "half a bit stays inside the backdrop");
      const far = { ...near, view: zoomViewport(near.view, -18.8, 0, 0) };
      h.update(true, { state: far, version: 3 });
      const batch = h.tick();
      assert.ok(batch.length && batch.every(isBackdrop), "the refresh outranks detail");
      assert.equal(batch[0].source.state.view.logZoom, -16.8);
      assert.ok(h.paints.length > before);
    },
    { backdrop: true },
  ));

test("settling goes straight to the native pass when the backdrop fills the edges", () =>
  harness(
    (h) => {
      finishRest(h);
      const state = { ...h.snapshot.state, view: zoomViewport(h.snapshot.state.view, -19.6, 0, 0) };
      h.update(true, { state, version: 2 });
      h.tick();
      const stats = h.motion.getStats();
      assert.equal(stats.historyCoversViewport, false);
      assert.equal(stats.backdropCoversViewport, true);
      h.update(false);
      const [first] = h.tick();
      assert.equal(h.motion.getStats().discardedSources, 1);
      assert.deepEqual([first.target.width, first.target.height], [640, 360]);
      const { tile } = first.target;
      assert.ok(tile.x < 320 && tile.x + tile.width > 256, "the pass begins at the center");
      assert.ok(tile.y < 180 && tile.y + tile.height > 128, "the pass begins at the center");
    },
    { backdrop: true },
  ));

test("a replacement backdrop stays hidden until it is whole", () =>
  harness(
    (h) => {
      finishRest(h);
      const shown = h.presents.at(-1).u_backdropSize;
      const state = { ...h.snapshot.state, view: zoomViewport(h.snapshot.state.view, -18.8, 0, 0) };
      h.update(true, { state, version: 2 });
      const density = h.motion.getStats().backdropEffectiveDensity;
      h.tick();
      assert.equal(h.motion.getStats().backdropEffectiveDensity, density);
      assert.deepEqual(h.presents.at(-1).u_backdropSize, shown);
      h.tick();
      h.tick();
      assert.ok(h.motion.getStats().backdropEffectiveDensity < density);
    },
    { backdrop: true },
  ));

test("a parameter edit replaces the backdrop before its native pass", () =>
  harness(
    (h) => {
      finishRest(h);
      const before = h.paints.length;
      const state = { ...h.snapshot.state, config: { ...h.snapshot.state.config, palette: "ice" } };
      h.update(false, { state, version: 2 });
      const first = h.tick();
      assert.deepEqual(h.presents.at(-1).u_backdropValid, [0]);
      assert.ok(first.every(isBackdrop));
      assert.ok(first.every(({ source }) => source.state.config.palette === "ice"));
      h.flush();
      assert.deepEqual(h.presents.at(-1).u_backdropValid, [1]);
      assert.equal(paintedArea(h.paints.slice(before).filter((p) => !isBackdrop(p))), 640 * 360);
    },
    { backdrop: true },
  ));

test("a camera move at rest discards an unfinished backdrop for the old camera", () =>
  harness(
    (h) => {
      h.update(false);
      const [{ source }] = h.tick();
      const state = { ...h.snapshot.state, view: moveViewport(h.snapshot.state.view, 0.1, 0) };
      h.update(false, { state, version: 2 });
      h.flush();
      const last = h.paints.filter(isBackdrop).at(-1);
      assert.notEqual(last.source, source);
      assert.equal(last.source.state.view.x, state.view.x);
      assert.deepEqual(h.completions, [2]);
    },
    { backdrop: true },
  ));

test("same-camera version changes retain native work and never repaint its completed source", () =>
  harness((h) => {
    h.update(false);
    h.tick();
    const originalSource = h.paints[0].source;
    h.update(false, { version: 2 });
    h.tick();
    h.flush();
    assert.ok(h.paints.every(({ source }) => source === originalSource));
    assert.equal(h.clears, 1);
    assert.equal(
      h.paints.reduce((sum, { target: { tile } }) => sum + tile.width * tile.height, 0),
      640 * 360,
    );
    assert.deepEqual(h.completions, [2]);
    const paintCount = h.paints.length;
    h.update(false, { version: 3 });
    h.flush();
    assert.equal(h.paints.length, paintCount);
    assert.equal(h.clears, 1);
    assert.equal(h.motion.getStats().completedSources, 1);
    assert.deepEqual(h.completions, [2, 3]);
  }));

test("newly revealed visible edges outrank the center and preserve submitted coverage", () =>
  harness(
    (h) => {
      const original = h.snapshot.state;
      const left = { ...original, view: moveViewport(original.view, -0.1, 0) };
      h.update(true, { state: left, version: 2 });
      const first = h.tick();
      assert.equal(first[0].target.tile.x, 0, "new left edge is painted before the center");
      const source = first[0].source;
      const right = { ...original, view: moveViewport(original.view, 0.1, 0) };
      h.update(true, { state: right, version: 3 });
      const second = h.tick();
      assert.ok(
        second.every(({ target }) => target.tile.x >= 512),
        "new right edge takes priority on the next input",
      );
      h.flush();
      const { width, height } = first[0].target;
      const counts = new Uint8Array(width * height);
      for (const paint of h.paints.filter((paint) => paint.source === source)) {
        const { tile } = paint.target;
        for (let y = tile.y; y < tile.y + tile.height; y++) {
          for (let x = tile.x; x < tile.x + tile.width; x++) counts[y * width + x]++;
        }
      }
      assert.ok(
        counts.every((count) => count === 1),
        "reordering neither repeats nor omits submitted tiles",
      );
    },
    { initial: true },
  ));

test("settling starts the latest native pass even without completed history", () =>
  harness((h) => {
    h.update(true);
    h.tick();
    assert.equal(h.motion.getStats().historyCoversViewport, false);
    h.update(false);
    const batch = h.tick();
    assert.equal(h.motion.getStats().discardedSources, 1);
    assert.ok(batch.every(({ target }) => target.width === 640 && target.height === 360));
    h.flush();
    assert.deepEqual(h.completions, [1]);
  }));

test("entering motion caps the next batch even when a large resting query just completed", () =>
  harness(
    (h) => {
      h.available = true;
      h.gpuMs = 1;
      h.update(false);
      h.tick();
      h.tick();
      h.tick();
      assert.ok(h.motion.getStats().batchPixels > 32768);
      h.update(true);
      assert.ok(h.motion.getStats().batchPixels <= 32768);
      const batch = h.tick();
      assert.ok(
        batch.reduce((sum, { target: { tile } }) => sum + tile.width * tile.height, 0) <= 32768,
      );
    },
    { timed: true, size: [2048, 1536] },
  ));

test("fallback grows from RAF pacing, shrinks after a late frame and resets for motion", () =>
  harness(
    (h) => {
      h.update(false);
      for (let i = 0; i <= 10; i++) h.tick(i * 16.7);
      const before = h.motion.getStats().fallbackPixels;
      assert.ok(before >= 131072 && before <= 262144);
      h.tick(225);
      assert.equal(h.motion.getStats().fallbackPixels, Math.max(16384, Math.floor(before / 2)));
      h.update(true);
      assert.ok(h.motion.getStats().fallbackPixels <= 32768);
      for (let i = 1; i <= 8; i++) h.tick(225 + i * 16.7);
      assert.ok(h.motion.getStats().fallbackPixels <= 65536);
      assert.equal(h.queries.size, 0);
    },
    { size: [2048, 1536] },
  ));

test("asynchronous framebuffer failure releases resources before reporting once", () =>
  harness((h) => {
    h.framebufferComplete = false;
    h.update();
    h.tick();
    assert.equal(h.errors.length, 1);
    assert.match(h.errors[0].message, /surface is incomplete/);
    assert.equal(h.paints.length, 0);
    assert.equal(h.deleted.length, h.allocated.length);
    h.update(true);
    h.flush();
    h.motion.destroy();
    assert.equal(h.errors.length, 1);
    assert.equal(h.deleted.length, h.allocated.length, "failure cleanup remains idempotent");
  }));

test("asynchronous paint failure retires its GPU query and reports the original error", () =>
  harness(
    (h) => {
      const error = new Error("paint failed");
      h.paintError = error;
      h.update();
      h.tick();
      assert.deepEqual(h.errors, [error]);
      assert.equal(h.queries.size, 0);
      assert.equal(h.deleted.length, h.allocated.length + 1, "also releases the timing query");
      assert.equal(new Set(h.deleted).size, h.deleted.length);
      h.flush();
      assert.deepEqual(h.completions, []);
    },
    { timed: true },
  ));

test("asynchronous failure without a handler still cleans up before rethrowing", () =>
  harness(
    (h) => {
      h.framebufferComplete = false;
      h.update();
      assert.throws(() => h.tick(), /surface is incomplete/);
      assert.ok(h.allocated.every((resource) => h.deleted.includes(resource)));
      h.flush();
    },
    { reportErrors: false },
  ));

test("completed compatible work becomes history before a distant camera starts fresh work", () =>
  harness(
    (h) => {
      h.update();
      h.tick();
      const state = { ...h.snapshot.state, view: zoomViewport(h.snapshot.state.view, -22, 0, 0) };
      h.update(true, { state, version: 2, iterations: 464 });
      h.tick();
      const stats = h.motion.getStats();
      assert.equal(stats.completedSources, 1);
      assert.equal(stats.historyVersion, 1);
      assert.equal(stats.workVersion, 2);
      assert.equal(stats.discardedSources, 0);
    },
    { size: [128, 128] },
  ));

test("completed work with obsolete colors is discarded instead of promoted", () =>
  harness(
    (h) => {
      h.update();
      h.tick();
      const state = { ...h.snapshot.state, config: { ...h.snapshot.state.config, palette: "ice" } };
      h.update(true, { state, version: 2 });
      h.tick();
      const stats = h.motion.getStats();
      assert.equal(stats.completedSources, 0);
      assert.equal(stats.historyVersion, null);
      assert.equal(stats.workVersion, 2);
      assert.equal(stats.discardedSources, 1);
    },
    { size: [128, 128] },
  ));

test("fallback paints bounded batches at native rest resolution without resizing the display", () =>
  harness((h) => {
    h.update();
    const batch = h.tick();
    assert.ok(batch.length);
    assert.ok(
      batch.reduce((sum, p) => sum + p.target.tile.width * p.target.tile.height, 0) <= 16384,
    );
    assert.deepEqual(h.completions, []);
    h.flush();
    assert.deepEqual(h.completions, [1]);
    assert.ok(h.paints.every((p) => p.target.width === 640 && p.target.height === 360));
    assert.equal(
      h.paints.reduce((sum, p) => sum + p.target.tile.width * p.target.tile.height, 0),
      640 * 360,
    );
    h.update();
    h.flush();
    assert.deepEqual(h.completions, [1]);
  }));

test("moving work survives nearby updates, then finishes exact latest native camera", () =>
  harness((h) => {
    h.update(true);
    h.tick();
    const first = h.paints[0];
    assert.equal(first.target.width, Math.round(640 * 0.8 * 1.18));
    assert.equal(first.source.state.config.iterations, 440);
    assert.equal(h.snapshot.state.config.iterations, 200);
    const state = { ...h.snapshot.state, view: moveViewport(h.snapshot.state.view, 0.05, 0) };
    h.update(true, { state, version: 2 });
    h.tick();
    assert.equal(h.clears, 1);
    assert.equal(h.paints[1].source, first.source);
    h.update(false);
    h.flush();
    assert.deepEqual(h.completions, [2]);
    const last = h.paints.at(-1);
    assert.equal(last.target.pixelRatio, 1);
    assert.equal(last.target.width, 640);
    assert.equal(last.source.state.view.x, state.view.x);
    assert.equal(last.source.state.view.logZoom, state.view.logZoom);
  }));

test("completed moving source stops scheduling instead of rebuilding its overscan forever", () =>
  harness((h) => {
    h.update(true);
    h.flush();
    assert.equal(h.clears, 1);
    assert.deepEqual(h.completions, []);
    h.update(false);
    h.flush();
    assert.equal(h.clears, 2);
    assert.deepEqual(h.completions, [1]);
  }));

test("parameter edits discard partial work and cannot composite old colors", () =>
  harness((h) => {
    h.update(true);
    h.tick();
    const state = { ...h.snapshot.state, config: { ...h.snapshot.state.config, palette: "ice" } };
    h.update(true, { state, version: 2 });
    h.tick();
    assert.equal(h.clears, 2);
    assert.equal(h.paints.at(-1).source.state.config.palette, "ice");
    assert.deepEqual(h.presents.at(-1).u_historyValid, [0]);
  }));

test("history is copied only from the initial direct frame, never from the warped display", () =>
  harness(
    (h) => {
      assert.equal(h.copies, 1);
      const state = { ...h.snapshot.state, view: moveViewport(h.snapshot.state.view, 0.1, 0) };
      h.update(true, { state });
      h.flush();
      h.update(false);
      h.flush();
      assert.equal(h.copies, 1);
      assert.deepEqual(h.completions, [1]);
    },
    { initial: true },
  ));

test("unavailable GPU timing keeps one batch in flight while presenting new cameras", () =>
  harness(
    (h) => {
      h.update(true);
      h.tick();
      const count = h.paints.length;
      const state = { ...h.snapshot.state, view: moveViewport(h.snapshot.state.view, 0.1, 0) };
      h.update(true, { state, version: 2 });
      h.tick();
      h.tick();
      assert.equal(h.paints.length, count);
      assert.equal(h.presents.length, 3);
      assert.equal(h.queries.size, 1);
      assert.ok(h.presents.at(-1).u_workTransform[0] > 0);
      h.available = true;
      h.tick();
      assert.ok(h.paints.length > count);
    },
    { timed: true },
  ));

test("disjoint unavailable queries are retired; failed query allocation uses a small batch", () =>
  harness(
    (h) => {
      h.update();
      h.tick();
      h.disjoint = true;
      h.queryFailure = true;
      const batch = h.tick();
      assert.equal(h.queries.size, 0);
      assert.ok(batch.length);
      assert.ok(
        batch.reduce((sum, p) => sum + p.target.tile.width * p.target.tile.height, 0) <= 16384,
      );
      h.flush();
      assert.deepEqual(h.completions, [1]);
    },
    { timed: true },
  ));

test("destroy retires an outstanding timing query and cancels queued draws", () =>
  harness(
    (h) => {
      h.update();
      h.tick();
      assert.equal(h.queries.size, 1);
      const count = h.paints.length;
      h.motion.destroy();
      h.tick();
      assert.equal(h.queries.size, 0);
      assert.equal(h.paints.length, count);
    },
    { timed: true },
  ));

test("coalesced batches cover every native pixel once with fewer paint calls", () =>
  harness(
    (h) => {
      h.available = true;
      h.update();
      h.flush();
      const counts = new Uint8Array(640 * 360);
      for (const {
        target: { tile },
      } of h.paints) {
        for (let y = tile.y; y < tile.y + tile.height; y++) {
          for (let x = tile.x; x < tile.x + tile.width; x++) counts[y * 640 + x]++;
        }
      }
      assert.ok(counts.every((count) => count === 1));
      assert.ok(h.paints.length < Math.ceil(640 / 64) * Math.ceil(360 / 64));
      const stats = h.motion.getStats();
      assert.equal(stats.submittedPixels, 640 * 360);
      assert.equal(stats.paintCalls, h.paints.length);
      assert.equal(stats.presentations, h.presents.length);
      assert.equal(stats.completedSources, 1);
      assert.equal(stats.nativeCompleted, true);
      assert.equal(stats.historyEffectiveDensity, 1);
    },
    { timed: true },
  ));

test("timing budgets distinguish moving and idle frames and allow bounded larger batches", () => {
  for (const moving of [false, true])
    harness(
      (h) => {
        h.gpuMs = 6;
        h.available = true;
        h.update(moving);
        h.tick();
        h.tick();
        assert.equal(h.motion.getStats().batchPixels, moving ? 43691 : 131072);
      },
      { timed: true },
    );
  harness(
    (h) => {
      h.gpuMs = 1;
      h.available = true;
      h.update();
      h.tick();
      h.tick();
      h.tick();
      const batch = h.tick();
      const pixels = batch.reduce((sum, { target: { tile } }) => sum + tile.width * tile.height, 0);
      assert.equal(h.motion.getStats().batchPixels, 1048576);
      assert.ok(pixels > 262144 && pixels <= 1048576);
    },
    { timed: true, size: [2048, 1536] },
  );
});

test("settling replaces unfinished motion work immediately when completed history covers it", () =>
  harness(
    (h) => {
      const state = { ...h.snapshot.state, view: zoomViewport(h.snapshot.state.view, -21, 0, 0) };
      h.update(true, { state, version: 2 });
      h.tick();
      assert.equal(h.motion.getStats().historyCoversViewport, true);
      h.update(false);
      const batch = h.tick();
      assert.equal(h.motion.getStats().discardedSources, 1);
      assert.ok(batch.every(({ target }) => target.width === 640 && target.height === 360));
      h.flush();
      assert.deepEqual(h.completions, [2]);
    },
    { initial: true },
  ));

test("source stats show retained source age and reduced density when zooming into it", () =>
  harness((h) => {
    h.update(true);
    h.tick();
    const state = { ...h.snapshot.state, view: zoomViewport(h.snapshot.state.view, -21, 0, 0) };
    h.update(true, { state, version: 2 });
    h.tick();
    const stats = h.motion.getStats();
    assert.equal(stats.workVersion, 1);
    assert.equal(stats.latestVersion, 2);
    assert.ok(stats.workAgeMs >= 0);
    assert.ok(Math.abs(stats.workEffectiveDensity - 0.4) < 0.01);
    assert.ok(stats.workSubmittedFraction > 0 && stats.workSubmittedFraction < 1);
    assert.equal(stats.nativeCompleted, false);
  }));

test("shallow sources preserve null orbit state for the paint callback", () =>
  harness((h) => {
    const state = { ...h.snapshot.state, view: createViewportAtLog([-0.75, 0.125], 0) };
    h.update(false, { state, orbit: null, orbitView: null, iterations: 200 });
    h.flush();
    assert.ok(h.paints.every(({ source }) => source.orbit === null && source.orbitView === null));
    assert.deepEqual(h.completions, [1]);
  }));

test("display-only updates move the camera without painting an unusable reference", () =>
  harness(
    (h) => {
      h.update(true);
      h.tick();
      const painted = h.paints.length;
      const source = h.paints[0].source;
      const state = { ...h.snapshot.state, view: moveViewport(h.snapshot.state.view, 0.1, 0) };
      h.available = true;
      h.update(true, { state, version: 2, orbit: null, orbitView: null }, false);
      h.tick();
      h.flush();
      assert.equal(h.paints.length, painted);
      assert.equal(h.queries.size, 0);
      assert.ok(h.presents.at(-1).u_workTransform[0] > 0);
      const firstPan = h.presents.at(-1).u_workTransform[0];
      const nextState = { ...state, view: moveViewport(state.view, 0.1, 0) };
      h.update(true, { state: nextState, version: 3 }, false);
      h.tick();
      h.flush();
      assert.ok(h.presents.at(-1).u_workTransform[0] > firstPan);
      assert.equal(h.paints.length, painted);
      h.update(true, { orbit: {}, orbitView: nextState.view });
      h.tick();
      assert.ok(h.paints.length > painted);
      assert.equal(
        h.paints.at(-1).source,
        source,
        "valid work at its own original camera survives the wait",
      );
    },
    { timed: true },
  ));
