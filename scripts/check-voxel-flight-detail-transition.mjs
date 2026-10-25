import { readFileSync, writeFileSync } from "node:fs";

const source = readFileSync(new URL("../utils/shaders/voxel-flight.frag", import.meta.url), "utf8");
const fragment =
  source.slice(0, source.indexOf("\nvoid main() {")) +
  `
uniform vec3 u_testDigit;
uniform float u_testFootprint;
uniform int u_testMode;
uniform vec3 u_testNormal;
uniform float u_testDistance;
void main() {
  if (u_testMode == 2) {
    gl_FragColor = vec4(depthIllumination(u_testNormal, 0.7, 0.8, u_testDistance), 1.0);
  } else {
    vec3 low, high;
    holeBounds(vec3(0.0), u_testDigit, 1.0, u_testFootprint, low, high);
    gl_FragColor = vec4(u_testMode == 0 ? low : high, 1.0);
  }
}`;
async function check(page, fragment) {
  return page.evaluate((fragment) => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 1;
    const gl = canvas.getContext("webgl", { antialias: false });
    if (!gl) throw Error("WebGL unavailable");
    const compile = (type, source) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, source);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw Error(gl.getShaderInfoLog(s));
      return s;
    };
    const vs = compile(
        gl.VERTEX_SHADER,
        "attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}",
      ),
      fs = compile(gl.FRAGMENT_SHADER, fragment),
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
    const p = gl.getAttribLocation(program, "p");
    gl.enableVertexAttribArray(p);
    gl.vertexAttribPointer(p, 2, gl.FLOAT, false, 0, 0);
    const at = (n) => gl.getUniformLocation(program, n),
      errors = [];
    let cases = 0;
    const read = () => {
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      const pixel = new Uint8Array(4);
      gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
      return Array.from(pixel.slice(0, 3), (v) => v / 255);
    };
    try {
      for (let x = 0; x < 3; x++)
        for (let y = 0; y < 3; y++)
          for (let z = 0; z < 3; z++) {
            const digit = [x, y, z];
            gl.uniform3fv(at("u_testDigit"), digit);
            let previousLow = digit.map((v) => v / 2),
              previousHigh = previousLow;
            for (let step = 0; step <= 100; step++) {
              const ratio = 0.8 + step * 0.024;
              gl.uniform1f(at("u_testFootprint"), 1 / ratio);
              gl.uniform1i(at("u_testMode"), 0);
              const low = read();
              gl.uniform1i(at("u_testMode"), 1);
              const high = read();
              const t = Math.max(0, Math.min(1, (ratio - 1) / 2)),
                reveal = t * t * (3 - 2 * t);
              for (let i = 0; i < 3; i++) {
                const expectedLow = ((1 - reveal) * digit[i]) / 2,
                  expectedHigh = expectedLow + reveal;
                if (
                  Math.abs(low[i] - expectedLow) > 1.5 / 255 ||
                  Math.abs(high[i] - expectedHigh) > 1.5 / 255 ||
                  low[i] > previousLow[i] + 1 / 255 ||
                  high[i] < previousHigh[i] - 1 / 255 ||
                  Math.abs(low[i] - previousLow[i]) > 0.03 ||
                  Math.abs(high[i] - previousHigh[i]) > 0.03
                )
                  errors.push({
                    digit,
                    ratio,
                    axis: i,
                    low: low[i],
                    high: high[i],
                    expectedLow,
                    expectedHigh,
                  });
              }
              previousLow = low;
              previousHigh = high;
              cases++;
            }
          }
      gl.uniform1i(at("u_testMode"), 2);
      gl.uniform1f(at("u_reliefFront"), 0.25);
      gl.uniform1f(at("u_fogDistanceScale"), 1 / 96);
      gl.uniform1f(at("u_testDistance"), 0.8);
      const light = [-0.35, 0.85, 0.39],
        length = Math.hypot(...light);
      for (let i = 0; i < 3; i++) light[i] /= length;
      const relief = 0.55 + 0.45 * Math.exp(-0.9 * (0.8 - 0.25));
      for (let axis = 0; axis < 3; axis++)
        for (const sign of [-1, 1]) {
          const normal = [0, 0, 0];
          normal[axis] = sign;
          gl.uniform3fv(at("u_testNormal"), normal);
          const mix = 0.5 + 0.5 * normal[1],
            ambient = [0.27, 0.3, 0.36].map((v, i) => v * (1 - mix) + [0.36, 0.36, 0.33][i] * mix);
          const expected = ambient.map(
            (v, i) =>
              Math.min(
                1,
                v * 0.8 + 0.82 * Math.max(0, sign * light[axis]) * 0.7 * [1.04, 1, 0.94][i],
              ) * relief,
          );
          let reference;
          for (let turn = 0; turn < 24; turn++) {
            // Same physical point and normal, different view orientations.
            const yaw = turn * 0.37,
              pitch = Math.sin(turn * 0.53);
            gl.uniform3fv(at("u_forward"), [
              Math.sin(yaw) * Math.cos(pitch),
              Math.sin(pitch),
              -Math.cos(yaw) * Math.cos(pitch),
            ]);
            gl.uniform3fv(at("u_up"), [
              -Math.sin(yaw) * Math.sin(pitch),
              Math.cos(pitch),
              Math.cos(yaw) * Math.sin(pitch),
            ]);
            const got = read();
            if (
              got.some((v, i) => Math.abs(v - expected[i]) > 1.5 / 255) ||
              (reference && got.some((v, i) => v !== reference[i]))
            )
              errors.push({ axis, sign, turn, expected, got });
            reference = got;
            cases++;
          }
        }
      return { passed: errors.length === 0, cases, errors };
    } finally {
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    }
  }, fragment);
}
writeFileSync(
  process.argv[2] ?? "/private/tmp/check-voxel-flight-detail-transition.js",
  `async(page)=>await (${check.toString()})(page,${JSON.stringify(fragment)})`,
);
