import { useMemo, useState } from "react";
import { PanelBoolean, PanelColor, PanelNumber } from "../components/ExplorerControls";
import { ExplorerPanel } from "../components/ExplorerPanel";
import { NavElement } from "../components/Navbar";
import { SideDrawer } from "../components/SideDrawer";
import styles from "../styles/Fullscreen.module.css";
import { useFractalViewportSize } from "../utils/hooks/useFractalViewportSize";
import { useRenderSurface } from "../utils/hooks/useRenderSurface";
import { useSpatialControls } from "../utils/hooks/useSpatialControls";
import { getDescription } from "../utils/readFiles";
import type { Polyline3DSceneConfig, PolylineSceneParams } from "../utils/render/polylineScene";
import { INITIAL_SPATIAL_CAMERA, moveSpatialCamera } from "../utils/spatial/camera";

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
  animateTrail: false,
  trailSpeed: 40,
  showHead: true,
  autoRotate: false,
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
  const { width, height } = useFractalViewportSize();
  const [config, setConfig] = useState<Config>(INITIAL_CONFIG);
  const [camera, setCamera] = useState(INITIAL_SPATIAL_CAMERA);

  const params = useMemo<PolylineSceneParams>(() => {
    const { sigma, rho, beta, dt, steps } = config;
    return {
      source: { kind: "lorenz", sigma, rho, beta, dt, steps },
      config: { ...config, spatialCamera: camera },
      maxPoints: MAX_POINTS,
    };
  }, [config, camera]);

  const { containerRef, canvas, pick } = useRenderSurface({
    kind: "polylineScene",
    params,
    width,
    height,
  });

  useSpatialControls({
    canvas,
    view: config,
    setView: setConfig,
    identity: "attractor",
    worldPick: pick,
    animateOrbit: true,
    maxZoom: 24,
    controlled: { camera, setCamera },
  });

  const handleUpdate = (newData: Config) => {
    if (newData.cameraDistance !== config.cameraDistance)
      setCamera((old) =>
        moveSpatialCamera(
          old,
          [0, 0, 0],
          old.zoom + Math.log2(config.cameraDistance / newData.cameraDistance),
        ),
      );
    setConfig((old) => ({
      ...old,
      ...newData,
    }));
  };

  return (
    <main className={styles.fullScreen}>
      <ExplorerPanel
        data={config}
        introTitle="Lorenz Attractor"
        lines={["Drag to rotate. Shift-drag to pan. Scroll to zoom."]}
        mode="scene"
        onUpdate={handleUpdate}
        onRestore={setConfig}
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
        <PanelNumber
          path="cameraDistance"
          min={0.3}
          max={INITIAL_CONFIG.cameraDistance}
          step={0.05}
        />
        <PanelColor path="background" />
        <PanelColor path="nearColor" label="Near color" />
        <PanelColor path="farColor" label="Far color" />
        <PanelNumber path="farAlpha" label="Far opacity" min={0} max={1} step={0.05} />
        <PanelNumber path="lineWidth" min={0.1} max={4} step={0.05} />
      </ExplorerPanel>
      <div
        data-fractal-viewport
        data-zoom={camera.zoom}
        className={styles.viewport}
        style={{ background: config.background }}
        ref={containerRef}
      />
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
