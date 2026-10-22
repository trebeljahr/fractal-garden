import { Children, type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import zoomStyles from "../styles/DeepZoom.module.css";
import styles from "../styles/Fullscreen.module.css";
import { createViewport, MAX_DEPTH_BITS, matchesDeepViewport } from "../utils/deepZoom/math";
import {
  createDeepZoomRenderer,
  MAX_RENDER_ITERATIONS,
  type ZoomStatus,
} from "../utils/deepZoom/renderer";
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
import { useWindowSize } from "../utils/hooks/useWindowResize";
import { DeepZoomCanvas } from "./DeepZoomCanvas";
import { PanelColor, PanelNumber, PanelSelect } from "./ExplorerControls";
import { ExplorerPanel } from "./ExplorerPanel";
import { FractalPlaces } from "./FractalPlaces";
import { NavElement } from "./Navbar";
import { SideDrawer } from "./SideDrawer";

type Formula = "mandelbrot" | "julia" | "burning-ship";

type Props<T extends EscapeTimeColoring> = {
  formula: Formula;
  title: string;
  description: string;
  config: T;
  onUpdate: (newData: T) => void;
  onRestore: (newData: T) => void;
  initialCenter: [number, number];
  initialZoomSize: number;
  maxZoomSize?: number;
  flipY?: boolean;
  c?: [number, number];
  views?: EscapeTimePlace[];
  lines: string[];
  children?: ReactNode;
  shareRules?: ControlRule[];
};

/**
 * Fullscreen WebGL explorer shared by the Mandelbrot set, Julia sets and the
 * Burning Ship. All three share one shader and the same coloring controls.
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
  flipY = false,
  c = [0, 0],
  views = [],
  lines,
  children,
  shareRules,
}: Props<T>) {
  const { width, height } = useWindowSize();
  const [gl, setGl] = useState<WebGLRenderingContext | null>(null);
  const [cnv, setCnv] = useState<HTMLCanvasElement | null>(null);
  const viewportRef = useRef(createViewport(initialCenter, initialZoomSize));
  const rendererRef = useRef<ReturnType<typeof createDeepZoomRenderer> | null>(null);
  const [viewport, setViewport] = useState(viewportRef.current);
  const updateViewport = useCallback(() => {
    setViewport(viewportRef.current);
    rendererRef.current?.update();
  }, []);
  const [status, setStatus] = useState<ZoomStatus | null>(null);
  const stateRef = useRef({ config, c, width, height });
  stateRef.current = { config, c, width, height };
  const [cReal, cImag] = c;
  const getRenderedViewport = useCallback(() => rendererRef.current?.getViewport() ?? null, []);

  useDeepZoomControls({
    canvas: cnv,
    viewportRef,
    maxZoomSize,
    flipY,
    getRenderedViewport,
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
        setStatus,
      );
    } catch (error) {
      setStatus({
        logZoom: viewportRef.current.logZoom,
        iterations: stateRef.current.config.iterations,
        message: error instanceof Error ? error.message : String(error),
        error: true,
      });
      return;
    }
    rendererRef.current = renderer;
    cnv.addEventListener("garden:redraw", renderer.redraw);
    renderer.update();
    return () => {
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
              matchesParameters={(view) => matchesJuliaConstant(view, c)}
              matchesViewport={(view) =>
                matchesDeepViewport(
                  viewport,
                  createViewport(view.preciseCenter ?? view.center, view.zoomSize),
                )
              }
              onSelect={(view) => {
                viewportRef.current = createViewport(
                  view.preciseCenter ?? view.center,
                  view.zoomSize,
                );
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
            viewportRef.current = createViewport(initialCenter, initialZoomSize);
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
      <div className={styles.fullScreen}>
        <DeepZoomCanvas setGl={setGl} width={width} height={height} setCnv={setCnv} />
        {status && gl && (
          <output
            className={zoomStyles.status}
            data-fractal-chrome
            data-deep-zoom-status={status.message}
            aria-live="off"
          >
            <span>
              {status.logZoom < -3
                ? `10^${(-status.logZoom * Math.LOG10E * Math.LN2).toFixed(1)} zoom`
                : "Explore the boundary"}
            </span>
            <span>
              {status.logZoom <= -MAX_DEPTH_BITS ? "Precision budget reached" : status.message}
            </span>
            {status.logZoom < -7 && (
              <span>
                {status.iterations.toLocaleString()} iterations
                {status.iterations === MAX_RENDER_ITERATIONS ? " (limit)" : ""}
              </span>
            )}
          </output>
        )}
      </div>
      <SideDrawer description={description} />
      <NavElement />
    </main>
  );
}
