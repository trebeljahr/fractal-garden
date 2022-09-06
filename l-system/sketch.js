class Config {
  constructor() {
    let fromUrl = new URL(window.location.href).searchParams.get("fractal");
    fromUrl = fromUrl
      ? fromUrl
          .split("-")
          .map(([first, ...rest]) => first.toUpperCase() + rest.join(""))
          .join(" ")
      : "";
    console.log(fromUrl);
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

let ruleNames;

function setup() {
  createCanvas(windowWidth, windowHeight);
  ruleNames = Object.keys(ruleSet).sort();
  config = new Config();

  resetAndDraw();

  const gui = new dat.GUI();
  const o = gui.addFolder("Options");
  const iterationController = o
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
  for (let i = 0; i < config.iterations; i++) {
    generateNextIteration();
  }

  // for (let char of sentence) {
  //   rules.draw[char]();
  // }
}

function generateNextIteration() {
  let newSentence = "";
  computing = true;
  rules.setup();

  for (let char of sentence) {
    newSentence += rules.replace[char] || char;
    rules.draw[char]();
  }

  rules.after();

  sentence = newSentence;
  computing = false;
}
