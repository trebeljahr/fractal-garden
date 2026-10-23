import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas } from "../components/Canvas";
import { PanelBoolean, PanelColor, PanelSelect } from "../components/ExplorerControls";
import { ExplorerPanel } from "../components/ExplorerPanel";
import { NavElement } from "../components/Navbar";
import { SideDrawer } from "../components/SideDrawer";
import styles from "../styles/Fullscreen.module.css";
import { createViewport, type DeepViewport } from "../utils/deepZoom/math";
import { FERN_LABELS, FERN_OPTIONS, FERN_PRESETS, type FernStyle } from "../utils/fernPresets";
import {
  createFernWalker,
  type FernMethod,
  fernBounds,
  fernOpeningSpan,
} from "../utils/fernViewport";
import { useDeepZoomControls } from "../utils/hooks/useDeepZoomControls";
import { useFractalViewportSize } from "../utils/hooks/useFractalViewportSize";
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
  const [revision, setRevision] = useState(0);
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
  const paused = useRef(config.paused);
  paused.current = config.paused;

  // Fit new styles and the opening view on resize. Preserve an explored center.
  useEffect(() => {
    if (!width || !height) return;
    if (
      !initialized.current ||
      lastStyle.current !== config.fernToUse ||
      view.current.logZoom >= previousOpening.current.logZoom - 1e-10
    ) {
      view.current = opening;
      setRevision((n) => n + 1);
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
    onChange: () => setRevision((n) => n + 1),
  });

  useEffect(() => {
    if (!ctx) return;
    const reset = () => {
      view.current = opening;
      setConfig((old) => ({ ...old, paused: true }));
      setRevision((n) => n + 1);
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

  useEffect(() => {
    if (!ctx || !width || !height || !initialized.current) return;
    const ratio = window.devicePixelRatio || 1;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.fillStyle = config.background;
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = config.color;
    const walker = createFernWalker(
      FERN_PRESETS[config.fernToUse].matrix,
      view.current,
      width,
      height,
      config.method,
      42 + revision,
    );
    ctx.canvas.dataset.fernLogZoom = String(opening.logZoom - view.current.logZoom);
    ctx.canvas.dataset.fernMethod = config.method;
    ctx.canvas.dataset.fernComplete = "false";
    let id = 0;
    let disposed = false;
    const draw = () => {
      const start = performance.now();
      do {
        const points = walker.step(800);
        for (let i = 0; i < points.length; i += 2) ctx.fillRect(points[i], points[i + 1], 1, 1);
        if (
          !walker.pending &&
          (config.method === "deterministic" || walker.samples >= 300000 || walker.tiles === 0)
        )
          break;
      } while (performance.now() - start < 6);
      const complete =
        !walker.pending &&
        (config.method === "deterministic" || walker.samples >= 300000 || walker.tiles === 0);
      ctx.canvas.dataset.fernSamples = String(walker.samples);
      ctx.canvas.dataset.fernVisited = String(walker.visited);
      ctx.canvas.dataset.fernResolution = String(walker.resolution);
      ctx.canvas.dataset.fernComplete = String(complete);
      if (
        !disposed &&
        (!complete || (!paused.current && config.method === "chaos" && walker.tiles))
      )
        id = requestAnimationFrame(draw);
    };
    // Every new viewport refines even when continuous playback is paused.
    draw();
    const resume = () => {
      cancelAnimationFrame(id);
      draw();
    };
    ctx.canvas.addEventListener("garden:fern-resume", resume);
    return () => {
      disposed = true;
      cancelAnimationFrame(id);
      ctx.canvas.removeEventListener("garden:fern-resume", resume);
    };
  }, [
    config.background,
    config.color,
    config.fernToUse,
    config.method,
    ctx,
    width,
    height,
    revision,
    opening,
  ]);

  useEffect(() => {
    if (!config.paused) ctx?.canvas.dispatchEvent(new Event("garden:fern-resume"));
  }, [config.paused, ctx]);

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
