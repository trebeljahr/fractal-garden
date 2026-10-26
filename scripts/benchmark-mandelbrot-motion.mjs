import { readFileSync, writeFileSync } from "node:fs";
import { posix, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

// Generate a Playwright CLI run-code file using the production renderer and worker.
const option = (name, fallback) => {
  const i = process.argv.indexOf(name);
  return i < 0 ? fallback : process.argv[i + 1];
};
const root = resolve(option("--source-root", fileURLToPath(new URL("../", import.meta.url))));
const modules = {};
function include(path) {
  if (modules[path]) return;
  if (!/\.ts$/.test(path)) {
    modules[path] =
      `module.exports = ${JSON.stringify(readFileSync(resolve(root, path), "utf8"))};`;
    return;
  }
  let source = readFileSync(resolve(root, path), "utf8").replace(
    'new URL("../../workers/deepZoom.worker.ts", import.meta.url)',
    '"benchmark-worker"',
  );
  if (path === "utils/deepZoom/renderer.ts" && process.argv.includes("--baseline-full")) {
    source = source
      .replace(/const maxPixels =[\s\S]*?;\n/, "const maxPixels = Infinity;\n")
      .replace("if (!moving || !previewFrame())", "if (true)");
  }
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  }).outputText;
  modules[path] = compiled;
  for (const match of compiled.matchAll(/require\("([^"]+)"\)/g)) {
    let dependency = posix.normalize(posix.join(posix.dirname(path), match[1]));
    if (!posix.extname(dependency)) dependency += ".ts";
    include(dependency);
  }
}
include("utils/deepZoom/renderer.ts");
include("workers/deepZoom.worker.ts");
function loader(sources) {
  const cache = {};
  function load(path) {
    if (cache[path]) return cache[path].exports;
    const module = { exports: {} };
    cache[path] = module;
    new Function("require", "module", "exports", sources[path])(
      (relative) => {
        const parts = path.split("/");
        parts.pop();
        for (const part of relative.split("/")) {
          if (part === "..") parts.pop();
          else if (part !== ".") parts.push(part);
        }
        let next = parts.join("/");
        if (!/\.[^/]+$/.test(next)) next += ".ts";
        return load(next);
      },
      module,
      module.exports,
    );
    return module.exports;
  }
  return load;
}
async function benchmark(payload) {
  const load = new Function(`return (${payload.loader})`)()(payload.modules);
  const workerSource = `const load=(${payload.loader})(${JSON.stringify(payload.modules)});
    load("workers/deepZoom.worker.ts");
    const receive=self.onmessage, send=self.postMessage.bind(self); let started;
    self.onmessage=event=>{started=performance.now();receive(event);};
    self.postMessage=(data,options)=>send({...data,calculationMs:performance.now()-started},options);`;
  const workerURL = URL.createObjectURL(new Blob([workerSource], { type: "text/javascript" }));
  const NativeWorker = window.Worker,
    workers = [],
    jobs = [];
  window.Worker = class extends NativeWorker {
    constructor() {
      super(workerURL);
      workers.push(this);
      this.addEventListener("message", (event) => jobs.push(event.data.calculationMs));
    }
  };
  const { createViewportAtLog, moveViewport, zoomViewport } = load("utils/deepZoom/math.ts");
  const { createDeepZoomRenderer } = load("utils/deepZoom/renderer.ts");
  const fixtures = {
    whole: { center: [-0.5, 0], depth: 1, iterations: 200 },
    tail: { center: [-0.7435669, 0.1314023], depth: Math.log2(0.0006), iterations: 1400 },
    branches: {
      center: [
        "-0.101096363845622161025785445738622565463805442826253483876931177660780840740470584274821219810516779033404531908556741193",
        "0.956286510809141500771096057729977435809833336510529170034314321500524659065716732526978410787339807204344472492646928436",
      ],
      depth: Math.log2(1e-30),
      iterations: 1400,
    },
    antenna: { center: [-2, 0], depth: -1000 * Math.log2(10), iterations: 8192 },
    boundary: {
      center: ["-0.743643887037151007923796441434256376153", "0.131825904205311970493132056385139"],
      depth: Math.log2(1e-14),
      iterations: 4096,
    },
  };
  const fixture = fixtures[payload.fixture],
    canvas = document.createElement("canvas");
  document.body.replaceChildren(canvas);
  document.body.style.cssText = "margin:0;background:#000;overflow:hidden";
  canvas.style.cssText = `width:${payload.width}px;height:${payload.height}px;display:block`;
  const gl = canvas.getContext("webgl", { preserveDrawingBuffer: true, antialias: false });
  if (!gl) throw Error("WebGL unavailable");
  if (payload.disableTimers) {
    const getExtension = gl.getExtension.bind(gl);
    gl.getExtension = (name) => (name === "EXT_disjoint_timer_query" ? null : getExtension(name));
  }
  const debug = gl.getExtension("WEBGL_debug_renderer_info"),
    gpu = gl.getParameter(debug ? debug.UNMASKED_RENDERER_WEBGL : gl.RENDERER);
  const state = {
    view: createViewportAtLog(fixture.center, fixture.depth),
    c: [0, 0],
    width: payload.width,
    height: payload.height,
    config: {
      iterations: fixture.iterations,
      look: "classic",
      colorMode: payload.mode,
      palette: "classic",
      colorDensity: 1,
      colorOffset: 0,
      interior: "#000000",
    },
  };
  const draws = [],
    gpuBatches = [],
    gpuBatchRecords = [],
    motionStats = [],
    draw = gl.drawArrays.bind(gl),
    use = gl.useProgram.bind(gl),
    bindFramebuffer = gl.bindFramebuffer.bind(gl),
    viewport = gl.viewport.bind(gl),
    scissor = gl.scissor.bind(gl),
    syncPixel = new Uint8Array(4),
    kinds = new WeakMap();
  const timer = gl.getExtension("EXT_disjoint_timer_query");
  if (timer) {
    const queryResult = timer.getQueryObjectEXT.bind(timer);
    timer.getQueryObjectEXT = (query, pname) => {
      const value = queryResult(query, pname);
      if (pname === timer.QUERY_RESULT_EXT) {
        gpuBatches.push(value / 1e6);
        gpuBatchRecords.push({ frame, ms: value / 1e6 });
      }
      return value;
    };
  }
  let kind = "full",
    frame = -1,
    offscreen = false,
    targetSize = [0, 0],
    tile = null;
  gl.bindFramebuffer = (target, framebuffer) => {
    offscreen = Boolean(framebuffer);
    bindFramebuffer(target, framebuffer);
  };
  gl.viewport = (x, y, w, h) => {
    targetSize = [w, h];
    viewport(x, y, w, h);
  };
  gl.scissor = (x, y, w, h) => {
    tile = [x, y, w, h];
    scissor(x, y, w, h);
  };
  gl.useProgram = (program) => {
    use(program);
    if (!kinds.has(program))
      kinds.set(
        program,
        gl.getUniformLocation(program, "u_reference") !== null ||
          gl.getUniformLocation(program, "u_zoomSize") !== null
          ? "full"
          : "display",
      );
    kind = kinds.get(program);
  };
  gl.drawArrays = (...args) => {
    const t = performance.now();
    draw(...args);
    if (payload.synchronized) gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, syncPixel);
    draws.push({
      frame,
      ms: performance.now() - t,
      time: performance.now(),
      width: targetSize[0],
      height: targetSize[1],
      preview: kind === "display",
      kind: offscreen ? "tile" : kind,
      tile: offscreen ? tile : null,
    });
  };
  const statuses = [],
    raf = () => new Promise((resolve) => requestAnimationFrame(resolve)),
    delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const percentile = (xs, p) =>
    xs.length
      ? [...xs].sort((a, b) => a - b)[Math.min(xs.length - 1, Math.floor(xs.length * p))]
      : null;
  let renderer;
  try {
    renderer = createDeepZoomRenderer(
      gl,
      "mandelbrot",
      () => state,
      (status) => statuses.push({ ...status, time: performance.now() }),
      { interactive: true },
    );
    const start = performance.now();
    renderer.update();
    while (
      !statuses.some((s) => s.message === "Detail ready" || s.message === "Ready" || s.error) &&
      performance.now() < start + 30000
    )
      await delay(25);
    gl.finish();
    const setupMs = performance.now() - start,
      initialStatus = statuses.at(-1),
      startJobs = jobs.length,
      starts = [];
    if (
      !["Detail ready", "Ready"].includes(initialStatus?.message) ||
      statuses.some((status) => status.error)
    )
      throw new Error(
        `Renderer setup failed: ${JSON.stringify({ statuses, stats: renderer.getMotionStats?.(), gpuBatches: gpuBatches.slice(-20), draws: draws.slice(-5) })}`,
      );
    await raf();
    for (frame = 0; frame < payload.frames; frame++) {
      starts.push(performance.now());
      const t = (frame + 1) / payload.frames;
      state.view = zoomViewport(
        moveViewport(
          createViewportAtLog(fixture.center, fixture.depth),
          0.2 * Math.sin(t * 3),
          0.08 * t,
        ),
        fixture.depth - (payload.zoomTravel ? payload.zoomTravel * t : 0.5 * Math.sin(t * Math.PI)),
        0,
        0,
      );
      renderer.update(true);
      await raf();
      if (renderer.getMotionStats)
        motionStats.push({ frame, time: performance.now(), ...renderer.getMotionStats() });
    }
    if (payload.pauseBeforeStop) {
      // A short pause starts a native pass, then a final wheel nudge changes the
      // camera before that pass has finished. This used to cause two settle sweeps.
      await delay(payload.pauseBeforeStop);
      state.view = zoomViewport(state.view, state.view.logZoom - 0.05, 0, 0);
      renderer.update(true);
      await raf();
    }
    gl.finish();
    const movingPNG = canvas.toDataURL("image/png"),
      motionDraws = draws.filter((d) => d.frame >= 0 && d.frame < payload.frames);
    frame = payload.frames;
    const settleStart = performance.now();
    const settleStats = [];
    renderer.update(false);
    while (
      !statuses.some(
        (s) => ["Detail ready", "Ready"].includes(s.message) && s.time >= settleStart,
      ) &&
      performance.now() < settleStart + 30000
    ) {
      if (renderer.getMotionStats)
        settleStats.push({ time: performance.now() - settleStart, ...renderer.getMotionStats() });
      await delay(25);
    }
    const settled = statuses.some(
      (s) => ["Detail ready", "Ready"].includes(s.message) && s.time >= settleStart,
    );
    if (!settled)
      throw Error(
        `Final detail did not complete: ${JSON.stringify({ stats: renderer.getMotionStats?.(), gpuBatches: gpuBatches.slice(-20) })}`,
      );
    const settleMs = performance.now() - settleStart;
    gl.finish();
    const settledPNG = canvas.toDataURL("image/png");
    const current = motionDraws.filter((d) => !d.preview),
      intervals = starts.slice(1).map((t, i) => t - starts[i]);
    return {
      label: payload.label,
      fixture: payload.fixture,
      mode: payload.mode,
      gpu,
      devicePixelRatio,
      css: [payload.width, payload.height],
      frames: payload.frames,
      synchronized: payload.synchronized,
      pauseBeforeStop: payload.pauseBeforeStop,
      settleStats,
      timerQueries: Boolean(timer),
      setupMs,
      settleMs,
      gpuBatches,
      motionStats,
      motionGpuBatches: gpuBatchRecords.filter((q) => q.frame >= 0 && q.frame < payload.frames),
      gpuBatchMedianMs: percentile(gpuBatches, 0.5),
      gpuBatchP95Ms: percentile(gpuBatches, 0.95),
      gpuBatchMaxMs: gpuBatches.length ? Math.max(...gpuBatches) : null,
      displayFrames: new Set(motionDraws.filter((d) => d.kind === "display").map((d) => d.frame))
        .size,
      detailTiles: motionDraws.filter((d) => d.kind === "tile").length,
      detailPixels: motionDraws
        .filter((d) => d.kind === "tile")
        .reduce((sum, d) => sum + d.tile[2] * d.tile[3], 0),
      initialStatus,
      motionJobs: jobs.length - startJobs,
      workerMs: jobs.slice(startJobs).reduce((a, b) => a + b, 0),
      draws: motionDraws,
      currentDraws: current.length,
      previewDraws: motionDraws.length - current.length,
      currentDrawMedianMs: percentile(
        current.map((d) => d.ms),
        0.5,
      ),
      currentDrawP95Ms: percentile(
        current.map((d) => d.ms),
        0.95,
      ),
      inputIntervalMedianMs: percentile(intervals, 0.5),
      inputIntervalP95Ms: percentile(intervals, 0.95),
      inputIntervalsOver33ms: intervals.filter((ms) => ms > 33.4).length,
      errors: statuses.filter((s) => s.error),
      movingPNG,
      settledPNG,
    };
  } finally {
    renderer?.destroy();
    for (const worker of workers) worker.terminate();
    window.Worker = NativeWorker;
    URL.revokeObjectURL(workerURL);
    gl.getExtension("WEBGL_lose_context")?.loseContext();
  }
}
const payload = {
  modules,
  loader: loader.toString(),
  fixture: option("--fixture", "branches"),
  label: option("--label", "current"),
  mode: option("--mode", "smooth"),
  width: Number(option("--width", "960")),
  height: Number(option("--height", "600")),
  frames: Number(option("--frames", "24")),
  synchronized: !process.argv.includes("--async"),
  disableTimers: process.argv.includes("--no-timers"),
  zoomTravel: Number(option("--zoom-travel", "0")),
  pauseBeforeStop: Number(option("--pause-before-stop", "0")),
};
const invocation = `await page.evaluate(${benchmark.toString()}, ${JSON.stringify(payload)})`;
const dpr = Number(option("--dpr", "1"));
const output = `async (originalPage) => { const context = await originalPage.context().browser().newContext({viewport:{width:${payload.width},height:${payload.height}},deviceScaleFactor:${dpr}}); try { const page=await context.newPage(); return ${invocation}; } finally { await context.close(); } }`;
writeFileSync(process.argv[2] ?? "/private/tmp/benchmark-mandelbrot-motion.js", output);
