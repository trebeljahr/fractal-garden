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
const { generateMoselySnowflake } = require("../utils/voxelFractals.ts");
const source = readFileSync(new URL("../utils/shaders/voxel-flight.frag", import.meta.url), "utf8");
const fragment =
  source.slice(0, source.indexOf("\nvoid main() {")) +
  `
uniform vec3 u_testOrigin;
uniform vec3 u_testDirection;
uniform float u_testScale;
void main() {
  float visible = lightVisibility(u_testOrigin, u_testDirection, u_testScale * 0.00001, u_testScale / 3.0);
  gl_FragColor = vec4(vec3(visible), 1.0);
}`;

// Independent finite-box intersections provide the shadow references.
const fixtures = [];
for (const [pattern, variant] of [
  [2, "lighter"],
  [3, "heavier"],
])
  for (const levels of [1, 3]) {
    const cubes = generateMoselySnowflake(levels, variant);
    const origins = Array.from({ length: 8 }, (_, mask) =>
      [0, 1, 2].map((i) => (mask & (1 << i) ? 0.41 : -0.41)),
    );
    if (pattern === 2) origins.push([0, 0, 0]);
    for (const origin of origins)
      for (const raw of [
        [1, 0, 0],
        [-1, 0, 0],
        [0, 1, 0],
        [0, -1, 0],
        [0, 0, 1],
        [0, 0, -1],
        [1, 1, 1],
        [-1, -1, -1],
        [0.8, 0.3, -0.5],
      ]) {
        const direction = raw.map((v) => v / Math.hypot(...raw));
        const blocked = cubes.some((cube) => {
          const low = [cube.x, cube.y, cube.z].map((v) => (v - cube.size / 2) / 2),
            high = low.map((v) => v + cube.size / 2);
          let near = 0,
            far = Infinity;
          for (let i = 0; i < 3; i++) {
            if (Math.abs(direction[i]) < 1e-15) {
              if (origin[i] < low[i] || origin[i] > high[i]) return false;
              continue;
            }
            const a = (low[i] - origin[i]) / direction[i],
              b = (high[i] - origin[i]) / direction[i];
            near = Math.max(near, Math.min(a, b));
            far = Math.min(far, Math.max(a, b));
          }
          return far > near;
        });
        fixtures.push({ pattern, levels, origin, direction, expected: blocked ? 0 : 255 });
      }
  }
async function check(page, fragment, fixtures) {
  return page.evaluate(
    ({ fragment, fixtures }) => {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 1;
      const gl = canvas.getContext("webgl", { antialias: false });
      if (!gl?.getExtension("OES_texture_float")) throw Error("Float WebGL unavailable");
      const compile = (type, src) => {
        const s = gl.createShader(type);
        gl.shaderSource(s, src);
        gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw Error(gl.getShaderInfoLog(s));
        return s;
      };
      const vs = compile(
        gl.VERTEX_SHADER,
        "attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}",
      );
      const fs = compile(gl.FRAGMENT_SHADER, fragment),
        program = gl.createProgram();
      gl.attachShader(program, vs);
      gl.attachShader(program, fs);
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS))
        throw Error(gl.getProgramInfoLog(program));
      gl.useProgram(program);
      const buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      const at = gl.getAttribLocation(program, "p");
      gl.enableVertexAttribArray(at);
      gl.vertexAttribPointer(at, 2, gl.FLOAT, false, 0, 0);
      const tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      const loc = (n) => gl.getUniformLocation(program, n),
        errors = [];
      let cases = 0,
        lit = 0,
        shadowed = 0;
      try {
        for (const unit of [1e-6, 1, 1e6])
          for (const fixture of fixtures) {
            const texture = new Float32Array(256 * 8);
            for (let level = 0; level < fixture.levels; level++)
              texture.set([-unit / 2, -unit / 2, -unit / 2, unit / 3 ** (level + 1)], level * 4);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 256, 2, 0, gl.RGBA, gl.FLOAT, texture);
            gl.uniform1i(loc("u_grid"), 0);
            gl.uniform1i(loc("u_levels"), fixture.levels);
            gl.uniform1i(loc("u_pattern"), fixture.pattern);
            gl.uniform3fv(loc("u_low"), [-unit / 2, -unit / 2, -unit / 2]);
            gl.uniform3fv(loc("u_high"), [unit / 2, unit / 2, unit / 2]);
            gl.uniform1f(loc("u_farDistance"), unit * 96);
            gl.uniform1f(loc("u_testScale"), unit);
            gl.uniform3fv(
              loc("u_testOrigin"),
              fixture.origin.map((v) => v * unit),
            );
            gl.uniform3fv(loc("u_testDirection"), fixture.direction);
            gl.drawArrays(gl.TRIANGLES, 0, 3);
            const pixel = new Uint8Array(4);
            gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
            if (pixel[0] !== fixture.expected) errors.push({ unit, ...fixture, got: pixel[0] });
            cases++;
            if (fixture.expected === 255) lit++;
            else shadowed++;
          }
        // A nearby cell beside an enormous retained ancestor must still cast
        // its shadow. Parallel-axis divisions cannot overflow into NaN.
        for (const axis of [0, 1, 2])
          for (const sign of [-1, 1]) {
            const texture = new Float32Array(256 * 8);
            texture.set([-1e29, -1e29, -1e29, 2e29], 0);
            texture.set([1, 0, 0, 0], 256 * 4);
            texture.set([-0.5, -0.5, -0.5, 1 / 3], 4);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 256, 2, 0, gl.RGBA, gl.FLOAT, texture);
            gl.uniform1i(loc("u_levels"), 2);
            gl.uniform1i(loc("u_pattern"), 2);
            gl.uniform3fv(loc("u_low"), [-1e29, -1e29, -1e29]);
            gl.uniform3fv(loc("u_high"), [1e29, 1e29, 1e29]);
            gl.uniform1f(loc("u_testScale"), 1);
            gl.uniform1f(loc("u_farDistance"), 96);
            const origin = [0.41, 0.41, 0.41],
              direction = [0, 0, 0];
            origin[axis] *= -sign;
            direction[axis] = sign;
            gl.uniform3fv(loc("u_testOrigin"), origin);
            gl.uniform3fv(loc("u_testDirection"), direction);
            gl.drawArrays(gl.TRIANGLES, 0, 3);
            const pixel = new Uint8Array(4);
            gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
            if (pixel[0] !== 0) errors.push({ ancestor: 1e29, axis, sign, got: pixel[0] });
            cases++;
            shadowed++;
          }
        return { passed: errors.length === 0, cases, lit, shadowed, errors };
      } finally {
        gl.deleteTexture(tex);
        gl.deleteBuffer(buffer);
        gl.deleteProgram(program);
        gl.deleteShader(vs);
        gl.deleteShader(fs);
        gl.getExtension("WEBGL_lose_context")?.loseContext();
      }
    },
    { fragment, fixtures },
  );
}
writeFileSync(
  process.argv[2] ?? "/private/tmp/check-voxel-flight-shadows.js",
  `async(page)=>await (${check.toString()})(page,${JSON.stringify(fragment)},${JSON.stringify(fixtures)})`,
);
