import { useCallback, useEffect, useRef, useState } from "react";
import { Canvas } from "../components/Canvas";
import { PanelColor, PanelNumber, PanelSelect } from "../components/ExplorerControls";
import { ExplorerPanel } from "../components/ExplorerPanel";
import { NavElement } from "../components/Navbar";
import { SideDrawer } from "../components/SideDrawer";
import styles from "../styles/Fullscreen.module.css";
import { finite, isRecord } from "../utils/explorerShare";
import { useExplorerPart } from "../utils/hooks/useExplorerPart";
import { useLogisticViewportControls } from "../utils/hooks/useLogisticViewportControls";
import { useWindowSize } from "../utils/hooks/useWindowResize";
import {
  FULL_LOGISTIC_VIEW,
  type LogisticRender,
  type LogisticView,
  renderLogistic,
} from "../utils/logisticMap";
import { getDescription } from "../utils/readFiles";

type Props = {
  description: string;
};

const PRESETS = {
  Full: {
    rMin: 2.5,
    rMax: 4,
    xMin: 0,
    xMax: 1,
  },
  "Period Doubling": {
    rMin: 2.9,
    rMax: 3.6,
    xMin: 0.2,
    xMax: 0.9,
  },
  "Chaotic Bands": {
    rMin: 3.55,
    rMax: 4,
    xMin: 0.2,
    xMax: 0.95,
  },
  Feigenbaum: {
    rMin: 3.4,
    rMax: 3.58,
    xMin: 0.3,
    xMax: 0.92,
  },
} as const;

const presetOptions = Object.keys(PRESETS) as Array<keyof typeof PRESETS>;
const logisticPresetOptions: Preset[] = ["Custom", ...presetOptions];
const presetLabels: Record<Preset, string> = {
  Custom: "Custom view",
  Full: "Whole cascade",
  "Period Doubling": "Early bifurcations",
  "Chaotic Bands": "Chaotic bands",
  Feigenbaum: "Feigenbaum window",
};

type Preset = keyof typeof PRESETS | "Custom";

type View = LogisticView;

type Config = {
  preset: Preset;
  settleIterations: number;
  plotIterations: number;
  columns: number;
  pointAlpha: number;
  pointSize: number;
  background: string;
  color: string;
};

const MIN_RANGE = 0.000001;
const MAX_RANGE = 10;
const INITIAL_VIEW: View = FULL_LOGISTIC_VIEW;

const LogisticMap = ({ description }: Props) => {
  const { width, height } = useWindowSize();
  const [ctx, setCtx] = useState<CanvasRenderingContext2D | null>(null);
  const renderRef = useRef<(() => void) | null>(null);
  const viewRef = useRef<View>(INITIAL_VIEW);
  const [config, setConfig] = useState<Config>({
    preset: "Full",
    settleIterations: 300,
    plotIterations: 180,
    columns: 1400,
    pointAlpha: 0.12,
    pointSize: 0.5,
    background: "#252424",
    color: "#f0d66d",
  });

  const configRef = useRef(config);
  const updateView = useCallback(() => {
    setConfig((old) => (old.preset === "Custom" ? old : { ...old, preset: "Custom" }));
    renderRef.current?.();
  }, []);
  useLogisticViewportControls(ctx?.canvas ?? null, viewRef, updateView);

  useExplorerPart(
    "logisticView",
    () => viewRef.current,
    (saved) => {
      if (
        !isRecord(saved) ||
        !finite(saved.rMin, -100, 100) ||
        !finite(saved.rMax, -100, 100) ||
        !finite(saved.xMin, -100, 100) ||
        !finite(saved.xMax, -100, 100) ||
        !finite(saved.rMax - saved.rMin, MIN_RANGE, MAX_RANGE) ||
        !finite(saved.xMax - saved.xMin, MIN_RANGE, MAX_RANGE)
      ) {
        throw new Error("Invalid diagram view");
      }
      viewRef.current = { rMin: saved.rMin, rMax: saved.rMax, xMin: saved.xMin, xMax: saved.xMax };
      renderRef.current?.();
    },
  );

  useEffect(() => {
    if (!ctx || !width || !height) return;
    let worker: Worker | null = null;
    let busy = false;
    let dirty = false;
    let frame = 0;
    let disposed = false;
    const request = (): LogisticRender => ({
      width: ctx.canvas.width,
      height: ctx.canvas.height,
      ratio: ctx.canvas.width / width,
      view: { ...viewRef.current },
      config: configRef.current,
    });
    const paint = (pixels: Uint8ClampedArray<ArrayBuffer>, w: number, h: number) => {
      if (ctx.canvas.width === w && ctx.canvas.height === h) {
        ctx.putImageData(new ImageData(pixels, w, h), 0, 0);
      }
    };
    const draw = () => {
      frame = 0;
      if (disposed || busy || !dirty) return;
      dirty = false;
      const job = request();
      if (worker) {
        busy = true;
        worker.postMessage(job);
      } else paint(renderLogistic(job), job.width, job.height);
    };
    const schedule = () => {
      dirty = true;
      if (!frame && !busy) frame = requestAnimationFrame(draw);
    };
    try {
      worker = new Worker(new URL("../utils/logistic.worker.ts", import.meta.url));
      worker.onmessage = ({ data }) => {
        busy = false;
        if (disposed) return;
        paint(data.pixels, data.width, data.height);
        if (dirty) schedule();
      };
      worker.onerror = () => {
        worker?.terminate();
        worker = null;
        busy = false;
        schedule();
      };
    } catch {
      // Keep the explorer usable when a browser cannot start a worker.
    }
    // Export must contain the current view even if its worker frame is still queued.
    const beforeExport = () => {
      const job = request();
      paint(renderLogistic(job), job.width, job.height);
    };
    window.addEventListener("garden:before-export", beforeExport);
    renderRef.current = schedule;
    schedule();
    return () => {
      disposed = true;
      renderRef.current = null;
      cancelAnimationFrame(frame);
      worker?.terminate();
      window.removeEventListener("garden:before-export", beforeExport);
    };
  }, [ctx, width, height]);

  useEffect(() => {
    configRef.current = config;
    renderRef.current?.();
  }, [config]);

  const handleUpdate = (newData: Config) => {
    const merged = { ...config, ...newData };
    if (newData.preset && newData.preset !== config.preset && newData.preset !== "Custom") {
      viewRef.current = { ...PRESETS[newData.preset] };
    }
    setConfig(merged);
  };

  return (
    <main className={styles.fullScreen}>
      <ExplorerPanel
        data={config}
        introTitle="Logistic Map"
        lines={["Drag to pan. Scroll or pinch to zoom."]}
        mode="formula"
        onUpdate={handleUpdate}
        onRestore={setConfig}
      >
        <PanelColor path="background" />
        <PanelColor path="color" />
        <PanelSelect
          path="preset"
          label="Starting view"
          optionLabels={logisticPresetOptions.map((option) => presetLabels[option])}
          options={logisticPresetOptions}
        />
        <PanelNumber path="settleIterations" min={50} max={1000} step={10} />
        <PanelNumber path="plotIterations" min={20} max={400} step={10} />
        <PanelNumber path="columns" min={200} max={2400} step={100} />
        <PanelNumber path="pointAlpha" min={0.02} max={1} step={0.01} />
        <PanelNumber path="pointSize" min={0.5} max={2.5} step={0.1} />
      </ExplorerPanel>
      <div className={styles.fullScreen}>
        <Canvas setCtx={setCtx} width={width} height={height} />
      </div>
      <SideDrawer description={description} />
      <NavElement />
    </main>
  );
};

export default LogisticMap;

export async function getStaticProps() {
  const description = await getDescription("logistic-map.md");
  return {
    props: {
      description,
    },
  };
}
