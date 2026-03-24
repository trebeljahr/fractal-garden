import Head from "next/head";
import { useEffect, useState } from "react";
import { Canvas } from "../../components/Canvas";
import {
  PanelBoolean,
  PanelColor,
  PanelNumber,
} from "../../components/ExplorerControls";
import { ExplorerPanel } from "../../components/ExplorerPanel";
import { NavElement } from "../../components/Navbar";
import { SideDrawer } from "../../components/SideDrawer";
import styles from "../../styles/Fullscreen.module.css";
import { getDescription } from "../../utils/readFiles";
import { useWindowSize } from "../../utils/hooks/useWindowResize";

type Props = {
  description: string;
};

type Config = {
  iterations: number;
  animateIterations: boolean;
  background: string;
  color: string;
  lineWidth: number;
};

type Vec2D = [number, number];

type Bounds = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
};

const MAX_ITERATIONS = 16;
const TURN_ANGLE = Math.PI / 2;
const START_ANGLE = Math.PI / 4;
const PADDING = 0.08;

function generateDragonSentence(iterations: number) {
  let sentence = "F";

  for (let i = 0; i < iterations; i++) {
    let nextSentence = "";

    for (let char of sentence) {
      if (char === "F") {
        nextSentence += "F+G";
        continue;
      }

      if (char === "G") {
        nextSentence += "F-G";
        continue;
      }

      nextSentence += char;
    }

    sentence = nextSentence;
  }

  return sentence;
}

function traceDragonCurve(sentence: string) {
  let x = 0;
  let y = 0;
  let angle = START_ANGLE;

  const points: Vec2D[] = [[x, y]];
  const bounds: Bounds = {
    minX: x,
    maxX: x,
    minY: y,
    maxY: y,
  };

  for (let char of sentence) {
    if (char === "F" || char === "G") {
      x += Math.cos(angle);
      y += Math.sin(angle);
      points.push([x, y]);
      bounds.minX = Math.min(bounds.minX, x);
      bounds.maxX = Math.max(bounds.maxX, x);
      bounds.minY = Math.min(bounds.minY, y);
      bounds.maxY = Math.max(bounds.maxY, y);
      continue;
    }

    if (char === "+") {
      angle += TURN_ANGLE;
      continue;
    }

    if (char === "-") {
      angle -= TURN_ANGLE;
    }
  }

  return { points, bounds };
}

function getDragonTransform(bounds: Bounds, width: number, height: number) {
  const curveWidth = Math.max(bounds.maxX - bounds.minX, 1);
  const curveHeight = Math.max(bounds.maxY - bounds.minY, 1);
  const scale = Math.min(
    (width * (1 - 2 * PADDING)) / curveWidth,
    (height * (1 - 2 * PADDING)) / curveHeight
  );

  const top = (height - curveHeight * scale) / 2;
  const left = (width - curveWidth * scale) / 2;

  return {
    scale,
    offsetX: left - bounds.minX * scale,
    offsetY: top + bounds.maxY * scale,
  };
}

const DragonCurve = ({ description }: Props) => {
  const { width, height } = useWindowSize();
  const [ctx, setCtx] = useState<CanvasRenderingContext2D | null>(null);
  const [config, setConfig] = useState<Config>({
    iterations: MAX_ITERATIONS,
    animateIterations: true,
    background: "#252424",
    color: "#9af4ff",
    lineWidth: 1.5,
  });

  useEffect(() => {
    if (!config.animateIterations) return;

    const delay = config.iterations === MAX_ITERATIONS ? 1800 : 900;

    const id = setTimeout(() => {
      setConfig((old) => ({
        ...old,
        iterations:
          old.iterations >= MAX_ITERATIONS ? 1 : Math.min(old.iterations + 1, MAX_ITERATIONS),
      }));
    }, delay);

    return () => clearTimeout(id);
  }, [config.animateIterations, config.iterations]);

  useEffect(() => {
    if (!ctx || !width || !height) return;

    const sentence = generateDragonSentence(config.iterations);
    const { points, bounds } = traceDragonCurve(sentence);
    const { scale, offsetX, offsetY } = getDragonTransform(bounds, width, height);

    ctx.resetTransform();
    const ratio = window.devicePixelRatio || 1;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

    ctx.fillStyle = config.background;
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = config.color;
    ctx.lineWidth = config.lineWidth;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    const [startX, startY] = points[0];
    ctx.beginPath();
    ctx.moveTo(offsetX + startX * scale, offsetY - startY * scale);

    for (let i = 1; i < points.length; i++) {
      const [x, y] = points[i];
      ctx.lineTo(offsetX + x * scale, offsetY - y * scale);
    }

    ctx.stroke();
    ctx.closePath();
  }, [config, ctx, width, height]);

  const handleUpdate = (newData: Config) => {
    setConfig((old) => ({ ...old, ...newData }));
  };

  return (
    <>
      <Head>
        <title>L-System Dragon Curve</title>
        <meta
          name="description"
          content="An interactive Dragon Curve implementation. Explore the classic Heighway Dragon, generated from a simple L-system and fitted to the screen at every iteration."
        />
      </Head>
      <main className={styles.fullScreen}>
        <ExplorerPanel data={config} mode="pattern" onUpdate={handleUpdate}>
          <PanelColor path="background" />
          <PanelColor path="color" />
          <PanelNumber
            path="iterations"
            min={1}
            max={MAX_ITERATIONS}
            step={1}
          />
          <PanelNumber path="lineWidth" min={0.5} max={4} step={0.1} />
          <PanelBoolean path="animateIterations" />
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

export default DragonCurve;

export async function getStaticProps() {
  const description = await getDescription("dragon-curve.md");
  return {
    props: {
      description,
    },
  };
}
