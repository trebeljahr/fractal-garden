import { readFileSync, writeFileSync } from "node:fs";

// Exercise the production relief function with independent box-corner references.
const source = readFileSync(new URL("../utils/shaders/voxel-flight.frag", import.meta.url), "utf8");
const fragment =
  source.slice(0, source.indexOf("\nvoid main() {")) +
  `
uniform float u_checkDepth;
void main() { gl_FragColor = vec4(vec3(depthRelief(u_checkDepth)), 1.0); }
`;
async function check(page, fragment) {
  return page.evaluate((fragment) => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 1;
    const gl = canvas.getContext("webgl", { antialias: false });
    if (!gl) throw Error("WebGL unavailable");
    const compile = (type, source) => {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
        throw Error(gl.getShaderInfoLog(shader));
      return shader;
    };
    const vert = compile(
      gl.VERTEX_SHADER,
      "attribute vec2 p; void main(){gl_Position=vec4(p,0.,1.);}",
    );
    const frag = compile(gl.FRAGMENT_SHADER, fragment);
    const program = gl.createProgram();
    gl.attachShader(program, vert);
    gl.attachShader(program, frag);
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
    const uniform = (name) => gl.getUniformLocation(program, name);
    const dot = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);
    const errors = [];
    let cases = 0;
    try {
      for (const direction of [
        [0, 0, -1],
        [1, 0, 0],
        [0, -1, 0],
        [1, 2, -3],
      ]) {
        const length = Math.hypot(...direction),
          forward = direction.map((x) => x / length);
        for (const unit of [1e-6, 1, 1e6])
          for (const outside of [false, true]) {
            const center = outside ? forward.map((x) => x * 3 * unit) : [0, 0, 0];
            const low = center.map((x) => x - unit),
              high = center.map((x) => x + unit);
            // Minimum dot product over eight actual corners, independent of shader center/extent math.
            const front = Math.max(
              0,
              Math.min(
                ...Array.from({ length: 8 }, (_, mask) =>
                  dot(
                    low.map((v, i) => (mask & (1 << i) ? high[i] : v)),
                    forward,
                  ),
                ),
              ),
            );
            gl.uniform3fv(uniform("u_low"), low);
            gl.uniform3fv(uniform("u_high"), high);
            gl.uniform3fv(uniform("u_forward"), forward);
            gl.uniform1f(uniform("u_fogDistanceScale"), 1 / (96 * unit));
            let previous = 1;
            for (const depth of [0, 0.25, 1, 2, 8, 100]) {
              gl.uniform1f(uniform("u_checkDepth"), front + depth * unit);
              gl.drawArrays(gl.TRIANGLES, 0, 3);
              const pixel = new Uint8Array(4);
              gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
              const got = pixel[0] / 255,
                expected = 0.55 + 0.45 * Math.exp(-0.9 * depth);
              if (Math.abs(got - expected) > 1.5 / 255 || got > previous + 1 / 255)
                errors.push({ forward, unit, outside, depth, got, expected });
              previous = got;
              cases++;
            }
          }
      }
      // A nearby root plane beside enormous ancestors must not cancel to zero.
      for (let axis = 0; axis < 3; axis++)
        for (const sign of [-1, 1]) {
          const forward = [0, 0, 0];
          forward[axis] = sign;
          const low = [-1e29, -1e29, -1e29],
            high = [1e29, 1e29, 1e29];
          if (sign > 0) low[axis] = 0.001;
          else high[axis] = -0.001;
          gl.uniform3fv(uniform("u_low"), low);
          gl.uniform3fv(uniform("u_high"), high);
          gl.uniform3fv(uniform("u_forward"), forward);
          gl.uniform1f(uniform("u_fogDistanceScale"), 1 / 96e-6);
          for (const depth of [0, 0.25, 1, 2]) {
            gl.uniform1f(uniform("u_checkDepth"), 0.001 + depth * 1e-6);
            gl.drawArrays(gl.TRIANGLES, 0, 3);
            const pixel = new Uint8Array(4);
            gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
            const got = pixel[0] / 255,
              expected = 0.55 + 0.45 * Math.exp(-0.9 * depth);
            if (Math.abs(got - expected) > 1.5 / 255)
              errors.push({ axis, sign, depth, got, expected });
            cases++;
          }
        }
      return { passed: errors.length === 0, cases, errors };
    } finally {
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vert);
      gl.deleteShader(frag);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    }
  }, fragment);
}
writeFileSync(
  process.argv[2] ?? "/private/tmp/check-flight-depth-lighting.js",
  `async(page)=>await (${check.toString()})(page,${JSON.stringify(fragment)})`,
);
