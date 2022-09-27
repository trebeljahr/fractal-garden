import React, { useEffect, useState } from "react";
import { P5Instance } from "react-p5-wrapper";

import styles from "../styles/Fullscreen.module.css";
import { DynamicReactP5Wrapper } from "../utils/DynamicP5Wrapper";
import DatGui, {
  DatBoolean,
  DatColor,
  DatFolder,
  DatNumber,
} from "react-dat-gui";

type Config = {
  iterations: number;
  animateIterations: boolean;
  background: string;
  ruleset: Ruleset;
};

const rulesets: Record<string, Ruleset> = {
  "Fern 4": {
    color: "#ffe10b",
    minIterations: 1,
    maxIterations: 9,
    axiom: "X",
    replace: {
      X: "F[+X]F[-X]+X",
      F: "FF",
    },
    divideFactor: 2,
    initLength(p5) {
      return p5.height * 0.4;
    },
    angle: 20,
    initTranslation(p5) {
      return [p5.width / 2, p5.height];
    },
  },
  "Fern 3": {
    color: "#91fc8e",
    minIterations: 1,
    maxIterations: 5,
    axiom: "F",
    replace: {
      F: "F[+FF][-FF]F[-F][+F]F",
    },
    angle: 22.5,
    initLength: (p5) => p5.height * 0.9,
    initTranslation: (p5) => [p5.width / 2, p5.height],
    divideFactor: 3,
  },
  "Fern 2": {
    color: "#3cf7d2",
    minIterations: 1,
    maxIterations: 9,
    axiom: "Y",
    replace: {
      X: "X[-FFF][+FFF]FX",
      Y: "YFX[+Y][-Y]",
    },
    angle: 25.7,
    initLength: (p5) => p5.height * 0.6,
    initTranslation: (p5) => [p5.width / 2, p5.height],
    divideFactor: 2.05,
  },
  "Fern 1": {
    color: "#adff00",
    minIterations: 1,
    maxIterations: 8,
    axiom: "X",
    replace: {
      X: "F+[[X]-X]-F[-FX]+X",
      F: "FF",
    },
    angle: -25,
    initLength: (p5) => p5.height * 0.37,
    initTranslation: (p5) => [p5.width / 2, p5.height],
    divideFactor: 2,
  },
  "Sierpinski Curve": {
    color: "#f7ad1c",
    minIterations: 1,
    maxIterations: 7,
    axiom: "F+XF+F+XF",
    replace: {
      X: "XF-F+F-XF+F+XF-F+F-X",
    },
    angle: 90,
    initLength: (p5) => Math.min(p5.width, p5.height) * 0.25,
    initTranslation(p5, initialLength) {
      return [p5.width / 2 - initialLength * 1.6, p5.height / 2];
    },
    divideFactor: 2.05,
  },
  Crystal: {
    color: "#18fce0",
    minIterations: 1,
    maxIterations: 7,
    axiom: "F+F+F+F",
    replace: {
      F: "FF+F++F+F",
    },
    angle: 90,
    initLength: (p5) => Math.min(p5.width, p5.height) * 0.7,
    initTranslation: (p5, initialLength) => [
      p5.width / 2 - initialLength / 2,
      p5.height / 2 + initialLength / 2,
    ],
    divideFactor: 3,
  },
  "Quadratic Snowflake": {
    color: "#80b8f9",
    minIterations: 1,
    maxIterations: 7,
    axiom: "FF+FF+FF+FF",
    replace: {
      F: "F+F-F-F+F",
    },
    angle: 90,
    initLength: (p5) => Math.min(p5.width, p5.height) / 2.5,
    initTranslation: (p5, initialLength) => [
      p5.width / 2 - initialLength,
      p5.height / 2 + initialLength,
    ],
    divideFactor: 3,
  },
  Board: {
    color: "#339ffc",
    minIterations: 1,
    maxIterations: 6,
    axiom: "F+F+F+F",
    replace: {
      F: "FF+F+F+F+FF",
    },
    angle: 90,
    initLength: (p5) => Math.min(p5.width, p5.height) * 0.7,
    initTranslation: (p5, initialLength) => [
      p5.width / 2 - initialLength / 2,
      p5.height / 2 + initialLength / 2,
    ],
    divideFactor: 3,
  },
  "Koch Snowflake": {
    color: "#b1e5e8",
    minIterations: 1,
    maxIterations: 7,
    axiom: "F++F++F",
    replace: {
      F: "F-F++F-F",
    },
    angle: 60,
    initLength: (p5) => Math.min(p5.width, p5.height) * 0.8,
    initTranslation: (p5, initialLength) => [
      p5.width / 2 - initialLength / 3,
      p5.height / 2 + initialLength / 2,
    ],
    divideFactor: 3,
  },

  "Hilbert Curve": {
    color: "#fc79ff",
    minIterations: 1,
    maxIterations: 9,
    axiom: "W",
    replace: {
      V: "-WF+VFV+FW-",
      W: "+VF-WFW-FV+",
    },
    angle: 90,
    initLength: (p5) => Math.min(p5.width, p5.height) * 0.7,
    initTranslation: (p5, initialLength) => [
      p5.width / 2 - initialLength / 2,
      p5.height / 2 + initialLength / 2,
    ],
    divideFactor: 2,
  },
  "Sierpinski Triangle": {
    color: "#fc366b",
    minIterations: 1,
    maxIterations: 10,
    axiom: "F-G-G",
    replace: {
      F: "F-G+F+G-F",
      G: "GG",
    },
    angle: 120,
    initLength: (p5) => Math.min(p5.width, p5.height),
    initTranslation: (p5, initialLength) => {
      const totalHeight = (initialLength * Math.sqrt(3)) / 2;
      return [
        p5.width / 2 - initialLength / 2,
        p5.height - (p5.height - totalHeight) / 2,
      ];
    },
    initRotation: (p5) => p5.rotate(90),
    divideFactor: 2,
  },
  "Lévy Curve": {
    color: "#54bffc",
    minIterations: 1,
    maxIterations: 17,
    axiom: "F",

    replace: {
      F: "-F++F-",
    },
    angle: 45,
    initLength: (p5) =>
      Math.min(p5.width, p5.height) * (p5.width > p5.height * 1.3 ? 0.7 : 0.45),
    initTranslation: (p5, initialLength) => [
      p5.width / 2 - initialLength / 2,
      p5.height / 2 + initialLength / 2.6,
    ],
    initRotation: (p5) => p5.rotate(90),
    divideFactor: 1.417,
  },
};

interface Ruleset {
  color: string;
  minIterations: number;
  maxIterations: number;
  axiom: string;
  replace: Record<string, string>;
  initLength: (p5: P5) => number;
  initTranslation: (p5: P5, initialLength: number) => [number, number];
  initRotation?: (p5: P5) => void;
  divideFactor: number;
  angle: number;
}

type P5 = P5Instance<{ config: Config }>;

function sketch(p5: P5) {
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

  function commonSetup() {
    p5.resetMatrix();
    p5.background(config.background);
    p5.stroke(config.ruleset.color);
    let initialLength = config.ruleset.initLength(p5);
    angle = config.ruleset.angle;
    len = len || initialLength;

    const [xOff, yOff] = config.ruleset.initTranslation(p5, initialLength);

    console.log(xOff, yOff);
    p5.translate(xOff, yOff);
    config.ruleset.initRotation && config.ruleset.initRotation(p5);
  }

  function commonAfter() {
    len /= config.ruleset.divideFactor;
  }

  function drawForward() {
    p5.line(0, 0, 0, -len);
    p5.translate(0, -len);
  }

  const drawRules: Record<string, () => void> = {
    V: () => {},
    W: () => {},
    X: () => {},
    Y: () => {},
    Z: () => {},
    G: drawForward,
    F: drawForward,
    f: () => p5.translate(0, -len),
    "+": () => p5.rotate(angle * rotationDirection),
    "-": () => p5.rotate(angle * -rotationDirection),
    "|": () => p5.rotate(180),
    "[": () => p5.push(),
    "]": () => p5.pop(),
    "#": () => p5.strokeWeight((weight += weightIncrement)),
    "!": () => p5.strokeWeight((weight -= weightIncrement)),
    ">": () => (len *= scale),
    "<": () => (len /= scale),
    "&": () => (rotationDirection = -rotationDirection),
    "(": () => (angle += angleIncrement),
    ")": () => (angle -= angleIncrement),
  };

  function resetAndDraw() {
    p5.resetMatrix();
    p5.angleMode(p5.DEGREES);
    sentence = config.ruleset.axiom;
    len = 0;
    generateFractal();
  }

  function generateNextIteration() {
    let newSentence = "";
    commonSetup();

    console.log(len);
    console.log(angle);

    for (let char of sentence) {
      newSentence += config.ruleset.replace[char] || char;
      const drawFunc = drawRules[char];
      drawFunc();
    }
    commonAfter();

    sentence = newSentence;
  }

  function generateFractal() {
    if (computing) return;
    computing = true;
    currentIteration = 1;

    for (let i = 0; i <= config.iterations; i++) {
      generateNextIteration();
      currentIteration++;
    }
    computing = false;
  }

  function constrain(newIterations: number) {
    return p5.constrain(newIterations, 1, config.ruleset.maxIterations);
  }

  p5.updateWithProps = (props) => {
    if (props.config) {
      config = props.config;

      resetAndDraw();
    }
  };

  p5.setup = () => {
    p5.createCanvas(window.innerWidth, window.innerHeight);
  };

  p5.keyPressed = () => {
    if (p5.keyCode !== p5.LEFT_ARROW && p5.keyCode !== p5.RIGHT_ARROW) return;

    let inc = p5.keyCode === p5.LEFT_ARROW ? -1 : 1;

    config.iterations = constrain(config.iterations + inc);
    resetAndDraw();
  };

  p5.windowResized = () => {
    p5.resizeCanvas(window.innerWidth, window.innerHeight);
    resetAndDraw();
  };
}

type Props = {
  fractal: string;
};

const LSystem = ({ fractal }: Props) => {
  const [config, setConfig] = useState<Config>({
    iterations: rulesets[fractal].maxIterations - 1,
    animateIterations: false,
    background: "#252424",
    ruleset: rulesets[fractal],
  });

  useEffect(() => {
    if (!config.animateIterations) return;
    const id = setInterval(() => {
      setConfig((old) => {
        const newIterations = old.iterations + 1;
        return {
          ...old,
          iterations:
            newIterations > config.ruleset.maxIterations
              ? config.ruleset.minIterations
              : newIterations,
        };
      });
    }, 2000);
    return () => clearInterval(id);
  }, [config.animateIterations]);

  const handleUpdate = (newData: Config) => {
    setConfig((prevState) => ({
      ...prevState,
      ...newData,
      ruleset: { ...newData.ruleset },
    }));
  };

  return (
    <>
      <DatGui data={config} onUpdate={handleUpdate}>
        <DatFolder closed={true} title="Options">
          <DatColor path="background" label="background" />
          <DatNumber
            path="iterations"
            label="iterations"
            min={config.ruleset.minIterations}
            max={config.ruleset.maxIterations}
            step={1}
          />
          <DatBoolean path="animateIterations" label="animate iterations?" />
          <DatColor path="ruleset.color" label="color" />
        </DatFolder>
      </DatGui>

      <div className={styles.fullScreen}>
        <DynamicReactP5Wrapper sketch={sketch} config={config} />
      </div>
    </>
  );
};

export default LSystem;
