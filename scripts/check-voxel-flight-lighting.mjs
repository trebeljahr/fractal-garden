import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { isAbsolute, resolve } from "node:path";
import ts from "typescript";

// Generates a Playwright callback, matching the other GPU checks in this folder.
// Run the callback in an otherwise idle, local browser; hardware identity and
// both GPU query time and synchronized readback time are included in its result.
// node scripts/check-voxel-flight-lighting.mjs /private/tmp/check-lighting.js \
//   --baseline=HEAD --sizes=320x180,640x360 --captures=/private/tmp/lighting-stills
// Optional: --rounds=9 --warmup=3 --frames-per-mode=1 --max-ms=180000 --capture-size=640x360
// --fixtures=menger/exterior,mosely-heavy/interior --sizes=1280x720
// Matched optimization: --baseline-mode=depth --specialize=mosely-light --modes=baseline,depth
const options = Object.fromEntries(
  process.argv.slice(3).map((arg) => {
    const match = /^--([a-z-]+)=(.+)$/.exec(arg);
    if (!match) throw Error(`Expected --name=value, received ${arg}`);
    return match.slice(1);
  }),
);
const known = new Set([
  "baseline",
  "baseline-mode",
  "specialize",
  "modes",
  "sizes",
  "rounds",
  "warmup",
  "frames-per-mode",
  "max-ms",
  "fixtures",
  "captures",
  "capture-size",
]);
for (const key of Object.keys(options)) if (!known.has(key)) throw Error(`Unknown option: ${key}`);
function integer(name, fallback, minimum, maximum) {
  const value = Number(options[name] ?? fallback);
  if (!Number.isInteger(value) || value < minimum || value > maximum)
    throw Error(`${name} must be an integer from ${minimum} to ${maximum}`);
  return value;
}
function size(value) {
  const match = /^(\d+)x(\d+)$/.exec(value);
  if (!match) throw Error(`Invalid framebuffer size: ${value}`);
  const [width, height] = match.slice(1).map(Number);
  if (width < 32 || height < 32 || width * height > 8_000_000)
    throw Error(`Framebuffer must be at least 32x32 and at most 8000000 pixels: ${value}`);
  return { width, height };
}
const settings = {
  sizes: (options.sizes ?? "320x180,640x360").split(",").map(size),
  rounds: integer("rounds", 9, 3, 99),
  warmup: integer("warmup", 3, 1, 20),
  framesPerMode: integer("frames-per-mode", 1, 1, 16),
  maxMs: integer("max-ms", 180000, 1000, 900000),
  captureSize: size(options["capture-size"] ?? "640x360"),
};
if (options.captures && !isAbsolute(options.captures))
  throw Error("captures must be an absolute path");
if (options.captures) mkdirSync(options.captures, { recursive: true });
const require = createRequire(import.meta.url);
require.extensions[".ts"] = (module, filename) =>
  module._compile(
    ts.transpileModule(readFileSync(filename, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText,
    filename,
  );
const { buildGridFrame, flightBasis, PATTERNS } = require("../utils/voxelZoom/camera.ts");
const { fixedFromNumber } = require("../utils/deepZoom/math.ts");
const { specializeVoxelShader } = require("../utils/voxelZoom/shader.ts");
const { flightAtmosphere } = require("../utils/voxelZoom/atmosphere.ts");
const { flightDetailDepth, flightResolution } = require("../utils/voxelZoom/resolution.ts");
const root = new URL("../", import.meta.url);
const vertex = readFileSync(new URL("../utils/shaders/mandelbrot.vert", import.meta.url), "utf8");
const rawFragment = readFileSync(
  new URL("../utils/shaders/voxel-flight.frag", import.meta.url),
  "utf8",
);
if (options.specialize && !PATTERNS.includes(options.specialize))
  throw Error("Unknown specialization");
const fragment = options.specialize
  ? specializeVoxelShader(rawFragment, options.specialize)
  : rawFragment;
for (const uniform of ["u_lighting", "u_aoMode"])
  if (!fragment.includes(uniform)) throw Error(`Current shader lacks ${uniform}`);
const baselineRef = execFileSync("git", ["rev-parse", "--verify", options.baseline ?? "HEAD"], {
  cwd: root,
  encoding: "utf8",
}).trim();
const baseline = execFileSync("git", ["show", `${baselineRef}:utils/shaders/voxel-flight.frag`], {
  cwd: root,
  encoding: "utf8",
});
const hash = (source) => createHash("sha256").update(source).digest("hex");
let modes = [
  { name: "baseline", program: 0, lighting: 0, aoMode: 0 },
  { name: "classic", program: 1, lighting: 0, aoMode: 0 },
  { name: "depth-only", program: 1, lighting: 1, aoMode: 0 },
  { name: "depth", program: 1, lighting: 1, aoMode: 1 },
  { name: "minecraft", program: 1, lighting: 1, aoMode: 2 },
];
const baselineMode = modes.find((mode) => mode.name === (options["baseline-mode"] ?? "classic"));
if (!baselineMode || baselineMode.name === "baseline") throw Error("Invalid baseline-mode");
modes[0].lighting = baselineMode.lighting;
modes[0].aoMode = baselineMode.aoMode;
if (options.modes) {
  const requested = options.modes.split(",");
  if (requested.some((name) => !modes.some((mode) => mode.name === name)))
    throw Error("Unknown mode");
  modes = modes.filter((mode) => requested.includes(mode.name));
  if (modes[0]?.name !== "baseline") throw Error("Selected modes must include baseline");
}
const fixtures = [];
// Retained ancestor addresses end in an empty child. The named near-wall
// camera sits beside a retained sibling, looking straight at that wall.
for (const [pattern, parent, hole, wallSign] of [
  ["menger", [2, 2, 2], [1, 1, 0], 1],
  ["vicsek", [1, 1, 1], [2, 2, 1], -1],
  ["mosely-light", [1, 0, 0], [1, 1, 1], 1],
  ["mosely-heavy", [1, 1, 1], [0, 0, 0], 1],
]) {
  function cavity(level, nearWall = false) {
    const depth = level + 3;
    const one = 1n << 600n;
    const denominator = 3n ** BigInt(depth);
    const fractions = nearWall
      ? [wallSign > 0 ? 999999 : 1, 540000, 370000]
      : [930000, 540000, 370000];
    const position = parent.map((digit, axis) => {
      let address = 0n;
      for (let i = 1; i < depth; i++) address = address * 3n + BigInt(digit);
      address = address * 3n + BigInt(hole[axis]);
      return (
        ((2n * (address * 1000000n + BigInt(fractions[axis])) - denominator * 1000000n) * one) /
        (denominator * 1000000n)
      );
    });
    return {
      position,
      bits: 600,
      level: nearWall ? 8 : level,
      viewLevel: level,
      navigationLevel: level,
      yaw: nearWall ? (wallSign * Math.PI) / 2 : 0.63,
      pitch: nearWall ? 0.12 : 0.27,
    };
  }
  // Keep this camera outside every shape independently of app opening views,
  // which may intentionally start inside a passage for some patterns.
  const exterior = {
    position: [
      pattern === "menger" ? 0 : pattern === "vicsek" ? 0.7 : 0.8,
      pattern === "menger" ? 0 : pattern === "vicsek" ? 0.7 : 0.8,
      3.2,
    ].map((value) => fixedFromNumber(value, 600)),
    bits: 600,
    level: 0,
    viewLevel: 0,
    navigationLevel: 0,
    yaw: 0,
    pitch: 0,
  };
  for (const [view, camera] of [
    ["exterior", exterior],
    ["interior", cavity(0)],
    ["near-wall", cavity(0, true)],
    ["level150", cavity(150)],
  ]) {
    const navigationLevel = camera.navigationLevel ?? camera.viewLevel ?? camera.level;
    const atmosphere = flightAtmosphere(camera.level, navigationLevel);
    const frame = buildGridFrame(
      camera,
      pattern,
      flightDetailDepth(navigationLevel, camera.level),
      atmosphere.farDistance,
    );
    fixtures.push({
      name: `${pattern}/${view}`,
      pattern: PATTERNS.indexOf(pattern),
      frame: { ...frame, texture: Array.from(frame.texture) },
      basis: flightBasis(camera),
      atmosphere,
      camera: { ...camera, position: camera.position.map((p) => p.toString(16)) },
      resolutions: [...settings.sizes, settings.captureSize].map((dimensions) => ({
        ...dimensions,
        detail: flightResolution(
          frame.clearance,
          dimensions.width,
          dimensions.height,
          camera.level,
          navigationLevel,
        ),
      })),
    });
  }
}
const requestedFixtures = options.fixtures?.split(",");
for (const name of requestedFixtures ?? [])
  if (!fixtures.some((fixture) => fixture.name === name)) throw Error(`Unknown fixture: ${name}`);
const payload = {
  vertex,
  fragments: [baseline, fragment],
  modes,
  settings,
  fixtures: fixtures.filter(
    (fixture) =>
      (!requestedFixtures || requestedFixtures.includes(fixture.name)) &&
      (!options.specialize || fixture.pattern === PATTERNS.indexOf(options.specialize)),
  ),
  source: {
    baselineRef,
    baselineSha256: hash(baseline),
    currentSha256: hash(fragment),
    specialization: options.specialize ?? null,
  },
};

async function benchmark(payload) {
  const canvas = document.createElement("canvas");
  canvas.dataset.voxelLightingBenchmark = "true";
  document.body.replaceChildren(canvas);
  document.body.style.margin = "0";
  const gl = canvas.getContext("webgl", { preserveDrawingBuffer: true, antialias: false });
  if (!gl?.getExtension("OES_texture_float")) throw Error("Float WebGL unavailable");
  const timer = gl.getExtension("EXT_disjoint_timer_query");
  const debug = gl.getExtension("WEBGL_debug_renderer_info");
  const renderer = debug
    ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL)
    : gl.getParameter(gl.RENDERER);
  const software = /swiftshader|llvmpipe|softpipe|software|swrast/i.test(renderer);
  const identity = {
    vendor: debug ? gl.getParameter(debug.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR),
    renderer,
    unmasked: Boolean(debug),
    execution: software
      ? "software"
      : debug
        ? "hardware reported; confirm renderer identity"
        : "unknown (masked renderer)",
    webglVersion: gl.getParameter(gl.VERSION),
    userAgent: navigator.userAgent,
    timerExtension: Boolean(timer),
    devicePixelRatio,
  };
  const shaders = [],
    programs = [],
    queries = new Set();
  let buffer, texture;
  function dispose() {
    for (const query of queries) timer.deleteQueryEXT(query);
    gl.deleteTexture(texture);
    gl.deleteBuffer(buffer);
    for (const program of programs) gl.deleteProgram(program.handle);
    for (const shader of shaders) gl.deleteShader(shader);
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    canvas.remove();
    delete window.__voxelLightingBenchmark;
  }
  try {
    const compile = (source, type) => {
      const shader = gl.createShader(type);
      shaders.push(shader);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
        throw Error(gl.getShaderInfoLog(shader));
      return shader;
    };
    const vert = compile(payload.vertex, gl.VERTEX_SHADER);
    for (const source of payload.fragments) {
      const handle = gl.createProgram();
      const program = { handle, uniforms: {} };
      programs.push(program);
      gl.attachShader(handle, vert);
      gl.attachShader(handle, compile(source, gl.FRAGMENT_SHADER));
      gl.linkProgram(handle);
      if (!gl.getProgramParameter(handle, gl.LINK_STATUS))
        throw Error(gl.getProgramInfoLog(handle));
      for (let i = 0; i < gl.getProgramParameter(handle, gl.ACTIVE_UNIFORMS); i++) {
        const { name } = gl.getActiveUniform(handle, i);
        program.uniforms[name.slice(2)] = gl.getUniformLocation(handle, name);
      }
      program.attribute = gl.getAttribLocation(handle, "aPosition");
    }
    for (const name of ["lighting", "aoMode"])
      if (!programs[1].uniforms[name]) throw Error(`Current shader has no active u_${name}`);
    buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    for (const parameter of [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER])
      gl.texParameteri(gl.TEXTURE_2D, parameter, gl.NEAREST);
    for (const parameter of [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T])
      gl.texParameteri(gl.TEXTURE_2D, parameter, gl.CLAMP_TO_EDGE);
    function prepare(fixtureIndex, dimensions) {
      const fixture = payload.fixtures[fixtureIndex];
      canvas.width = dimensions.width;
      canvas.height = dimensions.height;
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        256,
        2,
        0,
        gl.RGBA,
        gl.FLOAT,
        new Float32Array(fixture.frame.texture),
      );
      const detail = fixture.resolutions.find(
        (r) => r.width === canvas.width && r.height === canvas.height,
      ).detail;
      for (const program of programs) {
        // biome-ignore lint/correctness/useHookAtTopLevel: WebGL API
        gl.useProgram(program.handle);
        const u = (name) => program.uniforms[name] ?? null;
        gl.uniform2f(u("resolution"), canvas.width, canvas.height);
        gl.uniform2f(u("viewCenter"), canvas.width / 2, canvas.height / 2);
        gl.uniform1f(u("viewSide"), Math.min(canvas.width, canvas.height));
        for (const [name, value] of Object.entries({ ...fixture.atmosphere, ...detail }))
          gl.uniform1f(u(name), value);
        for (const [name, value] of Object.entries({
          grid: 0,
          levels: fixture.frame.levels.length,
          pattern: fixture.pattern,
          faces: 1,
          wire: 0,
        }))
          gl.uniform1i(u(name), value);
        gl.uniform1f(u("lineWidth"), 1);
        gl.uniform3f(u("fill"), 0.8, 0.65, 0.45);
        gl.uniform3f(u("stroke"), 0.1, 0.15, 0.2);
        gl.uniform3f(u("background"), 0.025, 0.04, 0.06);
        for (const name of ["low", "high"]) gl.uniform3f(u(name), ...fixture.frame[name]);
        for (const name of ["forward", "right", "up"])
          gl.uniform3f(u(name), ...fixture.basis[name]);
      }
    }
    function activate(modeIndex) {
      const mode = payload.modes[modeIndex];
      const program = programs[mode.program];
      // biome-ignore lint/correctness/useHookAtTopLevel: WebGL API
      gl.useProgram(program.handle);
      gl.enableVertexAttribArray(program.attribute);
      gl.vertexAttribPointer(program.attribute, 2, gl.FLOAT, false, 0, 0);
      gl.uniform1i(program.uniforms.lighting ?? null, mode.lighting);
      gl.uniform1i(program.uniforms.aoMode ?? null, mode.aoMode);
    }
    const pixel = new Uint8Array(4);
    const syncDraw = () => {
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
      if (gl.isContextLost()) throw Error("WebGL context lost during benchmark");
    };
    const queryRejections = { disjoint: 0, timeout: 0, invalid: 0 };
    async function measure() {
      const query = timer?.createQueryEXT();
      let disjoint = timer && gl.getParameter(timer.GPU_DISJOINT_EXT);
      if (query) {
        queries.add(query);
        timer.beginQueryEXT(timer.TIME_ELAPSED_EXT, query);
      }
      const start = performance.now();
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (query) timer.endQueryEXT(timer.TIME_ELAPSED_EXT);
      gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
      const wallMs = performance.now() - start;
      let gpuMs = null;
      let gpuInvalidReason = null;
      if (query) {
        const deadline = performance.now() + 2000;
        let available = false;
        do {
          // Query results require yielding to the browser, even after readPixels.
          await new Promise((done) => setTimeout(done, 0));
          disjoint ||= gl.getParameter(timer.GPU_DISJOINT_EXT);
          available = timer.getQueryObjectEXT(query, timer.QUERY_RESULT_AVAILABLE_EXT);
        } while (!available && performance.now() < deadline && !gl.isContextLost());
        if (disjoint) gpuInvalidReason = "disjoint";
        else if (!available) gpuInvalidReason = "timeout";
        else {
          const value = timer.getQueryObjectEXT(query, timer.QUERY_RESULT_EXT) / 1000000;
          if (Number.isFinite(value) && value > 0) gpuMs = value;
          else gpuInvalidReason = "invalid";
        }
        if (gpuInvalidReason) queryRejections[gpuInvalidReason]++;
        timer.deleteQueryEXT(query);
        queries.delete(query);
      }
      if (gl.isContextLost()) throw Error("WebGL context lost during benchmark");
      return { gpuMs, wallMs, gpuInvalidReason };
    }
    function quantile(values, fraction) {
      const sorted = [...values].sort((a, b) => a - b);
      const index = (sorted.length - 1) * fraction;
      const lower = Math.floor(index);
      return sorted[lower] + (sorted[Math.ceil(index)] - sorted[lower]) * (index - lower);
    }
    function statistics(values) {
      if (!values.length) return null;
      const sorted = [...values].sort((a, b) => a - b);
      const middle = Math.floor(sorted.length / 2);
      return {
        count: sorted.length,
        medianMs: sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2,
        p25Ms: quantile(sorted, 0.25),
        p75Ms: quantile(sorted, 0.75),
        medianAbsoluteDeviationMs: quantile(
          values.map((value) => Math.abs(value - quantile(sorted, 0.5))),
          0.5,
        ),
        p95Ms: sorted[Math.ceil(sorted.length * 0.95) - 1],
        minMs: sorted[0],
        maxMs: sorted.at(-1),
      };
    }
    const results = [],
      start = performance.now();
    const deadline = start + payload.settings.maxMs;
    let complete = true;
    outer: for (let fixtureIndex = 0; fixtureIndex < payload.fixtures.length; fixtureIndex++) {
      const fixture = payload.fixtures[fixtureIndex];
      for (const dimensions of payload.settings.sizes) {
        if (performance.now() > deadline) {
          complete = false;
          break outer;
        }
        prepare(fixtureIndex, dimensions);
        const samples = payload.modes.map(() => []);
        // Rotate and reverse mode ordering to reduce warmup and thermal bias.
        for (let round = -payload.settings.warmup; round < payload.settings.rounds; round++) {
          const pending = [];
          for (let offset = 0; offset < payload.modes.length; offset++) {
            const rotation = round + payload.settings.warmup;
            const modeIndex =
              (rotation + (rotation % 2 ? payload.modes.length - 1 - offset : offset)) %
              payload.modes.length;
            activate(modeIndex);
            for (
              let frameInBatch = 0;
              frameInBatch < payload.settings.framesPerMode;
              frameInBatch++
            ) {
              if (round < 0) syncDraw();
              else {
                // measure() submits one independently timed and consumed draw
                // before its first await. Resolve all queries after the round,
                // avoiding a browser timer yield between every submitted frame.
                // A readback per frame prevents repeated opaque draws from
                // being discarded as overwritten work by a tile renderer.
                pending.push(
                  measure().then((sample) => ({ ...sample, modeIndex, round, frameInBatch })),
                );
              }
            }
          }
          const completed = await Promise.all(pending);
          // Treat a disjoint event anywhere in this unresolved group as
          // invalidating the whole group, regardless of which query noticed it.
          if (completed.some((sample) => sample.gpuInvalidReason === "disjoint")) {
            for (const sample of completed) {
              if (sample.gpuMs !== null) queryRejections.disjoint++;
              sample.gpuMs = null;
              sample.gpuInvalidReason = "disjoint";
            }
          }
          for (const { modeIndex, ...sample } of completed) samples[modeIndex].push(sample);
        }
        const useGpu = samples.every(
          (list) =>
            list.filter((sample) => sample.gpuMs !== null).length >=
            Math.max(3, Math.ceil(payload.settings.rounds * payload.settings.framesPerMode * 0.7)),
        );
        let baselinePixels;
        const outputs = payload.modes.map((mode, index) => {
          activate(index);
          syncDraw();
          const pixels = new Uint8Array(canvas.width * canvas.height * 4);
          gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
          baselinePixels ??= pixels;
          let changedPixels = 0,
            absoluteDifference = 0,
            maxChannelDifference = 0;
          for (let at = 0; at < pixels.length; at += 4) {
            let changed = false;
            for (let channel = 0; channel < 3; channel++) {
              const delta = Math.abs(pixels[at + channel] - baselinePixels[at + channel]);
              absoluteDifference += delta;
              maxChannelDifference = Math.max(maxChannelDifference, delta);
              changed ||= delta > 2;
            }
            if (changed) changedPixels++;
          }
          const gpu = statistics(
            samples[index].map((sample) => sample.gpuMs).filter((value) => value !== null),
          );
          const wall = statistics(samples[index].map((sample) => sample.wallMs));
          return {
            mode: mode.name,
            gpu,
            synchronizedWall: wall,
            primary: useGpu ? gpu : wall,
            samples: samples[index],
            pixels: {
              changedFraction: changedPixels / (canvas.width * canvas.height),
              meanChannelDifference: absoluteDifference / (canvas.width * canvas.height * 3),
              maxChannelDifference,
            },
          };
        });
        const baselineMedian = outputs[0].primary.medianMs;
        const depthReference =
          outputs.find((output) => output.mode === "depth-only") ??
          outputs.find((output) => output.mode === "depth") ??
          outputs[0];
        const depthOnlyMedian = depthReference.primary.medianMs;
        function pairedComparison(samples, reference) {
          const metric = useGpu ? "gpuMs" : "wallMs";
          const ratios = [],
            deltas = [];
          for (let round = 0; round < payload.settings.rounds; round++) {
            const mean = (list) => {
              const values = list
                .filter((sample) => sample.round === round && sample[metric] !== null)
                .map((sample) => sample[metric]);
              return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
            };
            const value = mean(samples),
              base = mean(reference);
            if (value !== null && base > 0) {
              ratios.push(value / base);
              deltas.push(value - base);
            }
          }
          return ratios.length
            ? {
                pairedRounds: ratios.length,
                medianDeltaMs: quantile(deltas, 0.5),
                p25DeltaMs: quantile(deltas, 0.25),
                p75DeltaMs: quantile(deltas, 0.75),
                medianRatio: quantile(ratios, 0.5),
                p25Ratio: quantile(ratios, 0.25),
                p75Ratio: quantile(ratios, 0.75),
              }
            : null;
        }
        const depthOnlySamples = depthReference.samples;
        for (const output of outputs) {
          output.relativeToBaseline =
            baselineMedian > 0 ? output.primary.medianMs / baselineMedian : null;
          output.relativeToDepthOnly =
            depthOnlyMedian > 0 ? output.primary.medianMs / depthOnlyMedian : null;
          output.pairedToBaseline = pairedComparison(output.samples, outputs[0].samples);
          output.pairedToDepthOnly = pairedComparison(output.samples, depthOnlySamples);
        }
        const error = gl.getError();
        if (error !== gl.NO_ERROR) throw Error(`WebGL error ${error} in ${fixture.name}`);
        results.push({
          name: fixture.name,
          ...dimensions,
          levels: fixture.frame.levels.length,
          camera: fixture.camera,
          timing: useGpu
            ? "GPU timer query"
            : "synchronized readback wall time (includes browser/driver/readback overhead)",
          outputs,
        });
      }
    }
    window.__voxelLightingBenchmark = {
      capture(fixtureIndex, modeIndex) {
        prepare(fixtureIndex, payload.settings.captureSize);
        activate(modeIndex);
        syncDraw();
      },
      dispose,
    };
    return {
      complete,
      identity,
      source: payload.source,
      settings: payload.settings,
      elapsedMs: performance.now() - start,
      sampling: {
        queryScope:
          "One draw per GPU timer query; one synchronous pixel readback per draw; query results resolved after each interleaved round.",
        samplesPerMode: payload.settings.rounds * payload.settings.framesPerMode,
        framesPerModePerRound: payload.settings.framesPerMode,
        pairedComparison:
          "Compare arithmetic means within matching rounds, then report the median and interquartile range of those paired ratios and deltas.",
      },
      queryRejections,
      results,
      classicMatchesBaseline: payload.modes.some((mode) => mode.name === "classic")
        ? results.every(
            (result) =>
              result.outputs.find((output) => output.mode === "classic").pixels
                .maxChannelDifference <= 2,
          )
        : null,
      caveats: [
        "Isolated production shader draws at fixed framebuffer size; excludes app CPU work, adaptive sizing, input and compositing.",
        "Warmups excluded; modes interleaved. p95 is nearest-rank over individual draw samples, not a gameplay frame-time estimate.",
        "Several submitted frames per mode reduce timer-yield gaps but do not lock GPU clocks or isolate other GPU work. Pairing reduces drift; remaining spread is reported explicitly.",
        "Readback wall time includes browser, driver and readback overhead. Software-renderer results do not estimate hardware GPU cost.",
        "Relative costs compare medians within the same camera, resolution and timing method; still images use the identical camera for every mode.",
      ],
    };
  } catch (error) {
    dispose();
    throw error;
  }
}

async function run(page, benchmark, payload, captures) {
  // No external page or preview server is needed by the isolated shader check.
  await page.goto("about:blank");
  await page.setViewportSize({
    width: Math.max(800, payload.settings.captureSize.width),
    height: Math.max(600, payload.settings.captureSize.height),
  });
  try {
    const report = await page.evaluate(benchmark, payload);
    report.captures = [];
    if (captures && report.complete) {
      const canvas = page.locator("canvas[data-voxel-lighting-benchmark]");
      for (let fixtureIndex = 0; fixtureIndex < payload.fixtures.length; fixtureIndex++) {
        for (let modeIndex = 0; modeIndex < payload.modes.length; modeIndex++) {
          await page.evaluate(
            ([fixtureIndex, modeIndex]) =>
              window.__voxelLightingBenchmark.capture(fixtureIndex, modeIndex),
            [fixtureIndex, modeIndex],
          );
          const filename = `${payload.fixtures[fixtureIndex].name.replaceAll("/", "-")}-${payload.modes[modeIndex].name}.png`;
          const path = `${captures}/${filename}`;
          await canvas.screenshot({ path });
          report.captures.push(path);
        }
      }
    }
    return report;
  } finally {
    await page.evaluate(() => window.__voxelLightingBenchmark?.dispose());
  }
}

const output = resolve(process.argv[2] ?? "/private/tmp/check-voxel-flight-lighting.js");
writeFileSync(
  output,
  `async(page)=>await (${run.toString()})(page,${benchmark.toString()},${JSON.stringify(payload)},${JSON.stringify(options.captures ?? null)})`,
);
console.log(
  `Wrote ${output}: ${payload.fixtures.length} cameras, ${settings.sizes.length} resolutions, ${modes.length} modes, ${settings.rounds} measured rounds.`,
);
