import React from "react";
import P5 from "p5";
import dynamic from "next/dynamic";
import { NavElement } from "../components/Navbar";
import styles from "../styles/Fullscreen.module.css";

class Config {
  public maxIterations = 6;
  public iterations = this.maxIterations - 1;
  public fractalColor = "#23ff00";
  public backgroundColor = "#252424";

  constructor(ruleset: Ruleset) {
    this.maxIterations = ruleset.maxIterations;
    this.iterations = this.maxIterations - 1;
    this.fractalColor = ruleset.color;
  }
}

const Sketch = dynamic(() => import("react-p5").then((mod) => mod.default), {
  ssr: false,
});

interface Ruleset {
  color: string;
  maxIterations: number;
  axiom: string;
  replace: Record<string, string>;
  setup: (p5: P5) => void;
  after: () => void;
}

function commonSetup(p5: P5) {
  p5.resetMatrix();
  p5.background(config.backgroundColor);
  p5.stroke(config.fractalColor);
}

const rulesets: Record<string, Ruleset> = {
  "Fern 4": {
    color: "#ffe10b",
    maxIterations: 10,
    axiom: "X",
    replace: {
      X: "F[+X]F[-X]+X",
      F: "FF",
    },
    setup: (p5: P5) => {
      let initialLength = p5.height * 0.4;
      p5.translate(p5.width / 2, p5.height);

      angle = 20;
      len = len || initialLength;
    },
    after: () => {
      len /= 2;
    },
  },
  "Fern 3": {
    color: "#91fc8e",
    maxIterations: 6,
    axiom: "F",
    replace: {
      F: "F[+FF][-FF]F[-F][+F]F",
    },
    setup: (p5: P5) => {
      let initialLength = p5.height * 0.9;
      p5.translate(p5.width / 2, p5.height);

      angle = 22.5;
      len = len || initialLength;
    },
    after: () => {
      len /= 3;
    },
  },
  "Fern 2": {
    color: "#3cf7d2",
    maxIterations: 10,
    axiom: "Y",
    replace: {
      X: "X[-FFF][+FFF]FX",
      Y: "YFX[+Y][-Y]",
    },
    setup: (p5: P5) => {
      let initialLength = p5.height * 0.6;
      p5.translate(p5.width / 2, p5.height);

      angle = 25.7;
      len = len || initialLength;
    },
    after: () => {
      len /= 2.05;
    },
  },
  "Fern 1": {
    color: "#adff00",
    maxIterations: 9,
    axiom: "X",
    replace: {
      X: "F+[[X]-X]-F[-FX]+X",
      F: "FF",
    },
    setup: (p5: P5) => {
      const initialLength = p5.height * 0.37;
      len = len || initialLength;

      p5.translate(p5.width / 2, p5.height);
      angle = -25;
    },
    after: () => {
      len = len / 2;
    },
  },
  "Sierpinski Curve": {
    color: "#f7ad1c",
    maxIterations: 8,
    axiom: "F+XF+F+XF",
    replace: {
      X: "XF-F+F-XF+F+XF-F+F-X",
    },
    setup: (p5: P5) => {
      let initialLength = Math.min(p5.width, p5.height) * 0.25;
      p5.translate(p5.width / 2 - initialLength * 1.6, p5.height / 2);

      angle = 90;
      len = len || initialLength;
    },
    after: () => {
      len /= 2.05;
    },
  },
  Crystal: {
    color: "#18fce0",
    maxIterations: 8,
    axiom: "F+F+F+F",
    replace: {
      F: "FF+F++F+F",
    },
    setup: (p5: P5) => {
      let initialLength = Math.min(p5.width, p5.height) * 0.7;
      p5.translate(
        p5.width / 2 - initialLength / 2,
        p5.height / 2 + initialLength / 2
      );

      angle = 90;
      len = len || initialLength;
    },
    after: () => {
      len = len / 3;
    },
  },
  "Quadratic Snowflake": {
    color: "#80b8f9",
    maxIterations: 8,
    axiom: "FF+FF+FF+FF",
    replace: {
      F: "F+F-F-F+F",
    },
    setup: (p5: P5) => {
      let initialLength = Math.min(p5.width, p5.height) / 2.5;
      p5.translate(p5.width / 2 - initialLength, p5.height / 2 + initialLength);

      angle = 90;
      len = len || initialLength;
    },
    after: () => {
      len = len / 3;
    },
  },
  Board: {
    color: "#339ffc",
    maxIterations: 7,
    axiom: "F+F+F+F",
    replace: {
      F: "FF+F+F+F+FF",
    },
    setup: (p5: P5) => {
      let initialLength = Math.min(p5.width, p5.height) * 0.7;
      len = len || initialLength;
      p5.translate(
        p5.width / 2 - initialLength / 2,
        p5.height / 2 + initialLength / 2
      );

      angle = 90;
    },
    after: () => {
      len = len / 3;
    },
  },
  "Koch Snowflake": {
    color: "#b1e5e8",
    maxIterations: 8,
    axiom: "F++F++F",
    replace: {
      F: "F-F++F-F",
    },
    setup: (p5: P5) => {
      const initialLength = p5.min(p5.width, p5.height) * 0.8;
      p5.translate(
        p5.width / 2 - initialLength / 3,
        p5.height / 2 + initialLength / 2
      );

      angle = 60;
      len = len || initialLength;
    },
    after: () => {
      len = len / 3;
    },
  },

  "Hilbert Curve": {
    color: "#fc79ff",
    maxIterations: 10,
    axiom: "W",
    replace: {
      V: "-WF+VFV+FW-",
      W: "+VF-WFW-FV+",
    },
    setup: (p5: P5) => {
      angle = 90;
      const initialLength = Math.min(p5.width, p5.height) * 0.7;
      len = len || initialLength;
      p5.translate(
        p5.width / 2 - initialLength / 2,
        p5.height / 2 + initialLength / 2
      );
    },
    after: () => {
      len /= 2;
    },
  },
  "Sierpinski Triangle": {
    color: "#fc366b",
    maxIterations: 11,
    axiom: "F-G-G",
    replace: {
      F: "F-G+F+G-F",
      G: "GG",
    },
    setup: (p5: P5) => {
      angle = 120;
      const initialLength = Math.min(p5.width, p5.height);
      len = len || initialLength;
      const totalHeight = (initialLength * Math.sqrt(3)) / 2;

      p5.translate(
        p5.width / 2 - initialLength / 2,
        p5.height - (p5.height - totalHeight) / 2
      );
      p5.rotate(90);
    },
    after: () => {
      len = len / 2;
    },
  },
  "Lévy Curve": {
    color: "#54bffc",
    maxIterations: 18,
    axiom: "F",

    replace: {
      F: "-F++F-",
    },
    setup: (p5: P5) => {
      let initialLength =
        Math.min(p5.width, p5.height) *
        (p5.width > p5.height * 1.3 ? 0.7 : 0.45);
      len = len === 0 ? initialLength : len;

      p5.translate(
        p5.width / 2 - initialLength / 2,
        p5.height / 2 + initialLength / 2.6
      );
      p5.rotate(90);
      angle = 45;
    },
    after: () => {
      len /= 1.417;
    },
  },
};

let config: Config;
let rotationDirection = 1;
let weight = 5;
let weightIncrement = 0;
let scale = 1;
let angleIncrement = 0;
let len = 0;
let angle = 0;

let sentence = "";
let computing = false;
let currentIteration = 1;

function drawForward(p5: P5) {
  p5.line(0, 0, 0, -len);
  p5.translate(0, -len);
}

const drawRules: Record<string, (p5: P5) => void> = {
  V: () => {},
  W: () => {},
  X: () => {},
  Y: () => {},
  Z: () => {},
  G: drawForward,
  F: drawForward,
  f: (p5: P5) => p5.translate(0, -len),
  "+": (p5: P5) => p5.rotate(angle * rotationDirection),
  "-": (p5: P5) => p5.rotate(angle * -rotationDirection),
  "|": (p5: P5) => p5.rotate(180),
  "[": (p5: P5) => p5.push(),
  "]": (p5: P5) => p5.pop(),
  "#": (p5: P5) => p5.strokeWeight((weight += weightIncrement)),
  "!": (p5: P5) => p5.strokeWeight((weight -= weightIncrement)),
  ">": () => (len *= scale),
  "<": () => (len /= scale),
  "&": () => (rotationDirection = -rotationDirection),
  "(": () => (angle += angleIncrement),
  ")": () => (angle -= angleIncrement),
};

function resetAndDraw(ruleset: Ruleset, p5: P5) {
  reset(ruleset);
  generateFractal(ruleset, p5);
}

function reset(ruleset: Ruleset) {
  sentence = ruleset.axiom;
  len = 0;
}

function generateNextIteration(ruleset: Ruleset, p5: P5) {
  let newSentence = "";
  commonSetup(p5);
  ruleset.setup(p5);

  for (let char of sentence) {
    newSentence += ruleset.replace[char] || char;
    const drawFunc = drawRules[char];
    drawFunc(p5);
  }

  ruleset.after();

  sentence = newSentence;
}

function generateFractal(ruleset: Ruleset, p5: P5) {
  if (computing) return;
  computing = true;
  currentIteration = 1;

  for (let i = 0; i < config.iterations; i++) {
    generateNextIteration(ruleset, p5);
    currentIteration++;
  }
  computing = false;
}

function constrain(p5: P5, newIterations: number, ruleset: Ruleset) {
  return p5.constrain(newIterations, 1, ruleset.maxIterations);
}

interface Props {
  fractal: string;
}

const LSystem = ({ fractal }: Props) => {
  const ruleset = rulesets[fractal];
  if (!ruleset) return null;

  const setup = (p5: P5, canvasParentRef: Element) => {
    console.log("running setup");
    p5.createCanvas(window.innerWidth, window.innerHeight).parent(
      canvasParentRef
    );
    p5.resetMatrix();
    p5.angleMode(p5.DEGREES);

    config = new Config(ruleset);
    resetAndDraw(ruleset, p5);
  };

  const keyPressed = (p5: P5) => {
    if (p5.keyCode !== p5.LEFT_ARROW && p5.keyCode !== p5.RIGHT_ARROW) return;

    let inc = p5.keyCode === p5.LEFT_ARROW ? -1 : 1;

    config.iterations = constrain(p5, config.iterations + inc, ruleset);
    resetAndDraw(ruleset, p5);
  };

  const windowResized = (p5: P5) => {
    p5.resizeCanvas(window.innerWidth, window.innerHeight);
    resetAndDraw(ruleset, p5);
  };

  return (
    <Sketch
      setup={setup}
      windowResized={windowResized}
      keyPressed={keyPressed}
    />
  );
};

export default LSystem;
