import { useEffect, useMemo, useState } from "react";
import { Canvas } from "../components/Canvas";
import { PanelColor, PanelNumber } from "../components/ExplorerControls";
import { ExplorerPanel } from "../components/ExplorerPanel";
import { NavElement } from "../components/Navbar";
import { SideDrawer } from "../components/SideDrawer";
import styles from "../styles/Fullscreen.module.css";
import { applyCanvasViewport } from "../utils/canvasViewport";
import { radians } from "../utils/ctxHelpers";
import { useCanvasViewport } from "../utils/hooks/useCanvasViewport";
import { useFractalFrame } from "../utils/hooks/useFractalFrame";
import { useFractalViewportSize } from "../utils/hooks/useFractalViewportSize";
import { contractingProjection, tribonacciWord } from "../utils/rauzy";
import { getDescription } from "../utils/readFiles";

type Props = {
  description: string;
};

type Config = {
  pointCount: number;
  pointSize: number;
  rotation: number;
  background: string;
  color1: string;
  color2: string;
  color3: string;
};

const MIN_POINTS = 1000;
const MAX_POINTS = 400000;
const PADDING = 0.08;

const RauzyFractal = ({ description }: Props) => {
  const { width, height } = useFractalViewportSize();
  const framing = useFractalFrame(width, height);
  const [ctx, setCtx] = useState<CanvasRenderingContext2D | null>(null);
  const viewport = useCanvasViewport(ctx?.canvas ?? null);
  const [config, setConfig] = useState<Config>({
    pointCount: 150000,
    pointSize: 1.2,
    rotation: 0,
    background: "#1d1c22",
    color1: "#f2a65a",
    color2: "#5ec2b7",
    color3: "#c06c9e",
  });

  const word = useMemo(() => tribonacciWord(MAX_POINTS), []);
  const projection = useMemo(() => contractingProjection(), []);

  const points = useMemo(() => {
    const count = Math.min(config.pointCount, word.length);
    const xs = new Float64Array(count);
    const ys = new Float64Array(count);
    const cos = Math.cos(radians(config.rotation));
    const sin = Math.sin(radians(config.rotation));
    let re = 0;
    let im = 0;

    for (let i = 0; i < count; i++) {
      xs[i] = re * cos - im * sin;
      ys[i] = re * sin + im * cos;
      const [dRe, dIm] = projection[word[i]];
      re += dRe;
      im += dIm;
    }

    return { xs, ys, count };
  }, [config.pointCount, config.rotation, projection, word]);

  useEffect(() => {
    if (!ctx || !width || !height) return;

    const { xs, ys, count } = points;
    let minX = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;

    for (let i = 0; i < count; i++) {
      minX = Math.min(minX, xs[i]);
      maxX = Math.max(maxX, xs[i]);
      minY = Math.min(minY, ys[i]);
      maxY = Math.max(maxY, ys[i]);
    }

    const fitHeight = height - (framing?.top ?? 0) - (framing?.bottom ?? 0);
    const drawWidth = maxX - minX || 1;
    const drawHeight = maxY - minY || 1;
    const scale = Math.min(
      (width * (1 - 2 * PADDING)) / drawWidth,
      (fitHeight * (1 - 2 * PADDING)) / drawHeight,
    );
    const xOffset = (width - drawWidth * scale) / 2 - minX * scale;
    // Flip y so the picture uses the usual mathematical orientation.
    const yOffset = (framing?.top ?? 0) + (fitHeight - drawHeight * scale) / 2 + maxY * scale;

    ctx.resetTransform();
    const ratio = window.devicePixelRatio || 1;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

    ctx.fillStyle = config.background;
    ctx.fillRect(0, 0, width, height);

    applyCanvasViewport(ctx, width, height, viewport);
    const size = config.pointSize;
    const half = size / 2;
    const colors = [config.color1, config.color2, config.color3];

    // Each point is colored by the letter that follows its prefix, which splits
    // the fractal into its three self-similar sub-tiles.
    colors.forEach((color, letter) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      for (let i = 0; i < count; i++) {
        if (word[i] !== letter) continue;
        ctx.rect(xOffset + xs[i] * scale - half, yOffset - ys[i] * scale - half, size, size);
      }
      ctx.fill();
    });
  }, [config, ctx, width, height, points, word, viewport, framing]);

  const handleUpdate = (newData: Config) => {
    setConfig((old) => ({ ...old, ...newData }));
  };

  return (
    <>
      <main className={styles.fullScreen}>
        <ExplorerPanel data={config} mode="pattern" onUpdate={handleUpdate}>
          <PanelColor path="background" />
          <PanelColor path="color1" label="Tile 1 color" />
          <PanelColor path="color2" label="Tile 2 color" />
          <PanelColor path="color3" label="Tile 3 color" />
          <PanelNumber
            path="pointCount"
            label="Points"
            min={MIN_POINTS}
            max={MAX_POINTS}
            step={1000}
          />
          <PanelNumber path="pointSize" min={0.5} max={4} step={0.1} />
          <PanelNumber path="rotation" min={-180} max={180} step={1} />
        </ExplorerPanel>
        <div
          data-fractal-viewport
          className={styles.viewport}
          style={{ background: config.background }}
        >
          {framing && <Canvas setCtx={setCtx} width={width} height={height} />}
        </div>
        <SideDrawer description={description} />
        <NavElement />
      </main>
    </>
  );
};

export default RauzyFractal;

export async function getStaticProps() {
  const description = await getDescription("rauzy-fractal.md");
  return {
    props: {
      description,
    },
  };
}
