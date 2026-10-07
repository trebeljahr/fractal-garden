import { useMemo, useState } from "react";
import { PanelBoolean, PanelColor, PanelNumber } from "../components/ExplorerControls";
import { ExplorerPanel } from "../components/ExplorerPanel";
import { NavElement } from "../components/Navbar";
import { SideDrawer } from "../components/SideDrawer";
import styles from "../styles/Fullscreen.module.css";
import { useOrbitZoomControls } from "../utils/hooks/useOrbitZoomControls";
import { useRenderSurface } from "../utils/hooks/useRenderSurface";
import { useWindowSize } from "../utils/hooks/useWindowResize";
import { getDescription } from "../utils/readFiles";
import type { Polyline3DSceneConfig, PolylineSceneParams } from "../utils/render/polylineScene";

type Props = {
  description: string;
};

type Config = Polyline3DSceneConfig & {
  sigma: number;
  rho: number;
  beta: number;
  dt: number;
  steps: number;
};

const INITIAL_CONFIG: Config = {
  sigma: 10,
  rho: 28,
  beta: 8 / 3,
  dt: 0.005,
  steps: 20000,
  animateTrail: true,
  trailSpeed: 40,
  showHead: true,
  autoRotate: true,
  rotationX: 8,
  rotationY: 0,
  cameraDistance: 4,
  background: "#252424",
  nearColor: "#ffd166",
  farColor: "#ef476f",
  farAlpha: 0.25,
  lineWidth: 0.6,
};

// Keeps the endless trail fast: older points fade out of the buffer.
const MAX_POINTS = 150000;

const LorenzAttractor = ({ description }: Props) => {
  const { width, height } = useWindowSize();
  const [config, setConfig] = useState<Config>(INITIAL_CONFIG);

  const params = useMemo<PolylineSceneParams>(() => {
    const { sigma, rho, beta, dt, steps } = config;
    return {
      source: { kind: "lorenz", sigma, rho, beta, dt, steps },
      config,
      maxPoints: MAX_POINTS,
    };
  }, [config]);

  const { containerRef, canvas } = useRenderSurface({
    kind: "polylineScene",
    params,
    width,
    height,
  });

  useOrbitZoomControls({
    canvas,
    setConfig,
    minDistance: 0.3,
    maxDistance: 10,
  });

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
        introTitle="Lorenz Attractor"
        lines={[
          "Drag to rotate the attractor and use the scroll wheel to dolly closer or farther away.",
        ]}
        mode="scene"
        onUpdate={handleUpdate}
      >
        <PanelNumber path="sigma" label="σ (sigma)" min={0} max={30} step={0.1} />
        <PanelNumber path="rho" label="ρ (rho)" min={0} max={100} step={0.1} />
        <PanelNumber path="beta" label="β (beta)" min={0} max={10} step={0.01} />
        <PanelNumber path="dt" label="Time step" min={0.001} max={0.02} step={0.001} />
        <PanelNumber path="steps" label="Steps" min={1000} max={80000} step={1000} />
        <PanelBoolean path="animateTrail" label="Animate trail" />
        <PanelNumber path="trailSpeed" label="Trail speed" min={1} max={500} step={1} />
        <PanelBoolean path="showHead" label="Show drawing head" />
        <PanelBoolean path="autoRotate" />
        <PanelNumber path="rotationX" min={-85} max={85} step={1} />
        <PanelNumber path="rotationY" min={-180} max={180} step={1} />
        <PanelNumber path="cameraDistance" min={0.3} max={10} step={0.05} />
        <PanelColor path="background" />
        <PanelColor path="nearColor" label="Near color" />
        <PanelColor path="farColor" label="Far color" />
        <PanelNumber path="farAlpha" label="Far opacity" min={0} max={1} step={0.05} />
        <PanelNumber path="lineWidth" min={0.1} max={4} step={0.05} />
      </ExplorerPanel>
      <div className={styles.fullScreen} ref={containerRef} />
      <SideDrawer description={description} />
      <NavElement />
    </main>
  );
};

export default LorenzAttractor;

export async function getStaticProps() {
  const description = await getDescription("lorenz-attractor.md");
  return {
    props: {
      description,
    },
  };
}
