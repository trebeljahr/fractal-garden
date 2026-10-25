import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const require = createRequire(import.meta.url);
require.extensions[".ts"] = (module, filename) => {
  const source = readFileSync(filename, "utf8").replaceAll(
    "import.meta.url",
    JSON.stringify(pathToFileURL(filename).href),
  );
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  });
  module._compile(outputText, filename);
};
for (const extension of [".frag", ".vert"])
  require.extensions[extension] = (module, filename) => {
    module.exports = readFileSync(filename, "utf8");
  };
const { createDeepZoomRenderer } = require("../utils/deepZoom/renderer.ts");
const { createViewportAtLog, moveViewport, zoomViewport } = require("../utils/deepZoom/math.ts");
const { buildReference } = require("../utils/deepZoom/orbit.ts");
const { exportDeepZoomPng } = require("../utils/deepZoom/export.ts");

async function harness(run, { isolatedExport = false } = {}) {
  const saved = Object.fromEntries(
    [
      "Worker",
      "window",
      "document",
      "requestAnimationFrame",
      "cancelAnimationFrame",
      "setTimeout",
      "clearTimeout",
    ].map((key) => [key, globalThis[key]]),
  );
  const frames = new Map();
  const timers = new Map();
  let serial = 0;
  let bound = null;
  let glitches = 0;
  const draws = [];
  let uniforms = {};
  const statuses = [];
  const allocations = [];
  const deletions = [];
  const encodings = [];
  let contextsLost = 0;
  const canvas = Object.assign(new EventTarget(), {
    width: 300,
    height: 150,
    toBlob: (callback) => {
      encodings.push({ width: canvas.width, height: canvas.height, callback });
    },
  });
  let state = {
    view: createViewportAtLog([-0.75, 0.125], -10),
    c: [0, 0],
    config: {
      iterations: 200,
      look: "classic",
      colorMode: "smooth",
      palette: "classic",
      colorDensity: 1,
      colorOffset: 0,
      interior: "#000000",
    },
    width: 640,
    height: 360,
  };
  const gl = new Proxy(
    {
      canvas,
      getExtension: (name) =>
        name === "WEBGL_lose_context" ? { loseContext: () => contextsLost++ } : {},
      getParameter: (key) => (key === "MAX_VIEWPORT_DIMS" ? [16384, 16384] : 16384),
      getShaderParameter: () => true,
      getProgramParameter: () => true,
      getAttribLocation: () => 0,
      getUniformLocation: (_, name) => name,
      checkFramebufferStatus: () => "FRAMEBUFFER_COMPLETE",
      bindFramebuffer: (_, target) => {
        bound = target;
      },
      useProgram: () => {
        uniforms = {};
      },
      drawArrays: () =>
        draws.push({
          bound,
          uniforms: structuredClone(uniforms),
          width: canvas.width,
          height: canvas.height,
        }),
      texImage2D: (...args) => allocations.push([args[3], args[4]]),
      readPixels: (_x, _y, _w, _h, _format, _type, data) => {
        data.fill(255);
        if (glitches > 0) {
          data[3] = 0;
          glitches--;
        }
      },
    },
    {
      get(target, key) {
        if (key in target) return target[key];
        if (/^[A-Z_0-9]+$/.test(key)) return key;
        if (key.startsWith("create")) return () => ({ id: ++serial });
        if (key.startsWith("delete")) return (value) => deletions.push(value);
        if (key.startsWith("uniform"))
          return (name, ...values) => {
            uniforms[name] = values;
          };
        return () => {};
      },
    },
  );
  let worker;
  const workers = [];
  globalThis.Worker = class {
    jobs = [];
    terminated = false;
    constructor() {
      worker = this;
      workers.push(this);
    }
    postMessage(job) {
      this.jobs.push(job);
    }
    terminate() {
      this.terminated = true;
    }
    complete(error) {
      const job = this.jobs.shift();
      assert.ok(job, "expected an orbit job");
      this.onmessage({
        data: {
          id: job.id,
          ...(error
            ? { error }
            : {
                references: (job.tiles?.map((repair) => repair.view) ?? [job.view]).map((view) =>
                  buildReference(view, job.formula, job.c, job.iterations),
                ),
              }),
        },
      });
      return job;
    }
  };
  globalThis.window = { devicePixelRatio: 2 };
  canvas.getContext = () => gl;
  globalThis.document = { createElement: () => canvas };
  globalThis.requestAnimationFrame = (fn) => {
    const id = ++serial;
    frames.set(id, fn);
    return id;
  };
  globalThis.cancelAnimationFrame = (id) => frames.delete(id);
  globalThis.setTimeout = (fn) => {
    const id = ++serial;
    timers.set(id, fn);
    return id;
  };
  globalThis.clearTimeout = (id) => timers.delete(id);
  const renderer = isolatedExport
    ? null
    : createDeepZoomRenderer(
        gl,
        "mandelbrot",
        () => state,
        (status) => statuses.push(status),
      );
  const tick = (queue = frames) => {
    const [id, fn] = queue.entries().next().value ?? [];
    assert.ok(fn, "expected scheduled work");
    queue.delete(id);
    fn();
  };
  const h = {
    renderer,
    gl,
    get worker() {
      return worker;
    },
    canvas,
    draws,
    allocations,
    statuses,
    deletions,
    frames,
    timers,
    encodings,
    get contextsLost() {
      return contextsLost;
    },
    get state() {
      return state;
    },
    set state(value) {
      state = value;
    },
    get visible() {
      return draws.filter((draw) => draw.bound === null);
    },
    glitch: () => {
      glitches++;
    },
    tick,
  };
  try {
    await run(h);
  } finally {
    try {
      renderer?.destroy();
      assert.ok(workers.every((worker) => worker.terminated));
      assert.equal(frames.size, 0);
      assert.equal(timers.size, 0);
      if (workers.length)
        assert.ok(deletions.length >= 12, "programs, shaders, textures and buffer released");
    } finally {
      Object.assign(globalThis, saved);
    }
  }
}

test("ordinary zoom stays at device resolution during movement and at rest", () =>
  harness((h) => {
    h.state = { ...h.state, view: createViewportAtLog([-0.5, 0], 1) };
    h.renderer.update();
    h.tick();
    assert.deepEqual([h.canvas.width, h.canvas.height], [1280, 720]);
    assert.equal(h.worker.jobs.length, 0);
    h.renderer.update();
    h.tick();
    assert.deepEqual([h.canvas.width, h.canvas.height], [1280, 720]);
  }));

test("deep zoom stays at device resolution during movement and precision repairs", () =>
  harness((h) => {
    h.renderer.update();
    h.tick();
    h.worker.complete();
    assert.deepEqual([h.canvas.width, h.canvas.height], [1280, 720]);
    h.state = { ...h.state, view: moveViewport(h.state.view, 0.02, 0) };
    h.renderer.update();
    h.tick();
    assert.deepEqual([h.canvas.width, h.canvas.height], [1280, 720]);
    h.worker.complete();
    assert.deepEqual([h.canvas.width, h.canvas.height], [1280, 720]);
    assert.equal(h.statuses.at(-1).message, "Detail ready");
  }));

test("deep navigation redraws current coordinates while the next reference is pending", () =>
  harness((h) => {
    h.state = { ...h.state, config: { ...h.state.config, iterations: 1000 } };
    h.renderer.update();
    h.tick();
    h.worker.complete();
    h.state = { ...h.state, view: moveViewport(h.state.view, 0.02, 0) };
    h.renderer.update();
    h.tick();
    assert.equal(h.worker.jobs.length, 1);
    assert.ok("u_deltaCenter" in h.draws.at(-1).uniforms);
    const count = h.draws.length;
    h.state = { ...h.state, view: zoomViewport(h.state.view, -11, 0.5, 0.25) };
    h.renderer.update();
    h.tick();
    assert.equal(h.draws.length, count + 1);
    assert.ok("u_deltaCenter" in h.draws.at(-1).uniforms);
    assert.equal(h.worker.jobs.length, 1, "gestures do not build a worker backlog");
  }));

test("a cached preview is only used when a new usable reference is required", () =>
  harness((h) => {
    h.renderer.update();
    h.tick();
    h.worker.complete();
    h.state = { ...h.state, config: { ...h.state.config, iterations: 8192 } };
    h.renderer.update();
    h.tick();
    assert.ok("u_ratio" in h.draws.at(-1).uniforms);
    assert.equal(h.worker.jobs.length, 1);
    assert.deepEqual([h.canvas.width, h.canvas.height], [1280, 720]);
    h.worker.complete();
    assert.ok("u_deltaCenter" in h.draws.at(-1).uniforms);
    assert.equal(h.statuses.at(-1).message, "Detail ready");
  }));

test("changed display density updates the framebuffer without changing the CSS viewport", () =>
  harness((h) => {
    h.state = { ...h.state, view: createViewportAtLog([-0.5, 0], 1) };
    for (const ratio of [1, 3, 2]) {
      window.devicePixelRatio = ratio;
      h.renderer.update();
      h.tick();
      assert.deepEqual([h.canvas.width, h.canvas.height], [640 * ratio, 360 * ratio]);
    }
  }));

test("deep frames are visible before repairs finish and stale tiles cannot overwrite navigation", () =>
  harness((h) => {
    h.renderer.update();
    h.tick();
    h.glitch();
    h.worker.complete();
    assert.equal(h.draws.length, 1, "first GPU frame is shown without waiting for all repairs");
    assert.ok(h.worker.jobs[0].tiles);
    h.state = { ...h.state, view: moveViewport(h.state.view, 0.02, 0) };
    h.renderer.update();
    h.tick();
    const count = h.draws.length;
    h.worker.complete();
    assert.equal(h.draws.length, count, "obsolete tile result was discarded");
  }));

test("parameter edits discard old reference results", () =>
  harness((h) => {
    h.renderer.update();
    h.tick();
    h.state = { ...h.state, c: [0.1, 0.2], config: { ...h.state.config, palette: "fire" } };
    h.renderer.update();
    h.tick();
    h.worker.complete();
    assert.equal(h.draws.length, 0);
    h.worker.complete();
    assert.deepEqual(h.draws.at(-1).uniforms.u_c, [0.1, 0.2]);
  }));

test("high iteration counts retain every device pixel", () =>
  harness((h) => {
    h.state = { ...h.state, config: { ...h.state.config, iterations: 8192 } };
    h.renderer.update();
    h.tick();
    h.worker.complete();
    assert.deepEqual([h.canvas.width, h.canvas.height], [1280, 720]);
    assert.equal(h.statuses.at(-1).message, "Detail ready");
  }));

test("repairs batch disjoint cells and draw the whole batch before mask readback", () =>
  harness((h) => {
    h.renderer.update();
    h.tick();
    let reads = 0;
    let beforeBatch = 0;
    h.gl.readPixels = (_x, _y, _w, _h, _format, _type, data) => {
      data.fill(reads++ === 0 ? 0 : 255);
      if (reads > 1)
        assert.equal(
          h.draws.length,
          beforeBatch + 8,
          "all eight repairs are queued before the GPU wait",
        );
    };
    h.worker.complete();
    assert.equal(h.worker.jobs.length, 1, "only one worker packet is pending");
    const first = h.worker.jobs[0].tiles;
    assert.equal(first.length, 8);
    assert.equal(new Set(first.map(({ tile }) => `${tile.x},${tile.y}`)).size, 8);
    beforeBatch = h.draws.length;
    h.worker.complete();
    assert.equal(h.worker.jobs[0].tiles.length, 8, "remaining cells start without a timer hop");
    beforeBatch = h.draws.length;
    h.worker.complete();
    assert.equal(h.worker.jobs.length, 0);
    assert.equal(h.statuses.at(-1).message, "Detail ready");
    assert.equal(reads, 17, "full mask and sixteen disjoint repair cells");
  }));

test("partial edge cells and invalid pixels late in a cell are retained", () =>
  harness((h) => {
    h.renderer.update();
    h.tick();
    h.gl.readPixels = (_x, _y, width, height, _format, _type, data) => {
      data.fill(255);
      data[(width * height - 1) * 4 + 3] = 0;
    };
    h.worker.complete();
    const [{ tile }] = h.worker.jobs[0].tiles;
    assert.equal(tile.x + tile.width, h.canvas.width);
    assert.equal(tile.y + tile.height, h.canvas.height);
  }));

test("expensive deep repair batches stay small and stale batches are discarded", () =>
  harness((h) => {
    h.state = {
      ...h.state,
      view: createViewportAtLog([-2, 0], -4096),
      config: { ...h.state.config, iterations: 8192 },
    };
    h.renderer.update();
    h.tick();
    h.gl.readPixels = (_x, _y, _w, _h, _format, _type, data) => data.fill(0);
    h.worker.complete();
    assert.equal(h.worker.jobs[0].tiles.length, 1);
    h.state = { ...h.state, view: moveViewport(h.state.view, 0.02, 0) };
    h.renderer.update();
    h.tick();
    const count = h.draws.length;
    h.worker.complete();
    assert.equal(h.draws.length, count);
  }));

test("a failed exact-pixel repair still reports a precision error", () =>
  harness((h) => {
    h.state = { ...h.state, width: 1, height: 1 };
    h.renderer.update();
    h.tick();
    h.gl.readPixels = (_x, _y, _w, _h, _format, _type, data) => data.fill(0);
    h.worker.complete();
    assert.equal(h.worker.jobs[0].tiles.length, 4);
    h.worker.complete();
    assert.equal(h.statuses.at(-1).error, true);
    assert.match(h.statuses.at(-1).message, /more precision/);
    assert.equal(h.worker.jobs.length, 0);
  }));

const exportSize = { width: 4096, height: 2304, ratio: 6.4 };

test("PNG export uses captured parameters and waits for all precision repairs before encoding", () =>
  harness(
    async (h) => {
      const source = structuredClone(h.state);
      const promise = exportDeepZoomPng("mandelbrot", source, exportSize);
      source.c[0] = 0.9;
      source.config.palette = "fire";
      source.view = moveViewport(source.view, 10, 10);
      h.tick();
      assert.equal(h.encodings.length, 0);
      h.glitch();
      h.worker.complete();
      assert.equal(h.encodings.length, 0, "an unfinished repair mask cannot be exported");
      assert.ok(h.worker.jobs[0].tiles);
      assert.deepEqual(h.draws[0].uniforms.u_c, [0, 0]);
      assert.deepEqual(h.draws[0].uniforms.u_palette, [0]);
      h.worker.complete();
      assert.equal(h.encodings.length, 1);
      const encoding = h.encodings[0];
      assert.deepEqual([encoding.width, encoding.height], [4096, 2304]);
      assert.equal(h.worker.terminated, false, "resources stay alive through PNG encoding");
      const blob = new Blob(["png"], { type: "image/png" });
      encoding.callback(blob);
      assert.equal(await promise, blob);
      assert.equal(h.worker.terminated, true);
      assert.equal(h.contextsLost, 1);
      assert.deepEqual([h.canvas.width, h.canvas.height], [1, 1]);
    },
    { isolatedExport: true },
  ));

test("failed PNG precision calculation releases the renderer and never encodes a preview", () =>
  harness(
    async (h) => {
      const promise = exportDeepZoomPng("mandelbrot", h.state, exportSize);
      const rejected = assert.rejects(promise, /Reference calculation failed/);
      h.tick();
      h.worker.complete("Reference calculation failed");
      await rejected;
      assert.equal(h.encodings.length, 0);
      assert.equal(h.contextsLost, 1);
    },
    { isolatedExport: true },
  ));

test("unmount cancellation releases pending export work and rejects the PNG", () =>
  harness(
    async (h) => {
      const controller = new AbortController();
      const promise = exportDeepZoomPng("mandelbrot", h.state, exportSize, controller.signal);
      const rejected = assert.rejects(promise, { name: "AbortError" });
      h.tick();
      assert.equal(h.worker.jobs.length, 1);
      controller.abort();
      await rejected;
      assert.equal(h.encodings.length, 0);
      assert.equal(h.contextsLost, 1);
    },
    { isolatedExport: true },
  ));

test("PNG encoding failure also releases the worker and graphics context", () =>
  harness(
    async (h) => {
      h.state = { ...h.state, view: createViewportAtLog([-0.5, 0], 1) };
      const promise = exportDeepZoomPng("mandelbrot", h.state, exportSize);
      const rejected = assert.rejects(promise);
      h.tick();
      h.encodings[0].callback(null);
      await rejected;
      assert.equal(h.contextsLost, 1);
    },
    { isolatedExport: true },
  ));
