let len;
let angle;
let rotationDirection = 1;
let weight = 5;
let weightIncrement = 0;
let scale = 1;
let angleIncrement = 0;

let rules;
let sentence;
let iterations = 0;
let maxIterations = 20;
let computing = false;

const drawRules = {
  F: drawForward,
  f: () => translate(0, -len),
  "+": () => rotate(angle * rotationDirection),
  "-": () => rotate(angle * -rotationDirection),
  "|": () => rotate(180),
  "[": () => push(),
  "]": () => pop(),
  "#": () => strokeWeight((weight += weightIncrement)),
  "!": () => strokeWeight((weight -= weightIncrement)),
  ">": () => (len *= scale),
  "<": () => (len /= scale),
  "&": () => (rotationDirection = -rotationDirection),
  "(": () => (angle += angleIncrement),
  ")": () => (angle -= angleIncrement),
};

function drawForward() {
  line(0, 0, 0, -len);
  translate(0, -len);
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  background(50);
  rules = ruleSet.crystal;
  sentence = rules.axiom;
  const btn = createButton("Click");
  btn.mousePressed(() => {
    if (computing) return;
    console.log("Hello");
    generateNextSentence();
    createP(sentence);
  });
}

const ruleSet = {
  crystal: {
    axiom: "F+F+F+F",
    draw: drawRules,
    replace: {
      F: "FF+F++F+F",
    },
    setup: () => {
      resetMatrix();
      let initialLength = width / 3;
      translate(width / 2 - initialLength / 2, height / 2 + initialLength / 2);
      background(50);
      angleMode(DEGREES);
      stroke(255);
      angle = 90;
      len = len || initialLength;
    },
    after: () => {
      len = len / 3;
    },
  },
  quadraticSnowflake: {
    axiom: "FF+FF+FF+FF",
    draw: drawRules,
    replace: {
      F: "F+F-F-F+F",
    },
    setup: () => {
      resetMatrix();
      let initialLength = width / 5;
      translate(width / 2 - initialLength, height / 2 + initialLength);
      background(50);
      angleMode(DEGREES);
      stroke(255);
      angle = 90;
      len = len || initialLength;
    },
    after: () => {
      len = len / 3;
    },
  },
  kochIsland: {
    axiom: "F+F+F+F",
    draw: drawRules,
    replace: {
      F: "F+F-F-FFF+F+F-F",
    },
    setup: () => {
      resetMatrix();
      translate(width / 2 - width / 4 / 2, height / 2 + width / 4 / 2);
      background(50);
      angleMode(DEGREES);
      stroke(255);
      angle = 90;
      len = len || width / 4;
    },
    after: () => {
      len = len / 4.5;
    },
  },
  board: {
    axiom: "F+F+F+F",
    draw: drawRules,
    replace: {
      F: "FF+F+F+F+FF",
    },
    setup: () => {
      resetMatrix();
      translate(width / 2 - width / 3 / 2, height / 2 + width / 3 / 2);
      background(50);
      angleMode(DEGREES);
      stroke(255);
      angle = 90;
      len = len || width / 3;
    },
    after: () => {
      len = len / 3;
    },
  },
  kochSnowflake: {
    axiom: "F++F++F",
    draw: drawRules,
    replace: {
      F: "F-F++F-F",
    },
    setup: () => {
      resetMatrix();
      translate(width / 2 - width / 3 / 3, height / 2 + width / 3 / 2);
      background(50);
      angleMode(DEGREES);
      stroke(255);
      angle = 60;
      len = len || width / 3;
    },
    after: () => {
      len = len / 3;
    },
  },

  cross: {
    axiom: "F+F+F+F",
    draw: drawRules,
    replace: {
      F: "F+F-F+F+F",
    },
    setup: () => {
      resetMatrix();
      translate(width / 2, height / 2);
      background(50);
      angleMode(DEGREES);
      stroke(255);
      angle = 90;
      len = len || 200;
    },
    after: () => {
      len = len / 2;
    },
  },
  pentaflake: {
    axiom: "F++F++F++F++F",
    draw: drawRules,
    replace: {
      F: "F++F++F|F-F++F",
    },
    setup: () => {
      resetMatrix();
      translate(0, height);
      background(50);
      angleMode(DEGREES);
      stroke(255);
      angle = 36;
      len = len || 200;
    },
    after: () => {
      len = len / 2.5;
    },
  },
  dragonKurve: {
    axiom: "F",
    replace: {
      F: "F+G",
      G: "F-G",
    },
    setup: () => {
      resetMatrix();
      translate(width / 2, height / 2);
      background(50);
      angleMode(DEGREES);
      stroke(255);
      len = 5;
    },
    after: () => {},
    draw: {
      F: drawForward,
      G: drawForward,
      "+": () => rotate(90),
      "-": () => rotate(-90),
    },
  },
  kochKurve: {
    axiom: "F",
    replace: {
      F: "F+F-F-F+F",
    },
    setup: () => {
      resetMatrix();
      translate(0, height);
      background(50);
      angleMode(DEGREES);
      stroke(255);
      angle = 60;
      rotate(angle);
      len = 2;
    },
    after: () => {},
    draw: {
      F: drawForward,
      "+": () => rotate(angle),
      "-": () => rotate(-angle),
    },
  },
  hilbert: {
    axiom: "A",
    replace: {
      A: "+BF-AFA-FB+",
      B: "-AF+BFB+FA-",
    },
    setup: () => {
      resetMatrix();
      translate(0, height);
      background(50);
      angleMode(DEGREES);
      stroke(255);
      angle = 90;
      len = 5;
    },
    after: () => {},
    draw: {
      F: drawForward,
      A: () => {},
      B: () => {},
      "+": () => rotate(angle),
      "-": () => rotate(-angle),
    },
  },
  sierpinski1: {
    axiom: "F-G-G",
    replace: {
      F: "F-G+F+G-F",
      G: "GG",
    },
    setup: () => {
      resetMatrix();
      background(50);
      translate(0, height);
      angleMode(DEGREES);
      rotate(90);
      stroke(255);
      len = len || Math.min(width, height);
    },
    after: () => {
      len = len / 2;
    },
    draw: {
      F: drawForward,
      G: drawForward,
      "+": () => rotate(120),
      "-": () => rotate(-120),
    },
  },
  sierpinski2: {
    axiom: "A",
    replace: {
      A: "B-A-B",
      B: "A+B+A",
    },
    setup: () => {
      resetMatrix();
      background(50);
      translate(0, height);
      angleMode(DEGREES);
      rotate(90);
      stroke(255);
      len = len || Math.min(width, height);
    },
    after: () => {
      console.log(len);
      len = len / 2;
    },
    draw: {
      A: drawForward,
      B: drawForward,
      "+": () => rotate(60),
      "-": () => rotate(-60),
    },
  },
  fern: {
    setup: () => {
      resetMatrix();
      background(50);
      angleMode(DEGREES);
      translate(width / 2.5, height);
      stroke(255);
      rotate(20);
      len = height / 3;
    },
    axiom: "X",
    draw: {
      F: () => {
        line(0, 0, 0, -len);
        translate(0, -len);
      },
      "-": () => rotate(+25),
      "+": () => rotate(-25),
      "[": () => push(),
      "]": () => pop(),
      X: () => {},
    },
    after: () => {
      len = len / 2;
    },
    replace: {
      X: "F+[[X]-X]-F[-FX]+X",
      F: "FF",
    },
  },
};

function generateNextSentence() {
  let newSentence = "";
  computing = true;
  rules.setup();
  if (iterations > maxIterations) return;

  for (let char of sentence) {
    newSentence += rules.replace[char] || char;
    rules.draw[char]();
  }

  rules.after();
  iterations++;

  sentence = newSentence;
  computing = false;
}
