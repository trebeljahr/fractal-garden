let len;

function drawForward() {
  line(0, 0, 0, -len);
  translate(0, -len);
}

const ruleSet = {
  dragon: {
    axiom: "F",
    replace: {
      F: "F+G",
      G: "F-G",
    },
    setup: () => {
      resetMatrix();
      translate(width / 2, height / 2);
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
  algae: {
    axiom: "A",
    replace: {
      A: "AB",
      B: "A",
    },
  },
  fern: {
    setup: () => {
      resetMatrix();
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

let rules = ruleSet.dragon;
let sentence = rules.axiom;
let iterations = 0;
let maxIterations = 20;

function generateNextSentence() {
  let newSentence = "";
  rules.setup();
  if (iterations > maxIterations) return;

  for (let char of sentence) {
    newSentence += rules.replace[char] || char;
    rules.draw[char]();
  }

  rules.after();
  iterations++;

  sentence = newSentence;
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  background(50);
  const btn = createButton("Click");
  btn.mousePressed(() => {
    console.log("Hello");
    generateNextSentence();
    createP(sentence);
  });
}
