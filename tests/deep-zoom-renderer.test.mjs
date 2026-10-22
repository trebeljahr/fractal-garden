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
  const uniforms = {};
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
      drawArrays: () =>
        draws.push({
          bound,
          uniforms: structuredClone(uniforms),
          width: canvas.width,
          height: canvas.height,
        }),
      texImage2D: (...args) => allocations.push([args[3], args[4]]),
      readPixels: (_x, _y, _w, _h, _format, _type, data) => {
        assert.ok(bound, "all calculation and repair reads happen offscreen");
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
    assert.ok(
      deletions.length >= 13,
      "programs, shaders, textures, buffer and framebuffer released",
    );
    Object.assign(globalThis, saved);
  }
}

test("moving and idle frames use the same device-pixel grid and only completed frames are visible", () =>
  harness((h) => {
    h.renderer.update();
    h.tick();
    assert.equal(h.visible.length, 0);
    assert.equal(h.canvas.width, 300, "visible canvas retained while calculating");
    h.worker.complete();
    assert.equal(h.visible.length, 1);
    assert.deepEqual([h.canvas.width, h.canvas.height], [1280, 720]);
    assert.deepEqual(h.draws[0].uniforms.u_resolution, [1280, 720]);
    h.state = { ...h.state, view: zoomViewport(h.state.view, -10.2, 0.5, 0.25) };
    h.renderer.update();
    h.tick();
    assert.equal(h.visible.length, 1, "navigation never stretches the old image");
    h.worker.complete();
    assert.equal(h.visible.length, 2);
    assert.deepEqual(h.visible[1].uniforms.u_resolution, [1280, 720]);
    h.tick();
    assert.equal(h.worker.jobs.length, 0, "no extra idle resolution pass");
  }));

test("continuous navigation finishes a frozen frame then coalesces input to the newest target", () =>
  harness((h) => {
    const original = h.state.view;
    h.renderer.update();
    h.tick();
    for (let i = 1; i <= 20; i++) {
      h.state = { ...h.state, view: moveViewport(original, i / 100, 0) };
      h.renderer.update();
    }
    const target = h.state.view;
    h.worker.complete();
    assert.equal(h.visible.length, 1, "continuous input cannot starve presentation");
    assert.deepEqual(h.renderer.getViewport(), original);
    assert.deepEqual(
      h.draws[0].uniforms.u_deltaCenter,
      [0, 0, 0, 0],
      "worker result uses its own camera",
    );
    h.tick();
    assert.equal(h.worker.jobs.length, 1, "one replacement frame, no input backlog");
    assert.equal(h.worker.jobs[0].view.x, target.x);
    h.worker.complete();
    assert.deepEqual(h.renderer.getViewport(), target);
  }));

test("glitch repairs stay offscreen, including when navigation continues during a repair", () =>
  harness((h) => {
    h.renderer.update();
    h.tick();
    h.glitch();
    h.worker.complete();
    assert.equal(h.visible.length, 0);
    h.state = { ...h.state, view: moveViewport(h.state.view, 0.02, 0) };
    h.renderer.update();
    h.tick();
    assert.ok(h.worker.jobs[0].tile);
    h.worker.complete();
    h.repair();
    assert.equal(h.visible.length, 1, "frame presented only after the repair queue empties");
  }));

test("parameter edits and resizes discard old work without clearing the visible frame", () =>
  harness((h) => {
    h.renderer.update();
    h.tick();
    h.worker.complete();
    h.tick();
    h.state = { ...h.state, view: moveViewport(h.state.view, 0.02, 0) };
    h.renderer.update();
    h.tick();
    h.state = {
      ...h.state,
      width: 800,
      c: [0.1, 0.2],
      config: { ...h.state.config, palette: "fire" },
    };
    h.renderer.update();
    h.tick();
    h.worker.complete();
    assert.equal(h.visible.length, 1);
    assert.equal(h.canvas.width, 1280);
    h.tick();
    h.worker.complete();
    assert.equal(h.visible.length, 2);
    assert.equal(h.canvas.width, 1600);
    assert.deepEqual(h.draws.at(-2).uniforms.u_c, [0.1, 0.2]);
  }));

test("shallow views and a return from deep zoom are also presented at full resolution", () =>
  harness((h) => {
    h.renderer.update();
    h.tick();
    h.state = { ...h.state, view: createViewportAtLog([-0.5, 0], 1) };
    h.renderer.update();
    h.tick();
    h.worker.complete();
    h.tick();
    assert.equal(h.visible.length, 1, "returning wide cancels the old deep calculation");
    assert.deepEqual(h.draws.at(-2).uniforms.u_resolution, [1280, 720]);
    assert.equal(h.worker.jobs.length, 0);
  }));

test("worker errors preserve the last sharp frame and later input can recover", () =>
  harness((h) => {
    h.renderer.update();
    h.tick();
    h.worker.complete();
    h.tick();
    h.state = { ...h.state, view: moveViewport(h.state.view, 0.02, 0) };
    h.renderer.update();
    h.tick();
    h.worker.complete("Reference failed");
    assert.equal(h.visible.length, 1);
    assert.equal(h.statuses.at(-1).error, true);
    h.renderer.update();
    h.tick();
    h.worker.complete();
    assert.equal(h.visible.length, 2);
  }));

test("an unrecoverable exact-pixel repair reports failure without replacing the sharp frame", () =>
  harness((h) => {
    h.renderer.update();
    h.tick();
    h.worker.complete();
    h.tick();
    h.state = { ...h.state, view: moveViewport(h.state.view, 0.02, 0) };
    h.renderer.update();
    h.tick();
    for (let attempt = 0; attempt < 12 && !h.statuses.at(-1)?.error; attempt++) {
      h.glitch();
      h.worker.complete();
      if (h.timers.size) h.repair();
    }
    assert.equal(h.statuses.at(-1).error, true);
    assert.match(h.statuses.at(-1).message, /more precision/);
    assert.equal(h.visible.length, 1);
    assert.equal(h.worker.jobs.length, 0);
  }));

test("returning to the retained frame clears refinement status without redrawing", () =>
  harness((h) => {
    h.state = { ...h.state, view: createViewportAtLog([-0.5, 0], 1) };
    const original = h.state.view;
    h.renderer.update();
    h.tick();
    h.tick();
    h.state = { ...h.state, view: createViewportAtLog([-0.75, 0.125], -10) };
    h.renderer.update();
    h.tick();
    assert.equal(h.statuses.at(-1).message, "Refining detail…");
    h.state = { ...h.state, view: original };
    h.renderer.update();
    h.tick();
    h.worker.complete();
    h.tick();
    assert.equal(h.visible.length, 1);
    assert.equal(h.statuses.at(-1).message, "Ready");
  }));
