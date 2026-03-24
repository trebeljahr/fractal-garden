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
import { useOrbitZoomControls } from "../utils/hooks/useOrbitZoomControls";
import { useWindowSize } from "../utils/hooks/useWindowResize";
import {
  drawVoxelScene,
  generateMoselySnowflake,
} from "../utils/voxelFractals";
import { getDescription } from "../utils/readFiles";
import { scrollToDescription } from "../utils/scrollToDescription";

type Props = {
  description: string;
};

type Config = {
  variant: "lighter" | "heavier";
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
  variant: "lighter",
  iterations: MAX_ITERATIONS,
  animateIterations: true,
  autoRotate: true,
  rotationX: 28,
  rotationY: 32,
  cameraDistance: 6,
  background: "#252424",
  fillColor: "#8fb0ff",
  strokeColor: "#dce9ff",
  showFaces: true,
  showWireframe: true,
  lineWidth: 0.7,
};

const variantOptions: Config["variant"][] = ["lighter", "heavier"];
const variantLabels: Record<Config["variant"], string> = {
  lighter: "Airy lattice",
  heavier: "Dense lattice",
};

const MoselySnowflake = ({ description }: Props) => {
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
    const cubes = generateMoselySnowflake(config.iterations, config.variant);
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
        <title>Mosely Snowflake</title>
        <meta
          name="description"
          content="A rotating 3D Mosely Snowflake renderer with lighter and heavier variants. Explore this cube-based snowflake as a projected recursive solid."
        />
      </Head>
      <main className={styles.fullScreen}>
        <ExplorerPanel
          controlsHint="Choose a lattice style, then tune orbit, growth, and linework."
          controlsTitle="Snowflake Studio"
          data={config}
          introTitle="Mosely Snowflake"
          lines={[
            "Drag to rotate the snowflake and use the scroll wheel to dolly in closer to the form.",
          ]}
          mode="scene"
          onUpdate={handleUpdate}
        >
          <PanelColor path="background" />
          <PanelColor path="fillColor" />
          <PanelColor path="strokeColor" />
          <PanelSelect
            path="variant"
            label="Snowflake type"
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

export default MoselySnowflake;

export async function getStaticProps() {
  const description = await getDescription("mosely-snowflake.md");
  return {
    props: {
      description,
    },
  };
}
