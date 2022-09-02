class Configuration {
  constructor() {
    this.angle = 43;
    this.maxIterations = 8;
    this.branches = 3;
    this.rootLength = window.innerHeight / 2.5;
    this.lengthDecay = 0.6;
    this.widthDecay = 0.8;
    this.rootWidth = 16;
    this.name = "img_name";
    this.save = () => saveCanvas(canvas, this.name, "jpg");
  }
}

let config;
function setup() {
  createCanvas(window.innerWidth, window.innerHeight);
  background(51);
  angleMode(DEGREES);
  config = new Configuration();
  drawTree();
  const gui = new dat.GUI();
  const o = gui.addFolder("Options");
  let angleController = o.add(config, "angle", 5, 180).step(1);
  const iterationController = o.add(config, "maxIterations", 1, 10).step(1);
  const branchController = o.add(config, "branches", 1, 5).step(1);
  const rootLengthController = o.add(
    config,
    "rootLength",
    window.innerHeight / 5,
    window.innerHeight / 2
  );
  const lengthDecayController = o.add(config, "lengthDecay", 0.1, 0.8);
  const widthDecayController = o.add(config, "widthDecay", 0.1, 1);
  const rootWidthController = o.add(config, "rootWidth", 10, 60).step(1);

  const saving = gui.addFolder("Save File");
  saving.add(config, "name");
  saving.add(config, "save");

  angleController.onChange(drawTree);
  rootWidthController.onChange(drawTree);
  rootLengthController.onChange(drawTree);
  branchController.onChange(drawTree);
  iterationController.onChange(drawTree);
  lengthDecayController.onChange(drawTree);
  widthDecayController.onChange(drawTree);
}

function drawTree() {
  background(51);
  resetMatrix();
  translate(width / 2, height);
  branch(config.rootLength, config.rootWidth, 0);
}

function branch(len, weight, iteration) {
  if (iteration > config.maxIterations) {
    return;
  }
  strokeWeight(weight);
  stroke(map(iteration, 0, 10, 100, 150), map(iteration, 0, 10, 100, 255), 100);
  line(0, 0, 0, -len);
  translate(0, -len);
  rotate(
    config.angle *
      (config.branches % 2 === 0
        ? Math.floor(config.branches / 2) - 0.5
        : Math.floor(config.branches / 2))
  );
  for (let i = 0; i < config.branches; i++) {
    push();
    rotate(-config.angle * i);
    branch(len * config.lengthDecay, weight * config.widthDecay, iteration + 1);
    pop();
  }
}
