import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas } from "../components/Canvas";
import { PanelBoolean, PanelColor, PanelSelect } from "../components/ExplorerControls";
import { ExplorerPanel } from "../components/ExplorerPanel";
import { NavElement } from "../components/Navbar";
import { SideDrawer } from "../components/SideDrawer";
import styles from "../styles/Fullscreen.module.css";
import { createViewport, type DeepViewport } from "../utils/deepZoom/math";
import { FERN_LABELS, FERN_OPTIONS, FERN_PRESETS, type FernStyle } from "../utils/fernPresets";
import { FernViewportRenderer } from "../utils/fernRenderer";
import { type FernMethod, fernBounds, fernOpeningSpan } from "../utils/fernViewport";
import { useDeepZoomControls } from "../utils/hooks/useDeepZoomControls";
import { useFractalViewportSize } from "../utils/hooks/useFractalViewportSize";
import { useReducedMotion } from "../utils/hooks/useReducedMotion";
import { getDescription } from "../utils/readFiles";

type Config = {
  paused: boolean;
  color: string;
  background: string;
  fernToUse: FernStyle;
  method: FernMethod;
};

type Props = { description: string };

const BarnsleyFern = ({ description }: Props) => {
  const [config, setConfig] = useState<Config>({
    paused: true,
    color: "#96f78e",
    background: "#252424",
    fernToUse: "barnsley",
    method: "chaos",
  });
  const { width, height } = useFractalViewportSize();
  const [ctx, setCtx] = useState<CanvasRenderingContext2D | null>(null);
  const renderer = useRef<FernViewportRenderer | null>(null);
  const reducedMotion = useReducedMotion();
  const view = useRef<DeepViewport>(createViewport([0, 0], 1));
  const bounds = useMemo(
    () => fernBounds(FERN_PRESETS[config.fernToUse].matrix),
    [config.fernToUse],
  );
  const span = width && height ? fernOpeningSpan(bounds, width, height) : 1;
  const opening = useMemo(() => createViewport([bounds.x, bounds.y], span), [bounds, span]);
  const previousOpening = useRef(opening);
  const initialized = useRef(false);
  const lastStyle = useRef(config.fernToUse);

  // Fit new styles and the opening view on resize. Preserve an explored center.
  useEffect(() => {
    if (!width || !height) return;
    if (
      !initialized.current ||
      lastStyle.current !== config.fernToUse ||
      view.current.logZoom >= previousOpening.current.logZoom - 1e-10
    ) {
      view.current = opening;
      renderer.current?.setView(view.current);
    }
    initialized.current = true;
    previousOpening.current = opening;
    lastStyle.current = config.fernToUse;
  }, [opening, config.fernToUse, width, height]);

  useDeepZoomControls({
    canvas: ctx?.canvas ?? null,
    viewportRef: view,
    maxZoomSize: span,
    flipY: false,
    onChange: () => {
      if (ctx) ctx.canvas.dataset.fernLogZoom = String(opening.logZoom - view.current.logZoom);
      renderer.current?.setView(view.current);
    },
  });

  useEffect(() => {
    if (!ctx) return;
    const reset = () => {
      view.current = opening;
      ctx.canvas.dataset.fernLogZoom = "0";
      setConfig((old) => ({ ...old, paused: true }));
      renderer.current?.setView(view.current);
    };
    ctx.canvas.setAttribute(
      "aria-label",
      "Interactive fern. Drag to pan; scroll or pinch to reveal new dots; double-click to reset.",
    );
    ctx.canvas.addEventListener("dblclick", reset);
    window.addEventListener("garden:reset-pose", reset);
    return () => {
      ctx.canvas.removeEventListener("dblclick", reset);
      window.removeEventListener("garden:reset-pose", reset);
    };
  }, [ctx, opening]);

  // Pause changes continue the same dot sequence rather than restarting it.
  // biome-ignore lint/correctness/useExhaustiveDependencies: paused is updated in the following effect
  useEffect(() => {
    if (!ctx || !width || !height || !initialized.current) return;
    ctx.canvas.dataset.fernLogZoom = String(opening.logZoom - view.current.logZoom);
    ctx.canvas.dataset.fernMethod = config.method;
    const active = new FernViewportRenderer(ctx, {
      matrix: FERN_PRESETS[config.fernToUse].matrix,
      view: view.current,
      width,
      height,
      ratio: window.devicePixelRatio || 1,
      method: config.method,
      background: config.background,
      color: config.color,
      paused: config.paused,
      reducedMotion,
      onProgress: ({ samples, visited, resolution, complete }) => {
        ctx.canvas.dataset.fernSamples = String(samples);
        ctx.canvas.dataset.fernVisited = String(visited);
        ctx.canvas.dataset.fernResolution = String(resolution);
        ctx.canvas.dataset.fernComplete = String(complete);
      },
    });
    renderer.current = active;
    return () => {
      active.dispose();
      if (renderer.current === active) renderer.current = null;
    };
  }, [
    config.background,
    config.color,
    config.fernToUse,
    config.method,
    ctx,
    width,
    height,
    opening,
    reducedMotion,
  ]);

  useEffect(() => {
    renderer.current?.setPaused(config.paused);
  }, [config.paused]);

  const controls = (
    <>
      <PanelSelect
        path="fernToUse"
        label="Fern style"
        optionLabels={FERN_OPTIONS.map((option) => FERN_LABELS[option])}
        options={FERN_OPTIONS}
      />
      <PanelSelect
        path="method"
        label="Construction method"
        options={["chaos", "deterministic"]}
        optionLabels={["Chaos game", "All four maps"]}
      />
      {config.method === "chaos" && <PanelBoolean path="paused" />}
      <PanelColor path="background" />
      <PanelColor path="color" />
    </>
  );
  return (
    <main className={styles.fullScreen}>
      <ExplorerPanel
        data={config}
        mode="pattern"
        explorationControls={controls}
        onUpdate={(data) => setConfig((old) => ({ ...old, ...data }))}
      >
        {controls}
      </ExplorerPanel>
      <div
        data-fractal-viewport
        className={styles.viewport}
        style={{ background: config.background }}
      >
        <Canvas setCtx={setCtx} width={width} height={height} />
      </div>
      <SideDrawer description={description} />
      <NavElement />
    </main>
  );
};

export default BarnsleyFern;

export async function getStaticProps() {
  return { props: { description: await getDescription("barnsley-fern.md") } };
}
