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
const { createDeepZoomRenderer, iterationBudget } = require("../utils/deepZoom/renderer.ts");
const { createViewportAtLog, moveViewport, zoomViewport } = require("../utils/deepZoom/math.ts");
const { buildReference } = require("../utils/deepZoom/orbit.ts");
const { summarizeShipPixels } = require("../utils/deepZoom/pixelSummary.ts");
const { exportDeepZoomPng } = require("../utils/deepZoom/export.ts");
const { buildApproximation } = require("../utils/deepZoom/approximation.ts");

async function harness(run, { isolatedExport = false, formula = "mandelbrot" } = {}) {
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
  let historyCopies = 0;
  let maskReads = 0;
  let scissorEnabled = false;
  let scissor = null;
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
      enable: (flag) => {
        if (flag === "SCISSOR_TEST") scissorEnabled = true;
      },
      disable: (flag) => {
        if (flag === "SCISSOR_TEST") scissorEnabled = false;
      },
      scissor: (...rectangle) => {
        scissor = rectangle;
      },
      drawArrays: () =>
        draws.push({
          bound,
          tile: scissorEnabled ? scissor : null,
          uniforms: structuredClone(uniforms),
          width: canvas.width,
          height: canvas.height,
        }),
      texImage2D: (...args) => allocations.push([args[3], args[4]]),
      copyTexImage2D: () => {
        historyCopies++;
      },
      readPixels: (_x, _y, _w, _h, _format, _type, data) => {
        maskReads++;
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
            : job.pixelRepairs
              ? {
                  summaries: job.pixelRepairs.map((tile) =>
                    summarizeShipPixels(
                      job.view,
                      job.iterations,
                      job.frameWidth,
                      job.frameHeight,
                      tile,
                    ),
                  ),
                }
              : {
                  references: (job.tiles?.map((repair) => repair.view) ?? [job.view]).map(
                    (view) => {
                      const reference = buildReference(view, job.formula, job.c, job.iterations);
                      if (
                        job.formula === "mandelbrot" &&
                        !job.tiles &&
                        Number.isFinite(job.logDeltaC)
                      ) {
                        reference.approximation = buildApproximation(reference, {
                          logDeltaC: job.logDeltaC,
                        });
                      }
                      return reference;
                    },
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
        formula,
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
    get fullDraws() {
      return draws.filter((draw) => draw.tile === null);
    },
    get historyCopies() {
      return historyCopies;
    },
    get maskReads() {
      return maskReads;
    },
    glitch: () => {
      glitches++;
    },
    tick,
    completeReference: () => {
      const job = worker.complete();
      if (frames.size) tick();
      return job;
    },
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

for (const formula of ["julia", "burning-ship"]) {
  test(`${formula}: deep zoom stays at device resolution during movement and precision repairs`, () =>
    harness(
      (h) => {
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
      },
      { formula },
    ));
}

for (const formula of ["julia", "burning-ship"]) {
  test(`${formula}: deep navigation redraws current coordinates while the next reference is pending`, () =>
    harness(
      (h) => {
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
      },
      { formula },
    ));
}

for (const formula of ["julia", "burning-ship"]) {
  test(`${formula}: a cached preview is only used when a new usable reference is required`, () =>
    harness(
      (h) => {
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
      },
      { formula },
    ));
}

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
    h.completeReference();
    assert.equal(h.draws.length, 1, "first GPU frame is shown without waiting for all repairs");
    assert.ok(h.worker.jobs[0].tiles);
    h.state = { ...h.state, view: moveViewport(h.state.view, 0.02, 0) };
    h.renderer.update();
    h.tick();
    const count = h.draws.length;
    h.worker.complete();
    assert.equal(h.draws.length, count, "obsolete tile result was discarded");
    assert.equal(
      h.worker.jobs.length,
      0,
      "discarding stale repairs does not rebuild a reusable reference",
    );
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
    h.tick();
    assert.equal(h.worker.jobs.length, 1, "the scheduled frame requests current parameters");
    h.completeReference();
    assert.deepEqual(h.draws.at(-1).uniforms.u_c, [0.1, 0.2]);
  }));

for (const formula of ["mandelbrot", "julia", "burning-ship"]) {
  test(`${formula}: high iteration counts retain every device pixel`, () =>
    harness(
      (h) => {
        h.state = { ...h.state, config: { ...h.state.config, iterations: 8192 } };
        h.renderer.update();
        h.tick();
        h.completeReference();
        assert.deepEqual([h.canvas.width, h.canvas.height], [1280, 720]);
        assert.equal(h.statuses.at(-1).message, "Detail ready");
      },
      { formula },
    ));
}

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
    h.completeReference();
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
    h.completeReference();
    const [{ tile }] = h.worker.jobs[0].tiles;
    assert.equal(tile.x + tile.width, h.canvas.width);
    assert.equal(tile.y + tile.height, h.canvas.height);
  }));

for (const formula of ["mandelbrot", "julia", "burning-ship"]) {
  test(`${formula}: repairs shrink coordinate error around the tile reference without moving pixels`, () =>
    harness(
      (h) => {
        h.state = {
          ...h.state,
          width: 57,
          height: 31,
          config: { ...h.state.config, colorMode: "stripes" },
        };
        h.renderer.update();
        h.tick();
        let reads = 0;
        h.gl.readPixels = (_x, _y, width, height, _format, _type, data) => {
          data.fill(255);
          if (reads++ === 0) data[(width * height - 1) * 4 + 3] = 0;
        };
        h.completeReference();
        const [{ tile, view: repairView }] = h.worker.jobs[0].tiles;
        h.worker.complete();
        const repaired = h.draws.at(-1);
        const [offsetX, offsetY] = repaired.uniforms.u_pixelOffset;
        const width = h.canvas.width;
        const height = h.canvas.height;
        const size = Math.min(width, height);
        assert.deepEqual(repaired.uniforms.u_deltaCenter, [0, 0, 0, 0]);
        assert.deepEqual(
          [offsetX, offsetY],
          [tile.x + tile.width / 2 - width / 2, tile.y + tile.height / 2 - height / 2],
        );
        const [mantissa, exponent] = repaired.uniforms.u_scale;
        const scale = mantissa * 2 ** exponent;
        const flipY = formula === "burning-ship" ? -1 : 1;
        const referenceX = Number(repairView.x - h.state.view.x) / 2 ** repairView.bits;
        const referenceY = Number(repairView.y - h.state.view.y) / 2 ** repairView.bits;
        for (const [x, y] of [
          [tile.x + 0.5, tile.y + 0.5],
          [tile.x + tile.width - 0.5, tile.y + tile.height - 0.5],
        ]) {
          const localX = (2 * x - width - 2 * offsetX) / size;
          const localY = ((2 * y - height - 2 * offsetY) / size) * flipY;
          assert.ok(Math.abs(localX) < tile.width / size);
          assert.ok(Math.abs(localY) < tile.height / size);
          assert.ok(
            Math.abs(referenceX + localX * scale - ((2 * x - width) / size) * scale) < 1e-16,
          );
          assert.ok(
            Math.abs(referenceY + localY * scale - ((2 * y - height) / size) * scale * flipY) <
              1e-16,
          );
        }
        h.state = { ...h.state, view: moveViewport(h.state.view, 0.001, 0) };
        h.renderer.update();
        h.tick();
        assert.deepEqual(h.draws.at(-1).uniforms.u_pixelOffset, [0, 0]);
        assert.notEqual(h.draws.at(-1).uniforms.u_deltaCenter[0], 0);
      },
      { formula },
    ));
}

test("Burning Ship repairs sparse invalid masks in bounded tiles without per-pixel GPU draws", () =>
  harness(
    (h) => {
      h.state = { ...h.state, width: 34, height: 18 };
      h.gl.readPixels = (_x, _y, width, height, _format, _type, data) => {
        data.fill(255);
        data[3] = 0;
        data[(width * height - 1) * 4 + 3] = 0;
      };
      h.renderer.update();
      h.tick();
      h.completeReference();
      const job = h.worker.jobs[0];
      assert.equal(job.tiles, undefined, "summary jobs do not build unused orbit views");
      assert.deepEqual([job.frameWidth, job.frameHeight], [68, 36]);
      assert.equal(job.pixelRepairs.length, 2);
      for (const tile of job.pixelRepairs) {
        assert.ok(tile.width <= 32 && tile.height <= 32);
        assert.equal(
          tile.mask.reduce((sum, value) => sum + value, 0),
          1,
        );
      }
      const draws = h.draws.length;
      h.worker.complete();
      assert.equal(h.draws.length, draws + 2, "one draw per tile, even with many repaired pixels");
      assert.ok(h.draws.slice(-2).every((draw) => "u_pixelSummary" in draw.uniforms));
      assert.equal(h.worker.jobs.length, 0);
      assert.equal(h.statuses.at(-1).message, "Detail ready");
    },
    { formula: "burning-ship" },
  ));

test("Burning Ship discards summaries after a palette or camera change", () =>
  harness(
    (h) => {
      h.glitch();
      h.renderer.update();
      h.tick();
      h.completeReference();
      assert.ok(h.worker.jobs[0].pixelRepairs);
      h.state = { ...h.state, config: { ...h.state.config, palette: "fire" } };
      h.renderer.update();
      h.tick();
      const draws = h.draws.length;
      h.worker.complete();
      assert.equal(h.draws.length, draws, "old colors cannot replace the new frame");
      h.worker.complete();
      assert.deepEqual(h.draws.at(-1).uniforms.u_palette, [2]);
    },
    { formula: "burning-ship" },
  ));

for (const [logZoom, colorMode] of [
  [-65, "smooth"],
  [-10, "stripes"],
  [-10, "distance"],
]) {
  test(`Burning Ship keeps orbit repairs at ${logZoom} in ${colorMode} mode`, () =>
    harness(
      (h) => {
        h.state = {
          ...h.state,
          view: createViewportAtLog([-2, 0], logZoom),
          config: { ...h.state.config, colorMode },
        };
        h.glitch();
        h.renderer.update();
        h.tick();
        h.completeReference();
        assert.ok(h.worker.jobs[0].tiles);
        assert.equal(h.worker.jobs[0].pixelRepairs, undefined);
        h.worker.complete();
        assert.ok("u_reference" in h.draws.at(-1).uniforms);
      },
      { formula: "burning-ship" },
    ));
}

test("pixel summaries preserve unmarked pixels and distinguish escaping from bounded orbits", () => {
  const summary = summarizeShipPixels(createViewportAtLog([-2, 0], Math.log2(0.01)), 100, 3, 1, {
    x: 0,
    y: 0,
    width: 3,
    height: 1,
    mask: new Uint8Array([1, 0, 1]),
  });
  assert.ok(summary[0] < 100);
  assert.ok(summary[1] > Math.log(256));
  assert.deepEqual([...summary.slice(2, 4)], [1, 1]);
  assert.deepEqual([...summary.slice(4, 8)], [0, 0, 0, 0]);
  assert.deepEqual([...summary.slice(8)], [100, 0, 0, 1]);
});

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
    h.completeReference();
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
    h.completeReference();
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
      h.completeReference();
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

for (const iterations of [200, 8192]) {
  test(`Mandelbrot keeps native pixels while moving and settled at ${iterations} requested iterations`, () =>
    harness((h) => {
      h.state = { ...h.state, config: { ...h.state.config, iterations } };
      h.renderer.update();
      h.tick();
      assert.deepEqual(
        [h.canvas.width, h.canvas.height],
        [1280, 720],
        "allocate native pixels before reference arrives",
      );
      h.completeReference();
      const beforeSettle = h.fullDraws.length;
      assert.equal(h.frames.size, 0);
      assert.equal(h.timers.size, 0);
      assert.equal(beforeSettle, 1);
      assert.deepEqual([h.canvas.width, h.canvas.height], [1280, 720]);
      assert.equal(
        h.fullDraws.length,
        beforeSettle,
        "settling does not redraw an already current native frame",
      );
      assert.ok(h.draws.every((draw) => draw.width === 1280 && draw.height === 720));
      assert.ok(h.draws.every((draw) => !("u_ratio" in draw.uniforms)));
      assert.equal(h.historyCopies, 0, "sharp motion needs no cached bitmap");
      assert.equal(h.statuses.at(-1).message, "Detail ready");
    }));
}

test("nearby Mandelbrot pans and anchored zooms draw every changed camera without rebuilding the reference", () =>
  harness((h) => {
    h.renderer.update();
    h.tick();
    const job = h.completeReference();
    const start = h.fullDraws.length;
    for (let step = 1; step <= 12; step++) {
      h.state = {
        ...h.state,
        view: zoomViewport(moveViewport(h.state.view, 0.02, -0.01), -10 - step / 32, 0.5, 0.25),
      };
      h.renderer.update();
      h.tick();
      assert.equal(h.fullDraws.length, start + step);
      assert.equal(h.worker.jobs.length, 0);
      const last = h.draws.at(-1);
      assert.ok("u_deltaCenter" in last.uniforms);
      assert.ok(!("u_ratio" in last.uniforms));
      assert.deepEqual(last.uniforms.u_maxIterations, [
        iterationBudget(h.state.view, h.state.config.iterations),
      ]);
      assert.ok(job.iterations > last.uniforms.u_maxIterations[0]);
    }
    assert.equal(h.historyCopies, 0);
    const draws = h.fullDraws.length;
    assert.equal(h.fullDraws.length, draws);
    assert.equal(h.worker.jobs.length, 0);
  }));

test("reference iteration headroom does not change Mandelbrot's displayed limit", () =>
  harness((h) => {
    h.renderer.update();
    h.tick();
    const job = h.completeReference();
    const requested = iterationBudget(h.state.view, h.state.config.iterations);
    assert.ok(job.iterations > requested);
    assert.deepEqual(h.draws.at(-1).uniforms.u_maxIterations, [requested]);
    h.state = {
      ...h.state,
      config: { ...h.state.config, iterations: requested + 20, palette: "fire" },
    };
    h.renderer.update();
    h.tick();
    assert.equal(h.worker.jobs.length, 0, "an increase within cached capacity reuses the orbit");
    assert.deepEqual(h.draws.at(-1).uniforms.u_maxIterations, [requested + 20]);
  }));

test("Mandelbrot refreshes its domain after a large pan and continues drawing while replacement is pending", () =>
  harness((h) => {
    h.renderer.update();
    h.tick();
    h.completeReference();
    h.state = { ...h.state, view: moveViewport(h.state.view, 8, 0) };
    h.renderer.update();
    h.tick();
    assert.equal(h.worker.jobs.length, 1);
    assert.equal(h.fullDraws.length, 2);
    h.state = { ...h.state, view: moveViewport(h.state.view, 0.02, 0) };
    h.renderer.update();
    h.tick();
    assert.equal(h.fullDraws.length, 3);
    assert.equal(h.worker.jobs.length, 1, "movement does not queue more worker jobs");
    assert.ok(h.draws.every((draw) => !("u_ratio" in draw.uniforms)));
    const count = h.fullDraws.length;
    h.completeReference();
    assert.equal(
      h.fullDraws.length,
      count,
      "replacement must not duplicate an already current draw",
    );
    assert.equal(h.worker.jobs.length, 0);
  }));

test("Mandelbrot refreshes domain on zoom-out even when its center is unchanged", () =>
  harness((h) => {
    h.renderer.update();
    h.tick();
    const initial = h.completeReference();
    h.state = { ...h.state, view: zoomViewport(h.state.view, -8) };
    h.renderer.update();
    h.tick();
    assert.equal(h.worker.jobs.length, 1);
    const replacement = h.worker.jobs[0];
    assert.ok(replacement.logDeltaC > initial.logDeltaC);
    assert.equal(h.fullDraws.length, 2);
    h.completeReference();
    assert.equal(h.worker.jobs.length, 0);
  }));

test("Mandelbrot domain includes the full viewport after an extreme aspect-ratio change", () =>
  harness((h) => {
    h.renderer.update();
    h.tick();
    const initial = h.completeReference();
    h.state = { ...h.state, width: 6400, height: 100 };
    h.renderer.update();
    h.tick();
    assert.deepEqual([h.canvas.width, h.canvas.height], [12800, 200]);
    assert.equal(h.worker.jobs.length, 1);
    assert.ok(h.worker.jobs[0].logDeltaC > initial.logDeltaC);
    h.completeReference();
    assert.equal(
      h.worker.jobs.length,
      0,
      "new domain covers the wide viewport without repeated rebuilding",
    );
  }));

test("Mandelbrot worker completion coalesces with pending input and draws the latest camera once", () =>
  harness((h) => {
    h.renderer.update();
    h.tick();
    h.state = { ...h.state, view: moveViewport(h.state.view, 0.02, 0) };
    h.renderer.update();
    assert.equal(h.frames.size, 1);
    h.worker.complete();
    assert.equal(h.draws.length, 0, "worker callback must not draw outside the animation frame");
    assert.equal(h.frames.size, 1, "reply reuses the pending input frame");
    h.state = { ...h.state, view: moveViewport(h.state.view, 0.03, 0) };
    h.renderer.update();
    h.tick();
    assert.equal(h.fullDraws.length, 1);
    assert.notEqual(h.draws[0].uniforms.u_deltaCenter[0], 0);
    assert.equal(h.frames.size, 0);
    assert.equal(h.worker.jobs.length, 0);
  }));

test("repairs queued while a replacement reference is pending resume when the worker is free", () =>
  harness((h) => {
    h.renderer.update();
    h.tick();
    h.completeReference();
    h.state = { ...h.state, view: moveViewport(h.state.view, 8, 0) };
    h.glitch();
    h.renderer.update();
    h.tick();
    assert.equal(h.worker.jobs.length, 1);
    assert.equal(h.maskReads, 2);
    assert.ok(!h.worker.jobs[0].tiles, "main reference still owns the worker");
    const fullDraws = h.fullDraws.length;
    h.completeReference();
    assert.equal(h.fullDraws.length, fullDraws);
    assert.equal(h.maskReads, 2, "an inspected frame needs no second full readback");
    assert.ok(h.worker.jobs[0]?.tiles, "deferred repair resumes when worker is free");
    h.worker.complete();
    assert.equal(h.worker.jobs.length, 0);
    assert.equal(h.statuses.at(-1).message, "Detail ready");
  }));

test("Mandelbrot refreshes before exhausting cached iteration headroom", () =>
  harness((h) => {
    h.renderer.update();
    h.tick();
    const initial = h.completeReference();
    h.state = { ...h.state, config: { ...h.state.config, iterations: initial.iterations - 1 } };
    h.renderer.update();
    h.tick();
    assert.equal(h.fullDraws.length, 2, "still-compatible reference draws the changed state");
    assert.equal(
      h.worker.jobs.length,
      1,
      "replacement starts before reference capacity is exhausted",
    );
    assert.ok(h.worker.jobs[0].iterations > initial.iterations);
  }));

test("Mandelbrot refreshes precision before its reference loses the required guard bits", () =>
  harness((h) => {
    h.state = {
      ...h.state,
      view: createViewportAtLog([-2, 0], -80),
      config: { ...h.state.config, iterations: 8192 },
    };
    h.renderer.update();
    h.tick();
    const initial = h.completeReference();
    h.state = { ...h.state, view: zoomViewport(h.state.view, -130) };
    h.renderer.update();
    h.tick();
    assert.ok(initial.view.bits >= 130 + 64, "reference still has its hard precision margin");
    assert.equal(h.fullDraws.length, 2);
    assert.equal(h.worker.jobs.length, 1, "replacement begins with spare guard bits remaining");
    assert.ok(h.worker.jobs[0].view.bits > initial.view.bits);
  }));

test("a stale lower-capacity Mandelbrot reply cannot displace a still-usable reference", () =>
  harness((h) => {
    h.state = { ...h.state, config: { ...h.state.config, iterations: 8192 } };
    h.renderer.update();
    h.tick();
    h.completeReference();
    h.state = {
      ...h.state,
      view: moveViewport(h.state.view, 8, 0),
      config: { ...h.state.config, iterations: 200 },
    };
    h.renderer.update();
    h.tick();
    assert.equal(h.worker.jobs.length, 1);
    assert.ok(h.worker.jobs[0].iterations < 8192);
    h.state = { ...h.state, config: { ...h.state.config, iterations: 8192 } };
    h.renderer.update();
    h.tick();
    h.completeReference();
    const count = h.fullDraws.length;
    h.state = { ...h.state, view: moveViewport(h.state.view, 0.02, 0) };
    h.renderer.update();
    h.tick();
    assert.equal(
      h.fullDraws.length,
      count + 1,
      "old compatible reference keeps drawing while current replacement is pending",
    );
    assert.deepEqual(h.draws.at(-1).uniforms.u_maxIterations, [8192]);
  }));

test("a device-pixel-ratio change redraws Mandelbrot after resizing even without a new input version", () =>
  harness((h) => {
    h.renderer.update();
    h.tick();
    h.completeReference();
    h.state = { ...h.state, view: moveViewport(h.state.view, 8, 0) };
    h.renderer.update();
    h.tick();
    assert.equal(h.worker.jobs.length, 1);
    const beforeResize = h.fullDraws.length;
    globalThis.window.devicePixelRatio = 1;
    h.completeReference();
    assert.deepEqual([h.canvas.width, h.canvas.height], [640, 360]);
    assert.equal(
      h.fullDraws.length,
      beforeResize + 1,
      "resizing clears pixels, so current version must be redrawn",
    );
    assert.deepEqual([h.draws.at(-1).width, h.draws.at(-1).height], [640, 360]);
    assert.ok(!("u_ratio" in h.draws.at(-1).uniforms));
    assert.equal(h.fullDraws.length, beforeResize + 1, "settling retains the resized frame");
    assert.equal(h.statuses.at(-1).message, "Detail ready");
  }));

test("a distant same-depth Mandelbrot jump waits for a reference that can distinguish its pixels", () =>
  harness((h) => {
    h.state = {
      ...h.state,
      view: createViewportAtLog([-2, 0], -100),
      config: { ...h.state.config, iterations: 8192 },
    };
    h.renderer.update();
    h.tick();
    h.completeReference();
    const beforeJump = h.fullDraws.length;
    h.state = { ...h.state, view: createViewportAtLog([0, 1], -100) };
    h.renderer.update();
    h.tick();
    assert.equal(h.worker.jobs.length, 1);
    assert.equal(
      h.fullDraws.length,
      beforeJump,
      "a huge deltaCenter must not collapse all current pixels into one parameter",
    );
    h.completeReference();
    assert.equal(
      h.fullDraws.length,
      beforeJump + 1,
      "the first usable reference draws the new location",
    );
    assert.deepEqual(h.draws.at(-1).uniforms.u_deltaCenter, [0, 0, 0, 0]);
    assert.deepEqual([h.canvas.width, h.canvas.height], [1280, 720]);
    assert.equal(h.fullDraws.length, beforeJump + 1);
    assert.equal(h.statuses.at(-1).message, "Detail ready");
  }));

test("anchored Mandelbrot zoom refreshes before deltaCenter loses pixel precision", () =>
  harness((h) => {
    h.state = {
      ...h.state,
      view: createViewportAtLog([-2, 0], -100),
      config: { ...h.state.config, iterations: 8192 },
    };
    h.renderer.update();
    h.tick();
    h.completeReference();
    h.state = { ...h.state, view: zoomViewport(h.state.view, -109, 0.5, 0.25) };
    h.renderer.update();
    h.tick();
    assert.equal(h.fullDraws.length, 2, "reference is still usable while refresh starts");
    assert.equal(
      h.worker.jobs.length,
      1,
      "shrinking pixels trigger refresh even inside the cached domain",
    );
    h.state = { ...h.state, view: zoomViewport(h.state.view, -114, 0.5, 0.25) };
    h.renderer.update();
    h.tick();
    assert.equal(
      h.fullDraws.length,
      2,
      "an exhausted coordinate margin must not display a collapsed image",
    );
    assert.equal(h.worker.jobs.length, 1);
    h.completeReference();
    assert.equal(h.fullDraws.length, 3, "the refreshed reference resolves the latest camera");
    assert.equal(h.worker.jobs.length, 0);
    assert.ok(h.draws.every((draw) => !("u_ratio" in draw.uniforms)));
  }));
