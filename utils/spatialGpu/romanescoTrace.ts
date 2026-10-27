/**
 * Finish difficult grazing rays in separate GPU passes. Resolved pixels discard
 * before tracing again, so they do not share long loops with the remaining rays.
 * Restart distances preserve all 32 float bits in an RGBA8 render target.
 */
export function createRomanescoTracePasses(gl: WebGL2RenderingContext) {
  const traces = [gl.createTexture(), gl.createTexture()];
  if (traces.some((texture) => !texture)) {
    traces.forEach((texture) => {
      gl.deleteTexture(texture);
    });
    throw new Error("Could not allocate Romanesco ray continuations.");
  }
  let width = 0;
  let height = 0;
  const budgets = [96, 256, 1024, 4096];
  const finished = new Float32Array([0, 0, 128 / 255, 191 / 255]);
  const locations = new WeakMap<
    WebGLProgram,
    {
      resume: WebGLUniformLocation | null;
      limit: WebGLUniformLocation | null;
      state: WebGLUniformLocation | null;
    }
  >();
  return {
    draw(program: WebGLProgram) {
      let at = locations.get(program);
      if (!at) {
        at = {
          resume: gl.getUniformLocation(program, "u_traceResume"),
          limit: gl.getUniformLocation(program, "u_iterationLimit"),
          state: gl.getUniformLocation(program, "u_traceState"),
        };
        locations.set(program, at);
      }
      const active = gl.getParameter(gl.ACTIVE_TEXTURE) as number;
      gl.activeTexture(gl.TEXTURE6);
      if (width !== gl.canvas.width || height !== gl.canvas.height) {
        width = gl.canvas.width;
        height = gl.canvas.height;
        for (const texture of traces) {
          gl.bindTexture(gl.TEXTURE_2D, texture);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
          gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGBA8,
            width,
            height,
            0,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            null,
          );
        }
      }
      gl.uniform1i(at.state, 6);
      for (let pass = 0; pass < budgets.length; pass++) {
        gl.framebufferTexture2D(
          gl.FRAMEBUFFER,
          gl.COLOR_ATTACHMENT2,
          gl.TEXTURE_2D,
          traces[pass % 2],
          0,
        );
        gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1, gl.COLOR_ATTACHMENT2]);
        // A discarded finished ray must also be finished in the other buffer.
        gl.clearBufferfv(gl.COLOR, 2, finished);
        gl.bindTexture(gl.TEXTURE_2D, traces[(pass + 1) % 2]);
        gl.uniform1i(at.resume, pass ? 1 : 0);
        gl.uniform1i(at.limit, budgets[pass]);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      }
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT2, gl.TEXTURE_2D, null, 0);
      gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]);
      gl.uniform1i(at.resume, 0);
      gl.uniform1i(at.limit, 0);
      gl.activeTexture(active);
    },
    destroy() {
      traces.forEach((texture) => {
        gl.deleteTexture(texture);
      });
    },
  };
}
