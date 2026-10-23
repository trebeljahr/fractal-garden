import { useMemo, useState } from "react";
import { PanelBoolean, PanelColor, PanelNumber } from "../../components/ExplorerControls";
import { ExplorerPanel } from "../../components/ExplorerPanel";
import { NavElement } from "../../components/Navbar";
import { SideDrawer } from "../../components/SideDrawer";
import styles from "../../styles/Fullscreen.module.css";
import { useFractalRenderer } from "../../utils/hooks/useFractalRenderer";
import { useFractalViewportSize } from "../../utils/hooks/useFractalViewportSize";
import { useOrbitZoomControls } from "../../utils/hooks/useOrbitZoomControls";
import { getDescription } from "../../utils/readFiles";
import type { Polyline3DSceneConfig, PolylineSceneParams } from "../../utils/render/polylineScene";

type Props = {
  description: string;
};

type Config = Polyline3DSceneConfig & {
  iterations: number;
};

const MIN_ITERATIONS = 1;
const MAX_ITERATIONS = 5;

const INITIAL_CONFIG: Config = {
  iterations: MIN_ITERATIONS,
  animateTrail: false,
  trailSpeed: 20,
  autoRotate: false,
  rotationX: 24,
  rotationY: 28,
  cameraDistance: 4.5,
  background: "#252424",
  nearColor: "#fc79ff",
  farColor: "#4cc9f0",
  farAlpha: 0.3,
  lineWidth: 1.6,
};

const HilbertCurve3D = ({ description }: Props) => {
  const { width, height } = useFractalViewportSize();
  const [config, setConfig] = useState<Config>(INITIAL_CONFIG);

  const params = useMemo<PolylineSceneParams>(
    () => ({ source: { kind: "hilbert3d", order: config.iterations }, config }),
    [config],
  );

  const { containerRef, canvas } = useFractalRenderer({
    kind: "polylineScene",
    storageKey: "hilbert-curve-3d",
    config,
    setConfig,
    params,
    constructionParams: (settings) => ({
      source: { kind: "hilbert3d" as const, order: settings.iterations },
      config: settings,
    }),
    width,
    height,
    min: MIN_ITERATIONS,
    max: MAX_ITERATIONS,
    stepDelay: 1200,
    holdDelay: 2400,
  });

  useOrbitZoomControls({
    canvas,
    cameraDistance: config.cameraDistance,
    setConfig,
    minDistance: 2,
    maxDistance: INITIAL_CONFIG.cameraDistance,
  });

  const handleUpdate = (newData: Config) => {
    setConfig((old) => ({
      ...old,
      ...newData,
    }));
  };

  return (
    <main className={styles.lSystem}>
      <ExplorerPanel
        data={config}
        introTitle="3D Hilbert Curve"
        lines={["Drag to rotate. Scroll to zoom."]}
        mode="scene"
        onUpdate={handleUpdate}
      >
        <PanelNumber path="iterations" min={MIN_ITERATIONS} max={MAX_ITERATIONS} step={1} />
        <PanelBoolean path="autoRotate" />
        <PanelNumber path="rotationX" min={-85} max={85} step={1} />
        <PanelNumber path="rotationY" min={-180} max={180} step={1} />
        <PanelNumber path="cameraDistance" min={2} max={INITIAL_CONFIG.cameraDistance} step={0.1} />
        <PanelColor path="background" />
        <PanelColor path="nearColor" label="Near color" />
        <PanelColor path="farColor" label="Far color" />
        <PanelNumber path="farAlpha" label="Far opacity" min={0} max={1} step={0.05} />
        <PanelNumber path="lineWidth" min={0.2} max={4} step={0.1} />
      </ExplorerPanel>
      <div
        data-fractal-viewport
        className={styles.viewport}
        style={{ background: config.background }}
        ref={containerRef}
      />
      <SideDrawer description={description} />
      <NavElement />
    </main>
  );
};

export default HilbertCurve3D;

export async function getStaticProps() {
  const description = await getDescription("hilbert-curve-3d.md");
  return {
    props: {
      description,
    },
  };
}
