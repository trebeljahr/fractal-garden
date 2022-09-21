class Config {
  constructor() {
    let fromUrl = new URL(window.location.href).searchParams.get("fractal");
    fromUrl = fromUrl
      ? fromUrl
          .split("-")
          .map(([first, ...rest]) => first.toUpperCase() + rest.join(""))
          .join(" ")
      : "";
    this.fractal = ruleSet[fromUrl] ? fromUrl : ruleNames[0];
    this.maxIterations = ruleSet[fromUrl].maxIterations;
    this.iterations = ruleSet[fromUrl].maxIterations - 1;
    this.fractalColor = ruleSet[fromUrl].color || "#23ff00";
    this.backgroundColor = "#252424";

    this.name = this.fractal;
    this.save = () => {
      drawToCanvas = false;
      let a3Paper = {
        width: 9920,
        height: 7016,
      };
      const oldCanvas = pg;
      const graphics = createGraphics(a3Paper.width, a3Paper.height);
      graphics.angleMode(DEGREES);
      graphics.strokeWeight(3);
      pg = graphics;
      resetAndDraw();
      saveCanvas(pg, this.name, "jpg");
      pg = oldCanvas;
      drawToCanvas = true;
    };
  }
}

let config;

let len;
let angle;
let rotationDirection = 1;
let weight = 5;
let weightIncrement = 0;
let scale = 1;
let angleIncrement = 0;

let rules;
let sentence;
let computing = false;
let currentIteration = 1;

let ruleNames;
let iterationController;
let pg;
let drawToCanvas = true;

function setup() {
  createCanvas(windowWidth, windowHeight);

  ruleNames = Object.keys(ruleSet).sort();
  config = new Config();
  newGraphics();
  resetAndDraw();

  const gui = new dat.GUI();
  const o = gui.addFolder("Options");
  iterationController = o
    .add(config, "iterations", 1, rules.maxIterations)
    .step(1)
    .onFinishChange(resetAndDraw);

  const r = ruleNames.reduce((agg, key) => ({ ...agg, [key]: key }), {});
  o.add(config, "fractal", r).onFinishChange(() => {
    newGraphics();
    reset();
    iterationController.max(rules.maxIterations);
    config.iterations = rules.maxIterations - 1;
    config.fractalColor = rules.color || "#23ff00";
    config.backgroundColor = "#252424";

    o.updateDisplay();
    generateFractal();
  });

  o.addColor(config, "fractalColor").onFinishChange(resetAndDraw);
  o.addColor(config, "backgroundColor").onFinishChange(resetAndDraw);
  const saving = gui.addFolder("Save File");
  saving.add(config, "name");
  saving.add(config, "save");
}

function resetAndDraw() {
  reset();
  generateFractal();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  newGraphics();
  resetAndDraw();
}

function newGraphics() {
  if (pg) pg.elt.remove();
  pg = createGraphics(windowWidth, windowHeight);
  pg.angleMode(DEGREES);
}

function reset() {
  rules = ruleSet[config.fractal];
  window.history.replaceState(
    null,
    null,
    `?fractal=${config.fractal.replace(" ", "-").toLowerCase()}`
  );
  sentence = rules.axiom;
  len = undefined;
}

function generateFractal() {
  if (computing) return;
  computing = true;
  currentIteration = 1;

  for (let i = 0; i < config.iterations; i++) {
    generateNextIteration();
    currentIteration++;
  }
  computing = false;
  if (drawToCanvas) image(pg, 0, 0);
}

function keyPressed() {
  if (keyCode === LEFT_ARROW) {
    config.iterations = constrain(
      config.iterations - 1,
      1,
      rules.maxIterations
    );
    iterationController.updateDisplay();
    resetAndDraw();
  } else if (keyCode === RIGHT_ARROW) {
    config.iterations = constrain(
      config.iterations + 1,
      1,
      rules.maxIterations
    );
    iterationController.updateDisplay();
    resetAndDraw();
  }
}

function generateNextIteration() {
  let newSentence = "";
  rules.setup();

  for (let char of sentence) {
    newSentence += rules.replace[char] || char;
    rules.draw[char]();
  }

  rules.after();

  sentence = newSentence;
}
