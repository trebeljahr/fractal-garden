import Head from "next/head";
import { useEffect, useState } from "react";
import { Canvas } from "../components/Canvas";
import {
  PanelBoolean,
  PanelColor,
  PanelNumber,
  PanelSelect,
} from "../components/ExplorerControls";
import { ExplorerPanel } from "../components/ExplorerPanel";
import { NavElement } from "../components/Navbar";
import { SideDrawer } from "../components/SideDrawer";
import styles from "../styles/Fullscreen.module.css";
import { useWindowSize } from "../utils/hooks/useWindowResize";
import { getDescription } from "../utils/readFiles";

type Props = {
  description: string;
};

type Variant = "saltire" | "cross";

type Config = {
  iterations: number;
  animateIterations: boolean;
  variant: Variant;
  background: string;
  color: string;
  fillSquares: boolean;
  strokeSquares: boolean;
  lineWidth: number;
};

const MAX_ITERATIONS = 6;
const PADDING = 0.08;
const OFFSETS: Record<Variant, [number, number][]> = {
  saltire: [
    [0, 0],
    [2, 0],
    [1, 1],
    [0, 2],
    [2, 2],
  ],
  cross: [
    [1, 0],
    [0, 1],
    [1, 1],
    [2, 1],
    [1, 2],
  ],
};

const variantOptions = Object.keys(OFFSETS) as Variant[];
const variantLabels: Record<Variant, string> = {
  saltire: "Diagonal cross",
  cross: "Greek cross",
};

const VicsekFractal2D = ({ description }: Props) => {
  const { width, height } = useWindowSize();
  const [ctx, setCtx] = useState<CanvasRenderingContext2D | null>(null);
  const [config, setConfig] = useState<Config>({
    iterations: MAX_ITERATIONS,
    animateIterations: true,
    variant: "saltire",
    background: "#252424",
    color: "#f2efde",
    fillSquares: true,
    strokeSquares: false,
    lineWidth: 0.8,
  });

  useEffect(() => {
    if (!config.animateIterations) return;

    const delay = config.iterations >= MAX_ITERATIONS ? 1800 : 950;
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

    const ratio = window.devicePixelRatio || 1;
    const size = Math.min(width, height) * (1 - 2 * PADDING);
    const originX = (width - size) / 2;
    const originY = (height - size) / 2;
    const offsets = OFFSETS[config.variant];

    const drawSquare = (x: number, y: number, len: number) => {
      if (config.fillSquares) {
        ctx.fillRect(x, y, len, len);
      }

      if (config.strokeSquares) {
        ctx.strokeRect(x, y, len, len);
      }
    };

    const drawVicsek = (x: number, y: number, len: number, depth: number) => {
      if (depth >= config.iterations) {
        drawSquare(x, y, len);
        return;
      }

      const nextLength = len / 3;

      for (let i = 0; i < offsets.length; i++) {
        const [offsetX, offsetY] = offsets[i];
        drawVicsek(
          x + offsetX * nextLength,
          y + offsetY * nextLength,
          nextLength,
          depth + 1
        );
      }
    };

    ctx.resetTransform();
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.fillStyle = config.background;
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = config.color;
    ctx.strokeStyle = config.color;
    ctx.lineWidth = config.lineWidth;
    ctx.lineJoin = "round";

    drawVicsek(originX, originY, size, 0);
  }, [config, ctx, height, width]);

  const handleUpdate = (newData: Config) => {
    setConfig((old) => ({
      ...old,
      ...newData,
    }));
  };

  return (
    <>
      <Head>
        <title>2D Vicsek Fractal</title>
        <meta
          name="description"
          content="An interactive 2D Vicsek fractal renderer with both saltire and cross variants. Explore the square-based cousin of the Sierpinski Carpet."
        />
      </Head>
      <main className={styles.fullScreen}>
        <ExplorerPanel data={config} mode="pattern" onUpdate={handleUpdate}>
          <PanelColor path="background" />
          <PanelColor path="color" />
          <PanelSelect
            path="variant"
            label="Layout"
            optionLabels={variantOptions.map((option) => variantLabels[option])}
            options={variantOptions}
          />
          <PanelNumber
            path="iterations"
            min={0}
            max={MAX_ITERATIONS}
            step={1}
          />
          <PanelBoolean path="animateIterations" />
          <PanelNumber path="lineWidth" min={0.2} max={3} step={0.1} />
          <PanelBoolean path="fillSquares" />
          <PanelBoolean path="strokeSquares" />
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

export default VicsekFractal2D;

export async function getStaticProps() {
  const description = await getDescription("vicsek-fractal-2d.md");
  return {
    props: {
      description,
    },
  };
}
