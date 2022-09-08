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
    this.maxIterations = 10;
    this.iterations = 6;
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

function setup() {
  createCanvas(windowWidth, windowHeight);
  ruleNames = Object.keys(ruleSet).sort();
  config = new Config();

  resetAndDraw();

  const gui = new dat.GUI();
  const o = gui.addFolder("Options");
  iterationController = o
    .add(config, "iterations", 1, rules.maxIterations)
    .step(1)
    .onFinishChange(resetAndDraw);

  const r = ruleNames.reduce((agg, key) => ({ ...agg, [key]: key }), {});
  o.add(config, "fractal", r).onFinishChange(() => {
    reset();
    iterationController.max(rules.maxIterations);
    config.iterations = rules.maxIterations - 1;
    iterationController.updateDisplay();
    generateFractal();
  });

  o.open();
}

function resetAndDraw() {
  reset();
  generateFractal();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  resetAndDraw();
}

function reset() {
  resetMatrix();
  background(50);
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
