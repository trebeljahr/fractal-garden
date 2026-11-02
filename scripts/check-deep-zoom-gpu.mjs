import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

// Generate a Playwright CLI run-code file without launching another browser.
// All expected pixels come from independent fixed-point iterations on the CPU.
const require = createRequire(import.meta.url);
require.extensions[".ts"] = (module, filename) => {
  const { outputText } = ts.transpileModule(readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  module._compile(outputText, filename);
};
const {
  createViewportAtLog,
  numberToFloatExp,
  moveViewport,
  scaleToFloatExp,
} = require("../utils/deepZoom/math.ts");
const { buildApproximation } = require("../utils/deepZoom/approximation.ts");
const { buildReference, sampleEscape } = require("../utils/deepZoom/orbit.ts");
const root = fileURLToPath(new URL("../", import.meta.url));
const read = (path) => readFileSync(resolve(root, path), "utf8");
const vertex = read("utils/shaders/mandelbrot.vert");
const escapeSource = read("utils/shaders/escape-time.frag");
const deep = read("utils/shaders/deep-zoom.frag");
const mainAt = escapeSource.indexOf("void main()");
const coloringAt = deep.indexOf("    bool trapMode");
if (mainAt < 0 || coloringAt < 0)
  throw new Error("Could not locate the production shader boundaries.");
const shared = escapeSource.slice(0, mainAt);
// Preserve production recurrence, rebasing, bailout and glitch detection.
const diagnostic = `${deep.slice(0, coloringAt)}
    gl_FragColor=vec4(mod(iteration,256.0)/255.0,
                      floor(iteration/256.0)/255.0,
                      escaped ? 1.0 : 0.0, 1.0);
}
`;

const definitions = [
  ...[20, 100, 1000].map((digits) => ({
    name: `Mandelbrot antenna 1e-${digits}`,
    formula: "mandelbrot",
    center: [-2, 0],
    digits,
  })),
  {
    name: "Mandelbrot complex preperiodic 1e-30",
    formula: "mandelbrot",
    center: [0, 1],
    digits: 30,
    height: 3,
  },
  { name: "Julia unit circle 1e-1000", formula: "julia", center: [1, 0], digits: 1000 },
  {
    name: "Julia complex contraction 1e-1000",
    formula: "julia",
    center: [1, 0],
    digits: 1000,
    height: 3,
    offsetX: -6,
  },
  {
    name: "Burning Ship folding across axis",
    formula: "burning-ship",
    center: [-1.75, 0],
    digits: 4,
    height: 3,
  },
  { name: "Burning Ship needle 1e-1000", formula: "burning-ship", center: [-2, 0], digits: 1000 },
  {
    name: "Burning Ship complex folds 1e-4",
    formula: "burning-ship",
    center: [-1.76, -0.03],
    digits: 4,
    height: 3,
    exploratory: false,
  },
  { name: "Mandelbar spike tip 1e-100", formula: "mandelbar", center: [-2, 0], digits: 100 },
  {
    name: "Mandelbar body corner 1e-8",
    formula: "mandelbar",
    center: [-0.75, 0],
    digits: 8,
    height: 3,
  },
  {
    name: "Mandelbar turned tip 1e-12",
    formula: "mandelbar",
    center: [1, Math.sqrt(3)],
    digits: 12,
    height: 3,
  },
  { name: "Cactus neck 1e-30", formula: "cactus", center: [0, 0], digits: 30, height: 3 },
  { name: "Cactus left dust 1e-6", formula: "cactus", center: [-1.72, 0], digits: 6, height: 3 },
  { name: "Cactus left tip 1e-12", formula: "cactus", center: [-0.7735, 0], digits: 12, height: 3 },
  { name: "Cactus crown 1e-9", formula: "cactus", center: [0.1, 0.28], digits: 9, height: 3 },
];

const fixtures = definitions.map((definition) => {
  const { name, formula, center, digits, exploratory = false } = definition;
  const width = 5;
  const height = definition.height ?? 1;
  const c = [0, 0];
  const iterations = digits > 4 ? 8192 : 1500;
  const view = moveViewport(
    createViewportAtLog(center, -digits * Math.log2(10)),
    definition.offsetX ?? 0,
    0,
  );
  const referenceStart = performance.now();
  const reference = buildReference(view, formula, c, iterations);
  const approximation = buildApproximation(reference, { logDeltaC: view.logZoom + 4 });
  const referenceMs = performance.now() - referenceStart;
  const oracleStart = performance.now();
  const expected = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dx = (2 * (x + 0.5) - width) / Math.min(width, height);
      const dy =
        ((2 * (y + 0.5) - height) / Math.min(width, height)) *
        (formula === "burning-ship" ? -1 : 1);
      const sample = sampleEscape(view, formula, c, iterations, dx, dy);
      expected.push({ x, y, iteration: sample.iteration, escaped: sample.escaped });
    }
  }
  return {
    name,
    formula,
    width,
    height,
    iterations,
    exploratory,
    scale: scaleToFloatExp(view.logZoom),
    constant: [...numberToFloatExp(c[0]), ...numberToFloatExp(c[1])],
    orbit: [...reference.orbit, ...(reference.critical?.orbit ?? [])],
    criticalStart: reference.length,
    criticalLength: reference.critical?.length ?? 0,
    referenceLength: reference.length,
    approximation: { ...approximation, data: [...approximation.data] },
    expected,
    referenceMs: Math.round(referenceMs * 100) / 100,
    oracleMs: Math.round((performance.now() - oracleStart) * 100) / 100,
  };
});

function checkGpu({ vertex, shared, diagnostic, fixtures }) {
  const canvas = document.createElement("canvas");
  const gl = canvas.getContext("webgl", {
    alpha: true,
    antialias: false,
    premultipliedAlpha: false,
    preserveDrawingBuffer: true,
  });
  if (!gl) throw new Error("WebGL is unavailable.");
  if (!gl.getExtension("OES_texture_float")) throw new Error("Float textures are unavailable.");
  const debug = gl.getExtension("WEBGL_debug_renderer_info");
  const renderer = String(gl.getParameter(debug ? debug.UNMASKED_RENDERER_WEBGL : gl.RENDERER));
  const vendor = String(gl.getParameter(debug ? debug.UNMASKED_VENDOR_WEBGL : gl.VENDOR));
  const programs = new Map();
  const failures = [];
  const results = [];
  const buffer = gl.createBuffer();
  const texture = gl.createTexture();
  const approximationTexture = gl.createTexture();
  if (!buffer || !texture || !approximationTexture) throw new Error("GPU allocation failed.");

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

  function programFor(formula) {
    if (programs.has(formula)) return programs.get(formula);
    const start = performance.now();
    const define = `#define FORMULA_${formula.replace("-", "_").toUpperCase()}\n`;
    const vertexShader = compile(vertex, gl.VERTEX_SHADER);
    const fragmentShader = compile(define + shared + diagnostic, gl.FRAGMENT_SHADER);
    const program = gl.createProgram();
    if (!program) throw new Error("Program allocation failed.");
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const error = gl.getProgramInfoLog(program);
      gl.deleteProgram(program);
      throw new Error(`Shader linking failed: ${error}`);
    }
    const uniforms = Object.fromEntries(
      [
        "resolution",
        "maxIterations",
        "colorMode",
        "interior",
        "reference",
        "referenceSize",
        "referenceLength",
        "criticalStart",
        "criticalLength",
        "deltaCenter",
        "scale",
        "constant",
        "approximation",
        "approximationSize",
        "approximationLogDeltaC",
        "approximationMaxLogRadius",
        "hasApproximation",
      ].map((name) => [name, gl.getUniformLocation(program, `u_${name}`)]),
    );
    const entry = {
      program,
      uniforms,
      compileMs: Math.round((performance.now() - start) * 100) / 100,
    };
    programs.set(formula, entry);
    return entry;
  }

  try {
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    for (const fixture of fixtures) {
      canvas.width = fixture.width;
      canvas.height = fixture.height;
      const { program, uniforms: u } = programFor(fixture.formula);
      // biome-ignore lint/correctness/useHookAtTopLevel: WebGL API
      gl.useProgram(program);
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      const position = gl.getAttribLocation(program, "aPosition");
      gl.enableVertexAttribArray(position);
      gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
      gl.viewport(0, 0, fixture.width, fixture.height);
      gl.disable(gl.BLEND);
      gl.disable(gl.DITHER);
      gl.disable(gl.SCISSOR_TEST);
      const textureWidth = Math.min(1024, gl.getParameter(gl.MAX_TEXTURE_SIZE));
      const textureHeight = Math.ceil(
        (fixture.referenceLength + fixture.criticalLength) / textureWidth,
      );
      const reference = new Float32Array(textureWidth * textureHeight * 4);
      reference.set(fixture.orbit);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        textureWidth,
        textureHeight,
        0,
        gl.RGBA,
        gl.FLOAT,
        reference,
      );
      const approximationHeight = Math.max(
        1,
        Math.ceil((fixture.approximation.length * 5) / textureWidth),
      );
      const approximation = new Float32Array(textureWidth * approximationHeight * 4);
      approximation.set(fixture.approximation.data);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, approximationTexture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        textureWidth,
        approximationHeight,
        0,
        gl.RGBA,
        gl.FLOAT,
        approximation,
      );
      gl.activeTexture(gl.TEXTURE0);
      gl.uniform1i(u.approximation, 1);
      gl.uniform2f(u.approximationSize, textureWidth, approximationHeight);
      gl.uniform1f(u.approximationLogDeltaC, fixture.approximation.logDeltaC);
      let maxLogRadius = -1e6;
      for (let i = 0; i < fixture.approximation.data.length; i += 20) {
        for (const offset of [0, 2]) {
          if (fixture.approximation.data[i + offset + 1] > 1)
            maxLogRadius = Math.max(maxLogRadius, fixture.approximation.data[i + offset]);
        }
      }
      gl.uniform1f(u.approximationMaxLogRadius, maxLogRadius);
      gl.uniform1i(u.hasApproximation, fixture.approximation.maxSkip > 0 ? 1 : 0);
      gl.uniform2f(u.resolution, fixture.width, fixture.height);
      gl.uniform1f(u.maxIterations, fixture.iterations);
      gl.uniform1i(u.colorMode, 0);
      gl.uniform3f(u.interior, 0, 0, 0);
      gl.uniform1i(u.reference, 0);
      gl.uniform2f(u.referenceSize, textureWidth, textureHeight);
      gl.uniform1f(u.referenceLength, fixture.referenceLength);
      gl.uniform1f(u.criticalStart, fixture.criticalStart);
      gl.uniform1f(u.criticalLength, fixture.criticalLength);
      gl.uniform4f(u.deltaCenter, 0, 0, 0, 0);
      gl.uniform2f(u.scale, ...fixture.scale);
      gl.uniform4f(u.constant, ...fixture.constant);
      const start = performance.now();
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      const pixels = new Uint8Array(fixture.width * fixture.height * 4);
      gl.readPixels(0, 0, fixture.width, fixture.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
      const gpuMs = Math.round((performance.now() - start) * 100) / 100;
      const error = gl.getError();
      if (error !== gl.NO_ERROR) throw new Error(`WebGL error ${error} in ${fixture.name}`);
      let valid = 0;
      let matched = 0;
      let glitched = 0;
      const mismatches = [];
      let center;
      for (let i = 0; i < fixture.expected.length; i++) {
        const expected = fixture.expected[i];
        const actual = {
          iteration: pixels[i * 4] + 256 * pixels[i * 4 + 1],
          escaped: pixels[i * 4 + 2] >= 128,
          valid: pixels[i * 4 + 3] >= 128,
        };
        const isCenter =
          expected.x === Math.floor(fixture.width / 2) &&
          expected.y === Math.floor(fixture.height / 2);
        if (isCenter) center = { expected, actual };
        if (!actual.valid) {
          glitched += 1;
          if (isCenter) failures.push(`${fixture.name}: exact center marked as a glitch`);
          continue;
        }
        valid += 1;
        const agrees =
          actual.escaped === expected.escaped &&
          (!expected.escaped || Math.abs(actual.iteration - expected.iteration) <= 2);
        if (agrees) matched += 1;
        else {
          mismatches.push({ x: expected.x, y: expected.y, expected, actual });
          if (!fixture.exploratory || isCenter)
            failures.push(
              `${fixture.name}: pixel (${expected.x},${expected.y}) disagrees with BigInt`,
            );
        }
      }
      const requiredValid = fixture.exploratory ? 1 : Math.ceil(fixture.expected.length * 0.4);
      if (valid < requiredValid)
        failures.push(`${fixture.name}: only ${valid}/${fixture.expected.length} valid pixels`);
      results.push({
        name: fixture.name,
        pixels: fixture.expected.length,
        valid,
        matched,
        glitched,
        gpuMs,
        referenceMs: fixture.referenceMs,
        oracleMs: fixture.oracleMs,
        center,
        ...(mismatches.length ? { mismatches } : {}),
      });
    }
  } finally {
    for (const { program } of programs.values()) gl.deleteProgram(program);
    gl.deleteBuffer(buffer);
    gl.deleteTexture(texture);
    gl.deleteTexture(approximationTexture);
    gl.getExtension("WEBGL_lose_context")?.loseContext();
  }
  return {
    passed: failures.length === 0,
    renderer,
    vendor,
    compileMs: Object.fromEntries(
      [...programs].map(([formula, entry]) => [formula, entry.compileMs]),
    ),
    results,
    failures,
  };
}

const payload = { vertex, shared, diagnostic, fixtures };
const outputPath = resolve(process.argv[2] ?? "/private/tmp/deep-zoom-gpu.js");
const script = `async (page) => {
  const result = await page.evaluate(${checkGpu.toString()}, ${JSON.stringify(payload)});
  console.log(JSON.stringify(result, null, 2));
  if (!result.passed) throw new Error(JSON.stringify(result));
  return result;
}\n`;
writeFileSync(outputPath, script);
console.log(
  JSON.stringify({ outputPath, fixtures: fixtures.length, bytes: Buffer.byteLength(script) }),
);
