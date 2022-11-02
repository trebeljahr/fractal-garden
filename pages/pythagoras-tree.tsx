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
import { remapper } from "../utils/scaling";
import { Matrix2D, Vec2D, Vector } from "../utils/vectors";

type Config = {
  iterations: number;
  animateIterations: boolean;
  angle: number;
  background: string;
  fillTriangles: boolean;
};

type Props = {
  description: string;
};

const MAX_ITERATIONS = 11;

function determineTriangleTip(angle: number): (p1: Vec2D, p2: Vec2D) => Vec2D {
  const angleRad = radians(angle);

  const cos = Math.cos(angleRad);
  const cos2 = cos * cos;

  const sin = Math.sin(angleRad);
  const sincos = sin * cos;

  const rot: Matrix2D = [
    [cos2, sincos],
    [-sincos, cos2],
  ];

  return (p1, p2) => {
    const vec = Vector.sub(p1, p2);

    const dir = Vector.mul(vec, rot);
    const p3 = Vector.add(p2, dir);

    return p3;
  };
}

const remapH = remapper([0, MAX_ITERATIONS], [23, 88]);
const hsvGradient = (iteration: number) =>
  `hsl(${remapH(iteration)}, 96%, 30%)`;

const PythagorasTreeComponent = ({ description }: Props) => {
  const [config, setConfig] = useState<Config>({
    iterations: 0,
    animateIterations: true,
    angle: 45,
    background: "#252424",
    fillTriangles: true,
  });

  const { width, height } = useWindowSize();
  const [ctx, setCtx] = useState<CanvasRenderingContext2D | null>(null);

  useEffect(() => {
    if (!config.animateIterations) return;

    const interval = setInterval(() => {
      setConfig((config) => {
        const iterations = (config.iterations + 1) % (MAX_ITERATIONS + 1);
        return { ...config, iterations };
      });
    }, 600);

    return () => clearInterval(interval);
  }, [config.animateIterations]);

  useEffect(() => {
    if (!ctx || !width || !height) return;

    const drawPoly = (points: Vec2D[], color: string) => {
      const [start, ...remaining] = points;

      ctx.beginPath();
      ctx.moveTo(...start);
      remaining.forEach((point) => ctx.lineTo(...point));
      ctx.closePath();

      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.stroke();
    };

    const thirdPoint = determineTriangleTip(config.angle);

    const drawBranch = (p1: Vec2D, p2: Vec2D, depth = 0) => {
      const [x1, y1] = p1;
      const [x2, y2] = p2;

      const d: Vec2D = [y1 - y2, x2 - x1];

      const p3 = Vector.sub(p2, d);
      const p4 = Vector.sub(p1, d);

      const color = hsvGradient(depth);
      drawPoly([p1, p2, p3, p4], color);

      if (depth === config.iterations) return;

      const p5 = thirdPoint(p3, p4);
      if (config.fillTriangles) drawPoly([p3, p4, p5], color);

      drawBranch(p4, p5, depth + 1);
      drawBranch(p5, p3, depth + 1);
    };

    const drawTree = (size: number) => {
      ctx.resetTransform();
      const ratio = Math.ceil(window.devicePixelRatio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

      ctx.fillStyle = config.background;
      ctx.fillRect(0, 0, width, height);
      ctx.translate(width / 2, height);

      const half = size / 2;
      drawBranch([-half, 0], [half, 0]);
    };

    const draw = () => {
      const maxW = width / 9;
      const maxH = height / 5;
      drawTree(Math.min(maxW, maxH));
    };

    draw();
  }, [config, ctx, width, height, config.animateIterations]);

  const handleUpdate = (newData: Config) => {
    setConfig((prevState) => ({ ...prevState, ...newData }));
  };

  return (
    <>
      <Head>
        <title>Pythagoras Tree</title>
        <meta name="description" content={`tree tree tree`} />
      </Head>

      <main className={styles.fullScreen}>
        <DatGui data={config} onUpdate={handleUpdate}>
          <DatFolder closed={true} title="Options">
            <DatColor path="background" label="background" />
            <DatNumber path="angle" label="angle" min={30} max={60} step={1} />
            <DatNumber
              path="iterations"
              label="iterations"
              min={0}
              max={MAX_ITERATIONS}
              step={1}
            />
            <DatBoolean path="animateIterations" label="animate" />
            <DatBoolean path="fillTriangles" label="fill triangles" />
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

export default PythagorasTreeComponent;

export async function getStaticProps() {
  const description = await getDescription("pythagoras-tree.md");
  return {
    props: {
      description,
    },
  };
}
