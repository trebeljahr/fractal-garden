import { useEffect, useState } from "react";
import { Canvas } from "../components/Canvas";
import { PanelBoolean, PanelColor, PanelNumber } from "../components/ExplorerControls";
import { ExplorerPanel } from "../components/ExplorerPanel";
import { NavElement } from "../components/Navbar";
import { SideDrawer } from "../components/SideDrawer";
import styles from "../styles/Fullscreen.module.css";
import { useWindowSize } from "../utils/hooks/useWindowResize";
import { getDescription } from "../utils/readFiles";

type Props = {
  description: string;
};

type Config = {
  iterations: number;
  animateIterations: boolean;
  ratio: number;
  rootWidth: number;
  widthFactor: number;
  background: string;
  rootColor: string;
  tipColor: string;
};

const MAX_ITERATIONS = 14;
const PADDING = 0.08;

function hexToRgb(hex: string): [number, number, number] {
  const value = Number.parseInt(hex.replace("#", ""), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function mixColors(from: string, to: string, t: number) {
  const a = hexToRgb(from);
  const b = hexToRgb(to);
  const [r, g, bl] = a.map((channel, i) => Math.round(channel + (b[i] - channel) * t));
  return `rgb(${r}, ${g}, ${bl})`;
}

const HTree = ({ description }: Props) => {
  const { width, height } = useWindowSize();
  const [ctx, setCtx] = useState<CanvasRenderingContext2D | null>(null);
  const [config, setConfig] = useState<Config>({
    iterations: 10,
    animateIterations: true,
    ratio: Math.SQRT1_2,
    rootWidth: 10,
    widthFactor: 0.78,
    background: "#252424",
    rootColor: "#f5b971",
    tipColor: "#7fd8e8",
  });

  useEffect(() => {
    if (!config.animateIterations) return;

    const delay = config.iterations >= MAX_ITERATIONS ? 1800 : 650;

    const id = setTimeout(() => {
      setConfig((old) => ({
        ...old,
        iterations: old.iterations >= MAX_ITERATIONS ? 0 : old.iterations + 1,
      }));
    }, delay);

    return () => clearTimeout(id);
  }, [config.animateIterations, config.iterations]);

  useEffect(() => {
    if (!ctx || !width || !height) return;

    // Fit the limit shape, not the current iteration, so the tree grows in place
    // while animating. Horizontal segments sit at even depths, vertical at odd.
    const r2 = config.ratio * config.ratio;
    const halfWidth = 0.5 / (1 - r2);
    const halfHeight = (0.5 * config.ratio) / (1 - r2);
    const rootLength = Math.min(
      (width * (1 - 2 * PADDING)) / (2 * halfWidth),
      (height * (1 - 2 * PADDING)) / (2 * halfHeight),
    );

    // One path per depth keeps the number of stroke calls tiny.
    const paths = [...new Array(config.iterations + 1)].map(() => new Path2D());

    const grow = (x: number, y: number, length: number, horizontal: boolean, depth: number) => {
      const half = length / 2;
      const [x0, y0, x1, y1] = horizontal ? [x - half, y, x + half, y] : [x, y - half, x, y + half];

      const path = paths[depth];
      path.moveTo(x0, y0);
      path.lineTo(x1, y1);

      if (depth >= config.iterations) return;

      grow(x0, y0, length * config.ratio, !horizontal, depth + 1);
      grow(x1, y1, length * config.ratio, !horizontal, depth + 1);
    };

    grow(width / 2, height / 2, rootLength, true, 0);

    ctx.resetTransform();
    const ratio = window.devicePixelRatio || 1;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

    ctx.fillStyle = config.background;
    ctx.fillRect(0, 0, width, height);

    ctx.lineCap = "round";

    paths.forEach((path, depth) => {
      const t = depth / MAX_ITERATIONS;
      ctx.strokeStyle = mixColors(config.rootColor, config.tipColor, t);
      ctx.lineWidth = Math.max(0.4, config.rootWidth * config.widthFactor ** depth);
      ctx.stroke(path);
    });
  }, [config, ctx, width, height]);

  const handleUpdate = (newData: Config) => {
    setConfig((old) => ({ ...old, ...newData }));
  };

  return (
    <>
      <main className={styles.fullScreen}>
        <ExplorerPanel data={config} mode="pattern" onUpdate={handleUpdate}>
          <PanelColor path="background" />
          <PanelColor path="rootColor" label="Root color" />
          <PanelColor path="tipColor" label="Tip color" />
          <PanelNumber path="iterations" min={0} max={MAX_ITERATIONS} step={1} />
          <PanelBoolean path="animateIterations" />
          <PanelNumber path="ratio" min={0.5} max={0.8} step={0.001} />
          <PanelNumber path="rootWidth" min={0.5} max={30} step={0.5} />
          <PanelNumber path="widthFactor" min={0.5} max={1} step={0.01} />
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

export default HTree;

export async function getStaticProps() {
  const description = await getDescription("h-tree.md");
  return {
    props: {
      description,
    },
  };
}
