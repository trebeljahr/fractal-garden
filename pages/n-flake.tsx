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
import { radians } from "../utils/ctxHelpers";
import { useWindowSize } from "../utils/hooks/useWindowResize";
import { getDescription } from "../utils/readFiles";

type Props = {
  description: string;
};

type Config = {
  sides: number;
  iterations: number;
  animateIterations: boolean;
  includeCenter: boolean;
  rotation: number;
  background: string;
  color: string;
  fillPolygons: boolean;
  strokePolygons: boolean;
  lineWidth: number;
};

const MIN_SIDES = 3;
const MAX_SIDES = 10;
const PADDING = 0.08;
const MAX_POLYGONS = 22000;

function getScaleFactor(sides: number) {
  let sum = 0;

  for (let k = 1; k <= Math.floor(sides / 4); k++) {
    sum += Math.cos((2 * Math.PI * k) / sides);
  }

  return 1 / (2 * (1 + sum));
}

function canUseCenteredVariant(sides: number) {
  return sides === 4 || sides === 5 || sides === 6;
}

function usesCenterPolygon(sides: number, includeCenter: boolean) {
  return includeCenter && canUseCenteredVariant(sides);
}

function getBranchFactor(sides: number, includeCenter: boolean) {
  return sides + (usesCenterPolygon(sides, includeCenter) ? 1 : 0);
}

function getMaxIterations(sides: number, includeCenter: boolean) {
  const branchFactor = getBranchFactor(sides, includeCenter);
  let iterations = 7;

  while (iterations > 2 && Math.pow(branchFactor, iterations) > MAX_POLYGONS) {
    iterations -= 1;
  }

  return iterations;
}

function drawPolygon(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  radius: number,
  sides: number,
  rotation: number,
  fillPolygons: boolean,
  strokePolygons: boolean
) {
  ctx.beginPath();

  for (let i = 0; i < sides; i++) {
    const angle = rotation - Math.PI / 2 + (2 * Math.PI * i) / sides;
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);

    if (i === 0) {
      ctx.moveTo(x, y);
      continue;
    }

    ctx.lineTo(x, y);
  }

  ctx.closePath();

  if (fillPolygons) {
    ctx.fill();
  }

  if (strokePolygons) {
    ctx.stroke();
  }
}

const NFlake = ({ description }: Props) => {
  const { width, height } = useWindowSize();
  const [ctx, setCtx] = useState<CanvasRenderingContext2D | null>(null);
  const [config, setConfig] = useState<Config>({
    sides: 5,
    iterations: 4,
    animateIterations: true,
    includeCenter: true,
    rotation: 0,
    background: "#120f1a",
    color: "#94f0d7",
    fillPolygons: true,
    strokePolygons: true,
    lineWidth: 0.8,
  });

  const maxIterations = getMaxIterations(config.sides, config.includeCenter);
  const centeredVariant = usesCenterPolygon(config.sides, config.includeCenter);

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

    const ratio = Math.ceil(window.devicePixelRatio);
    const scaleFactor = getScaleFactor(config.sides);
    const rootRadius = (Math.min(width, height) * (1 - 2 * PADDING)) / 2;
    const rotation = radians(
      config.rotation + (config.sides === 4 ? 45 : 0)
    );

    const drawFlake = (
      centerX: number,
      centerY: number,
      radius: number,
      depth: number
    ) => {
      if (depth >= config.iterations) {
        drawPolygon(
          ctx,
          centerX,
          centerY,
          radius,
          config.sides,
          rotation,
          config.fillPolygons,
          config.strokePolygons
        );
        return;
      }

      const childRadius = radius * scaleFactor;
      const offset = radius - childRadius;

      for (let i = 0; i < config.sides; i++) {
        const angle = rotation - Math.PI / 2 + (2 * Math.PI * i) / config.sides;
        drawFlake(
          centerX + offset * Math.cos(angle),
          centerY + offset * Math.sin(angle),
          childRadius,
          depth + 1
        );
      }

      if (centeredVariant) {
        drawFlake(centerX, centerY, childRadius, depth + 1);
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
    ctx.lineCap = "round";

    drawFlake(width / 2, height / 2, rootRadius, 0);
  }, [centeredVariant, config, ctx, height, width]);

  const handleUpdate = (newData: Config) => {
    setConfig((old) => ({
      ...old,
      ...newData,
    }));
  };

  return (
    <>
      <Head>
        <title>N-Flake</title>
        <meta
          name="description"
          content="An interactive N-Flake fractal explorer. Change the number of polygon sides and grow the polyflake family from triangular to decagonal forms."
        />
      </Head>
      <main className={styles.fullScreen}>
        <DatGui data={config} onUpdate={handleUpdate}>
          <DatFolder closed={true} title="Options">
            <DatColor path="background" label="background" />
            <DatColor path="color" label="color" />
            <DatNumber
              path="sides"
              label="sides"
              min={MIN_SIDES}
              max={MAX_SIDES}
              step={1}
            />
            <DatNumber
              path="iterations"
              label="iterations"
              min={0}
              max={maxIterations}
              step={1}
            />
            <DatBoolean path="animateIterations" label="animate" />
            <DatBoolean path="includeCenter" label="center copy" />
            <DatNumber
              path="rotation"
              label="rotation"
              min={-180}
              max={180}
              step={1}
            />
            <DatNumber
              path="lineWidth"
              label="lineWidth"
              min={0.2}
              max={3}
              step={0.1}
            />
            <DatBoolean path="fillPolygons" label="fill" />
            <DatBoolean path="strokePolygons" label="stroke" />
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

export default NFlake;

export async function getStaticProps() {
  const description = await getDescription("n-flake.md");
  return {
    props: {
      description,
    },
  };
}
