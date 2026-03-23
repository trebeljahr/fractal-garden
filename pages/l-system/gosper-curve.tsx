import Head from "next/head";
import { useEffect, useState } from "react";
import DatGui, {
  DatBoolean,
  DatColor,
  DatFolder,
  DatNumber,
} from "react-dat-gui";
import { Canvas } from "../../components/Canvas";
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

const MAX_ITERATIONS = 6;
const TURN_ANGLE = Math.PI / 3;
const PADDING = 0.08;

function generateGosperSentence(iterations: number) {
  let sentence = "XF";

  for (let i = 0; i < iterations; i++) {
    let nextSentence = "";

    for (let char of sentence) {
      if (char === "X") {
        nextSentence += "X+YF++YF-FX--FXFX-YF+";
        continue;
      }

      if (char === "Y") {
        nextSentence += "-FX+YFYF++YF+FX--FX-Y";
        continue;
      }

      nextSentence += char;
    }

    sentence = nextSentence;
  }

  return sentence;
}

function traceGosperCurve(sentence: string) {
  let x = 0;
  let y = 0;
  let angle = 0;

  const points: Vec2D[] = [[x, y]];
  const bounds: Bounds = {
    minX: x,
    maxX: x,
    minY: y,
    maxY: y,
  };

  for (let char of sentence) {
    if (char === "F") {
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

function getTransform(bounds: Bounds, width: number, height: number) {
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

const GosperCurve = ({ description }: Props) => {
  const { width, height } = useWindowSize();
  const [ctx, setCtx] = useState<CanvasRenderingContext2D | null>(null);
  const [config, setConfig] = useState<Config>({
    iterations: 4,
    animateIterations: true,
    background: "#252424",
    color: "#89f7d1",
    lineWidth: 1.3,
  });

  useEffect(() => {
    if (!config.animateIterations) return;

    const delay = config.iterations === MAX_ITERATIONS ? 1800 : 1100;

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

    const sentence = generateGosperSentence(config.iterations);
    const { points, bounds } = traceGosperCurve(sentence);
    const { scale, offsetX, offsetY } = getTransform(bounds, width, height);

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
        <title>L-System Gosper Curve</title>
        <meta
          name="description"
          content="An interactive Gosper Curve implementation. This flowing L-system curve is fitted to the viewport at each iteration so it stays readable as it grows."
        />
      </Head>
      <main className={styles.fullScreen}>
        <DatGui data={config} onUpdate={handleUpdate}>
          <DatFolder closed={true} title="Options">
            <DatColor path="background" label="background" />
            <DatColor path="color" label="color" />
            <DatNumber
              path="iterations"
              label="iterations"
              min={1}
              max={MAX_ITERATIONS}
              step={1}
            />
            <DatNumber
              path="lineWidth"
              label="lineWidth"
              min={0.5}
              max={4}
              step={0.1}
            />
            <DatBoolean path="animateIterations" label="animate" />
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

export default GosperCurve;

export async function getStaticProps() {
  const description = await getDescription("gosper-curve.md");
  return {
    props: {
      description,
    },
  };
}
