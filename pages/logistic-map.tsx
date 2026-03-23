import Head from "next/head";
import { useEffect, useRef, useState } from "react";
import DatGui, {
  DatColor,
  DatFolder,
  DatNumber,
  DatSelect,
} from "react-dat-gui";
import { Canvas } from "../components/Canvas";
import { NavElement } from "../components/Navbar";
import { SideDrawer } from "../components/SideDrawer";
import styles from "../styles/Fullscreen.module.css";
import { constrain } from "../utils/ctxHelpers";
import { useWindowSize } from "../utils/hooks/useWindowResize";
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

type Preset = keyof typeof PRESETS | "Custom";

type View = {
  rMin: number;
  rMax: number;
  xMin: number;
  xMax: number;
};

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

type DragState = {
  clientX: number;
  clientY: number;
  view: View;
};

const MIN_RANGE = 0.000001;
const MAX_RANGE = 10;

function logistic(r: number, x: number) {
  return r * x * (1 - x);
}

const LogisticMap = ({ description }: Props) => {
  const { width, height } = useWindowSize();
  const [ctx, setCtx] = useState<CanvasRenderingContext2D | null>(null);
  const [view, setView] = useState<View>(PRESETS.Full);
  const dragRef = useRef<DragState | null>(null);
  const viewRef = useRef<View>(PRESETS.Full);
  const [config, setConfig] = useState<Config>({
    preset: "Full",
    settleIterations: 300,
    plotIterations: 180,
    columns: 1400,
    pointAlpha: 0.12,
    pointSize: 1,
    background: "#0f1016",
    color: "#f0d66d",
  });

  useEffect(() => {
    viewRef.current = view;
  }, [view]);

  useEffect(() => {
    if (!ctx) return;

    const canvas = ctx.canvas;
    canvas.style.cursor = "grab";

    const handleMouseDown = (event: MouseEvent) => {
      dragRef.current = {
        clientX: event.clientX,
        clientY: event.clientY,
        view: { ...viewRef.current },
      };
      canvas.style.cursor = "grabbing";
    };

    const handleMouseMove = (event: MouseEvent) => {
      if (!dragRef.current) return;

      const rect = canvas.getBoundingClientRect();
      const xRange = dragRef.current.view.rMax - dragRef.current.view.rMin;
      const yRange = dragRef.current.view.xMax - dragRef.current.view.xMin;
      const deltaX = ((event.clientX - dragRef.current.clientX) / rect.width) * xRange;
      const deltaY = ((event.clientY - dragRef.current.clientY) / rect.height) * yRange;

      setConfig((old) =>
        old.preset === "Custom" ? old : { ...old, preset: "Custom" }
      );
      setView({
        rMin: dragRef.current.view.rMin - deltaX,
        rMax: dragRef.current.view.rMax - deltaX,
        xMin: dragRef.current.view.xMin + deltaY,
        xMax: dragRef.current.view.xMax + deltaY,
      });
    };

    const handleMouseUp = () => {
      dragRef.current = null;
      canvas.style.cursor = "grab";
    };

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();

      const rect = canvas.getBoundingClientRect();
      const px = (event.clientX - rect.left) / rect.width;
      const py = (event.clientY - rect.top) / rect.height;
      const zoomFactor = event.deltaY > 0 ? 1.14 : 0.86;

      setConfig((old) =>
        old.preset === "Custom" ? old : { ...old, preset: "Custom" }
      );
      setView((old) => {
        const xRange = old.rMax - old.rMin;
        const yRange = old.xMax - old.xMin;
        const nextXRange = constrain(xRange * zoomFactor, MIN_RANGE, MAX_RANGE);
        const nextYRange = constrain(yRange * zoomFactor, MIN_RANGE, MAX_RANGE);
        const focusR = old.rMin + px * xRange;
        const focusX = old.xMax - py * yRange;
        const rMin = focusR - px * nextXRange;
        const rMax = rMin + nextXRange;
        const xMax = focusX + py * nextYRange;
        const xMin = xMax - nextYRange;

        return {
          rMin,
          rMax,
          xMin,
          xMax,
        };
      });
    };

    canvas.addEventListener("mousedown", handleMouseDown);
    canvas.addEventListener("wheel", handleWheel, { passive: false });
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      canvas.removeEventListener("mousedown", handleMouseDown);
      canvas.removeEventListener("wheel", handleWheel);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [ctx]);

  useEffect(() => {
    if (!ctx || !width || !height) return;

    const ratio = Math.ceil(window.devicePixelRatio);
    const xRange = Math.max(view.rMax - view.rMin, MIN_RANGE);
    const yRange = Math.max(view.xMax - view.xMin, MIN_RANGE);
    const columns = Math.max(config.columns, 1);

    ctx.resetTransform();
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.globalAlpha = 1;
    ctx.fillStyle = config.background;
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = config.color;
    ctx.globalAlpha = config.pointAlpha;

    for (let column = 0; column < columns; column++) {
      const t = columns === 1 ? 0 : column / (columns - 1);
      const r = view.rMin + t * xRange;
      const px = t * width;
      let x = 0.5;

      for (let i = 0; i < config.settleIterations; i++) {
        x = logistic(r, x);
      }

      for (let i = 0; i < config.plotIterations; i++) {
        x = logistic(r, x);

        if (x < view.xMin || x > view.xMax) {
          continue;
        }

        const py = ((view.xMax - x) / yRange) * height;
        ctx.fillRect(px, py, config.pointSize, config.pointSize);
      }
    }

    ctx.globalAlpha = 1;
  }, [config, ctx, height, view, width]);

  const handleUpdate = (newData: Config) => {
    const merged = { ...config, ...newData };
    if (
      newData.preset &&
      newData.preset !== config.preset &&
      newData.preset !== "Custom"
    ) {
      setView(PRESETS[newData.preset]);
    }
    setConfig(merged);
  };

  return (
    <>
      <Head>
        <title>Logistic Map</title>
        <meta
          name="description"
          content="An interactive Logistic Map bifurcation diagram with zooming and panning. Explore the route from stable fixed points into period doubling and chaos."
        />
      </Head>
      <main className={styles.fullScreen}>
        <DatGui data={config} onUpdate={handleUpdate}>
          <DatFolder closed={true} title="Options">
            <DatColor path="background" label="background" />
            <DatColor path="color" label="color" />
            <DatSelect
              path="preset"
              label="preset"
              options={["Custom", ...Object.keys(PRESETS)]}
            />
            <DatNumber
              path="settleIterations"
              label="settle"
              min={50}
              max={1000}
              step={10}
            />
            <DatNumber
              path="plotIterations"
              label="plot"
              min={20}
              max={400}
              step={10}
            />
            <DatNumber
              path="columns"
              label="columns"
              min={200}
              max={2400}
              step={100}
            />
            <DatNumber
              path="pointAlpha"
              label="alpha"
              min={0.02}
              max={1}
              step={0.01}
            />
            <DatNumber
              path="pointSize"
              label="pointSize"
              min={0.5}
              max={2.5}
              step={0.1}
            />
          </DatFolder>
        </DatGui>
        <div className={styles.fullScreen}>
          <Canvas setCtx={setCtx} width={width} height={height} />
        </div>
        <SideDrawer description={description} />
        <NavElement />
      </main>
    </>
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
