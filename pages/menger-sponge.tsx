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
import { useWindowSize } from "../utils/hooks/useWindowResize";
import {
  drawVoxelScene,
  generateMengerSponge,
} from "../utils/voxelFractals";
import { getDescription } from "../utils/readFiles";

type Props = {
  description: string;
};

type Config = {
  iterations: number;
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

const MengerSponge = ({ description }: Props) => {
  const { width, height } = useWindowSize();
  const [ctx, setCtx] = useState<CanvasRenderingContext2D | null>(null);
  const [config, setConfig] = useState<Config>({
    iterations: 2,
    autoRotate: true,
    rotationX: 24,
    rotationY: 28,
    cameraDistance: 6,
    background: "#11131a",
    fillColor: "#7ce3c2",
    strokeColor: "#d9fff3",
    showFaces: true,
    showWireframe: true,
    lineWidth: 0.7,
  });

  useEffect(() => {
    if (!ctx || !width || !height) return;

    const ratio = Math.ceil(window.devicePixelRatio);
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
