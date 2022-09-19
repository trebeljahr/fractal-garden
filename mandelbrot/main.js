let mandelBrot;
function preload() {
  mandelBrot = loadShader("mandel.vert", "continuous.frag");
}

const aspectRatio = 2 / 1;

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  drawMandelBrot();
}

const zoom_center = [0.5, 0.5];
const target_zoom_center = [0.0, 0.0];

let zoom_size = 1;
let stop_zooming = true;
let zoom_factor = 1.0;
let max_iterations = 200;

function mouseDragged(event) {
  const x_part = event.offsetX / width;
  const y_part = event.offsetY / height;
  target_zoom_center[0] = zoom_center[0] - zoom_size / 2.0 + x_part * zoom_size;
  target_zoom_center[1] = zoom_center[1] + zoom_size / 2.0 - y_part * zoom_size;

  zoom_factor = keyIsDown(CONTROL) ? 1.01 : 0.99;
  stop_zooming = false;
  return false;
}

function mouseReleased() {
  stop_zooming = true;
}

function setup() {
  createCanvas(windowWidth, windowHeight, WEBGL);

  for (let i = 0; i < 2; i++) {
    drawMandelBrot();
  }
}

function drawMandelBrot() {
  zoom_size = constrain(zoom_size * zoom_factor, 0.00005, 4);
  zoom_center[0] += 0.1 * (target_zoom_center[0] - zoom_center[0]);
  zoom_center[1] += 0.1 * (target_zoom_center[1] - zoom_center[1]);

  console.log(zoom_center);
  console.log(zoom_size);

  mandelBrot.setUniform("u_zoomCenter", zoom_center);
  mandelBrot.setUniform("u_zoomSize", zoom_size);
  mandelBrot.setUniform("iResolution", [
    width * pixelDensity(),
    height * pixelDensity(),
  ]);

  shader(mandelBrot);
  rect(0, 0, width, height);
}

function draw() {
  if (stop_zooming) return;
  if (zoom_size < 0.00005) return;

  drawMandelBrot();
}
