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
  iterations: MAX_ITERATIONS,
  animateIterations: true,
  autoRotate: true,
  rotationX: 26,
  rotationY: 30,
  cameraDistance: 6,
  background: "#252424",
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

    const ratio = window.devicePixelRatio || 1;
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
        <ExplorerPanel
          controlsHint="Growth, framing, and rendering layers for the cubic cross."
          controlsTitle="Scene Studio"
          data={config}
          introTitle="3D Vicsek Fractal"
          lines={[
            "Drag to orbit around the fractal and use the scroll wheel to dolly in or back out.",
          ]}
          mode="scene"
          onUpdate={handleUpdate}
        >
          <PanelColor path="background" />
          <PanelColor path="fillColor" />
          <PanelColor path="strokeColor" />
          <PanelNumber
            path="iterations"
            min={0}
            max={MAX_ITERATIONS}
            step={1}
          />
          <PanelBoolean path="animateIterations" />
          <PanelBoolean path="autoRotate" />
          <PanelNumber path="rotationX" min={-180} max={180} step={1} />
          <PanelNumber path="rotationY" min={-180} max={180} step={1} />
          <PanelNumber path="cameraDistance" min={3} max={10} step={0.1} />
          <PanelNumber path="lineWidth" min={0.2} max={2} step={0.1} />
          <PanelBoolean path="showFaces" />
          <PanelBoolean path="showWireframe" />
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

export default VicsekFractal3D;

export async function getStaticProps() {
  const description = await getDescription("vicsek-fractal-3d.md");
  return {
    props: {
      description,
    },
  };
}
