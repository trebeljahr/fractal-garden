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
const {
  buildGridFrame,
  initialFlightCamera,
  flightBasis,
  PATTERNS,
} = require("../utils/voxelZoom/camera.ts");
const {
  generateMengerSponge,
  generateVicsekFractal3D,
  generateMoselySnowflake,
} = require("../utils/voxelFractals.ts");
const generators = [
  generateMengerSponge,
  generateVicsekFractal3D,
  (n) => generateMoselySnowflake(n, "lighter"),
  (n) => generateMoselySnowflake(n, "heavier"),
];
const vertex = readFileSync(new URL("../utils/shaders/mandelbrot.vert", import.meta.url), "utf8");
const fragment = readFileSync(
  new URL("../utils/shaders/voxel-flight.frag", import.meta.url),
  "utf8",
).replace(
  "gl_FragColor = vec4(color, 1.0);",
  `float code=floor(t*100000.0+0.5); gl_FragColor=vec4(mod(code,256.0)/255.0,mod(floor(code/256.0),256.0)/255.0,floor(code/65536.0)/255.0,hit?1.0:(t<far && far>max(0.0,near)?0.5:0.0));`,
);
function intersect(low, high, ray) {
  let near = 0,
    far = Infinity;
  for (let i = 0; i < 3; i++) {
    if (Math.abs(ray[i]) < 1e-15) {
      if (low[i] > 0 || high[i] < 0) return null;
      continue;
    }
    const a = low[i] / ray[i],
      b = high[i] / ray[i];
    near = Math.max(near, Math.min(a, b));
    far = Math.min(far, Math.max(a, b));
  }
  return far > near ? near : null;
}
const fixtures = [];
PATTERNS.forEach((pattern, index) => {
  const camera = initialFlightCamera(),
    frame = buildGridFrame(camera, pattern, 3),
    basis = flightBasis(camera),
    cubes = generators[index](3);
  const expected = [];
  for (const y of [12, 19, 26, 32, 38, 45, 52])
    for (const x of [12, 19, 26, 32, 38, 45, 52]) {
      const uv = [(2 * (x + 0.5) - 65) / 65, (2 * (y + 0.5) - 65) / 65];
      const d = basis.forward.map(
        (v, i) => v + 0.58 * (uv[0] * basis.right[i] + uv[1] * basis.up[i]),
      );
      const len = Math.hypot(...d),
        ray = d.map((v) => v / len);
      let distance = Infinity;
      for (const cube of cubes) {
        const low = [cube.x, cube.y, cube.z].map(
            (v, i) => (v - cube.size / 2 - (i === 2 ? 3.2 : 0)) / 2,
          ),
          high = low.map((v) => v + cube.size / 2);
        const t = intersect(low, high, ray);
        if (t !== null) distance = Math.min(distance, t);
      }
      expected.push({
        x,
        y,
        hit: Number.isFinite(distance),
        distance: Number.isFinite(distance) ? distance : null,
      });
    }
  fixtures.push({
    name: pattern,
    pattern: index,
    frame: { ...frame, texture: Array.from(frame.texture) },
    basis,
    expected,
  });
});
for (const [name, pattern, index, position, yaw, pitch] of [
  ["Menger corner at 3^-150", "menger", 0, [1, 1, 1], -Math.PI / 4, -Math.asin(1 / Math.sqrt(3))],
  ["Vicsek face at 3^-150", "vicsek", 1, [1, 0, 0], -Math.PI / 2, 0],
]) {
  const one = 1n << 600n,
    offset = (one * 2n) / (3n ** 150n * 100n),
    camera = {
      position: position.map((v) => BigInt(v) * one + (v === 1 ? offset : 0n)),
      bits: 600,
      level: 150,
      yaw,
      pitch,
    };
  const frame = buildGridFrame(camera, pattern),
    basis = flightBasis(camera);
  fixtures.push({
    name,
    pattern: index,
    frame: { ...frame, texture: Array.from(frame.texture) },
    basis,
    expected: [
      { x: 32, y: 32, hit: true, distance: pattern === "menger" ? 0.01 * Math.sqrt(3) : 0.01 },
    ],
  });
}
// The same front-facing sponge, nested 150 times in the retained +++ corner.
// Rays which hit the standalone copy must hit at the same local distance.
{
  const one = 1n << 600n,
    scale = 3n ** 150n;
  const camera = {
    position: [one - one / scale, one - one / scale, one + (one * 22n) / (10n * scale)],
    bits: 600,
    level: 150,
    yaw: 0,
    pitch: 0,
  };
  const frame = buildGridFrame(camera, "menger", 153);
  fixtures.push({
    name: "Menger nested copy at 3^-150",
    pattern: 0,
    frame: { ...frame, texture: Array.from(frame.texture) },
    basis: flightBasis(camera),
    expected: fixtures[0].expected.filter((ray) => ray.hit),
  });
}
// Distance culling must stop rays before a remote root box, for every rule.
for (const fixture of fixtures.slice(0, 4)) {
  fixtures.push({
    ...fixture,
    name: `${fixture.name} beyond fog range`,
    viewDistance: 0.25,
    expected: fixture.expected.map((ray) => ({ ...ray, hit: false, distance: null })),
  });
}
async function check(payload) {
  const canvas = document.createElement("canvas");
  canvas.width = 65;
  canvas.height = 65;
  document.body.append(canvas);
  const gl = canvas.getContext("webgl", { preserveDrawingBuffer: true });
  if (!gl?.getExtension("OES_texture_float")) throw Error("Float WebGL unavailable");
  const compile = (source, type) => {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw Error(gl.getShaderInfoLog(shader));
    return shader;
  };
  const vert = compile(payload.vertex, gl.VERTEX_SHADER),
    frag = compile(payload.fragment, gl.FRAGMENT_SHADER),
    program = gl.createProgram();
  gl.attachShader(program, vert);
  gl.attachShader(program, frag);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw Error(gl.getProgramInfoLog(program));
  // biome-ignore lint/correctness/useHookAtTopLevel: WebGL API
  gl.useProgram(program);
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const a = gl.getAttribLocation(program, "aPosition");
  gl.enableVertexAttribArray(a);
  gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0);
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  for (const p of [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER])
    gl.texParameteri(gl.TEXTURE_2D, p, gl.NEAREST);
  for (const p of [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T])
    gl.texParameteri(gl.TEXTURE_2D, p, gl.CLAMP_TO_EDGE);
  const u = (name) => gl.getUniformLocation(program, "u_" + name);
  gl.uniform2f(u("resolution"), 65, 65);
  gl.uniform1i(u("grid"), 0);
  gl.viewport(0, 0, 65, 65);
  const results = [];
  try {
    for (const fixture of payload.fixtures) {
      const { frame, basis } = fixture;
      gl.uniform1f(u("viewDistance"), fixture.viewDistance ?? 512);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        256,
        2,
        0,
        gl.RGBA,
        gl.FLOAT,
        new Float32Array(frame.texture),
      );
      gl.uniform1i(u("levels"), frame.levels.length);
      gl.uniform1i(u("pattern"), fixture.pattern);
      for (const name of ["low", "high"]) gl.uniform3f(u(name), ...frame[name]);
      for (const name of ["right", "up", "forward"]) gl.uniform3f(u(name), ...basis[name]);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      const pixels = new Uint8Array(65 * 65 * 4);
      gl.readPixels(0, 0, 65, 65, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
      const mismatches = [];
      for (const expected of fixture.expected) {
        const offset = (expected.y * 65 + expected.x) * 4,
          hit = pixels[offset + 3] === 255,
          distance =
            (pixels[offset] + 256 * pixels[offset + 1] + 65536 * pixels[offset + 2]) / 100000;
        if (hit !== expected.hit || (hit && Math.abs(distance - expected.distance) > 0.002))
          mismatches.push({ ...expected, actual: { hit, distance } });
      }
      let exhausted = 0,
        asymmetric = 0;
      for (let y = 0; y < 65; y++)
        for (let x = 0; x < 65; x++) {
          const alpha = pixels[(y * 65 + x) * 4 + 3];
          if (alpha === 128) exhausted++;
          if (fixture.name === "menger" && alpha !== pixels[(y * 65 + 64 - x) * 4 + 3])
            asymmetric++;
        }
      results.push({
        exhausted,
        asymmetric,
        name: fixture.name,
        rays: fixture.expected.length,
        levels: frame.levels.length,
        mismatches,
      });
    }
    return {
      passed: results.every(
        (r) => r.mismatches.length === 0 && r.exhausted === 0 && r.asymmetric === 0,
      ),
      results,
    };
  } finally {
    gl.deleteTexture(texture);
    gl.deleteBuffer(buffer);
    gl.deleteProgram(program);
    gl.deleteShader(vert);
    gl.deleteShader(frag);
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    canvas.remove();
  }
}
writeFileSync(
  process.argv[2] ?? "/private/tmp/check-voxel-flight-gpu.js",
  `async(page)=>await page.evaluate(${check.toString()},${JSON.stringify({ vertex, fragment, fixtures })})`,
);
