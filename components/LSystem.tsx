import { type ReactNode, useCallback, useMemo, useState } from "react";

import styles from "../styles/Fullscreen.module.css";
import { useFractalRenderer } from "../utils/hooks/useFractalRenderer";
import { useFractalViewportSize } from "../utils/hooks/useFractalViewportSize";
import { fittedFrame, type ZoomFrame } from "../utils/lsystem/pageZoom";
import { DEFAULT_SPEC, dimensionOf, type LSystemSpec } from "../utils/lsystem/spec";
import type { LSystem2DParams } from "../utils/render/lsystem2d";
import { EndlessZoom } from "./EndlessZoom";
import { PanelColor, PanelNumber } from "./ExplorerControls";
import { ExplorerPanel } from "./ExplorerPanel";
import { FractalPaletteContext } from "./FractalPalette";

type Config = {
  iterations: number;
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
  fitToViewport?: boolean;
}

type Props = {
  ruleset: Ruleset;
  children?: ReactNode;
  zoomDetailOffset?: number;
};

function expandSentence(sentence: string, replace: Record<string, string>) {
  let nextSentence = "";

  for (const char of sentence) {
    nextSentence += replace[char] || char;
  }

  return nextSentence;
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
function readInitialPose(ruleset: Ruleset, config?: Config) {
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

const LSystem = ({ ruleset, children, zoomDetailOffset = 0 }: Props) => {
  const minVisibleIteration = Math.max(ruleset.minIterations, getFirstVisibleIteration(ruleset));
  const [config, setConfig] = useState<Config>(() => ({
    iterations: minVisibleIteration,
    background: "#252424",
    ruleset: ruleset,
  }));
  const { width, height } = useFractalViewportSize();

  // Fit the mature fern once, so its branches grow in place without clipping
  // on narrow screens. The renderer and zoom layer use this same frame.
  const fitted = useMemo(() => {
    if (!width || !height || !config.ruleset.fitToViewport) return null;
    const { startAngle } = readInitialPose(config.ruleset);
    return fittedFrame(
      {
        ...DEFAULT_SPEC,
        axiom: config.ruleset.axiom,
        rules: Object.entries(config.ruleset.replace).map(([symbol, replacement]) => ({
          symbol,
          replacement,
        })),
        angle: config.ruleset.angle,
        startAngle,
      },
      config.ruleset.maxIterations - 1,
      width,
      height,
    );
  }, [config.ruleset, width, height]);

  const params = useMemo<LSystem2DParams | null>(() => {
    if (!width || !height) return null;
    const sizes = { width, height };
    const initialLength = fitted
      ? fitted.scale * config.ruleset.divideFactor ** (config.ruleset.maxIterations - 1)
      : config.ruleset.initLength(sizes);
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
      translation: fitted
        ? [fitted.originX, fitted.originY]
        : config.ruleset.initTranslation(sizes, initialLength),
      divideFactor: config.ruleset.divideFactor,
      iterations: config.iterations,
    };
  }, [config, width, height, fitted]);

  const { containerRef, ready } = useFractalRenderer({
    kind: "lsystem2d",
    storageKey: `l-system:${ruleset.axiom}:${JSON.stringify(ruleset.replace)}`,
    config,
    setConfig,
    params,
    constructionParams: (settings) => ({
      ...params!,
      ...readInitialPose(settings.ruleset, settings),
      iterations: settings.iterations,
      background: settings.background,
      color: settings.ruleset.color,
    }),
    width,
    height,
    min: minVisibleIteration,
    max: config.ruleset.maxIterations,
    stepDelay: 1000,
  });

  // Start endless zoom with the complete calibrated shape fitted to the viewport.
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
    (): ZoomFrame =>
      zoomSpec && width && height
        ? fittedFrame(zoomSpec, generation, width, height)
        : { originX: 0, originY: 0, scale: 1 },
    [zoomSpec, generation, width, height],
  );
  const handleUpdate = (newData: Config) => {
    setConfig((prevState) => ({
      ...prevState,
      ...newData,
      ruleset: { ...newData.ruleset },
    }));
  };

  const palette = useMemo(
    () => ({ color: config.ruleset.color, background: config.background }),
    [config.ruleset.color, config.background],
  );

  return (
    <FractalPaletteContext.Provider value={palette}>
      <ExplorerPanel data={config} mode="pattern" onUpdate={handleUpdate}>
        <PanelColor path="background" />
        <PanelColor path="ruleset.color" />
        <PanelNumber
          path="iterations"
          min={minVisibleIteration}
          max={config.ruleset.maxIterations}
          step={1}
        />
      </ExplorerPanel>

      <div
        data-fractal-viewport
        className={styles.viewport}
        style={{ background: config.background }}
        ref={containerRef}
      />
      {zoomSpec && zoomSpec.dimension === "2d" && (
        <EndlessZoom
          ready={ready}
          spec={zoomSpec}
          generation={generation}
          detailOffset={zoomDetailOffset}
          frame={zoomFrame}
          width={width}
          height={height}
        />
      )}
      {children}
    </FractalPaletteContext.Provider>
  );
};

export default LSystem;
