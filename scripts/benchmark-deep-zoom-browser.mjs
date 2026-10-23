import { readFileSync, writeFileSync } from "node:fs";
import { posix, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

// Generate a Playwright CLI run-code file using the production renderer and worker.
const root = fileURLToPath(new URL("../", import.meta.url));
const modules = {};
function include(path) {
  if (modules[path]) return;
  if (!/\.ts$/.test(path)) {
    modules[path] =
      `module.exports = ${JSON.stringify(readFileSync(resolve(root, path), "utf8"))};`;
    return;
  }
  const source = readFileSync(resolve(root, path), "utf8").replace(
    'new URL("../../workers/deepZoom.worker.ts", import.meta.url)',
    '"benchmark-worker"',
  );
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
  const NativeWorker = window.Worker;
  let metrics;
  window.Worker = class extends NativeWorker {
    constructor() {
      super(workerURL);
      this.addEventListener("message", (event) => {
        metrics.jobs++;
        metrics.calculationMs += event.data.calculationMs;
      });
    }
  };
  const { createViewportAtLog } = load("utils/deepZoom/math.ts");
  const { createDeepZoomRenderer } = load("utils/deepZoom/renderer.ts");
  const results = [];
  const standardFixtures = [
    ["Seahorse tail", "mandelbrot", [-0.7435669, 0.1314023], Math.log2(0.0006), [0, 0], 1400],
    ["Deep antenna", "mandelbrot", [-2, 0], -1000 * Math.log2(10), [0, 0], 8192],
    ["Julia unit circle", "julia", [1, 0], -1000 * Math.log2(10), [0, 0], 8192],
    ["Ship sail folds", "burning-ship", [-1.77375, -0.055625], Math.log2(0.004), [0, 0], 1400],
  ];
  const fixtures = payload.repairGrid
    ? [["Ship repair grid", "burning-ship", [-1.77375, -0.055625], Math.log2(0.004), [0, 0], 1400]]
    : standardFixtures;
  let activeRenderer, activeGL, activeTimer;
  try {
    for (const [name, formula, center, depth, c, iterations] of fixtures) {
      document.body.innerHTML = "";
      const canvas = document.createElement("canvas");
      document.body.append(canvas);
      const gl = canvas.getContext("webgl", { preserveDrawingBuffer: true });
      if (!gl) throw Error("WebGL unavailable");
      activeGL = gl;
      const read = gl.readPixels.bind(gl);
      metrics = { jobs: 0, calculationMs: 0, reads: 0, readMs: 0 };
      gl.readPixels = (...args) => {
        const start = performance.now();
        read(...args);
        metrics.readMs += performance.now() - start;
        metrics.reads++;
      };
      const state = {
        view: createViewportAtLog(center, depth),
        c,
        width: payload.repairGrid ? 64 : 960,
        height: payload.repairGrid ? 40 : 600,
        config: {
          iterations,
          look: "classic",
          colorMode: "smooth",
          palette: "classic",
          colorDensity: 1,
          colorOffset: 0,
          interior: "#000000",
        },
      };
      let done, timer;
      const completion = new Promise((resolve) => {
        done = resolve;
      });
      const renderer = createDeepZoomRenderer(
        gl,
        formula,
        () => state,
        (status) => {
          if (status.message === "Detail ready" || status.error) done(status);
        },
      );
      activeRenderer = renderer;
      const start = performance.now();
      renderer.update();
      timer = setTimeout(() => done({ message: "timeout" }), 6000);
      activeTimer = timer;
      const status = await completion;
      const elapsedMs = performance.now() - start;
      clearTimeout(timer);
      const pixels = new Uint8Array(canvas.width * canvas.height * 4);
      read(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
      let pixelHash32 = 2166136261;
      for (const value of pixels) pixelHash32 = Math.imul(pixelHash32 ^ value, 16777619) >>> 0;
      results.push({
        name,
        ...metrics,
        elapsedMs,
        status: status.message,
        width: canvas.width,
        height: canvas.height,
        pixelHash32,
      });
      renderer.destroy();
      activeRenderer = undefined;
      gl.getExtension("WEBGL_lose_context")?.loseContext();
      activeGL = undefined;
    }
    return { devicePixelRatio, results };
  } finally {
    clearTimeout(activeTimer);
    activeRenderer?.destroy();
    activeGL?.getExtension("WEBGL_lose_context")?.loseContext();
    window.Worker = NativeWorker;
    URL.revokeObjectURL(workerURL);
  }
}
const payload = {
  modules,
  loader: loader.toString(),
  repairGrid: process.argv.includes("--repair-grid"),
};
const output = `async (page) => await page.evaluate(${benchmark.toString()}, ${JSON.stringify(payload)})`;
writeFileSync(process.argv[2] ?? "/private/tmp/benchmark-deep-zoom-browser.js", output);
