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

function harness(run) {
  const saved = Object.fromEntries(
    [
      "Worker",
      "window",
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
  const canvas = { width: 300, height: 150 };
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
      getExtension: () => ({}),
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
  globalThis.Worker = class {
    jobs = [];
    terminated = false;
    constructor() {
      worker = this;
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
            : { reference: buildReference(job.view, job.formula, job.c, job.iterations) }),
        },
      });
      return job;
    }
  };
  globalThis.window = { devicePixelRatio: 2 };
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
  const renderer = createDeepZoomRenderer(
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
    worker,
    canvas,
    draws,
    allocations,
    statuses,
    deletions,
    frames,
    timers,
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
    repair: () => tick(timers),
  };
  try {
    run(h);
  } finally {
    renderer.destroy();
    assert.equal(worker.terminated, true);
    assert.equal(frames.size, 0);
    assert.equal(timers.size, 0);
    assert.ok(deletions.length >= 12, "programs, shaders, textures and buffer released");
    Object.assign(globalThis, saved);
  }
}

test("ordinary zoom stays at device resolution during movement and at rest", () =>
  harness((h) => {
    h.state = { ...h.state, view: createViewportAtLog([-0.5, 0], 1) };
    h.renderer.update();
    h.tick();
    assert.deepEqual([h.canvas.width, h.canvas.height], [1280, 720]);
    assert.equal(h.worker.jobs.length, 0);
    h.repair();
    assert.deepEqual([h.canvas.width, h.canvas.height], [1280, 720]);
  }));

test("deep zoom uses a bounded moving frame and restores idle detail", () =>
  harness((h) => {
    h.renderer.update();
    h.tick();
    h.worker.complete();
    const movingPixels = h.canvas.width * h.canvas.height;
    assert.ok(movingPixels <= 111000);
    h.repair();
    assert.ok(h.canvas.width * h.canvas.height > movingPixels * 5);
    assert.equal(h.statuses.at(-1).message, "Detail ready");
  }));

test("deep navigation redraws a preview immediately while the next reference is pending", () =>
  harness((h) => {
    h.renderer.update();
    h.tick();
    h.worker.complete();
    h.state = { ...h.state, view: moveViewport(h.state.view, 0.02, 0) };
    h.renderer.update();
    h.tick();
    assert.equal(h.worker.jobs.length, 1);
    assert.ok("u_ratio" in h.draws.at(-1).uniforms);
    const count = h.draws.length;
    h.state = { ...h.state, view: zoomViewport(h.state.view, -11, 0.5, 0.25) };
    h.renderer.update();
    h.tick();
    assert.equal(h.draws.length, count + 1);
    assert.ok("u_ratio" in h.draws.at(-1).uniforms);
    assert.equal(h.worker.jobs.length, 1, "gestures do not build a worker backlog");
  }));

test("deep frames are visible before repairs finish and stale tiles cannot overwrite navigation", () =>
  harness((h) => {
    h.renderer.update();
    h.tick();
    h.repair();
    h.glitch();
    h.worker.complete();
    assert.equal(h.draws.length, 1, "first GPU frame is shown without waiting for all repairs");
    assert.ok(h.worker.jobs[0].tile);
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

test("high iteration counts retain the deep zoom work budget", () =>
  harness((h) => {
    h.state = { ...h.state, config: { ...h.state.config, iterations: 8192 } };
    h.renderer.update();
    h.tick();
    h.worker.complete();
    assert.ok(h.canvas.width * h.canvas.height < 11000);
    h.repair();
    assert.ok(h.canvas.width * h.canvas.height < 221000);
    assert.equal(h.statuses.at(-1).message, "Detail ready");
  }));
