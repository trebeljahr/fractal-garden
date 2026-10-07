import { useCallback, useMemo, useState } from "react";

import styles from "../styles/Fullscreen.module.css";
import { useGrowingFractal } from "../utils/hooks/useGrowingFractal";
import { useWindowSize } from "../utils/hooks/useWindowResize";
import type { ZoomFrame } from "../utils/lsystem/pageZoom";
import { explorerHref } from "../utils/lsystem/share";
import { DEFAULT_SPEC, dimensionOf, type LSystemSpec } from "../utils/lsystem/spec";
import type { LSystem2DParams } from "../utils/render/lsystem2d";
import { EndlessZoom } from "./EndlessZoom";
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

// Replays initRotation against a stub context to recover the starting heading
// and line width, so the drawing itself can run on a worker.
function readInitialPose(ruleset: Ruleset, config: Config) {
  let startAngle = 0;
  let lineWidth = 1;
  const stub = {
    rotate: (angle: number) => (startAngle += (angle * 180) / Math.PI),
    set lineWidth(value: number) {
      lineWidth = value;
    },
  };
  ruleset.initRotation?.(stub as unknown as CanvasRenderingContext2D, config);
  return { startAngle, lineWidth };
}

const LSystem = ({ ruleset }: Props) => {
  const minVisibleIteration = Math.max(ruleset.minIterations, getFirstVisibleIteration(ruleset));
  const [config, setConfig] = useState<Config>(() => ({
    iterations: minVisibleIteration,
    animateIterations: true,
    background: "#252424",
    ruleset: ruleset,
  }));
  const { width, height } = useWindowSize();

  const params = useMemo<LSystem2DParams | null>(() => {
    if (!width || !height) return null;
    const sizes = { width, height };
    const initialLength = config.ruleset.initLength(sizes);
    const { startAngle, lineWidth } = readInitialPose(config.ruleset, config);
    return {
      axiom: config.ruleset.axiom,
      replace: config.ruleset.replace,
      angle: config.ruleset.angle,
      startAngle,
      lineWidth,
      color: config.ruleset.color,
      background: config.background,
      initialLength,
      translation: config.ruleset.initTranslation(sizes, initialLength),
      divideFactor: config.ruleset.divideFactor,
      iterations: config.iterations,
    };
  }, [config, width, height]);

  const { containerRef, animateLabel } = useGrowingFractal({
    kind: "lsystem2d",
    storageKey: `l-system:${ruleset.axiom}:${JSON.stringify(ruleset.replace)}`,
    config,
    setConfig,
    params,
    width,
    height,
    min: minVisibleIteration,
    max: config.ruleset.maxIterations,
    stepDelay: 1000,
  });

  // Endless zoom starts from the page's own picture: the renderer steps
  // initialLength / divideFactor^generation from the translation, heading
  // clockwise from up, which is the explorer turtle's convention too.
  const generation = Math.max(0, config.iterations - 1);
  const zoomSpec = useMemo<LSystemSpec | null>(() => {
    if (!params) return null;
    const spec: LSystemSpec = {
      ...DEFAULT_SPEC,
      axiom: params.axiom,
      rules: Object.entries(params.replace).map(([symbol, replacement]) => ({
        symbol,
        replacement,
      })),
      angle: params.angle,
      startAngle: params.startAngle,
      color: params.color,
      colorEnd: params.color,
      colorMode: "solid",
      background: params.background,
      lineWidth: params.lineWidth,
    };
    return { ...spec, dimension: dimensionOf(spec) };
  }, [params]);
  const zoomFrame = useCallback(
    (): ZoomFrame => ({
      originX: params?.translation[0] ?? 0,
      originY: params?.translation[1] ?? 0,
      scale: params ? params.initialLength / params.divideFactor ** generation : 1,
    }),
    [params, generation],
  );
  // Growing further while zoomed in would pull the picture away.
  const onZoomActive = useCallback((active: boolean) => {
    if (active) setConfig((old) => ({ ...old, animateIterations: false }));
  }, []);

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
        controlsHint="Iterations, palette, and the automatic growth loop. Scroll on the drawing to zoom in endlessly."
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
        <PanelBoolean path="animateIterations" label={animateLabel} />
      </ExplorerPanel>

      <div className={styles.fullScreen} ref={containerRef} />
      {zoomSpec && zoomSpec.dimension === "2d" && (
        <EndlessZoom
          spec={zoomSpec}
          generation={generation}
          frame={zoomFrame}
          width={width}
          height={height}
          onActiveChange={onZoomActive}
        />
      )}
    </>
  );
};

export default LSystem;
