class Config {
  constructor() {
    this.maxIterations = 5;
    this.color = "#ffe100";
    this.fillColor = "#000000";
    this.background = "#444444";
    this.name = "img_name";
    this.save = () => saveCanvas(canvas, this.name, "jpg");
  }
}
let config;
let length;
let canvas;
function setup() {
  config = new Config();
  const gui = new dat.GUI();
  drawSierpinskiCarpet();
  window.addEventListener("resize", drawSierpinskiCarpet);

  const o = gui.addFolder("Options");
  const iterationController = o.add(config, "maxIterations", 1, 6).step(1);
  const colorController = o.addColor(config, "color");
  const fillColorController = o.addColor(config, "fillColor");
  const backgroundController = o.addColor(config, "background");

  const saving = gui.addFolder("Save File");
  saving.add(config, "name");
  saving.add(config, "save");

  iterationController.onChange(drawSierpinskiCarpet);
  colorController.onChange(drawSierpinskiCarpet);
  fillColorController.onChange(drawSierpinskiCarpet);
  backgroundController.onChange(drawSierpinskiCarpet);
}

function drawSierpinskiCarpet() {
  canvas = createCanvas(window.innerWidth, window.innerHeight);
  if (window.innerWidth > window.innerHeight) {
    length = window.innerHeight * 0.8;
  } else {
    length = window.innerWidth * 0.8;
  }
  fill(config.fillColor);
  stroke(config.color);
  background(config.background);
  resetMatrix();
  translate(
    (window.innerWidth - length) / 2,
    (window.innerHeight - length) / 2
  );
  SierpinskiCarpet(length, { x: 0, y: 0 }, 0);
}

function SierpinskiCarpet(len, coordinates, iterations) {
  rect(coordinates.x, coordinates.y, len, len);
  for (let x = 0; x <= 2; x++) {
    for (let y = 0; y <= 2; y++) {
      if ((x === 1 && y === 1) || iterations >= config.maxIterations) {
      } else {
        const newCoordinates = {
          x: coordinates.x + x * (len / 3),
          y: coordinates.y + y * (len / 3),
        };
        SierpinskiCarpet(len / 3, newCoordinates, iterations + 1);
      }
    }
  }
}
