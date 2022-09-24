let mandelBrot;
function preload() {
  mandelBrot = loadShader("mandel.vert", "mandel.frag");
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
let max_iterations = 200;

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

function setup() {
  createCanvas(windowWidth, windowHeight, WEBGL);

  for (let i = 0; i < 2; i++) {
    drawMandelBrot();
  }
}

function getIResolution() {
  return [width * pixelDensity(), height * pixelDensity()];
}

function drawMandelBrot() {
  // console.log(zoom_center);
  // console.log(zoom_size);

  mandelBrot.setUniform("u_zoomCenter", zoom_center);
  mandelBrot.setUniform("u_zoomSize", zoom_size);
  mandelBrot.setUniform("iResolution", getIResolution());

  shader(mandelBrot);
  rect(0, 0, width, height);
}

function draw() {
  if (stop_zooming) return;
}
