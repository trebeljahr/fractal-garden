import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { basename, dirname, join } from "node:path";
import ts from "typescript";

// node scripts/check-voxel-performance.mjs BASELINE.frag CALLBACK.js [CAPTURES] [--candidate FILE]
// node scripts/check-voxel-performance.mjs --extract-captures CAPTURES/captures.json
// VOXEL_PATTERNS=menger,vicsek,mosely-light,mosely-heavy (default all).
// VOXEL_FILTER matches fixture names. VOXEL_WIDTH/HEIGHT/SAMPLES/WARMUP default
// to 640/480/8/3. VOXEL_RAYS=9 checks the full stationary accumulation (default 1).
// Baseline retains the original pattern-only specialization. --candidate uses
// its supplied bytes unchanged; otherwise the current helper receives the style.
// VOXEL_STYLE_SPECIALIZE=1 additionally fixes AO, lighting, faces and wire in the
// generated candidate, for experiments before integrating a production variant.
const args = process.argv.slice(2);
const extractIndex = args.indexOf("--extract-captures");
if (extractIndex >= 0) {
  const path = args[extractIndex + 1];
  if (!path) throw Error("--extract-captures requires a bundle path");
  const images = JSON.parse(readFileSync(path, "utf8"));
  if (!Array.isArray(images)) throw Error("Capture bundle must contain an image array");
  mkdirSync(dirname(path), { recursive: true });
  for (const { name, data } of images) {
    if (
      typeof name !== "string" ||
      basename(name) !== name ||
      !name.endsWith(".png") ||
      typeof data !== "string" ||
      !data.startsWith("data:image/png;base64,")
    )
      throw Error("Invalid PNG capture entry");
    writeFileSync(
      join(dirname(path), name),
      Buffer.from(data.slice("data:image/png;base64,".length), "base64"),
    );
  }
  console.log(JSON.stringify({ extracted: images.length, directory: dirname(path) }));
  process.exit(0);
}
const candidateIndex = args.indexOf("--candidate");
let candidatePath;
if (candidateIndex >= 0) {
  candidatePath = args[candidateIndex + 1];
  if (!candidatePath) throw Error("--candidate requires a shader path");
  args.splice(candidateIndex, 2);
}
if (!args[0]) throw Error("Supply the unmodified voxel-flight.frag as the first argument");
const width = Number(process.env.VOXEL_WIDTH ?? 640),
  height = Number(process.env.VOXEL_HEIGHT ?? 480);
const samples = Number(process.env.VOXEL_SAMPLES ?? 8),
  warmup = Number(process.env.VOXEL_WARMUP ?? 3);
const rays = Number(process.env.VOXEL_RAYS ?? 1);
for (const [name, value] of Object.entries({ width, height, samples, warmup }))
  if (!Number.isInteger(value) || value < 1) throw Error(`${name} must be a positive integer`);
if (![1, 9].includes(rays)) throw Error("VOXEL_RAYS must be 1 or 9");
const require = createRequire(import.meta.url);
require.extensions[".ts"] = (module, filename) =>
  module._compile(
    ts.transpileModule(readFileSync(filename, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText,
    filename,
  );
const {
  buildGridFrame,
  initialFlightCamera,
  exteriorFlightCamera,
  flightBasis,
  flightRootBounds,
  MAX_VOXEL_DEPTH,
  PATTERNS,
} = require("../utils/voxelZoom/camera.ts");
const { flightAtmosphere } = require("../utils/voxelZoom/atmosphere.ts");
const { flightDetailDepth, flightResolution } = require("../utils/voxelZoom/resolution.ts");
const { flightLens } = require("../utils/voxelZoom/lens.ts");
const { flightProjection, flightScreenBounds } = require("../utils/voxelZoom/view.ts");
const { flightReliefFront } = require("../utils/voxelZoom/lighting.ts");
const { FLIGHT_SAMPLE_OFFSETS } = require("../utils/voxelZoom/sampling.ts");
const { specializeVoxelShader } = require("../utils/voxelZoom/shader.ts");
const vertex = readFileSync(new URL("../utils/shaders/mandelbrot.vert", import.meta.url), "utf8");
const baseline = readFileSync(args[0], "utf8");
const candidate = readFileSync(
  candidatePath ?? new URL("../utils/shaders/voxel-flight.frag", import.meta.url),
  "utf8",
);
const selected =
  !process.env.VOXEL_PATTERNS || process.env.VOXEL_PATTERNS === "all"
    ? PATTERNS
    : process.env.VOXEL_PATTERNS.split(",").map((p) => p.trim());
for (const pattern of selected)
  if (!PATTERNS.includes(pattern)) throw Error(`Unknown voxel pattern ${pattern}`);
const variants = [],
  variantIndices = new Map();
const register = (name, source) => {
  const key = name + "\0" + source;
  if (!variantIndices.has(key)) {
    variantIndices.set(key, variants.length);
    variants.push({ name, source });
  }
  return variantIndices.get(key);
};
const aoMode = (style) => (style.occlusion === "off" ? 0 : style.occlusion === "minecraft" ? 2 : 1);
const lighting = (style) => (style.lighting === "classic" ? 0 : 1);
const styleSource = (source, style) =>
  source
    .replace("uniform int u_aoMode;", `const int u_aoMode = ${aoMode(style)};`)
    .replace("uniform int u_lighting;", `const int u_lighting = ${lighting(style)};`)
    .replace("uniform bool u_faces;", `const bool u_faces = ${style.showFaces};`)
    .replace("uniform bool u_wire;", `const bool u_wire = ${style.showWireframe};`);
const boundaryCamera = (pattern, level, navigationLevel = level) => {
  const bits = 600,
    one = 1n << 600n,
    offset = (2n * one) / (5n * 3n ** BigInt(level));
  const common = {
    bits,
    level,
    viewLevel: navigationLevel,
    navigationLevel,
    atmosphereLevel: navigationLevel,
    atmosphereVelocity: 0,
  };
  if (pattern === "menger")
    return {
      ...common,
      position: [one + offset, one + offset, one + offset],
      yaw: -Math.PI / 4,
      pitch: -Math.asin(1 / Math.sqrt(3)),
    };
  if (pattern === "vicsek")
    return { ...common, position: [one + offset, 0n, 0n], yaw: -Math.PI / 2, pitch: 0 };
  return { ...common, position: [0n, (4n * one) / 5n, one + offset], yaw: 0, pitch: 0 };
};
const framing = { top: 60, bottom: 76 };
const projection = flightProjection(width, height, framing);
const fixtures = [];
for (const pattern of [...new Set(selected)]) {
  const colors =
    pattern === "menger"
      ? ["#7ce3c2", "#d9fff3"]
      : pattern === "vicsek"
        ? ["#f5b86d", "#ffe8c5"]
        : ["#8fb0ff", "#dce9ff"];
  const style = {
    background: "#252424",
    fillColor: colors[0],
    strokeColor: colors[1],
    showFaces: true,
    showWireframe: true,
    lineWidth: pattern === "vicsek" ? 0.8 : 0.7,
    lighting: "depth",
    occlusion: "soft",
  };
  const definitions = [
    { name: "opening-depth-soft", camera: initialFlightCamera(pattern), style },
    {
      name: "rotated-classic-soft",
      camera: exteriorFlightCamera(pattern, -0.73, -0.35),
      style: { ...style, lighting: "classic" },
    },
    { name: "near-wall-depth-soft", camera: boundaryCamera(pattern, 12), style },
    {
      name: "near-wall-depth-strong",
      camera: boundaryCamera(pattern, 12),
      style: { ...style, occlusion: "minecraft" },
    },
    {
      name: "near-wall-classic-off",
      camera: boundaryCamera(pattern, 12),
      style: { ...style, lighting: "classic", occlusion: "off" },
    },
    { name: "approach-without-scroll", camera: boundaryCamera(pattern, 12, 0), style },
    { name: "deep-150-depth-soft", camera: boundaryCamera(pattern, 150), style },
    {
      name: "deep-150-wire",
      camera: boundaryCamera(pattern, 150),
      style: { ...style, lighting: "classic", showFaces: false, occlusion: "off" },
    },
  ];
  for (const definition of definitions) {
    const name = `${pattern}/${definition.name}`;
    if (process.env.VOXEL_FILTER && !new RegExp(process.env.VOXEL_FILTER).test(name)) continue;
    const { camera, style } = definition;
    const navigationLevel = camera.navigationLevel ?? camera.viewLevel ?? camera.level;
    const atmosphere = flightAtmosphere(camera.level, camera.atmosphereLevel ?? navigationLevel);
    const basis = flightBasis(camera),
      bounds = flightRootBounds(camera),
      lens = flightLens(pattern, bounds);
    const visible = flightScreenBounds(
      bounds,
      basis,
      width,
      height,
      atmosphere.farDistance,
      framing,
      lens,
    );
    if (!visible) throw Error(`Benchmark fixture ${name} has no visible root`);
    const frame = buildGridFrame(
      camera,
      pattern,
      flightDetailDepth(navigationLevel, camera.level),
      atmosphere.farDistance,
    );
    const detail = flightResolution(
      frame.clearance,
      projection.side,
      projection.side,
      camera.level,
      navigationLevel,
      projection.side,
      projection.side,
      lens,
    );
    const baselineSource = baseline.replace(
      "uniform int u_pattern;",
      `const int u_pattern = ${PATTERNS.indexOf(pattern)};`,
    );
    let candidateSource = candidatePath
      ? candidate
      : specializeVoxelShader(candidate, pattern, style);
    if (!candidatePath && process.env.VOXEL_STYLE_SPECIALIZE === "1")
      candidateSource = styleSource(candidateSource, style);
    fixtures.push({
      name,
      pattern: PATTERNS.indexOf(pattern),
      level: camera.level,
      navigationLevel,
      style,
      lighting: lighting(style),
      aoMode: aoMode(style),
      variants: [register("baseline", baselineSource), register("current", candidateSource)],
      frame: {
        texture: Array.from(frame.texture),
        levelCount: frame.levels.length,
        low: frame.low,
        high: frame.high,
        clearance: frame.clearance,
      },
      basis,
      lens,
      visible,
      detail,
      atmosphere,
      reliefFront: flightReliefFront(bounds),
    });
  }
}
if (!fixtures.length) throw Error("VOXEL_FILTER matched no fixtures");

async function check(page, payload, captures) {
  const result = await page.evaluate(
    async ({
      vertex,
      variants,
      fixtures,
      width,
      height,
      samples,
      warmup,
      offsets,
      projection,
      gridWidth,
      capture,
    }) => {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const gl = canvas.getContext("webgl", {
        alpha: false,
        antialias: false,
        preserveDrawingBuffer: true,
      });
      if (!gl?.getExtension("OES_texture_float")) throw Error("Float WebGL unavailable");
      const owned = [],
        images = [],
        compiled = new Map();
      const own = (value, release) => {
        if (!value) throw Error("GPU allocation failed");
        owned.push(() => release(value));
        return value;
      };
      const shader = (type, source) => {
        const s = own(gl.createShader(type), (v) => gl.deleteShader(v));
        gl.shaderSource(s, source);
        gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw Error(gl.getShaderInfoLog(s));
        return s;
      };
      const vert = shader(gl.VERTEX_SHADER, vertex);
      const programFor = (index) => {
        if (!compiled.has(index)) {
          const p = own(gl.createProgram(), (v) => gl.deleteProgram(v));
          gl.attachShader(p, vert);
          gl.attachShader(p, shader(gl.FRAGMENT_SHADER, variants[index].source));
          gl.bindAttribLocation(p, 0, "aPosition");
          gl.linkProgram(p);
          if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw Error(gl.getProgramInfoLog(p));
          compiled.set(index, {
            name: variants[index].name,
            program: p,
            uniform: (name) => gl.getUniformLocation(p, "u_" + name),
          });
        }
        return compiled.get(index);
      };
      const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
      const percentile = (values, p) =>
        [...values].sort((a, b) => a - b)[
          Math.min(values.length - 1, Math.floor(values.length * p))
        ];
      try {
        const buffer = own(gl.createBuffer(), (v) => gl.deleteBuffer(v));
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
        const texture = own(gl.createTexture(), (v) => gl.deleteTexture(v));
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        for (const p of [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER])
          gl.texParameteri(gl.TEXTURE_2D, p, gl.NEAREST);
        for (const p of [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T])
          gl.texParameteri(gl.TEXTURE_2D, p, gl.CLAMP_TO_EDGE);
        gl.disable(gl.DITHER);
        gl.disable(gl.DEPTH_TEST);
        gl.viewport(0, 0, width, height);
        const timer = gl.getExtension("EXT_disjoint_timer_query");
        const syncPixel = new Uint8Array(4);
        const sync = () => gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, syncPixel);
        const hardware = gl.getExtension("WEBGL_debug_renderer_info");
        const renderer = hardware
          ? gl.getParameter(hardware.UNMASKED_RENDERER_WEBGL)
          : gl.getParameter(gl.RENDERER);
        const setup = (p, f) => {
          // biome-ignore lint/correctness/useHookAtTopLevel: WebGL API, not a React hook.
          gl.useProgram(p.program);
          const u = p.uniform;
          gl.uniform2f(u("viewCenter"), projection.centerX, projection.centerY);
          for (const [name, value] of Object.entries({
            viewSide: projection.side,
            projection: f.lens,
            pixelAngle: f.detail.pixelAngle,
            nearFootprint: f.detail.nearFootprint,
            detailScale: f.detail.detailScale,
            farDistance: f.atmosphere.farDistance,
            fogDistanceScale: f.atmosphere.fogDistanceScale,
            fogStart: f.atmosphere.fogStart,
            fogDensity: f.atmosphere.fogDensity,
            reliefFront: f.reliefFront,
            lineWidth: f.style.lineWidth,
          }))
            gl.uniform1f(u(name), value);
          for (const [name, value] of Object.entries({
            grid: 0,
            levels: f.frame.levelCount,
            pattern: f.pattern,
            faces: Number(f.style.showFaces),
            wire: Number(f.style.showWireframe),
            lighting: f.lighting,
            aoMode: f.aoMode,
          }))
            gl.uniform1i(u(name), value);
          for (const name of ["low", "high"]) gl.uniform3fv(u(name), f.frame[name]);
          for (const name of ["right", "up", "forward"]) gl.uniform3fv(u(name), f.basis[name]);
          for (const [name, value] of Object.entries({
            background: f.style.background,
            fill: f.style.fillColor,
            stroke: f.style.strokeColor,
          }))
            gl.uniform3fv(u(name), rgb(value));
        };
        const compare = (a, b) => {
          let changedPixels = 0,
            changedBytes = 0,
            maxChannelDelta = 0,
            totalDelta = 0;
          const examples = [];
          for (let i = 0; i < a.length; i += 4) {
            let changed = false;
            for (let c = 0; c < 4; c++) {
              const delta = Math.abs(a[i + c] - b[i + c]);
              if (delta) {
                changed = true;
                changedBytes++;
              }
              maxChannelDelta = Math.max(maxChannelDelta, delta);
              totalDelta += delta;
            }
            if (changed) {
              changedPixels++;
              if (examples.length < 4)
                examples.push({
                  x: (i / 4) % width,
                  y: Math.floor(i / 4 / width),
                  baseline: Array.from(a.slice(i, i + 4)),
                  current: Array.from(b.slice(i, i + 4)),
                });
            }
          }
          return {
            changedPixels,
            changedBytes,
            maxChannelDelta,
            meanAbsoluteChannelDelta: totalDelta / a.length,
            examples,
          };
        };
        const results = [];
        for (const f of fixtures) {
          const programs = f.variants.map(programFor);
          gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGBA,
            gridWidth,
            2,
            0,
            gl.RGBA,
            gl.FLOAT,
            new Float32Array(f.frame.texture),
          );
          for (const p of programs) setup(p, f);
          const draw = (p) => {
            // biome-ignore lint/correctness/useHookAtTopLevel: WebGL API, not a React hook.
            gl.useProgram(p.program);
            gl.disable(gl.SCISSOR_TEST);
            gl.clearColor(...rgb(f.style.background), 1);
            gl.clear(gl.COLOR_BUFFER_BIT);
            gl.enable(gl.SCISSOR_TEST);
            gl.scissor(f.visible.x, f.visible.y, f.visible.width, f.visible.height);
            for (let i = 0; i < offsets.length; i++) {
              gl.uniform2fv(p.uniform("sampleOffset"), offsets[i]);
              if (i > 0) {
                gl.enable(gl.BLEND);
                gl.blendColor(0, 0, 0, 1 / (i + 1));
                gl.blendFunc(gl.CONSTANT_ALPHA, gl.ONE_MINUS_CONSTANT_ALPHA);
              } else gl.disable(gl.BLEND);
              gl.drawArrays(gl.TRIANGLES, 0, 3);
            }
            gl.disable(gl.BLEND);
            gl.disable(gl.SCISSOR_TEST);
          };
          for (let i = 0; i < warmup; i++)
            for (const p of programs) {
              draw(p);
              sync();
            }
          const pixels = programs.map((p) => {
            draw(p);
            const bytes = new Uint8Array(width * height * 4);
            gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, bytes);
            if (capture)
              images.push({
                name: `${f.name.replaceAll("/", "-")}-${p.name}.png`,
                data: canvas.toDataURL("image/png"),
              });
            return bytes;
          });
          const wall = programs.map(() => []),
            queries = programs.map(() => []);
          for (let i = 0; i < samples; i++) {
            for (const index of i % 2 ? [1, 0] : [0, 1]) {
              sync();
              const query = timer
                ? own(timer.createQueryEXT(), (q) => timer.deleteQueryEXT(q))
                : null;
              const start = performance.now();
              if (query) timer.beginQueryEXT(timer.TIME_ELAPSED_EXT, query);
              draw(programs[index]);
              if (query) timer.endQueryEXT(timer.TIME_ELAPSED_EXT);
              sync();
              wall[index].push(performance.now() - start);
              if (query) queries[index].push(query);
            }
            await new Promise((resolve) => setTimeout(resolve, 0));
          }
          const deadline = performance.now() + 10000;
          while (
            queries
              .flat()
              .some((q) => !timer.getQueryObjectEXT(q, timer.QUERY_RESULT_AVAILABLE_EXT))
          ) {
            if (performance.now() > deadline) throw Error("GPU timing queries did not finish");
            await new Promise((resolve) => setTimeout(resolve, 5));
          }
          const disjoint = timer ? Boolean(gl.getParameter(timer.GPU_DISJOINT_EXT)) : false;
          const measurements = wall.map((values, i) => {
            const useGpu = Boolean(timer) && !disjoint;
            const measured = useGpu
              ? queries[i].map((q) => timer.getQueryObjectEXT(q, timer.QUERY_RESULT_EXT) / 1e6)
              : values;
            return {
              name: programs[i].name,
              timing: useGpu
                ? "EXT_disjoint_timer_query"
                : "one-pixel readback synchronized wall time",
              disjoint,
              medianMs: percentile(measured, 0.5),
              p95Ms: percentile(measured, 0.95),
              samplesMs: measured,
              synchronizedMedianMs: percentile(values, 0.5),
              synchronizedSamplesMs: values,
            };
          });
          const background = rgb(f.style.background).map((v) => Math.round(v * 255));
          let nonBackgroundPixels = 0;
          for (let i = 0; i < pixels[0].length; i += 4)
            if (background.some((v, c) => pixels[0][i + c] !== v)) nonBackgroundPixels++;
          results.push({
            name: f.name,
            level: f.level,
            navigationLevel: f.navigationLevel,
            gridLevels: f.frame.levelCount,
            clearance: f.frame.clearance,
            detail: f.detail,
            scissor: f.visible,
            nonBackgroundPixels,
            measurements,
            speedup: measurements[0].medianMs / measurements[1].medianMs,
            color: compare(pixels[0], pixels[1]),
          });
        }
        const webglError = gl.getError();
        return {
          passed: !webglError && results.every((r) => r.color.changedBytes === 0),
          renderer,
          width,
          height,
          samples,
          warmup,
          raysPerFrame: offsets.length,
          timing:
            "paired GPU timer queries; readback synchronized wall time also reported; compilation and full image readback excluded",
          webglError,
          results,
          images,
        };
      } finally {
        for (const release of owned.reverse()) release();
        gl.getExtension("WEBGL_lose_context")?.loseContext();
      }
    },
    { ...payload, capture: Boolean(captures) },
  );
  if (captures) {
    let url;
    try {
      const downloaded = page.waitForEvent("download");
      url = await page.evaluate((images) => {
        const href = URL.createObjectURL(
          new Blob([JSON.stringify(images)], { type: "application/json" }),
        );
        const link = document.createElement("a");
        link.href = href;
        link.download = "captures.json";
        document.body.appendChild(link);
        link.click();
        link.remove();
        return href;
      }, result.images);
      const download = await downloaded,
        path = `${captures}/captures.json`;
      await download.saveAs(path);
      const failure = await download.failure();
      if (failure) throw Error(failure);
      result.captureBundle = { path, images: result.images.length };
    } catch (error) {
      result.captureError = String(error);
    } finally {
      if (url) await page.evaluate((href) => URL.revokeObjectURL(href), url);
    }
  }
  delete result.images;
  console.log(JSON.stringify(result, null, 2));
  return result;
}
writeFileSync(
  args[1] ?? "/private/tmp/check-voxel-performance.js",
  `async(page)=>await (${check.toString()})(page,${JSON.stringify({ vertex, variants, fixtures, width, height, samples, warmup, offsets: FLIGHT_SAMPLE_OFFSETS.slice(0, rays), projection, gridWidth: MAX_VOXEL_DEPTH })},${JSON.stringify(args[2] ?? null)})`,
);
