import { readFileSync, writeFileSync } from "node:fs";

// Exercise the complete production fragment, including material application.
// Helper-only illumination checks cannot catch a missing display conversion.
const fragment = readFileSync(
  new URL("../utils/shaders/voxel-flight.frag", import.meta.url),
  "utf8",
);

async function check(page, fragment) {
  return page.evaluate((fragment) => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 1;
    const gl = canvas.getContext("webgl", { antialias: false });
    if (!gl?.getExtension("OES_texture_float")) throw Error("Float WebGL unavailable");
    const compile = (type, source) => {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
        throw Error(gl.getShaderInfoLog(shader));
      return shader;
    };
    const vertex = compile(
      gl.VERTEX_SHADER,
      "attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}",
    );
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      256,
      2,
      0,
      gl.RGBA,
      gl.FLOAT,
      new Float32Array(256 * 8),
    );
    const key = [-0.35, 0.85, 0.39];
    const keyLength = Math.hypot(...key);
    const fillDirection = [0.7, -0.45, -0.2];
    const fillLength = Math.hypot(...fillDirection);
    const fill = [0.38, 0.72, 0.59];
    const stroke = [0.81, 0.43, 0.26];
    const patterns = ["menger", "vicsek", "mosely-light", "mosely-heavy"];
    const errors = [];
    let cases = 0;
    try {
      for (let pattern = 0; pattern < patterns.length; pattern++) {
        const shader = compile(
          gl.FRAGMENT_SHADER,
          fragment.replace("uniform int u_pattern;", `const int u_pattern = ${pattern};`),
        );
        const program = gl.createProgram();
        gl.attachShader(program, vertex);
        gl.attachShader(program, shader);
        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS))
          throw Error(gl.getProgramInfoLog(program));
        try {
          // biome-ignore lint/correctness/useHookAtTopLevel: WebGL API
          gl.useProgram(program);
          const position = gl.getAttribLocation(program, "p");
          gl.enableVertexAttribArray(position);
          gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
          const at = (name) => gl.getUniformLocation(program, `u_${name}`);
          gl.uniform1i(at("grid"), 0);
          gl.uniform1i(at("levels"), 0);
          gl.uniform1i(at("faces"), 1);
          gl.uniform1i(at("lighting"), 1);
          gl.uniform1i(at("aoMode"), 0);
          gl.uniform1f(at("viewSide"), 1);
          gl.uniform1f(at("projection"), 0.58);
          gl.uniform1f(at("pixelAngle"), 0.001);
          gl.uniform1f(at("nearFootprint"), 0.0001);
          gl.uniform1f(at("detailScale"), 1);
          gl.uniform1f(at("farDistance"), 96);
          gl.uniform1f(at("fogDistanceScale"), 1 / 96);
          gl.uniform1f(at("fogStart"), 0.9);
          gl.uniform1f(at("fogDensity"), 4);
          gl.uniform1f(at("reliefFront"), 0.25);
          gl.uniform1f(at("lineWidth"), 1);
          gl.uniform2f(at("sampleOffset"), 0, 0);
          gl.uniform3fv(at("background"), [0.03, 0.04, 0.05]);
          gl.uniform3fv(at("stroke"), stroke);
          for (let axis = 0; axis < 3; axis++)
            for (const sign of [-1, 1])
              for (const distance of [1, 4]) {
                // A finite cube sits directly beyond the selected entry face.
                // Its entry distance and normal follow from its bounds alone.
                const ray = [0, 0, 0];
                ray[axis] = -sign;
                const center = ray.map((v) => v * (distance + 0.5));
                gl.uniform3fv(
                  at("low"),
                  center.map((v) => v - 0.5),
                );
                gl.uniform3fv(
                  at("high"),
                  center.map((v) => v + 0.5),
                );
                const tangent = [0, 0, 0];
                tangent[(axis + 1) % 3] = 1;
                const up = [
                  tangent[1] * ray[2] - tangent[2] * ray[1],
                  tangent[2] * ray[0] - tangent[0] * ray[2],
                  tangent[0] * ray[1] - tangent[1] * ray[0],
                ];
                const skyWeight = axis === 1 ? (sign + 1) / 2 : 0.5;
                const direct = Math.max(0, (sign * key[axis]) / keyLength);
                const fillLight = Math.max(0, (sign * fillDirection[axis]) / fillLength);
                const relief = 0.55 + 0.45 * Math.exp(-0.9 * (distance - 0.25));
                const energy = [0.27, 0.3, 0.36].map((lower, channel) => {
                  const upper = [0.36, 0.36, 0.33][channel];
                  const ambient = lower * (1 - skyWeight) + upper * skyWeight;
                  return (
                    Math.min(
                      1,
                      ambient + 0.3 * fillLight + 0.82 * direct * [1.04, 1, 0.94][channel],
                    ) * relief
                  );
                });
                // Decode the material first, multiply physical light, then
                // encode the result. The oracle never uses the shader helpers.
                const illuminate = (color) =>
                  color.map((v, channel) => (v ** 2.2 * energy[channel]) ** (1 / 2.2));
                const tint = pattern >= 2 && axis === 0 ? 0.78 : 1;
                const faceColor = illuminate(fill.map((v) => v * tint));
                const edgeColor = illuminate(stroke);
                for (const angle of [-0.35, 0, 0.35]) {
                  // Move this same physical ray to either side of the view.
                  gl.uniform3fv(
                    at("forward"),
                    ray.map((v, i) => v * Math.cos(angle) + tangent[i] * Math.sin(angle)),
                  );
                  gl.uniform3fv(
                    at("right"),
                    tangent.map((v, i) => v * Math.cos(angle) - ray[i] * Math.sin(angle)),
                  );
                  gl.uniform3fv(at("up"), up);
                  gl.uniform2f(at("viewCenter"), 0.5 + Math.tan(angle) / (2 * 0.58), 0.5);
                  for (const style of ["face", "stroke"]) {
                    // With no subdivisions the root fixture has full outline
                    // coverage. Black fill isolates its 18% stroke contribution.
                    gl.uniform3fv(at("fill"), style === "face" ? fill : [0, 0, 0]);
                    gl.uniform1i(at("wire"), style === "stroke" ? 1 : 0);
                    const expected = style === "face" ? faceColor : edgeColor.map((v) => v * 0.18);
                    gl.drawArrays(gl.TRIANGLES, 0, 3);
                    const pixel = new Uint8Array(4);
                    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
                    const got = Array.from(pixel.slice(0, 3), (v) => v / 255);
                    if (
                      pixel[3] !== 255 ||
                      got.some((v, i) => Math.abs(v - expected[i]) > 1.5 / 255)
                    )
                      errors.push({
                        pattern: patterns[pattern],
                        axis,
                        sign,
                        distance,
                        angle,
                        style,
                        expected,
                        got,
                      });
                    cases++;
                  }
                }
              }
        } finally {
          gl.deleteProgram(program);
          gl.deleteShader(shader);
        }
      }
      return { passed: errors.length === 0, cases, errors };
    } finally {
      gl.deleteTexture(texture);
      gl.deleteBuffer(buffer);
      gl.deleteShader(vertex);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    }
  }, fragment);
}

writeFileSync(
  process.argv[2] ?? "/private/tmp/check-voxel-flight-color.js",
  `async(page)=>await (${check.toString()})(page,${JSON.stringify(fragment)})`,
);
