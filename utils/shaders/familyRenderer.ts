import { createShaderProgram } from "./compileShader";
import familyShader from "./family-explorer.frag";
import vertexShader from "./mandelbrot.vert";

export type FamilyFrame = {
  rule: number;
  family: boolean;
  center: { real: number; imaginary: number };
  half: number;
  param: { real: number; imaginary: number };
  /** Four samples per pixel, for a picture at rest. */
  sharp: boolean;
};

/** Draws square pictures of a rule with one shader. Returns null if WebGL isn't available. */
export function createFamilyRenderer(canvas: HTMLCanvasElement) {
  const gl = canvas.getContext("webgl", { antialias: false, preserveDrawingBuffer: true });
  if (!gl) return null;
  const output = createShaderProgram(gl, vertexShader, familyShader);
  const buffer = gl.createBuffer();
  if (!output || !buffer) return null;
  const location = (name: string) => gl.getUniformLocation(output.program, name);
  const uniforms = {
    resolution: location("u_resolution"),
    center: location("u_center"),
    half: location("u_half"),
    param: location("u_param"),
    family: location("u_family"),
    rule: location("u_rule"),
    sharp: location("u_sharp"),
  };
  const position = gl.getAttribLocation(output.program, "aPosition");
  return {
    draw(frame: FamilyFrame, size: number) {
      if (canvas.width !== size) canvas.width = size;
      if (canvas.height !== size) canvas.height = size;
      // biome-ignore lint/correctness/useHookAtTopLevel: WebGL API, not a React hook
      gl.useProgram(output.program);
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(position);
      gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
      gl.viewport(0, 0, size, size);
      gl.uniform2f(uniforms.resolution, size, size);
      gl.uniform2f(uniforms.center, frame.center.real, frame.center.imaginary);
      gl.uniform1f(uniforms.half, frame.half);
      gl.uniform2f(uniforms.param, frame.param.real, frame.param.imaginary);
      gl.uniform1f(uniforms.family, frame.family ? 1 : 0);
      gl.uniform1f(uniforms.rule, frame.rule);
      gl.uniform1f(uniforms.sharp, frame.sharp ? 1 : 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
    dispose() {
      gl.deleteBuffer(buffer);
      gl.deleteProgram(output.program);
      gl.deleteShader(output.vert);
      gl.deleteShader(output.frag);
    },
  };
}
