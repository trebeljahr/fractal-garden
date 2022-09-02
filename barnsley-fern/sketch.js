class Configuration {
  constructor() {
    this.detail = 60;
    this.color = "#23ff00";
    this.background = "#252424";
    this.useBarnsley = true;
    this.name = "img_name";
    this.save = () => saveCanvas(canvas, this.name, "jpg");
  }
}

let config;
let length;
let canvas;
function setup() {
  config = new Configuration();
  reset();
  window.addEventListener("resize", reset);
  const gui = new dat.GUI();
  const o = gui.addFolder("Options");
  const iterationController = o.add(config, "detail", 10, 80).step(1);
  const barnsleyController = o.add(config, "useBarnsley");
  const colorController = o.addColor(config, "color");
  const backgroundController = o.addColor(config, "background");

  iterationController.onChange(reset);
  barnsleyController.onChange(reset);
  backgroundController.onChange(reset);
  colorController.onChange(reset);
  const saving = gui.addFolder("Save File");
  saving.add(config, "name");
  saving.add(config, "save");
}

function reset() {
  canvas = createCanvas(window.innerWidth, window.innerHeight);
  background(config.background);
  iterations = 1;
}

const barnsleyMatrices = [
  [0, 0, 0, 0.16, 0, 0, 0.01],
  [0.85, 0.04, -0.04, 0.85, 0, 1.6, 0.85],
  [0.2, -0.26, 0.23, 0.22, 0, 1.6, 0.07],
  [-0.15, 0.28, 0.26, 0.24, 0, 0.44, 0.07],
];

const differentMatrices = [
  [0, 0, 0, 0.25, 0, -0.4, 0.02],
  [0.95, 0.005, -0.005, 0.93, -0.002, 0.5, 0.84],
  [0.035, -0.2, 0.16, 0.04, -0.09, 0.02, 0.07],
  [-0.04, 0.2, 0.16, 0.04, 0.083, 0.12, 0.07],
];

function applyMatrixValues(xValue, yValue, matrix) {
  const newXValue = matrix[0] * xValue + matrix[1] * yValue + matrix[4];
  const newYValue = matrix[2] * xValue + matrix[3] * yValue + matrix[5];
  return { newXValue, newYValue };
}

function generateNewCoords(xValue, yValue, matrices) {
  const r = Math.random();
  const prob1 = matrices[1][6];
  const prob2 = matrices[2][6];
  const prob3 = matrices[3][6];
  const prob4 = matrices[0][6];
  if (r <= prob1) {
    return applyMatrixValues(xValue, yValue, matrices[1]);
  } else if (r <= prob1 + prob2) {
    return applyMatrixValues(xValue, yValue, matrices[2]);
  } else if (r <= prob1 + prob2 + prob3) {
    return applyMatrixValues(xValue, yValue, matrices[3]);
  } else if (r <= prob1 + prob2 + prob3 + prob4) {
    return applyMatrixValues(xValue, yValue, matrices[0]);
  }
}

let x = 0;
let y = 0;
const scl = 50;
let iterations = 1;
function draw() {
  if (iterations < config.detail) {
    iterations++;
    for (let i = 0; i < 10000; i++) {
      stroke(config.color);
      const drawX = getDrawX();
      const drawY = getDrawY();
      strokeWeight(40 / config.detail);
      point(drawX, drawY);
      const matrices = config.useBarnsley
        ? barnsleyMatrices
        : differentMatrices;
      const coords = generateNewCoords(x, y, matrices);
      x = coords.newXValue;
      y = coords.newYValue;
    }
  }
}

function getDrawX() {
  return config.useBarnsley
    ? Math.floor(
        map(x, -2.182, 2.6558, width / 2 - height / 3, width / 2 + height / 3)
      )
    : Math.floor(
        map(x, -1.4, 1.7558, width / 2 - height / 3, width / 2 + height / 3)
      );
}

function getDrawY() {
  return config.useBarnsley
    ? Math.floor(map(y, 0, 9.9983, height, 100))
    : Math.floor(map(y, -0.5, 6.9983, height, 200));
}

// const drawY = Math.floor(map(y, 0, 9.9983, height, 100));
