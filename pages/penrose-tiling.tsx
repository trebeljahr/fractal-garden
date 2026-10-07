import { useEffect, useMemo, useState } from "react";
import { Canvas } from "../components/Canvas";
import { PanelBoolean, PanelColor, PanelNumber, PanelSelect } from "../components/ExplorerControls";
import { ExplorerPanel } from "../components/ExplorerPanel";
import { NavElement } from "../components/Navbar";
import { SideDrawer } from "../components/SideDrawer";
import styles from "../styles/Fullscreen.module.css";
import { radians } from "../utils/ctxHelpers";
import { useWindowSize } from "../utils/hooks/useWindowResize";
import {
  deflate,
  getMaxIterations,
  getStartTriangles,
  mergeTiles,
  type PenroseStart,
  type PenroseTile,
  type PenroseVariant,
  type RobinsonTriangle,
} from "../utils/penroseTiling";
import { getDescription } from "../utils/readFiles";

type Props = {
  description: string;
};

type Config = {
  variant: PenroseVariant;
  start: PenroseStart;
  iterations: number;
  animateIterations: boolean;
  zoom: number;
  rotation: number;
  background: string;
  kiteColor: string;
  dartColor: string;
  thinColor: string;
  thickColor: string;
  showOutline: boolean;
  outlineColor: string;
  lineWidth: number;
};

const PADDING = 0.06;

const variantOptions: PenroseVariant[] = ["p2", "p3"];
const variantLabels: Record<PenroseVariant, string> = {
  p2: "P2 kite and dart",
  p3: "P3 rhombus",
};

const startOptions: PenroseStart[] = ["sun", "star"];
const startLabels: Record<PenroseStart, string> = {
  sun: "Sun",
  star: "Star",
};

function tracePolygon(ctx: CanvasRenderingContext2D, tile: PenroseTile, closed: boolean) {
  const [first, ...rest] = tile.points;
  ctx.moveTo(first[0], first[1]);
  for (const [x, y] of rest) {
    ctx.lineTo(x, y);
  }
  if (closed) {
    ctx.closePath();
  }
}

const PenroseTiling = ({ description }: Props) => {
  const { width, height } = useWindowSize();
  const [ctx, setCtx] = useState<CanvasRenderingContext2D | null>(null);
  const [config, setConfig] = useState<Config>({
    variant: "p2",
    start: "sun",
    iterations: 5,
    animateIterations: true,
    zoom: 1,
    rotation: 0,
    background: "#252424",
    kiteColor: "#f2b134",
    dartColor: "#3d7ea6",
    thinColor: "#e4572e",
    thickColor: "#76b041",
    showOutline: true,
    outlineColor: "#1b1a1a",
    lineWidth: 1,
  });

  const maxIterations = getMaxIterations(config.variant, config.start);

  const levels = useMemo(() => {
    const result: RobinsonTriangle[][] = [getStartTriangles(config.variant, config.start)];
    for (let i = 1; i <= maxIterations; i++) {
      result.push(deflate(result[i - 1], config.variant));
    }
    return result;
  }, [config.variant, config.start, maxIterations]);

  const tiles = useMemo(() => {
    const level = levels[Math.min(config.iterations, levels.length - 1)];
    return mergeTiles(level, config.variant);
  }, [levels, config.iterations, config.variant]);

  useEffect(() => {
    if (config.iterations <= maxIterations) return;

    setConfig((old) => ({
      ...old,
      iterations: maxIterations,
    }));
  }, [config.iterations, maxIterations]);

  useEffect(() => {
    if (!config.animateIterations) return;

    const delay = config.iterations >= maxIterations ? 1800 : 950;

    const id = setTimeout(() => {
      setConfig((old) => ({
        ...old,
        iterations: old.iterations >= maxIterations ? 0 : old.iterations + 1,
      }));
    }, delay);

    return () => clearTimeout(id);
  }, [config.animateIterations, config.iterations, maxIterations]);

  useEffect(() => {
    if (!ctx || !width || !height) return;

    const ratio = window.devicePixelRatio || 1;
    const scale = ((Math.min(width, height) * (1 - 2 * PADDING)) / 2) * config.zoom;
    const colors =
      config.variant === "p2"
        ? [config.kiteColor, config.dartColor]
        : [config.thinColor, config.thickColor];

    ctx.resetTransform();
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.fillStyle = config.background;
    ctx.fillRect(0, 0, width, height);

    ctx.translate(width / 2, height / 2);
    ctx.rotate(radians(config.rotation));
    ctx.scale(scale, scale);

    for (const type of [0, 1] as const) {
      ctx.beginPath();
      for (const tile of tiles) {
        if (tile.type === type) tracePolygon(ctx, tile, true);
      }
      ctx.fillStyle = colors[type];
      ctx.fill();
    }

    if (config.showOutline && config.lineWidth > 0) {
      ctx.beginPath();
      for (const tile of tiles) {
        tracePolygon(ctx, tile, tile.complete);
      }
      ctx.strokeStyle = config.outlineColor;
      ctx.lineWidth = config.lineWidth / scale;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.stroke();
    }
  }, [config, ctx, height, tiles, width]);

  const handleUpdate = (newData: Config) => {
    setConfig((old) => ({
      ...old,
      ...newData,
    }));
  };

  return (
    <>
      <main className={styles.fullScreen}>
        <ExplorerPanel data={config} mode="pattern" onUpdate={handleUpdate}>
          <PanelSelect
            path="variant"
            optionLabels={variantOptions.map((option) => variantLabels[option])}
            options={variantOptions}
          />
          <PanelSelect
            path="start"
            label="Start"
            optionLabels={startOptions.map((option) => startLabels[option])}
            options={startOptions}
          />
          <PanelNumber path="iterations" min={0} max={maxIterations} step={1} />
          <PanelBoolean path="animateIterations" />
          <PanelNumber path="zoom" label="Zoom" min={0.5} max={4} step={0.1} />
          <PanelNumber path="rotation" label="Rotation" min={-180} max={180} step={1} />
          <PanelColor path="background" />
          {config.variant === "p2" ? (
            <PanelColor key="kiteColor" path="kiteColor" label="Kite color" />
          ) : (
            <PanelColor key="thinColor" path="thinColor" label="Thin rhombus color" />
          )}
          {config.variant === "p2" ? (
            <PanelColor key="dartColor" path="dartColor" label="Dart color" />
          ) : (
            <PanelColor key="thickColor" path="thickColor" label="Thick rhombus color" />
          )}
          <PanelBoolean path="showOutline" label="Outline" />
          <PanelColor path="outlineColor" label="Outline color" />
          <PanelNumber path="lineWidth" min={0} max={4} step={0.1} />
        </ExplorerPanel>
        <div className={styles.fullScreen}>
          <Canvas setCtx={setCtx} width={width} height={height} />
        </div>
        <SideDrawer description={description} />
        <NavElement />
      </main>
    </>
  );
};

export default PenroseTiling;

export async function getStaticProps() {
  const description = await getDescription("penrose-tiling.md");
  return {
    props: {
      description,
    },
  };
}
