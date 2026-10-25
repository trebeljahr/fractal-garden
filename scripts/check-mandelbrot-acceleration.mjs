import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

// Generate a Playwright CLI run-code payload; this script launches no browser.
// Usage: node scripts/check-mandelbrot-acceleration.mjs /private/tmp/check.js
//   --width=128 --height=80 --variant=bla,native,combined --oracle=8
//   --fixtures=tail,deep-branches,boundary,antenna
// Add --oracle-grid --width=32 --height=20 for every-pixel BigInt checks at
// the viewport precision and again with 128 additional arithmetic bits.
const root = fileURLToPath(new URL("../", import.meta.url));
const read = (path) => readFileSync(resolve(root, path), "utf8");
const compileTS = (source) =>
  ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
const require = createRequire(import.meta.url);
require.extensions[".ts"] = (module, filename) =>
  module._compile(compileTS(readFileSync(filename, "utf8")), filename);
const { createViewportAtLog, scaleToFloatExp } = require("../utils/deepZoom/math.ts");
const { buildReference } = require("../utils/deepZoom/orbit.ts");
const { buildApproximation } = require("../utils/deepZoom/approximation.ts");
const { MANDELBROT_PLACES } = require("../utils/escapeTimePlaces.ts");
const option = (name, fallback) =>
  process.argv
    .find((arg) => arg.startsWith(`--${name}=`))
    ?.split("=")
    .slice(1)
    .join("=") ?? fallback;
const width = Number(option("width", "128"));
const height = Number(option("height", "80"));
const oracleLimit = Number(option("oracle", "8"));
const oracleGrid = process.argv.includes("--oracle-grid");
const variants = option("variant", "bla,native,combined").split(",");
const fixtureIds = option("fixtures", "tail,deep-branches,boundary,antenna").split(",");
if (
  ![width, height].every((value) => Number.isInteger(value) && value >= 8 && value <= 512) ||
  !Number.isInteger(oracleLimit) ||
  oracleLimit < 0 ||
  oracleLimit > 64 ||
  variants.some((variant) => !["bla", "native", "combined"].includes(variant))
) {
  throw new Error("Invalid dimensions, oracle budget, or acceleration variant.");
}
const branchPlace = MANDELBROT_PLACES.find((place) => place.id === "deep-branches");
if (!branchPlace?.preciseCenter) throw new Error("Deep branches preset is missing.");
const definitions = [
  {
    id: "tail",
    name: "Seahorse tail",
    center: [-0.7435669, 0.1314023],
    logZoom: Math.log2(0.0006),
    iterations: 1400,
  },
  {
    id: "deep-branches",
    name: "Deep branches",
    center: branchPlace.preciseCenter,
    logZoom: Math.log2(branchPlace.zoomSize),
    iterations: branchPlace.iterations,
  },
  {
    id: "boundary",
    name: "Seahorse boundary 1e-14",
    center: ["-0.743643887037151007923796441434256376153", "0.131825904205311970493132056385139"],
    logZoom: -14 * Math.log2(10),
    iterations: 8192,
  },
  {
    id: "antenna",
    name: "Antenna 1e-1000",
    center: [-2, 0],
    logZoom: -1000 * Math.log2(10),
    iterations: 8192,
  },
];
if (fixtureIds.some((id) => !definitions.some((fixture) => fixture.id === id)))
  throw new Error("Unknown fixture.");
const fixtures = definitions
  .filter(({ id }) => fixtureIds.includes(id))
  .map((definition) => {
    const view = createViewportAtLog(definition.center, definition.logZoom);
    const start = performance.now();
    const reference = buildReference(view, "mandelbrot", [0, 0], definition.iterations);
    const approximation = buildApproximation(reference, {
      logDeltaC: view.logZoom + Math.log2(Math.hypot(width, height) / Math.min(width, height) + 2),
    });
    let approximationMaxLogRadius = -1000000;
    for (let i = 0; i < approximation.data.length; i += 20) {
      for (const header of [0, 2]) {
        if (approximation.data[i + header + 1] > 0)
          approximationMaxLogRadius = Math.max(
            approximationMaxLogRadius,
            approximation.data[i + header],
          );
      }
    }
    // Match the renderer's native-reference screening. Preserve the exponent
    // samples even when a native copy is unavailable.
    let nativeEligible = true;
    for (let i = 0; i < reference.length; i++) {
      for (const component of [0, 2]) {
        const exponent = reference.orbit[i * 4 + component + 1];
        if (reference.orbit[i * 4 + component] !== 0 && (exponent < -90 || exponent > 100))
          nativeEligible = false;
      }
    }
    const orbit = Array.from(reference.orbit);
    const nativeStart = reference.length;
    if (nativeEligible)
      for (let i = 0; i < reference.length; i++) {
        orbit.push(
          reference.orbit[i * 4] * 2 ** reference.orbit[i * 4 + 1],
          reference.orbit[i * 4 + 2] * 2 ** reference.orbit[i * 4 + 3],
          0,
          0,
        );
      }
    return {
      ...definition,
      width,
      height,
      viewport: reference.viewport,
      scale: scaleToFloatExp(view.logZoom),
      orbit,
      referenceLength: reference.length,
      nativeEligible,
      nativeStart,
      approximationMaxLogRadius,
      approximation: { ...approximation, data: Array.from(approximation.data) },
      preparationMs: Math.round((performance.now() - start) * 100) / 100,
    };
  });
const escapeSource = read("utils/shaders/escape-time.frag");
const deep = read("utils/shaders/deep-zoom.frag");
const mainAt = escapeSource.indexOf("void main()");
const coloringAt = deep.indexOf("    bool trapMode");
if (mainAt < 0 || coloringAt < 0) throw new Error("Production shader boundaries not found.");
const diagnostic = `${deep.slice(0, coloringAt)}
  gl_FragColor=vec4(mod(iteration,256.0)/255.0,
    floor(iteration/256.0)/255.0, escaped ? 1.0 : 0.0, 1.0);
}
`;

async function checkAcceleration(payload) {
  const canvas = document.createElement("canvas");
  const gl = canvas.getContext("webgl", {
    alpha: true,
    antialias: false,
    premultipliedAlpha: false,
    preserveDrawingBuffer: true,
  });
  if (!gl?.getExtension("OES_texture_float")) throw new Error("WebGL float textures unavailable.");
  const debug = gl.getExtension("WEBGL_debug_renderer_info");
  const renderer = String(gl.getParameter(debug ? debug.UNMASKED_RENDERER_WEBGL : gl.RENDERER));
  const vendor = String(gl.getParameter(debug ? debug.UNMASKED_VENDOR_WEBGL : gl.VENDOR));
  const modules = {};
  function load(name) {
    if (modules[name]) return modules[name].exports;
    const module = { exports: {} };
    modules[name] = module;
    new Function("require", "module", "exports", payload.oracleModules[name])(
      (dependency) => load(dependency.replace(/^\.\//, "")),
      module,
      module.exports,
    );
    return module.exports;
  }
  const { deserializeViewport, rescaleFixed } = load("math");
  const { sampleEscape } = load("orbit");
  const programs = [];
  const textures = [];
  const results = [];
  const failures = [];
  const oracleFailures = [];
  const buffer = gl.createBuffer();
  if (!buffer) throw new Error("Buffer allocation failed.");
  function compile(source, type) {
    const shader = gl.createShader(type);
    if (!shader) throw new Error("Shader allocation failed.");
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const error = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(`Shader compilation failed: ${error}`);
    }
    return shader;
  }
  function program(fragment) {
    const start = performance.now();
    const vertex = compile(payload.vertex, gl.VERTEX_SHADER);
    const pixel = compile(
      `#define FORMULA_MANDELBROT\n${payload.shared}${fragment}`,
      gl.FRAGMENT_SHADER,
    );
    const linked = gl.createProgram();
    if (!linked) throw new Error("Program allocation failed.");
    gl.attachShader(linked, vertex);
    gl.attachShader(linked, pixel);
    gl.linkProgram(linked);
    gl.deleteShader(vertex);
    gl.deleteShader(pixel);
    if (!gl.getProgramParameter(linked, gl.LINK_STATUS))
      throw new Error(`Link failed: ${gl.getProgramInfoLog(linked)}`);
    const uniforms = {};
    for (const name of [
      "resolution",
      "maxIterations",
      "colorMode",
      "palette",
      "colorDensity",
      "colorOffset",
      "interior",
      "reference",
      "referenceSize",
      "referenceLength",
      "criticalStart",
      "criticalLength",
      "deltaCenter",
      "scale",
      "exactPixel",
      "approximation",
      "approximationSize",
      "approximationLogDeltaC",
      "approximationMaxLogRadius",
      "hasApproximation",
      "nativeReferenceStart",
      "hasNativeReference",
    ]) {
      uniforms[name] = gl.getUniformLocation(linked, `u_${name}`);
    }
    const result = { linked, uniforms, compileMs: performance.now() - start };
    programs.push(result);
    return result;
  }
  function texture(unit, data) {
    const created = gl.createTexture();
    if (!created) throw new Error("Texture allocation failed.");
    textures.push(created);
    const width = Math.min(1024, gl.getParameter(gl.MAX_TEXTURE_SIZE));
    const height = Math.max(1, Math.ceil(data.length / (width * 4)));
    const packed = new Float32Array(width * height * 4);
    packed.set(data);
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, created);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.FLOAT, packed);
    return [width, height];
  }
  function diagnosticPixel(pixels, index) {
    const offset = index * 4;
    return {
      iteration: pixels[offset] + pixels[offset + 1] * 256,
      escaped: pixels[offset + 2] >= 128,
      valid: pixels[offset + 3] >= 128,
    };
  }
  function compare(before, after, beforeDiagnostic, afterDiagnostic, width, height) {
    let absolute = 0,
      maximum = 0,
      changedPixels = 0,
      largePixels = 0;
    let classificationChanges = 0,
      validityChanges = 0,
      iterationChanges = 0,
      maxIterationDifference = 0;
    const worst = [];
    for (let index = 0; index < width * height; index++) {
      let error = 0;
      for (let channel = 0; channel < 3; channel++) {
        const difference = Math.abs(before[index * 4 + channel] - after[index * 4 + channel]);
        absolute += difference;
        error = Math.max(error, difference);
      }
      maximum = Math.max(maximum, error);
      changedPixels += error > 0 ? 1 : 0;
      largePixels += error > payload.thresholds.largeChannelError ? 1 : 0;
      const baseline = diagnosticPixel(beforeDiagnostic, index);
      const candidate = diagnosticPixel(afterDiagnostic, index);
      classificationChanges += baseline.escaped !== candidate.escaped ? 1 : 0;
      validityChanges += baseline.valid !== candidate.valid ? 1 : 0;
      const iterationDifference =
        baseline.escaped && candidate.escaped
          ? Math.abs(baseline.iteration - candidate.iteration)
          : 0;
      iterationChanges += iterationDifference > 0 ? 1 : 0;
      maxIterationDifference = Math.max(maxIterationDifference, iterationDifference);
      const score =
        (baseline.valid !== candidate.valid || baseline.escaped !== candidate.escaped
          ? 100000
          : 0) +
        iterationDifference * 256 +
        error;
      if (
        payload.oracleLimit > 0 &&
        score > 0 &&
        (worst.length < payload.oracleLimit || score > worst.at(-1).score)
      ) {
        worst.push({
          index,
          x: index % width,
          y: Math.floor(index / width),
          error,
          score,
          baseline,
          candidate,
          baselineRGB: Array.from(before.slice(index * 4, index * 4 + 3)),
          candidateRGB: Array.from(after.slice(index * 4, index * 4 + 3)),
        });
        worst.sort((a, b) => b.score - a.score);
        worst.length = Math.min(worst.length, payload.oracleLimit);
      }
    }
    return {
      maxChannelError: maximum,
      meanChannelError: absolute / (width * height * 3),
      changedPixels,
      largePixels,
      largePixelFraction: largePixels / (width * height),
      classificationChanges,
      validityChanges,
      iterationChanges,
      maxIterationDifference,
      worst,
    };
  }
  function compareOracle(baselinePixels, candidatePixels, grid) {
    function counters() {
      return {
        pixels: 0,
        invalidPixels: 0,
        classificationMismatches: 0,
        exactAgreements: 0,
        withinOneAgreements: 0,
        bothEscapedPixels: 0,
        exactEscapedDwellAgreements: 0,
        withinOneEscapedDwellAgreements: 0,
        iterationErrors: [],
        escapedIterationErrors: [],
      };
    }
    const baseline = counters();
    const candidate = counters();
    let oldCorrectNewWrong = 0,
      oldWrongNewCorrect = 0;
    let oldClassificationCorrectNewWrong = 0,
      oldClassificationWrongNewCorrect = 0;
    function tally(stats, actual, expected) {
      stats.pixels++;
      if (!actual.valid) {
        stats.invalidPixels++;
        return { correct: false, classCorrect: false };
      }
      const sameClass = actual.escaped === expected.escaped;
      if (!sameClass) stats.classificationMismatches++;
      const error = Math.abs(actual.iteration - expected.iteration);
      stats.iterationErrors.push(error);
      if (sameClass && error === 0) stats.exactAgreements++;
      if (sameClass && error <= 1) stats.withinOneAgreements++;
      if (actual.escaped && expected.escaped) {
        stats.bothEscapedPixels++;
        stats.escapedIterationErrors.push(error);
        if (error === 0) stats.exactEscapedDwellAgreements++;
        if (error <= 1) stats.withinOneEscapedDwellAgreements++;
      }
      return { correct: sameClass && error <= 1, classCorrect: sameClass };
    }
    for (let index = 0; index < grid.length; index++) {
      if (!grid[index].stable) continue;
      const oldResult = tally(baseline, diagnosticPixel(baselinePixels, index), grid[index].high);
      const newResult = tally(candidate, diagnosticPixel(candidatePixels, index), grid[index].high);
      oldCorrectNewWrong += oldResult.correct && !newResult.correct ? 1 : 0;
      oldWrongNewCorrect += !oldResult.correct && newResult.correct ? 1 : 0;
      oldClassificationCorrectNewWrong += oldResult.classCorrect && !newResult.classCorrect ? 1 : 0;
      oldClassificationWrongNewCorrect += !oldResult.classCorrect && newResult.classCorrect ? 1 : 0;
    }
    function summarize(stats) {
      function distribution(values) {
        if (values.length === 0) return { samples: 0, mae: null, p95: null, maximum: null };
        values.sort((a, b) => a - b);
        return {
          samples: values.length,
          mae: values.reduce((sum, value) => sum + value, 0) / values.length,
          p95: values[Math.ceil(values.length * 0.95) - 1],
          maximum: values.at(-1),
        };
      }
      const { iterationErrors, escapedIterationErrors, ...counts } = stats;
      return {
        ...counts,
        iterationError: distribution(iterationErrors),
        escapedIterationError: distribution(escapedIterationErrors),
      };
    }
    return {
      stablePixels: baseline.pixels,
      excludedUnstablePixels: grid.length - baseline.pixels,
      baseline: summarize(baseline),
      candidate: summarize(candidate),
      oldCorrectNewWrong,
      oldWrongNewCorrect,
      oldClassificationCorrectNewWrong,
      oldClassificationWrongNewCorrect,
    };
  }
  try {
    const colorProgram = program(payload.deep);
    const diagnosticProgram = program(payload.diagnostic);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.disable(gl.BLEND);
    gl.disable(gl.DITHER);
    gl.disable(gl.SCISSOR_TEST);
    for (const fixture of payload.fixtures) {
      canvas.width = fixture.width;
      canvas.height = fixture.height;
      gl.viewport(0, 0, canvas.width, canvas.height);
      const referenceSize = texture(0, fixture.orbit);
      const approximationSize = texture(1, fixture.approximation.data);
      const decodedView = deserializeViewport(fixture.viewport);
      const oracleCache = new Map();
      const diagnosticCache = new Map();
      function render(entry, mode, variant) {
        const u = entry.uniforms;
        // biome-ignore lint/correctness/useHookAtTopLevel: WebGL API
        gl.useProgram(entry.linked);
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        const position = gl.getAttribLocation(entry.linked, "aPosition");
        gl.enableVertexAttribArray(position);
        gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
        gl.uniform2f(u.resolution, fixture.width, fixture.height);
        gl.uniform1f(u.maxIterations, fixture.iterations);
        gl.uniform1i(u.colorMode, mode);
        gl.uniform1i(u.palette, 0);
        gl.uniform1f(u.colorDensity, 1);
        gl.uniform1f(u.colorOffset, 0.5);
        gl.uniform3f(u.interior, 0, 0, 0);
        gl.uniform1i(u.reference, 0);
        gl.uniform2f(u.referenceSize, ...referenceSize);
        gl.uniform1f(u.referenceLength, fixture.referenceLength);
        gl.uniform1f(u.criticalStart, fixture.referenceLength);
        gl.uniform1f(u.criticalLength, 0);
        gl.uniform4f(u.deltaCenter, 0, 0, 0, 0);
        gl.uniform2f(u.scale, ...fixture.scale);
        gl.uniform1i(u.exactPixel, 0);
        gl.uniform1i(u.approximation, 1);
        gl.uniform2f(u.approximationSize, ...approximationSize);
        gl.uniform1f(u.approximationLogDeltaC, fixture.approximation.logDeltaC);
        gl.uniform1f(u.approximationMaxLogRadius, fixture.approximationMaxLogRadius);
        gl.uniform1i(
          u.hasApproximation,
          ["bla", "combined"].includes(variant) && fixture.approximation.maxSkip > 0 ? 1 : 0,
        );
        gl.uniform1f(u.nativeReferenceStart, fixture.nativeStart);
        gl.uniform1i(
          u.hasNativeReference,
          ["native", "combined"].includes(variant) && fixture.nativeEligible ? 1 : 0,
        );
        const pixels = new Uint8Array(fixture.width * fixture.height * 4);
        const start = performance.now();
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        gl.readPixels(0, 0, fixture.width, fixture.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
        const wallMs = performance.now() - start;
        const error = gl.getError();
        if (error !== gl.NO_ERROR)
          throw new Error(`WebGL ${error}: ${fixture.name}, mode ${mode}, ${variant}`);
        return { pixels, wallMs };
      }
      function diagnosticFor(mode, variant) {
        // Coloring does not feed the orbit. Keep separate groups because the
        // production shader selects native/BLA paths using these conditions.
        const group = mode < 3 ? 0 : mode === 3 ? 3 : 4;
        const key = `${variant}:${group}`;
        if (!diagnosticCache.has(key))
          diagnosticCache.set(key, render(diagnosticProgram, group, variant));
        return diagnosticCache.get(key).pixels;
      }
      const fixtureResult = {
        id: fixture.id,
        name: fixture.name,
        width: fixture.width,
        height: fixture.height,
        iterations: fixture.iterations,
        nativeEligible: fixture.nativeEligible,
        maxSkip: fixture.approximation.maxSkip,
        preparationMs: fixture.preparationMs,
        comparisons: [],
        oracleSamples: 0,
        oracleMs: 0,
      };
      let grid;
      const oracleComparisonCache = new Set();
      if (payload.oracleGrid) {
        grid = [];
        const higherBits = decodedView.bits + 128;
        const higherView = {
          ...decodedView,
          bits: higherBits,
          x: rescaleFixed(decodedView.x, decodedView.bits, higherBits),
          y: rescaleFixed(decodedView.y, decodedView.bits, higherBits),
        };
        const unstable = [];
        let classificationChanges = 0,
          iterationChanges = 0;
        const start = performance.now();
        for (let index = 0; index < fixture.width * fixture.height; index++) {
          const x = index % fixture.width;
          const y = Math.floor(index / fixture.width);
          const dx = (2 * (x + 0.5) - fixture.width) / Math.min(fixture.width, fixture.height);
          const dy = (2 * (y + 0.5) - fixture.height) / Math.min(fixture.width, fixture.height);
          const lowSample = sampleEscape(
            decodedView,
            "mandelbrot",
            [0, 0],
            fixture.iterations,
            dx,
            dy,
          );
          const highSample = sampleEscape(
            higherView,
            "mandelbrot",
            [0, 0],
            fixture.iterations,
            dx,
            dy,
          );
          const low = { escaped: lowSample.escaped, iteration: lowSample.iteration };
          const high = { escaped: highSample.escaped, iteration: highSample.iteration };
          const stable = low.escaped === high.escaped && low.iteration === high.iteration;
          classificationChanges += low.escaped !== high.escaped ? 1 : 0;
          iterationChanges += low.iteration !== high.iteration ? 1 : 0;
          if (!stable) unstable.push({ x, y, low, high });
          grid.push({ stable, high });
          oracleCache.set(index, high);
          if (index % 8 === 7) await new Promise((resolve) => setTimeout(resolve, 0));
        }
        fixtureResult.oracleMs += performance.now() - start;
        fixtureResult.oracleGrid = {
          pixels: grid.length,
          baseBits: decodedView.bits,
          higherBits,
          stabilized: unstable.length === 0,
          stablePixels: grid.length - unstable.length,
          classificationChanges,
          iterationChanges,
          unstable,
          comparisons: [],
          definitions:
            "Comparison statistics use only precision-stable pixels. Correct means valid, matching escape classification and dwell within one iteration. Overall iteration errors include iteration-limit values for unescaped pixels; escapedIterationError uses only pairs that both escape. The higher-precision camera preserves the original center and recomputes pixel offsets.",
        };
        if (unstable.length)
          oracleFailures.push({
            fixture: fixture.id,
            reason: "Independent oracle did not stabilize with 128 additional bits",
            pixels: unstable.length,
          });
      }
      for (let mode = 0; mode < 7; mode++) {
        const baseline = render(colorProgram, mode, "off");
        const baselineDiagnostic = diagnosticFor(mode, "off");
        for (const variant of payload.variants) {
          const candidate = render(colorProgram, mode, variant);
          const candidateDiagnostic = diagnosticFor(mode, variant);
          if (grid) {
            const modeGroup = mode < 3 ? 0 : mode === 3 ? 3 : 4;
            const key = `${variant}:${modeGroup}`;
            if (!oracleComparisonCache.has(key)) {
              oracleComparisonCache.add(key);
              fixtureResult.oracleGrid.comparisons.push({
                variant,
                modeGroup,
                colors:
                  modeGroup === 0
                    ? ["smooth", "log", "banded"]
                    : modeGroup === 3
                      ? ["distance"]
                      : ["stripes", "trap-point", "trap-cross"],
                ...compareOracle(baselineDiagnostic, candidateDiagnostic, grid),
              });
            }
          }
          const difference = compare(
            baseline.pixels,
            candidate.pixels,
            baselineDiagnostic,
            candidateDiagnostic,
            fixture.width,
            fixture.height,
          );
          for (const pixel of difference.worst) {
            if (!oracleCache.has(pixel.index)) {
              const start = performance.now();
              const dx =
                (2 * (pixel.x + 0.5) - fixture.width) / Math.min(fixture.width, fixture.height);
              const dy =
                (2 * (pixel.y + 0.5) - fixture.height) / Math.min(fixture.width, fixture.height);
              const { escaped, iteration } = sampleEscape(
                decodedView,
                "mandelbrot",
                [0, 0],
                fixture.iterations,
                dx,
                dy,
              );
              oracleCache.set(pixel.index, { escaped, iteration });
              fixtureResult.oracleMs += performance.now() - start;
            }
            pixel.oracle = oracleCache.get(pixel.index);
            pixel.baselineAgreesWithOracle =
              pixel.baseline.valid &&
              pixel.baseline.escaped === pixel.oracle.escaped &&
              (!pixel.oracle.escaped ||
                Math.abs(pixel.baseline.iteration - pixel.oracle.iteration) <= 1);
            pixel.candidateAgreesWithOracle =
              pixel.candidate.valid &&
              pixel.candidate.escaped === pixel.oracle.escaped &&
              (!pixel.oracle.escaped ||
                Math.abs(pixel.candidate.iteration - pixel.oracle.iteration) <= 1);
            delete pixel.score;
          }
          const reasons = [];
          if (difference.classificationChanges) reasons.push("escape classification changed");
          if (difference.validityChanges) reasons.push("validity mask changed");
          if (difference.maxIterationDifference > payload.thresholds.maxIterationDifference)
            reasons.push("escape iteration tolerance exceeded");
          if (difference.maxChannelError > payload.thresholds.maxChannelError)
            reasons.push("maximum RGB error exceeded");
          if (difference.meanChannelError > payload.thresholds.meanChannelError)
            reasons.push("mean RGB error exceeded");
          if (difference.largePixelFraction > payload.thresholds.largePixelFraction)
            reasons.push("too many pixels exceed RGB error threshold");
          if (variant === "bla" && mode >= 4 && difference.changedPixels !== 0)
            reasons.push("BLA changed a stripe/orbit-trap color");
          if (reasons.length) failures.push({ fixture: fixture.id, mode, variant, reasons });
          fixtureResult.comparisons.push({
            mode,
            color: payload.colorModes[mode],
            variant,
            passed: reasons.length === 0,
            baselineDrawReadMs: baseline.wallMs,
            candidateDrawReadMs: candidate.wallMs,
            ...difference,
          });
        }
      }
      fixtureResult.oracleSamples = oracleCache.size;
      results.push(fixtureResult);
      for (const owned of textures.splice(0)) gl.deleteTexture(owned);
      // Let the browser remain responsive between fixtures.
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  } finally {
    for (const { linked } of programs) gl.deleteProgram(linked);
    for (const owned of textures) gl.deleteTexture(owned);
    gl.deleteBuffer(buffer);
    gl.getExtension("WEBGL_lose_context")?.loseContext();
  }
  return {
    passed: failures.length === 0 && oracleFailures.length === 0,
    imageComparisonPassed: failures.length === 0,
    oracleGridStabilized: payload.oracleGrid ? oracleFailures.length === 0 : null,
    renderer,
    vendor,
    note: "Draw/read times include synchronization and readback, not isolated GPU timings. Oracle disagreements are reported, never exempted from thresholds.",
    thresholds: payload.thresholds,
    compileMs: programs.map(({ compileMs }) => compileMs),
    results,
    failures,
    oracleFailures,
  };
}

const payload = {
  vertex: read("utils/shaders/mandelbrot.vert"),
  shared: escapeSource.slice(0, mainAt),
  deep,
  diagnostic,
  fixtures,
  variants,
  oracleLimit,
  oracleGrid,
  colorModes: ["smooth", "log", "banded", "distance", "stripes", "trap-point", "trap-cross"],
  thresholds: {
    maxChannelError: 32,
    meanChannelError: 0.5,
    largeChannelError: 8,
    largePixelFraction: 0.001,
    maxIterationDifference: 1,
  },
  oracleModules: {
    math: compileTS(read("utils/deepZoom/math.ts")),
    orbit: compileTS(read("utils/deepZoom/orbit.ts")),
  },
};
const outputPath = resolve(
  process.argv.slice(2).find((arg) => !arg.startsWith("--")) ??
    "/private/tmp/mandelbrot-acceleration.js",
);
const script = `async (page) => {
  const result = await page.evaluate(${checkAcceleration.toString()}, ${JSON.stringify(payload)});
  console.log(JSON.stringify(result, null, 2));
  if (!result.passed) throw new Error(JSON.stringify(result));
  return result;
}\n`;
writeFileSync(outputPath, script);
console.log(
  JSON.stringify({
    outputPath,
    fixtures: fixtures.length,
    variants,
    width,
    height,
    oracleGrid,
    bytes: Buffer.byteLength(script),
  }),
);
