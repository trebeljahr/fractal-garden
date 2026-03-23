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
import { ViewportOverlay } from "../components/ViewportOverlay";
import styles from "../styles/Fullscreen.module.css";
import { useOrbitZoomControls } from "../utils/hooks/useOrbitZoomControls";
import { useWindowSize } from "../utils/hooks/useWindowResize";
import {
  drawVoxelScene,
  generateVicsekFractal3D,
} from "../utils/voxelFractals";
import { getDescription } from "../utils/readFiles";
import { scrollToDescription } from "../utils/scrollToDescription";

type Props = {
  description: string;
};

type Config = {
  iterations: number;
  animateIterations: boolean;
  autoRotate: boolean;
  rotationX: number;
  rotationY: number;
  cameraDistance: number;
  background: string;
  fillColor: string;
  strokeColor: string;
  showFaces: boolean;
  showWireframe: boolean;
  lineWidth: number;
};

const MAX_ITERATIONS = 4;

const INITIAL_CONFIG: Config = {
  iterations: 3,
  animateIterations: false,
  autoRotate: true,
  rotationX: 26,
  rotationY: 30,
  cameraDistance: 6,
  background: "#101218",
  fillColor: "#f5b86d",
  strokeColor: "#ffe8c5",
  showFaces: true,
  showWireframe: true,
  lineWidth: 0.8,
};

const VicsekFractal3D = ({ description }: Props) => {
  const { width, height } = useWindowSize();
  const [ctx, setCtx] = useState<CanvasRenderingContext2D | null>(null);
  const [config, setConfig] = useState<Config>(INITIAL_CONFIG);
  const canvas = ctx?.canvas ?? null;

  useOrbitZoomControls({
    canvas,
    setConfig,
    minDistance: 3,
    maxDistance: 10,
  });

  useEffect(() => {
    if (!config.animateIterations) return;

    const delay = config.iterations >= MAX_ITERATIONS ? 1800 : 950;
    const id = window.setTimeout(() => {
      setConfig((old) => ({
        ...old,
        iterations:
          old.iterations >= MAX_ITERATIONS ? 0 : old.iterations + 1,
      }));
    }, delay);

    return () => window.clearTimeout(id);
  }, [config.animateIterations, config.iterations]);

  useEffect(() => {
    if (!ctx || !width || !height) return;

    const ratio = Math.ceil(window.devicePixelRatio);
    const cubes = generateVicsekFractal3D(config.iterations);
    let animationId = 0;
    let rotationOffset = 0;

    const draw = () => {
      ctx.resetTransform();
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

      drawVoxelScene(ctx, width, height, cubes, {
        rotationX: config.rotationX,
        rotationY: config.rotationY + rotationOffset,
        cameraDistance: config.cameraDistance,
        background: config.background,
        fillColor: config.fillColor,
        strokeColor: config.strokeColor,
        lineWidth: config.lineWidth,
        showFaces: config.showFaces,
        showWireframe: config.showWireframe,
      });

      if (!config.autoRotate) {
        return;
      }

      rotationOffset += 0.45;
      animationId = requestAnimationFrame(draw);
    };

    draw();

    return () => cancelAnimationFrame(animationId);
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
        <title>3D Vicsek Fractal</title>
        <meta
          name="description"
          content="A rotating 3D Vicsek fractal renderer. This cube-based cross fractal extends the 2D Vicsek idea into three dimensions."
        />
      </Head>
      <main className={styles.fullScreen}>
        <DatGui data={config} onUpdate={handleUpdate}>
          <DatFolder closed={true} title="Options">
            <DatColor path="background" label="background" />
            <DatColor path="fillColor" label="fillColor" />
            <DatColor path="strokeColor" label="strokeColor" />
            <DatNumber
              path="iterations"
              label="iterations"
              min={0}
              max={MAX_ITERATIONS}
              step={1}
            />
            <DatBoolean path="animateIterations" label="animate" />
            <DatBoolean path="autoRotate" label="autoRotate" />
            <DatNumber
              path="rotationX"
              label="rotationX"
              min={-180}
              max={180}
              step={1}
            />
            <DatNumber
              path="rotationY"
              label="rotationY"
              min={-180}
              max={180}
              step={1}
            />
            <DatNumber
              path="cameraDistance"
              label="camera"
              min={3}
              max={10}
              step={0.1}
            />
            <DatNumber
              path="lineWidth"
              label="lineWidth"
              min={0.2}
              max={2}
              step={0.1}
            />
            <DatBoolean path="showFaces" label="faces" />
            <DatBoolean path="showWireframe" label="wireframe" />
          </DatFolder>
        </DatGui>
        <div className={styles.fullScreen}>
          <Canvas setCtx={setCtx} width={width} height={height} />
          <ViewportOverlay
            title="3D View"
            lines={[
              "Drag to orbit around the fractal and use the scroll wheel to zoom without opening the controls.",
              "Turn on animation to step through the Vicsek construction the same way the 2D fractals do.",
            ]}
            actions={[
              {
                label: "Reset view",
                onClick: () =>
                  setConfig((old) => ({
                    ...old,
                    autoRotate: INITIAL_CONFIG.autoRotate,
                    rotationX: INITIAL_CONFIG.rotationX,
                    rotationY: INITIAL_CONFIG.rotationY,
                    cameraDistance: INITIAL_CONFIG.cameraDistance,
                  })),
              },
              {
                label: "About this fractal",
                onClick: scrollToDescription,
              },
            ]}
          />
        </div>
        <SideDrawer description={description} />
        <NavElement />
      </main>
    </>
  );
};

export default VicsekFractal3D;

export async function getStaticProps() {
  const description = await getDescription("vicsek-fractal-3d.md");
  return {
    props: {
      description,
    },
  };
}
