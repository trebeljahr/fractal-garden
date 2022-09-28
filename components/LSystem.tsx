import React, { useEffect, useState } from "react";

import styles from "../styles/Fullscreen.module.css";
import DatGui, {
  DatBoolean,
  DatColor,
  DatFolder,
  DatNumber,
} from "react-dat-gui";
import { useWindowSize } from "../utils/hooks/useWindowResize";
import { Canvas } from "../components/Canvas";
import { radians } from "../utils/ctxHelpers";

type Config = {
  iterations: number;
  animateIterations: boolean;
  background: string;
  ruleset: Ruleset;
};

interface Sizes {
  width: number;
  height: number;
}

export interface Ruleset {
  color: string;
  minIterations: number;
  maxIterations: number;
  axiom: string;
  replace: Record<string, string>;
  initLength: (sizes: Sizes) => number;
  initTranslation: (sizes: Sizes, initialLength: number) => [number, number];
  initRotation?: (ctx: CanvasRenderingContext2D) => void;
  divideFactor: number;
  angle: number;
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
  const { width, height } = useWindowSize();
  const [ctx, setCtx] = useState<CanvasRenderingContext2D | null>(null);

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

  useEffect(() => {
    if (!ctx || !width || !height) return;

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

    const commonSetup = () => {
      ctx.resetTransform();
      ctx.fillStyle = config.background;
      ctx.fillRect(0, 0, width, height);
      ctx.strokeStyle = config.ruleset.color;

      let initialLength = config.ruleset.initLength({ width, height });
      angle = config.ruleset.angle;
      len = len || initialLength;

      const [xOff, yOff] = config.ruleset.initTranslation(
        { width, height },
        initialLength
      );
      ctx.translate(xOff, yOff);
      config.ruleset.initRotation && config.ruleset.initRotation(ctx);
    };

    const commonAfter = () => {
      len /= config.ruleset.divideFactor;
    };

    const drawForward = () => {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -len);
      ctx.stroke();
      ctx.closePath();
      ctx.translate(0, -len);
    };

    const drawRules: Record<string, () => void> = {
      V: () => {},
      W: () => {},
      X: () => {},
      Y: () => {},
      Z: () => {},
      G: drawForward,
      F: drawForward,
      f: () => ctx.translate(0, -len),
      "+": () => ctx.rotate(radians(angle * rotationDirection)),
      "-": () => ctx.rotate(radians(angle * -rotationDirection)),
      "|": () => ctx.rotate(radians(180)),
      "[": () => ctx.save(),
      "]": () => ctx.restore(),
      "#": () => (ctx.lineWidth = weight += weightIncrement),
      "!": () => (ctx.lineWidth = weight -= weightIncrement),
      ">": () => (len *= scale),
      "<": () => (len /= scale),
      "&": () => (rotationDirection = -rotationDirection),
      "(": () => (angle += angleIncrement),
      ")": () => (angle -= angleIncrement),
    };

    const resetAndDraw = () => {
      ctx.resetTransform();
      sentence = config.ruleset.axiom;
      len = 0;
      generateFractal();
    };

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

    resetAndDraw();
  }, [config, ctx, width, height, config.animateIterations]);

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
        <Canvas setCtx={setCtx} width={width} height={height} />
      </div>
    </>
  );
};

export default LSystem;
