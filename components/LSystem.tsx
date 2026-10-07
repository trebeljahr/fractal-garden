import { useEffect, useState } from "react";

import { Canvas } from "../components/Canvas";
import styles from "../styles/Fullscreen.module.css";
import { radians } from "../utils/ctxHelpers";
import { useWindowSize } from "../utils/hooks/useWindowResize";
import { explorerHref } from "../utils/lsystem/share";
import { DEFAULT_SPEC } from "../utils/lsystem/spec";
import { PanelBoolean, PanelColor, PanelNumber } from "./ExplorerControls";
import { ExplorerPanel } from "./ExplorerPanel";

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
  initRotation?: (ctx: CanvasRenderingContext2D, config?: Config) => void;
  divideFactor: number;
  angle: number;
}

type Props = {
  ruleset: Ruleset;
};

function expandSentence(sentence: string, replace: Record<string, string>) {
  let nextSentence = "";

  for (const char of sentence) {
    nextSentence += replace[char] || char;
  }

  return nextSentence;
}

// Hands the page's ruleset to the L-system explorer. initRotation is replayed
// against a stub context to recover the starting direction in degrees.
function openInExplorer(ruleset: Ruleset, iterations: number) {
  let startAngle = 0;
  const stub = { rotate: (angle: number) => (startAngle += (angle * 180) / Math.PI) };
  ruleset.initRotation?.(stub as unknown as CanvasRenderingContext2D);

  window.location.href = explorerHref({
    ...DEFAULT_SPEC,
    name: document.title.split(" | ")[0] || DEFAULT_SPEC.name,
    axiom: ruleset.axiom,
    rules: Object.entries(ruleset.replace).map(([symbol, replacement]) => ({
      symbol,
      replacement,
    })),
    angle: ruleset.angle,
    iterations,
    startAngle,
    color: ruleset.color.toLowerCase(),
    colorEnd: ruleset.color.toLowerCase(),
    colorMode: "solid",
  });
}

function hasDrawableSegment(sentence: string) {
  return sentence.includes("F") || sentence.includes("G");
}

function getFirstVisibleIteration(ruleset: Ruleset) {
  let sentence = ruleset.axiom;

  for (let iteration = 1; iteration <= ruleset.maxIterations; iteration++) {
    if (hasDrawableSegment(sentence)) {
      return iteration;
    }

    sentence = expandSentence(sentence, ruleset.replace);
  }

  return ruleset.minIterations;
}

const LSystem = ({ ruleset }: Props) => {
  const minVisibleIteration = Math.max(ruleset.minIterations, getFirstVisibleIteration(ruleset));
  const [config, setConfig] = useState<Config>(() => ({
    iterations: ruleset.maxIterations,
    animateIterations: true,
    background: "#252424",
    ruleset: ruleset,
  }));
  const { width, height } = useWindowSize();
  const [ctx, setCtx] = useState<CanvasRenderingContext2D | null>(null);

  useEffect(() => {
    if (!ctx || !width || !height) return;

    let rotationDirection = 1;
    let weight = 5;
    const weightIncrement = 0;
    const scale = 1;
    const angleIncrement = 0;
    let len = 0;
    let angle = 0;
    let sentence = "";
    let id: NodeJS.Timeout;

    const commonSetup = () => {
      ctx.resetTransform();
      const ratio = window.devicePixelRatio || 1;
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.fillStyle = config.background;
      ctx.fillRect(0, 0, width, height);
      ctx.strokeStyle = config.ruleset.color;

      const initialLength = config.ruleset.initLength({ width, height });
      angle = config.ruleset.angle;
      len = len || initialLength;

      const [xOff, yOff] = config.ruleset.initTranslation({ width, height }, initialLength);
      ctx.translate(xOff, yOff);
      config.ruleset.initRotation?.(ctx, config);
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
      const ratio = window.devicePixelRatio || 1;
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

      sentence = config.ruleset.axiom;
      len = 0;
      generateFractal();
    };

    function generateNextIteration() {
      let newSentence = "";
      commonSetup();

      for (const char of sentence) {
        newSentence += config.ruleset.replace[char] || char;
        const drawFunc = drawRules[char];
        drawFunc();
      }
      commonAfter();

      sentence = newSentence;
    }

    function generateFractal() {
      for (let i = 0; i < config.iterations; i++) {
        generateNextIteration();
      }

      if (!config.animateIterations) return;

      id = setTimeout(() => {
        setConfig((old) => {
          const newIterations = old.iterations + 1;
          return {
            ...old,
            iterations:
              newIterations > config.ruleset.maxIterations ? minVisibleIteration : newIterations,
          };
        });
      }, 1000);
    }

    resetAndDraw();

    return () => clearTimeout(id);
  }, [config, ctx, width, height, config.animateIterations, minVisibleIteration]);

  const handleUpdate = (newData: Config) => {
    setConfig((prevState) => ({
      ...prevState,
      ...newData,
      ruleset: { ...newData.ruleset },
    }));
  };

  return (
    <>
      <ExplorerPanel
        actions={[
          {
            label: "Edit these rules",
            onClick: () => openInExplorer(config.ruleset, config.ruleset.maxIterations),
          },
        ]}
        controlsHint="Iterations, palette, and the automatic growth loop."
        controlsTitle="L-System Studio"
        data={config}
        mode="pattern"
        onUpdate={handleUpdate}
      >
        <PanelColor path="background" />
        <PanelColor path="ruleset.color" />
        <PanelNumber
          path="iterations"
          min={minVisibleIteration}
          max={config.ruleset.maxIterations}
          step={1}
        />
        <PanelBoolean path="animateIterations" />
      </ExplorerPanel>

      <div className={styles.fullScreen}>
        <Canvas setCtx={setCtx} width={width} height={height} />
      </div>
    </>
  );
};

export default LSystem;
