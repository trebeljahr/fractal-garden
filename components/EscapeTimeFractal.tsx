import { Children, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import zoomStyles from "../styles/DeepZoom.module.css";
import styles from "../styles/Fullscreen.module.css";
import { exportDeepZoomPng } from "../utils/deepZoom/export";
import { createViewport, matchesDeepViewport } from "../utils/deepZoom/math";
import type { EscapeFormula } from "../utils/deepZoom/orbit";
import { createDeepZoomRenderer, MAX_RENDER_ITERATIONS } from "../utils/deepZoom/renderer";
import { watchDisplayResolution } from "../utils/displayResolution";
import {
  COLOR_MODE_LABELS,
  COLOR_MODES,
  type EscapeTimeColoring,
  LOOK_LABELS,
  LOOK_OPTIONS,
  PALETTE_LABELS,
  PALETTES,
} from "../utils/escapeTimeColoring";
import type { ControlRule } from "../utils/explorerShare";
import { type EscapeTimePlace, matchesJuliaConstant } from "../utils/fractalPlaces";
import { useDeepZoomControls } from "../utils/hooks/useDeepZoomControls";
import { useFractalFrame } from "../utils/hooks/useFractalFrame";
import { useFractalViewportSize } from "../utils/hooks/useFractalViewportSize";
import { registerPngExporter } from "../utils/pngExport";
import { DeepZoomCanvas } from "./DeepZoomCanvas";
import { PanelColor, PanelNumber, PanelSelect } from "./ExplorerControls";
import { ExplorerPanel } from "./ExplorerPanel";
import { FractalPlaces } from "./FractalPlaces";
import { NavElement } from "./Navbar";
import { SideDrawer } from "./SideDrawer";

type Props<T extends EscapeTimeColoring> = {
  formula: EscapeFormula;
  title: string;
  description: string;
  config: T;
  onUpdate: (newData: T) => void;
  onRestore: (newData: T) => void;
  initialCenter: [number, number];
  initialZoomSize: number;
  maxZoomSize?: number;
  minLogZoom?: number;
  flipY?: boolean;
  c?: [number, number];
  views?: EscapeTimePlace[];
  lines: string[];
  children?: ReactNode;
  shareRules?: ControlRule[];
  placeMatches?: (view: EscapeTimePlace) => boolean;
};

/**
 * Fullscreen WebGL explorer shared by the Mandelbrot set, Julia sets, the Burning
 * Ship and their relatives. They share one shader and the same coloring controls.
 */
export function EscapeTimeFractal<T extends EscapeTimeColoring>({
  formula,
  title,
  description,
  config,
  onUpdate,
  onRestore,
  initialCenter,
  initialZoomSize,
  maxZoomSize = initialZoomSize,
  minLogZoom,
  flipY = false,
  c = [0, 0],
  views = [],
  lines,
  children,
  shareRules,
  placeMatches,
}: Props<T>) {
  const { width, height } = useFractalViewportSize();
  const frame = useFractalFrame(width, height);
  const opening = useMemo(() => {
    const fitHeight = frame ? Math.max(1, frame.height - frame.top - frame.bottom) : 1;
    const span = frame
      ? (initialZoomSize * Math.min(frame.width, frame.height)) / Math.min(frame.width, fitHeight)
      : initialZoomSize;
    const offset = frame
      ? (((frame.top - frame.bottom) * span) / Math.min(frame.width, frame.height)) *
        (flipY ? -1 : 1)
      : 0;
    return createViewport([initialCenter[0], initialCenter[1] + offset], span);
  }, [frame, initialCenter[0], initialCenter[1], initialZoomSize, flipY]);
  const isOpeningPlace = (view: EscapeTimePlace) =>
    view.zoomSize === initialZoomSize &&
    view.center[0] === initialCenter[0] &&
    view.center[1] === initialCenter[1];
  const previousOpening = useRef(opening);
  const [gl, setGl] = useState<WebGLRenderingContext | null>(null);
  const [cnv, setCnv] = useState<HTMLCanvasElement | null>(null);
  const viewportRef = useRef(createViewport(initialCenter, initialZoomSize));
  const rendererRef = useRef<ReturnType<typeof createDeepZoomRenderer> | null>(null);
  const [viewport, setViewport] = useState(viewportRef.current);
  const viewportUiFrame = useRef(0);
  const updateViewport = useCallback((interaction = false) => {
    // Apply every input to the renderer; update the Places menu once per frame.
    rendererRef.current?.update(interaction);
    if (interaction) {
      if (!viewportUiFrame.current)
        viewportUiFrame.current = requestAnimationFrame(() => {
          viewportUiFrame.current = 0;
          setViewport(viewportRef.current);
        });
    } else {
      cancelAnimationFrame(viewportUiFrame.current);
      viewportUiFrame.current = 0;
      setViewport(viewportRef.current);
    }
  }, []);
  useEffect(() => () => cancelAnimationFrame(viewportUiFrame.current), []);
  useEffect(() => {
    if (matchesDeepViewport(viewportRef.current, previousOpening.current)) {
      viewportRef.current = opening;
      updateViewport();
    }
    previousOpening.current = opening;
  }, [opening, updateViewport]);
  useEffect(() => {
    const reset = () => {
      viewportRef.current = opening;
      updateViewport();
    };
    window.addEventListener("garden:reset-pose", reset);
    return () => window.removeEventListener("garden:reset-pose", reset);
  }, [opening, updateViewport]);
  const [renderError, setRenderError] = useState("");
  const stateRef = useRef({ config, c, width, height });
  stateRef.current = { config, c, width, height };
  const [cReal, cImag] = c;

  useDeepZoomControls({
    canvas: cnv,
    viewportRef,
    maxZoomSize: Math.max(maxZoomSize, 2 ** opening.logZoom),
    minLogZoom,
    flipY,
    onChange: updateViewport,
  });

  useEffect(() => {
    if (!gl || !cnv) return;
    let renderer: ReturnType<typeof createDeepZoomRenderer>;
    try {
      renderer = createDeepZoomRenderer(
        gl,
        formula,
        () => ({
          ...stateRef.current,
          view: viewportRef.current,
          width: stateRef.current.width || 1,
          height: stateRef.current.height || 1,
        }),
        (status) => setRenderError(status.error ? status.message : ""),
        { interactive: true },
      );
    } catch (error) {
      setRenderError(error instanceof Error ? error.message : String(error));
      return;
    }
    rendererRef.current = renderer;
    const capture = new AbortController();
    const unregisterExport = registerPngExporter(cnv, (size) =>
      exportDeepZoomPng(
        formula,
        {
          ...stateRef.current,
          view: viewportRef.current,
          width: stateRef.current.width || 1,
          height: stateRef.current.height || 1,
        },
        size,
        capture.signal,
      ),
    );
    cnv.addEventListener("garden:redraw", renderer.redraw);
    const stopWatchingResolution = watchDisplayResolution(renderer.update);
    return () => {
      stopWatchingResolution();
      unregisterExport();
      capture.abort();
      cnv.removeEventListener("garden:redraw", renderer.redraw);
      renderer.destroy();
      rendererRef.current = null;
    };
  }, [gl, cnv, formula]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: every render input invalidates the frame
  useEffect(() => {
    rendererRef.current?.update();
  }, [config, cReal, cImag, width, height]);

  return (
    <main className={styles.fullScreen}>
      <ExplorerPanel
        places={
          views.length > 0 && (
            <FractalPlaces
              views={views}
              initialZoomSize={initialZoomSize}
              matchesParameters={placeMatches ?? ((view) => matchesJuliaConstant(view, c))}
              matchesViewport={(view) =>
                matchesDeepViewport(
                  viewport,
                  isOpeningPlace(view)
                    ? opening
                    : createViewport(view.preciseCenter ?? view.center, view.zoomSize),
                )
              }
              onSelect={(view) => {
                viewportRef.current = isOpeningPlace(view)
                  ? opening
                  : createViewport(view.preciseCenter ?? view.center, view.zoomSize);
                onRestore({
                  ...config,
                  ...view.parameters,
                  iterations: view.iterations ?? config.iterations,
                });
                updateViewport();
              }}
            />
          )
        }
        shareRules={shareRules}
        data={config}
        introTitle={title}
        lines={lines}
        mode="formula"
        onUpdate={(newData) => {
          // Studio family changes start wide; destination restores retain their framing.
          if ("preset" in config && "preset" in newData && config.preset !== newData.preset) {
            viewportRef.current = opening;
            updateViewport();
          }
          onUpdate(newData);
        }}
        onRestore={onRestore}
      >
        {/* DatFolder clones every child, so drop empty slots first. */}
        {Children.toArray(children)}
        <PanelSelect path="look" label="Look" optionLabels={LOOK_LABELS} options={LOOK_OPTIONS} />
        <PanelSelect
          path="colorMode"
          label="Coloring"
          optionLabels={COLOR_MODES.map((mode) => COLOR_MODE_LABELS[mode])}
          options={[...COLOR_MODES]}
        />
        <PanelSelect
          path="palette"
          label="Palette"
          optionLabels={PALETTES.map((palette) => PALETTE_LABELS[palette])}
          options={[...PALETTES]}
        />
        <PanelNumber
          path="iterations"
          label="Minimum iterations"
          min={10}
          max={MAX_RENDER_ITERATIONS}
          step={10}
        />
        <PanelNumber path="colorDensity" label="Color density" min={0.1} max={10} step={0.1} />
        <PanelNumber path="colorOffset" label="Color offset" min={0} max={1} step={0.01} />
        <PanelColor path="interior" label="Interior" />
      </ExplorerPanel>
      <div data-fractal-viewport className={styles.viewport}>
        {frame && <DeepZoomCanvas setGl={setGl} width={width} height={height} setCnv={setCnv} />}
        {renderError && gl && (
          <output className={zoomStyles.error} data-fractal-chrome role="alert">
            {renderError}
          </output>
        )}
      </div>
      <SideDrawer description={description} />
      <NavElement />
    </main>
  );
}
