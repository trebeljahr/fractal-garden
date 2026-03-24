import Head from "next/head";
import { useEffect, useState } from "react";
import { Canvas } from "../components/Canvas";
import {
  PanelBoolean,
  PanelColor,
  PanelNumber,
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

type Circle = {
  x: number;
  y: number;
  bend: number;
  radius: number;
  depth: number;
};

type Config = {
  iterations: number;
  animateIterations: boolean;
  background: string;
  color: string;
  fillCircles: boolean;
  strokeCircles: boolean;
  lineWidth: number;
  showOuterCircle: boolean;
};

const MAX_ITERATIONS = 7;
const PADDING = 0.08;

function createCircle(
  x: number,
  y: number,
  bend: number,
  depth: number
): Circle {
  return {
    x,
    y,
    bend,
    radius: Math.abs(1 / bend),
    depth,
  };
}

function reflectCircle(
  excluded: Circle,
  a: Circle,
  b: Circle,
  c: Circle,
  depth: number
) {
  const bend = 2 * (a.bend + b.bend + c.bend) - excluded.bend;
  const weightedX =
    2 * (a.bend * a.x + b.bend * b.x + c.bend * c.x) -
    excluded.bend * excluded.x;
  const weightedY =
    2 * (a.bend * a.y + b.bend * b.y + c.bend * c.y) -
    excluded.bend * excluded.y;

  return createCircle(weightedX / bend, weightedY / bend, bend, depth);
}

function getInitialConfiguration() {
  const outer = createCircle(0, 0, -1, 0);
  const innerRadius = 2 * Math.sqrt(3) - 3;
  const innerBend = 1 / innerRadius;
  const centerDistance = 1 - innerRadius;
  const innerCircles = [...new Array(3)].map((_, index) => {
    const angle = -Math.PI / 2 + (2 * Math.PI * index) / 3;
    return createCircle(
      centerDistance * Math.cos(angle),
      centerDistance * Math.sin(angle),
      innerBend,
      0
    );
  });

  return [outer, ...innerCircles] as const;
}

function buildGasket(iterations: number) {
  const [outer, c1, c2, c3] = getInitialConfiguration();
  const circles = [outer, c1, c2, c3];

  const fillGap = (
    a: Circle,
    b: Circle,
    c: Circle,
    excluded: Circle,
    depth: number
  ) => {
    if (depth > iterations) return;

    const next = reflectCircle(excluded, a, b, c, depth);
    circles.push(next);

    fillGap(next, b, c, a, depth + 1);
    fillGap(next, a, c, b, depth + 1);
    fillGap(next, a, b, c, depth + 1);
  };

  fillGap(c1, c2, c3, outer, 1);
  fillGap(outer, c2, c3, c1, 1);
  fillGap(outer, c1, c3, c2, 1);
  fillGap(outer, c1, c2, c3, 1);

  return circles;
}

const ApollonianGasket = ({ description }: Props) => {
  const { width, height } = useWindowSize();
  const [ctx, setCtx] = useState<CanvasRenderingContext2D | null>(null);
  const [config, setConfig] = useState<Config>({
    iterations: MAX_ITERATIONS,
    animateIterations: true,
    background: "#252424",
    color: "#efdfb6",
    fillCircles: false,
    strokeCircles: true,
    lineWidth: 1,
    showOuterCircle: true,
  });

  useEffect(() => {
    if (!config.animateIterations) return;

    const delay = config.iterations >= MAX_ITERATIONS ? 1800 : 1050;
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
    const scale = (Math.min(width, height) * (1 - 2 * PADDING)) / 2;
    const circles = buildGasket(config.iterations);

    ctx.resetTransform();
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.fillStyle = config.background;
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = config.color;
    ctx.fillStyle = config.color;
    ctx.lineWidth = config.lineWidth;

    for (let i = 0; i < circles.length; i++) {
      const circle = circles[i];

      if (!config.showOuterCircle && circle.bend < 0) {
        continue;
      }

      ctx.beginPath();
      ctx.arc(
        width / 2 + circle.x * scale,
        height / 2 + circle.y * scale,
        circle.radius * scale,
        0,
        Math.PI * 2
      );

      if (config.fillCircles && circle.bend > 0) {
        ctx.globalAlpha = 0.12 + 0.08 * Math.min(circle.depth, 4);
        ctx.fill();
      }

      if (config.strokeCircles) {
        ctx.globalAlpha = circle.bend < 0 ? 0.9 : 0.4 + 0.08 * circle.depth;
        ctx.stroke();
      }

      ctx.closePath();
    }

    ctx.globalAlpha = 1;
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
        <title>Apollonian Gasket</title>
        <meta
          name="description"
          content="An interactive Apollonian Gasket renderer. Starting from four tangent circles, it recursively fills every curved triangular gap with another tangent circle."
        />
      </Head>
      <main className={styles.fullScreen}>
        <ExplorerPanel data={config} mode="pattern" onUpdate={handleUpdate}>
          <PanelColor path="background" />
          <PanelColor path="color" />
          <PanelNumber
            path="iterations"
            min={0}
            max={MAX_ITERATIONS}
            step={1}
          />
          <PanelBoolean path="animateIterations" />
          <PanelNumber
            path="lineWidth"
            min={0.4}
            max={3}
            step={0.1}
          />
          <PanelBoolean path="fillCircles" />
          <PanelBoolean path="strokeCircles" />
          <PanelBoolean path="showOuterCircle" />
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

export default ApollonianGasket;

export async function getStaticProps() {
  const description = await getDescription("apollonian-gasket.md");
  return {
    props: {
      description,
    },
  };
}
