function main() {
  const canvas_element = document.getElementById("maincanvas");
  canvas_element.width = window.innerWidth;
  canvas_element.height = window.innerHeight;
  let gl = canvas_element.getContext("webgl");

  const vertex_shader = gl.createShader(gl.VERTEX_SHADER);
  const fragment_shader = gl.createShader(gl.FRAGMENT_SHADER);

  gl.shaderSource(vertex_shader, document.getElementById("shader-vs").text);
  gl.shaderSource(fragment_shader, document.getElementById("shader-fs").text);

  gl.compileShader(vertex_shader);
  gl.compileShader(fragment_shader);

  const mandelbrot_program = gl.createProgram();
  gl.attachShader(mandelbrot_program, vertex_shader);
  gl.attachShader(mandelbrot_program, fragment_shader);
  gl.linkProgram(mandelbrot_program);
  gl.useProgram(mandelbrot_program);

  const vertex_buf = gl.createBuffer(gl.ARRAY_BUFFER);
  gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buf);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 3, -1, -1, 3]),
    gl.STATIC_DRAW
  );

  const position_attrib_location = gl.getAttribLocation(
    mandelbrot_program,
    "a_Position"
  );
  gl.enableVertexAttribArray(position_attrib_location);
  gl.vertexAttribPointer(position_attrib_location, 2, gl.FLOAT, false, 0, 0);

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

  const zoom_center = [0.0, 0.0];
  const target_zoom_center = [0.0, 0.0];
  const min_iterations = 200;
  let zoom_size = 4.0;
  let stop_zooming = true;
  let zoom_factor = 1.0;
  let max_iterations = 200;

  const renderFrame = () => {
    gl.uniform2f(zoom_center_uniform, zoom_center[0], zoom_center[1]);
    gl.uniform1f(zoom_size_uniform, zoom_size);
    gl.uniform1i(max_iterations_uniform, max_iterations);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    if (!stop_zooming) {
      //   max_iterations -= 10;
      //   max_iterations = Math.max(min_iterations, max_iterations);

      zoom_size *= zoom_factor;
      zoom_center[0] += 0.1 * (target_zoom_center[0] - zoom_center[0]);
      zoom_center[1] += 0.1 * (target_zoom_center[1] - zoom_center[1]);

      window.requestAnimationFrame(renderFrame);
    } else if (max_iterations < 500) {
      /* once zoom operation is complete, bounce back to normal detail level */
      max_iterations += 10;
      window.requestAnimationFrame(renderFrame);
    }
  };

  canvas_element.onmousedown = (event) => {
    const x_part = event.offsetX / canvas_element.width;
    const y_part = event.offsetY / canvas_element.height;
    target_zoom_center[0] =
      zoom_center[0] - zoom_size / 2.0 + x_part * zoom_size;
    target_zoom_center[1] =
      zoom_center[1] + zoom_size / 2.0 - y_part * zoom_size;
    stop_zooming = false;
    zoom_factor = event.buttons & 1 ? 0.99 : 1.01;
    renderFrame();
    return true;
  };
  canvas_element.oncontextmenu = () => {
    return false;
  };
  canvas_element.onmouseup = () => {
    stop_zooming = true;
  };

  renderFrame();
}

main();
