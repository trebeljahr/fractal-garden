function createProgram(
  gl: WebGLRenderingContext,
  vertexShader: WebGLShader,
  fragmentShader: WebGLShader,
) {
  const program = gl.createProgram();
  if (!program) return;

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);

  gl.linkProgram(program);

  const success = gl.getProgramParameter(program, gl.LINK_STATUS);
  if (!success) {
    const message = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    throw new Error("Program failed to link: " + message);
  }

  return program;
}

function compileShader(gl: WebGLRenderingContext, shaderSource: string, shaderType: number) {
  const shader = gl.createShader(shaderType);
  if (!shader) return;

  gl.shaderSource(shader, shaderSource);

  gl.compileShader(shader);

  const success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
  if (!success) {
    const message = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error("Could not compile shader: " + message);
  }

  return shader;
}

export function createShaderProgram(gl: WebGLRenderingContext, vertSrc: string, fragSrc: string) {
  const vert = compileShader(gl, vertSrc, gl.VERTEX_SHADER);
  if (!vert) return;
  let frag: WebGLShader | undefined;
  try {
    frag = compileShader(gl, fragSrc, gl.FRAGMENT_SHADER);
    const program = frag && createProgram(gl, vert, frag);
    if (frag && program) return { vert, frag, program };
  } catch (error) {
    gl.deleteShader(vert);
    if (frag) gl.deleteShader(frag);
    throw error;
  }
  gl.deleteShader(vert);
  if (frag) gl.deleteShader(frag);
}
