import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import ts from "typescript";

const require = createRequire(import.meta.url);
require.extensions[".ts"] = (module, filename) =>
  module._compile(
    ts.transpileModule(readFileSync(filename, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText,
    filename,
  );
const { buildGridFrame, flightBasis } = require("../utils/voxelZoom/camera.ts");
const { flightAtmosphere } = require("../utils/voxelZoom/atmosphere.ts");
const { flightDetailDepth, flightResolution } = require("../utils/voxelZoom/resolution.ts");
const root = new URL("../", import.meta.url);
const vertex = readFileSync(new URL("../utils/shaders/mandelbrot.vert", import.meta.url), "utf8");
const current = readFileSync(
  new URL("../utils/shaders/voxel-flight.frag", import.meta.url),
  "utf8",
);
// node scripts/check-voxel-flight-traversal.mjs /private/tmp/check-traversal.js <baseline-ref>
const baseline = execFileSync(
  "git",
  ["show", `${process.argv[3] ?? "HEAD"}:utils/shaders/voxel-flight.frag`],
  { cwd: root, encoding: "utf8" },
);
const instrument = (source) =>
  source
    .replace(
      "precision highp float;",
      "precision highp float; uniform int u_checkMode; float lookupCount = 0.0;",
    )
    .replaceAll("vec4 grid = texture2D", "lookupCount += 1.0; vec4 grid = texture2D")
    .replace(
      "gl_FragColor = vec4(color, 1.0);",
      `if (u_checkMode == 0) gl_FragColor = vec4(color, 1.0);
       else {
         float code = u_checkMode == 1 ? lookupCount : floor(t / u_farDistance * 1000000.0 + 0.5);
         gl_FragColor = vec4(mod(code, 256.0) / 255.0, mod(floor(code / 256.0), 256.0) / 255.0,
           floor(code / 65536.0) / 255.0, hit ? 1.0 : 0.0);
       }`,
    );
const width = 256;
const height = 160;
const fixtures = [];
for (const level of [0, 150])
  for (const [pattern, patternIndex, parent, hole] of [
    ["mosely-light", 2, [1, 0, 0], [1, 1, 1]],
    ["mosely-heavy", 3, [1, 1, 1], [0, 0, 0]],
  ]) {
    const one = 1n << 600n;
    const depth = level + 3;
    const denominator = 3n ** BigInt(depth);
    const position = parent.map((digit, axis) => {
      let address = 0n;
      for (let i = 1; i < depth; i++) address = address * 3n + BigInt(digit);
      address = address * 3n + BigInt(hole[axis]);
      return (
        ((address * 200n + BigInt([186, 108, 74][axis]) - denominator * 100n) * one) /
        (denominator * 100n)
      );
    });
    const camera = { position, bits: 600, level, viewLevel: level, yaw: 0.63, pitch: 0.27 };
    const atmosphere = flightAtmosphere(level, level);
    const frame = buildGridFrame(camera, pattern, flightDetailDepth(level), atmosphere.farDistance);
    fixtures.push({
      name: `${pattern} interior at level ${level}`,
      pattern: patternIndex,
      frame: { ...frame, texture: Array.from(frame.texture) },
      basis: flightBasis(camera),
      atmosphere,
      detail: flightResolution(frame.clearance, width, height, level, level),
    });
  }

async function check(payload) {
  const canvas = document.createElement("canvas");
  canvas.width = payload.width;
  canvas.height = payload.height;
  const gl = canvas.getContext("webgl", { preserveDrawingBuffer: true, antialias: false });
  if (!gl?.getExtension("OES_texture_float")) throw Error("Float WebGL unavailable");
  const shaders = [];
  const programs = [];
  const compile = (source, type) => {
    const shader = gl.createShader(type);
    shaders.push(shader);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw Error(gl.getShaderInfoLog(shader));
    return shader;
  };
  const vertex = compile(payload.vertex, gl.VERTEX_SHADER);
  for (const source of payload.fragments) {
    const program = gl.createProgram();
    programs.push(program);
    gl.attachShader(program, vertex);
    gl.attachShader(program, compile(source, gl.FRAGMENT_SHADER));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS))
      throw Error(gl.getProgramInfoLog(program));
  }
  const buffer = gl.createBuffer();
  const texture = gl.createTexture();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  for (const name of [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER])
    gl.texParameteri(gl.TEXTURE_2D, name, gl.NEAREST);
  for (const name of [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T])
    gl.texParameteri(gl.TEXTURE_2D, name, gl.CLAMP_TO_EDGE);
  gl.viewport(0, 0, canvas.width, canvas.height);
  const decode = (pixels, at) => pixels[at] + pixels[at + 1] * 256 + pixels[at + 2] * 65536;
  const results = [];
  try {
    for (const fixture of payload.fixtures) {
      const outputs = [];
      for (const program of programs) {
        // biome-ignore lint/correctness/useHookAtTopLevel: WebGL API
        gl.useProgram(program);
        const attribute = gl.getAttribLocation(program, "aPosition");
        gl.enableVertexAttribArray(attribute);
        gl.vertexAttribPointer(attribute, 2, gl.FLOAT, false, 0, 0);
        const u = (name) => gl.getUniformLocation(program, `u_${name}`);
        gl.uniform2f(u("resolution"), canvas.width, canvas.height);
        for (const [name, value] of Object.entries({ ...fixture.atmosphere, ...fixture.detail }))
          gl.uniform1f(u(name), value);
        gl.uniform1i(u("grid"), 0);
        gl.uniform1i(u("levels"), fixture.frame.levels.length);
        gl.uniform1i(u("pattern"), fixture.pattern);
        gl.uniform1i(u("faces"), 1);
        gl.uniform1i(u("wire"), 1);
        gl.uniform1f(u("lineWidth"), 1);
        gl.uniform3f(u("fill"), 0.8, 0.6, 0.4);
        gl.uniform3f(u("stroke"), 0.1, 0.15, 0.2);
        gl.uniform3f(u("background"), 0.02, 0.03, 0.04);
        for (const name of ["low", "high"]) gl.uniform3f(u(name), ...fixture.frame[name]);
        for (const name of ["forward", "right", "up"])
          gl.uniform3f(u(name), ...fixture.basis[name]);
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
        const output = { pixels: [], timings: [] };
        for (const mode of [0, 1, 2]) {
          gl.uniform1i(u("checkMode"), mode);
          gl.drawArrays(gl.TRIANGLES, 0, 3);
          const pixels = new Uint8Array(canvas.width * canvas.height * 4);
          gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
          output.pixels.push(pixels);
        }
        gl.uniform1i(u("checkMode"), 0);
        for (let repeat = 0; repeat < 4; repeat++) {
          const start = performance.now();
          gl.drawArrays(gl.TRIANGLES, 0, 3);
          gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
          if (repeat > 0) output.timings.push(performance.now() - start);
        }
        outputs.push(output);
      }
      const [before, after] = outputs;
      let hitMismatches = 0;
      let maxDistanceError = 0;
      let maxColorDifference = 0;
      let beforeLookups = 0;
      let afterLookups = 0;
      for (let at = 0; at < before.pixels[0].length; at += 4) {
        beforeLookups += decode(before.pixels[1], at);
        afterLookups += decode(after.pixels[1], at);
        if (before.pixels[2][at + 3] !== after.pixels[2][at + 3]) hitMismatches++;
        if (before.pixels[2][at + 3])
          maxDistanceError = Math.max(
            maxDistanceError,
            (Math.abs(decode(before.pixels[2], at) - decode(after.pixels[2], at)) *
              fixture.atmosphere.farDistance) /
              1000000,
          );
        for (let channel = 0; channel < 3; channel++)
          maxColorDifference = Math.max(
            maxColorDifference,
            Math.abs(before.pixels[0][at + channel] - after.pixels[0][at + channel]),
          );
      }
      results.push({
        name: fixture.name,
        beforeLookups,
        afterLookups,
        lookupReduction: 1 - afterLookups / beforeLookups,
        beforeMs: before.timings,
        afterMs: after.timings,
        hitMismatches,
        maxDistanceError,
        maxColorDifference,
      });
    }
    return {
      passed: results.every(
        (r) =>
          r.hitMismatches === 0 &&
          r.maxDistanceError < 0.0001 &&
          r.maxColorDifference <= 2 &&
          r.afterLookups <= r.beforeLookups,
      ),
      results,
    };
  } finally {
    gl.deleteTexture(texture);
    gl.deleteBuffer(buffer);
    for (const program of programs) gl.deleteProgram(program);
    for (const shader of shaders) gl.deleteShader(shader);
    gl.getExtension("WEBGL_lose_context")?.loseContext();
  }
}

writeFileSync(
  process.argv[2] ?? "/private/tmp/check-voxel-flight-traversal.js",
  `async(page)=>await page.evaluate(${check.toString()},${JSON.stringify({
    vertex,
    fragments: [instrument(baseline), instrument(current)],
    fixtures,
    width,
    height,
  })})`,
);
