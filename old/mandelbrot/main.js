function preload() {}

function windowResized() {}

document.body.addEventListener("mousedown", (event) => {
  // console.log(x_part, y_part);
  // target_zoom_center[0] = -x_part;
  // target_zoom_center[1] = -y_part;

  // zoom_factor = keyIsDown(CONTROL) ? 1.01 : 0.99;
  stop_zooming = false;
});

document.body.addEventListener("wheel", (event) => {
  // console.log(event);
  const zoom_factor = event.deltaY > 0 ? 1.01 : 0.99;
  zoom_size = constrain(zoom_size * zoom_factor, 0.00005, 4);
  drawMandelBrot();
});

document.body.addEventListener("mousemove", (event) => {
  if (stop_zooming) return;

  const x_part = event.movementX / width;
  const y_part = event.movementY / height;
  // console.log(x_part, y_part);

  zoom_center[0] -= x_part * 2.3 * zoom_size;
  zoom_center[1] += y_part * 2.3 * zoom_size;

  // console.log(zoom_center);

  if (zoom_size < 0.00005) return;

  drawMandelBrot();
});

document.body.addEventListener("mouseup", () => {
  stop_zooming = true;
});
