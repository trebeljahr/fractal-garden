export function paintMandelBrot(
  gl: WebGLRenderingContext,
  mandelbrot_program: WebGLProgram
) {
  gl.useProgram(mandelbrot_program);

  /* create a vertex buffer for a full-screen triangle */
  const vertex_buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buf);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 3, -1, -1, 3]),
    gl.STATIC_DRAW
  );

  /* set up the position attribute */
  const position_attrib_location = gl.getAttribLocation(
    mandelbrot_program,
    "a_Position"
  );
  gl.enableVertexAttribArray(position_attrib_location);
  gl.vertexAttribPointer(position_attrib_location, 2, gl.FLOAT, false, 0, 0);

  /* find uniform locations */
  const zoom_center_uniform = gl.getUniformLocation(
    mandelbrot_program,
    "u_zoomCenter"
  );
  const zoom_size_uniform = gl.getUniformLocation(
    mandelbrot_program,
    "u_zoomSize"
  );
  const max_iterations_uniform = gl.getUniformLocation(
    mandelbrot_program,
    "u_maxIterations"
  );

  /* these hold the state of zoom operation */
  const zoom_center = [0.0, 0.0];
  const target_zoom_center = [0.0, 0.0];
  const zoom_size = 4.0;
  const stop_zooming = true;
  const zoom_factor = 1.0;
  const max_iterations = 500;

  const renderFrame = function () {
    /* bind inputs & render frame */
    gl.uniform2f(zoom_center_uniform, zoom_center[0], zoom_center[1]);
    gl.uniform1f(zoom_size_uniform, zoom_size);
    gl.uniform1i(max_iterations_uniform, max_iterations);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    /* handle zoom */
    if (!stop_zooming) {
      /* zooming in progress */
      /* gradually decrease number of iterations, reducing detail, to speed up rendering */
      max_iterations -= 10;
      if (max_iterations < 50) max_iterations = 50;

      /* zoom in */
      zoom_size *= zoom_factor;

      /* move zoom center towards target */
      zoom_center[0] += 0.1 * (target_zoom_center[0] - zoom_center[0]);
      zoom_center[1] += 0.1 * (target_zoom_center[1] - zoom_center[1]);

      window.requestAnimationFrame(renderFrame);
    } else if (max_iterations < 500) {
      /* once zoom operation is complete, bounce back to normal detail level */
      max_iterations += 10;
      window.requestAnimationFrame(renderFrame);
    }
  };

  renderFrame();
}
