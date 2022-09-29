function createProgram(
  gl: WebGLRenderingContext,
  vertexShader: WebGLShader,
  fragmentShader: WebGLShader
) {
  const program = gl.createProgram();
  if (!program) return;

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);

  gl.linkProgram(program);

  const success = gl.getProgramParameter(program, gl.LINK_STATUS);
  if (!success) {
    throw "program failed to link:" + gl.getProgramInfoLog(program);
  }

  return program;
}

function compileShader(
  gl: WebGLRenderingContext,
  shaderSource: string,
  shaderType: number
) {
  const shader = gl.createShader(shaderType);
  if (!shader) return;

  gl.shaderSource(shader, shaderSource);

  gl.compileShader(shader);

  const success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
  if (!success) {
    throw "could not compile shader:" + gl.getShaderInfoLog(shader);
  }

  return shader;
}

export function createShaderProgram(
  gl: WebGLRenderingContext,
  vertSrc: string,
  fragSrc: string
) {
  const vert = compileShader(gl, vertSrc, gl.VERTEX_SHADER);
  const frag = compileShader(gl, fragSrc, gl.FRAGMENT_SHADER);
  if (!vert || !frag) return;

  const program = createProgram(gl, vert, frag);
  if (!program) return;

  return { vert, frag, program };
}
