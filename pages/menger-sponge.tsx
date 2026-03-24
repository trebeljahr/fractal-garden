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
  generateMengerSponge,
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

const MAX_ITERATIONS = 3;

const INITIAL_CONFIG: Config = {
  iterations: MAX_ITERATIONS,
  animateIterations: true,
  autoRotate: true,
  rotationX: 24,
  rotationY: 28,
  cameraDistance: 6,
  background: "#252424",
  fillColor: "#7ce3c2",
  strokeColor: "#d9fff3",
  showFaces: true,
  showWireframe: true,
  lineWidth: 0.7,
};

const MengerSponge = ({ description }: Props) => {
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
    const cubes = generateMengerSponge(config.iterations);
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

      rotationOffset += 0.4;
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
        <title>Menger Sponge</title>
        <meta
          name="description"
          content="A rotating Menger Sponge renderer. This 3D fractal extends the Sierpinski Carpet idea into space by removing the center cube and face-center cubes at every step."
        />
      </Head>
      <main className={styles.fullScreen}>
        <ExplorerPanel
          controlsHint="Growth, orbit, and rendering layers for the sponge."
          controlsTitle="Scene Studio"
          data={config}
          introTitle="Menger Sponge"
          lines={[
            "Drag to rotate the sponge and use the scroll wheel to dolly closer or farther away.",
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

export default MengerSponge;

export async function getStaticProps() {
  const description = await getDescription("menger-sponge.md");
  return {
    props: {
      description,
    },
  };
}
