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

export interface Ruleset {
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
  ruleset: Ruleset;
};

const LSystem = ({ ruleset }: Props) => {
  const [config, setConfig] = useState<Config>({
    iterations: ruleset.maxIterations - 1,
    animateIterations: true,
    background: "#252424",
    ruleset: ruleset,
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
          <DatColor path="ruleset.color" label="color" />

          <DatNumber
            path="iterations"
            label="iterations"
            min={config.ruleset.minIterations}
            max={config.ruleset.maxIterations}
            step={1}
          />
          <DatBoolean path="animateIterations" label="animate iterations?" />
        </DatFolder>
      </DatGui>

      <div className={styles.fullScreen}>
        <DynamicReactP5Wrapper sketch={sketch} config={config} />
      </div>
    </>
  );
};

export default LSystem;
