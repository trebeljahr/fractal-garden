import Head from "next/head";
import { useEffect, useState } from "react";
import DatGui, {
  DatBoolean,
  DatColor,
  DatFolder,
  DatNumber,
} from "react-dat-gui";
import { Canvas } from "../components/Canvas";
import { NavElement } from "../components/Navbar";
import { SideDrawer } from "../components/SideDrawer";
import styles from "../styles/Fullscreen.module.css";
import { getDescription } from "../utils/readFiles";
import { useWindowSize } from "../utils/hooks/useWindowResize";

type Props = {
  description: string;
};

type Config = {
  iterations: number;
  animateIterations: boolean;
  ratio: number;
  background: string;
  color: string;
  fillSquares: boolean;
  strokeSquares: boolean;
  lineWidth: number;
};

const MAX_ITERATIONS = 9;
const PADDING = 0.08;

type Bounds = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
};

function measureTSquareBounds(iterations: number, ratio: number): Bounds {
  const bounds: Bounds = {
    minX: Number.POSITIVE_INFINITY,
    maxX: Number.NEGATIVE_INFINITY,
    minY: Number.POSITIVE_INFINITY,
    maxY: Number.NEGATIVE_INFINITY,
  };

  const measure = (
    centerX: number,
    centerY: number,
    size: number,
    depth: number
  ) => {
    const half = size / 2;
    bounds.minX = Math.min(bounds.minX, centerX - half);
    bounds.maxX = Math.max(bounds.maxX, centerX + half);
    bounds.minY = Math.min(bounds.minY, centerY - half);
    bounds.maxY = Math.max(bounds.maxY, centerY + half);

    if (depth >= iterations) return;

    const nextSize = size * ratio;
    const offset = size / 2;

    measure(centerX - offset, centerY - offset, nextSize, depth + 1);
    measure(centerX + offset, centerY - offset, nextSize, depth + 1);
    measure(centerX - offset, centerY + offset, nextSize, depth + 1);
    measure(centerX + offset, centerY + offset, nextSize, depth + 1);
  };

  measure(0, 0, 1, 0);

  return bounds;
}

const TSquareFractal = ({ description }: Props) => {
  const { width, height } = useWindowSize();
  const [ctx, setCtx] = useState<CanvasRenderingContext2D | null>(null);
  const [config, setConfig] = useState<Config>({
    iterations: 6,
    animateIterations: true,
    ratio: 0.5,
    background: "#ffffff",
    color: "#111111",
    fillSquares: true,
    strokeSquares: false,
    lineWidth: 0.8,
  });

  useEffect(() => {
    if (!config.animateIterations) return;

    const delay = config.iterations === MAX_ITERATIONS ? 1800 : 850;

    const id = setTimeout(() => {
      setConfig((old) => ({
        ...old,
        iterations:
          old.iterations >= MAX_ITERATIONS
            ? 0
            : Math.min(old.iterations + 1, MAX_ITERATIONS),
      }));
    }, delay);

    return () => clearTimeout(id);
  }, [config.animateIterations, config.iterations]);

  useEffect(() => {
    if (!ctx || !width || !height) return;

    const bounds = measureTSquareBounds(config.iterations, config.ratio);
    const drawWidth = bounds.maxX - bounds.minX;
    const drawHeight = bounds.maxY - bounds.minY;
    const scale = Math.min(
      (width * (1 - 2 * PADDING)) / drawWidth,
      (height * (1 - 2 * PADDING)) / drawHeight
    );
    const xOffset = (width - drawWidth * scale) / 2 - bounds.minX * scale;
    const yOffset = (height - drawHeight * scale) / 2 - bounds.minY * scale;

    const drawSquare = (centerX: number, centerY: number, size: number) => {
      const scaledSize = size * scale;
      const half = scaledSize / 2;
      ctx.beginPath();
      ctx.rect(
        xOffset + centerX * scale - half,
        yOffset + centerY * scale - half,
        scaledSize,
        scaledSize
      );
      if (config.fillSquares) {
        ctx.fill();
      }
      if (config.strokeSquares) {
        ctx.stroke();
      }
      ctx.closePath();
    };

    const drawTSquare = (
      centerX: number,
      centerY: number,
      size: number,
      depth: number
    ) => {
      drawSquare(centerX, centerY, size);

      if (depth >= config.iterations) return;

      const nextSize = size * config.ratio;
      const offset = size / 2;

      drawTSquare(centerX - offset, centerY - offset, nextSize, depth + 1);
      drawTSquare(centerX + offset, centerY - offset, nextSize, depth + 1);
      drawTSquare(centerX - offset, centerY + offset, nextSize, depth + 1);
      drawTSquare(centerX + offset, centerY + offset, nextSize, depth + 1);
    };

    ctx.resetTransform();
    const ratio = window.devicePixelRatio || 1;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

    ctx.fillStyle = config.background;
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = config.color;
    ctx.strokeStyle = config.color;
    ctx.lineWidth = config.lineWidth;
    ctx.lineJoin = "miter";
    ctx.lineCap = "square";

    drawTSquare(0, 0, 1, 0);
  }, [config, ctx, width, height]);

  const handleUpdate = (newData: Config) => {
    setConfig((old) => ({ ...old, ...newData }));
  };

  return (
    <>
      <Head>
        <title>T-Square Fractal</title>
        <meta
          name="description"
          content="An interactive T-Square fractal with adjustable scaling between iterations. Explore the classic recursive square construction and its family resemblance to Sierpinski-style patterns."
        />
      </Head>
      <main className={styles.fullScreen}>
        <DatGui data={config} onUpdate={handleUpdate}>
          <DatFolder closed={false} title="Options">
            <DatColor path="background" label="background" />
            <DatColor path="color" label="color" />
            <DatNumber
              path="iterations"
              label="iterations"
              min={0}
              max={MAX_ITERATIONS}
              step={1}
            />
            <DatNumber
              path="ratio"
              label="ratio"
              min={0.25}
              max={0.75}
              step={0.01}
            />
            <DatNumber
              path="lineWidth"
              label="lineWidth"
              min={0.5}
              max={4}
              step={0.1}
            />
            <DatBoolean path="animateIterations" label="animate" />
            <DatBoolean path="fillSquares" label="fill" />
            <DatBoolean path="strokeSquares" label="stroke" />
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

export default TSquareFractal;

export async function getStaticProps() {
  const description = await getDescription("t-square-fractal.md");
  return {
    props: {
      description,
    },
  };
}
