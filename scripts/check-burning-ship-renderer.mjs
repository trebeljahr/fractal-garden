import { readFileSync, writeFileSync } from "node:fs";
import { posix, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

// Generate a browser regression check using the production renderer and worker.
// The expected smooth colors come from independent fixed-point pixel iterations.
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

const cpuLoad = loader(modules);
const { createViewportAtLog } = cpuLoad("utils/deepZoom/math.ts");
const { sampleEscape } = cpuLoad("utils/deepZoom/orbit.ts");
const option = (name, fallback) =>
  process.argv.find((argument) => argument.startsWith(`--${name}=`))?.split("=")[1] ?? fallback;
const width = Number(option("width", "64"));
const height = Number(option("height", "40"));
const colorMode = option("mode", "smooth");
if (
  !["smooth", "log", "banded"].includes(colorMode) ||
  !Number.isInteger(width) ||
  !Number.isInteger(height) ||
  width < 1 ||
  height < 1
)
  throw Error("Invalid diagnostic options");
const fixtures = [
  {
    name: "Reported black masts",
    view: {
      x: -BigInt("0xe38ee66e7a3855b74000000000000000000"),
      y: -BigInt("0x67de25fde8bc0848000000000000000000"),
      bits: 139,
      logZoom: -10.789905117185954,
    },
    iterations: 1000,
  },
  {
    name: "Reported wider masts",
    view: {
      x: -BigInt("0xe341236a8ade4babd3c0000000000000000"),
      y: -BigInt("0x6ae1928ddba76901fd0000000000000000"),
      bits: 139,
      logZoom: -7.100212550112431,
    },
    iterations: 1000,
  },
  ...[
    ["Julia frame", [0.9698602594389115, -1.681547187115921], 4.587660401070052e-7],
    ["Julia branches", [0.9708577230059467, -1.6822569449061373], 9.175320802140104e-7],
    ["Julia sprig", [0.971494536995786, -1.6822661159791057], 9.175320802140104e-7],
  ].map(([name, center, span]) => ({
    name,
    view: createViewportAtLog(center, Math.log2(span)),
    iterations: 1500,
  })),
].map(({ name, view, iterations }) => {
  const expected = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const sample = sampleEscape(
        view,
        "burning-ship",
        [0, 0],
        iterations,
        (2 * (x + 0.5) - width) / height,
        -(2 * (y + 0.5) - height) / height,
      );
      const [zr, zi] = sample.z.map(([m, e]) => m * 2 ** e);
      const smooth = Math.max(
        sample.iteration + 1 - Math.log2(Math.max(Math.log(zr * zr + zi * zi) / 2, 1e-6)),
        0,
      );
      const value =
        colorMode === "log"
          ? Math.min(Math.log(smooth + 1) / Math.log(iterations + 1), 0.9999)
          : colorMode === "banded"
            ? sample.iteration / 32
            : smooth / 40;
      const t = (value * 0.5 + 0.55) % 1;
      for (let channel = 0; channel < 3; channel++)
        expected.push(
          sample.escaped
            ? Math.round(255 * (0.5 + 0.5 * Math.cos(6.28318 * (t + channel * 0.1))))
            : 0,
        );
    }
  }
  return {
    name,
    view: { ...view, x: view.x.toString(), y: view.y.toString() },
    iterations,
    expected,
  };
});
async function check(payload) {
  const load = new Function(`return (${payload.loader})`)()(payload.modules);
  const workerSource = `const load=(${payload.loader})(${JSON.stringify(payload.modules)});load("workers/deepZoom.worker.ts");`;
  const workerURL = URL.createObjectURL(new Blob([workerSource], { type: "text/javascript" }));
  const NativeWorker = window.Worker;
  let jobs = 0;
  window.Worker = class extends NativeWorker {
    constructor() {
      super(workerURL);
      this.addEventListener("message", () => jobs++);
    }
  };
  const { createDeepZoomRenderer } = load("utils/deepZoom/renderer.ts");
  const results = [];
  let renderer, gl, timer;
  try {
    for (const fixture of payload.fixtures) {
      const canvas = document.createElement("canvas");
      gl = canvas.getContext("webgl", {
        preserveDrawingBuffer: true,
        premultipliedAlpha: false,
        antialias: false,
      });
      if (!gl) throw Error("WebGL unavailable");
      const state = {
        view: { ...fixture.view, x: BigInt(fixture.view.x), y: BigInt(fixture.view.y) },
        c: [0, 0],
        width: payload.width,
        height: payload.height,
        config: {
          iterations: fixture.iterations,
          look: "classic",
          colorMode: payload.colorMode,
          palette: "classic",
          colorDensity: 0.5,
          colorOffset: 0.55,
          interior: "#000000",
        },
      };
      jobs = 0;
      let initialInvalid;
      const draw = gl.drawArrays.bind(gl);
      gl.drawArrays = (...args) => {
        draw(...args);
        if (initialInvalid !== undefined) return;
        const first = new Uint8Array(canvas.width * canvas.height * 4);
        gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, first);
        initialInvalid = 0;
        for (let i = 3; i < first.length; i += 4) if (first[i] === 0) initialInvalid++;
      };
      let done;
      const completion = new Promise((resolve) => {
        done = resolve;
      });
      renderer = createDeepZoomRenderer(
        gl,
        "burning-ship",
        () => state,
        (status) => {
          if (status.message === "Ready" || status.message === "Detail ready" || status.error)
            done(status);
        },
        { pixelRatio: 1 },
      );
      const start = performance.now();
      renderer.update();
      timer = setTimeout(() => done({ message: "timeout" }), 20000);
      const status = await completion;
      clearTimeout(timer);
      const elapsedMs = performance.now() - start;
      const pixels = new Uint8Array(canvas.width * canvas.height * 4);
      gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
      let invalid = 0,
        error = 0,
        maxError = 0,
        largeErrors = 0;
      for (let pixel = 0; pixel < canvas.width * canvas.height; pixel++) {
        if (pixels[pixel * 4 + 3] !== 255) invalid++;
        let largest = 0;
        for (let channel = 0; channel < 3; channel++) {
          const difference = Math.abs(
            pixels[pixel * 4 + channel] - fixture.expected[pixel * 3 + channel],
          );
          error += difference;
          largest = Math.max(largest, difference);
        }
        maxError = Math.max(maxError, largest);
        if (largest > 16) largeErrors++;
      }
      const meanError = error / (canvas.width * canvas.height * 3);
      const passed =
        !status.error &&
        status.message !== "timeout" &&
        invalid === 0 &&
        meanError < 1 &&
        largeErrors <= canvas.width * canvas.height * 0.005;
      results.push({
        name: fixture.name,
        status: status.message,
        elapsedMs,
        jobs,
        initialInvalid,
        invalid,
        meanError,
        maxError,
        largeErrors,
        passed,
      });
      renderer.destroy();
      renderer = undefined;
      gl.getExtension("WEBGL_lose_context")?.loseContext();
      gl = undefined;
    }
    return results;
  } finally {
    clearTimeout(timer);
    renderer?.destroy();
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
    window.Worker = NativeWorker;
    URL.revokeObjectURL(workerURL);
  }
}
const payload = { modules, loader: loader.toString(), fixtures, width, height, colorMode };
const output = `async (page) => { const results = await page.evaluate(${check.toString()}, ${JSON.stringify(payload)}); console.log(JSON.stringify(results)); if (results.some(result => !result.passed)) throw Error("Burning Ship pixel regression"); return results; }`;
writeFileSync(process.argv[2] ?? "/private/tmp/check-burning-ship-renderer.js", output);
