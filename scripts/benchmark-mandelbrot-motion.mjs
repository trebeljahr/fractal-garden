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
    draw = gl.drawArrays.bind(gl),
    use = gl.useProgram.bind(gl),
    syncPixel = new Uint8Array(4);
  let preview = false,
    frame = -1;
  gl.useProgram = (program) => {
    use(program);
    preview = gl.getUniformLocation(program, "u_frame") !== null;
  };
  gl.drawArrays = (...args) => {
    const t = performance.now();
    draw(...args);
    if (payload.synchronized) gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, syncPixel);
    draws.push({
      frame,
      ms: performance.now() - t,
      time: performance.now(),
      width: canvas.width,
      height: canvas.height,
      preview,
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
    );
    const start = performance.now();
    renderer.update();
    while (
      !statuses.some((s) => s.message === "Detail ready" || s.error) &&
      performance.now() < start + 30000
    )
      await delay(25);
    gl.finish();
    const setupMs = performance.now() - start,
      initialStatus = statuses.at(-1),
      startJobs = jobs.length,
      starts = [];
    if (initialStatus?.message !== "Detail ready" || statuses.some((status) => status.error))
      throw new Error(`Renderer setup failed: ${JSON.stringify(statuses)}`);
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
        fixture.depth - 0.5 * Math.sin(t * Math.PI),
        0,
        0,
      );
      renderer.update();
      await raf();
    }
    gl.finish();
    const movingPNG = canvas.toDataURL("image/png"),
      motionDraws = draws.filter((d) => d.frame >= 0 && d.frame < payload.frames);
    frame = payload.frames;
    await delay(350);
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
      setupMs,
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
};
const invocation = `await page.evaluate(${benchmark.toString()}, ${JSON.stringify(payload)})`;
const dpr = Number(option("--dpr", "1"));
const output = `async (originalPage) => { const context = await originalPage.context().browser().newContext({viewport:{width:${payload.width},height:${payload.height}},deviceScaleFactor:${dpr}}); try { const page=await context.newPage(); return ${invocation}; } finally { await context.close(); } }`;
writeFileSync(process.argv[2] ?? "/private/tmp/benchmark-mandelbrot-motion.js", output);
