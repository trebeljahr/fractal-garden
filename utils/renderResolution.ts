const limits = new WeakMap<WebGLRenderingContext | WebGL2RenderingContext, [number, number]>();

/** Density stays fixed during motion. Bound allocations only by size and GPU limits. */
export function webglPixelRatio(
  gl: WebGLRenderingContext | WebGL2RenderingContext,
  width: number,
  height: number,
  ratio: number,
  maxPixels = 32_000_000,
) {
  let maximum = limits.get(gl);
  if (!maximum) {
    const viewport = gl.getParameter(gl.MAX_VIEWPORT_DIMS) as Int32Array;
    const side = Math.min(
      gl.getParameter(gl.MAX_TEXTURE_SIZE),
      gl.getParameter(gl.MAX_RENDERBUFFER_SIZE),
    );
    maximum = [Math.min(side, viewport[0]), Math.min(side, viewport[1])];
    limits.set(gl, maximum);
  }
  return Math.min(
    ratio,
    maximum[0] / width,
    maximum[1] / height,
    Math.sqrt(maxPixels / (width * height)),
  );
}
