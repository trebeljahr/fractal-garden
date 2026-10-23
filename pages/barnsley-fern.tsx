import { useEffect, useMemo, useRef, useState } from "react";
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
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);
  const renderer = useRef<FernViewportRenderer | null>(null);
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
    canvas,
    viewportRef: view,
    maxZoomSize: span,
    flipY: false,
    onChange: () => {
      if (canvas) canvas.dataset.fernLogZoom = String(opening.logZoom - view.current.logZoom);
      renderer.current?.setView(view.current);
    },
  });

  useEffect(() => {
    if (!canvas) return;
    const reset = () => {
      view.current = opening;
      canvas.dataset.fernLogZoom = "0";
      setConfig((old) => ({ ...old, paused: true }));
      renderer.current?.setView(view.current);
    };
    canvas.setAttribute(
      "aria-label",
      "Interactive fern. Drag to pan; scroll or pinch to reveal new dots; double-click to reset.",
    );
    canvas.addEventListener("dblclick", reset);
    window.addEventListener("garden:reset-pose", reset);
    return () => {
      canvas.removeEventListener("dblclick", reset);
      window.removeEventListener("garden:reset-pose", reset);
    };
  }, [canvas, opening]);

  const latest = useRef({ width, height, config });
  latest.current = { width, height, config };
  useEffect(() => {
    const { width, height, config: initial } = latest.current;
    if (!canvas || !width || !height) return;
    const active = new FernViewportRenderer(canvas, {
      matrix: FERN_PRESETS[config.fernToUse].matrix,
      view: view.current,
      width,
      height,
      method: config.method,
      background: initial.background,
      color: initial.color,
      paused: initial.paused,
      onProgress: ({ samples, visited, resolution, complete, count }) => {
        canvas.dataset.fernSamples = String(samples);
        canvas.dataset.fernVisited = String(visited);
        canvas.dataset.fernResolution = String(resolution);
        canvas.dataset.fernComplete = String(complete);
        canvas.dataset.fernPoints = String(count);
      },
    });
    renderer.current = active;
    canvas.dataset.fernLogZoom = String(previousOpening.current.logZoom - view.current.logZoom);
    canvas.dataset.fernMethod = config.method;
    return () => {
      active.dispose();
      if (renderer.current === active) renderer.current = null;
    };
  }, [canvas, config.fernToUse, config.method]);

  useEffect(() => {
    if (width && height) renderer.current?.resize(width, height);
  }, [width, height]);
  useEffect(() => {
    renderer.current?.setStyle(config.color, config.background);
  }, [config.color, config.background]);
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
        {width && height && <canvas ref={setCanvas} />}
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
