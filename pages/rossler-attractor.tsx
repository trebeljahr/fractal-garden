import { useMemo, useState } from "react";
import { Canvas } from "../components/Canvas";
import { PanelBoolean, PanelColor, PanelNumber } from "../components/ExplorerControls";
import { ExplorerPanel } from "../components/ExplorerPanel";
import { NavElement } from "../components/Navbar";
import { SideDrawer } from "../components/SideDrawer";
import styles from "../styles/Fullscreen.module.css";
import { useOrbitZoomControls } from "../utils/hooks/useOrbitZoomControls";
import { type Polyline3DSceneConfig, usePolyline3DScene } from "../utils/hooks/usePolyline3DScene";
import { useWindowSize } from "../utils/hooks/useWindowResize";
import { integrateRK4, normalizePolyline } from "../utils/polyline3d";
import { getDescription } from "../utils/readFiles";

type Props = {
  description: string;
};

type Config = Polyline3DSceneConfig & {
  a: number;
  b: number;
  c: number;
  dt: number;
  steps: number;
};

const INITIAL_CONFIG: Config = {
  a: 0.2,
  b: 0.2,
  c: 5.7,
  dt: 0.02,
  steps: 15000,
  animateTrail: true,
  trailSpeed: 40,
  autoRotate: true,
  rotationX: 18,
  rotationY: 0,
  cameraDistance: 4,
  background: "#252424",
  nearColor: "#9bf6ff",
  farColor: "#7b2cbf",
  farAlpha: 0.25,
  lineWidth: 1,
};

const RosslerAttractor = ({ description }: Props) => {
  const { width, height } = useWindowSize();
  const [ctx, setCtx] = useState<CanvasRenderingContext2D | null>(null);
  const [config, setConfig] = useState<Config>(INITIAL_CONFIG);

  useOrbitZoomControls({
    canvas: ctx?.canvas ?? null,
    setConfig,
    minDistance: 2,
    maxDistance: 10,
  });

  const { a, b, c, dt, steps } = config;
  const polyline = useMemo(() => {
    const orbit = integrateRK4(
      (x, y, z, out) => {
        out[0] = -y - z;
        out[1] = x + a * y;
        out[2] = b + z * (x - c);
      },
      [1, 1, 0],
      dt,
      steps,
    );
    // Show z as the vertical axis so the folding spike points upward.
    return normalizePolyline(orbit, [0, 2, 1]);
  }, [a, b, c, dt, steps]);

  usePolyline3DScene({ ctx, width, height, polyline, config });

  const handleUpdate = (newData: Config) => {
    setConfig((old) => ({
      ...old,
      ...newData,
    }));
  };

  return (
    <main className={styles.fullScreen}>
      <ExplorerPanel
        controlsHint="System parameters, integration and orbit view for the attractor."
        controlsTitle="Scene Studio"
        data={config}
        introTitle="Rössler Attractor"
        lines={[
          "Drag to rotate the attractor and use the scroll wheel to dolly closer or farther away.",
        ]}
        mode="scene"
        onUpdate={handleUpdate}
      >
        <PanelNumber path="a" label="a" min={0} max={0.5} step={0.01} />
        <PanelNumber path="b" label="b" min={0} max={2} step={0.01} />
        <PanelNumber path="c" label="c" min={1} max={20} step={0.1} />
        <PanelNumber path="dt" label="Time step" min={0.002} max={0.05} step={0.001} />
        <PanelNumber path="steps" label="Steps" min={1000} max={80000} step={1000} />
        <PanelBoolean path="animateTrail" label="Animate trail" />
        <PanelNumber path="trailSpeed" label="Trail speed" min={1} max={500} step={1} />
        <PanelBoolean path="autoRotate" />
        <PanelNumber path="rotationX" min={-85} max={85} step={1} />
        <PanelNumber path="rotationY" min={-180} max={180} step={1} />
        <PanelNumber path="cameraDistance" min={2} max={10} step={0.1} />
        <PanelColor path="background" />
        <PanelColor path="nearColor" label="Near color" />
        <PanelColor path="farColor" label="Far color" />
        <PanelNumber path="farAlpha" label="Far opacity" min={0} max={1} step={0.05} />
        <PanelNumber path="lineWidth" min={0.2} max={4} step={0.1} />
      </ExplorerPanel>
      <div className={styles.fullScreen}>
        <Canvas setCtx={setCtx} width={width} height={height} />
      </div>
      <SideDrawer description={description} />
      <NavElement />
    </main>
  );
};

export default RosslerAttractor;

export async function getStaticProps() {
  const description = await getDescription("rossler-attractor.md");
  return {
    props: {
      description,
    },
  };
}
