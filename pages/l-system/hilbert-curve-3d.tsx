import { useEffect, useMemo, useState } from "react";
import { Canvas } from "../../components/Canvas";
import { PanelBoolean, PanelColor, PanelNumber } from "../../components/ExplorerControls";
import { ExplorerPanel } from "../../components/ExplorerPanel";
import { NavElement } from "../../components/Navbar";
import { SideDrawer } from "../../components/SideDrawer";
import styles from "../../styles/Fullscreen.module.css";
import { useOrbitZoomControls } from "../../utils/hooks/useOrbitZoomControls";
import {
  type Polyline3DSceneConfig,
  usePolyline3DScene,
} from "../../utils/hooks/usePolyline3DScene";
import { useWindowSize } from "../../utils/hooks/useWindowResize";
import { generateHilbertCurve3D, normalizePolyline } from "../../utils/polyline3d";
import { getDescription } from "../../utils/readFiles";

type Props = {
  description: string;
};

type Config = Polyline3DSceneConfig & {
  iterations: number;
  animateIterations: boolean;
};

const MIN_ITERATIONS = 1;
const MAX_ITERATIONS = 5;

const INITIAL_CONFIG: Config = {
  iterations: 3,
  animateIterations: true,
  animateTrail: false,
  trailSpeed: 20,
  autoRotate: true,
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
  const { width, height } = useWindowSize();
  const [ctx, setCtx] = useState<CanvasRenderingContext2D | null>(null);
  const [config, setConfig] = useState<Config>(INITIAL_CONFIG);

  useOrbitZoomControls({
    canvas: ctx?.canvas ?? null,
    setConfig,
    minDistance: 2,
    maxDistance: 10,
  });

  useEffect(() => {
    if (!config.animateIterations) return;

    const delay = config.iterations >= MAX_ITERATIONS ? 2400 : 1200;
    const id = window.setTimeout(() => {
      setConfig((old) => ({
        ...old,
        iterations: old.iterations >= MAX_ITERATIONS ? MIN_ITERATIONS : old.iterations + 1,
      }));
    }, delay);

    return () => window.clearTimeout(id);
  }, [config.animateIterations, config.iterations]);

  const polyline = useMemo(
    () => normalizePolyline(generateHilbertCurve3D(config.iterations)),
    [config.iterations],
  );

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
        controlsHint="Depth, drawing and orbit view for the space-filling curve."
        controlsTitle="Scene Studio"
        data={config}
        introTitle="3D Hilbert Curve"
        lines={[
          "Drag to rotate the cube-filling curve and use the scroll wheel to dolly closer or farther away.",
        ]}
        mode="scene"
        onUpdate={handleUpdate}
      >
        <PanelNumber path="iterations" min={MIN_ITERATIONS} max={MAX_ITERATIONS} step={1} />
        <PanelBoolean path="animateIterations" />
        <PanelBoolean path="animateTrail" label="Animate trail" />
        <PanelNumber path="trailSpeed" label="Trail speed" min={1} max={400} step={1} />
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

export default HilbertCurve3D;

export async function getStaticProps() {
  const description = await getDescription("hilbert-curve-3d.md");
  return {
    props: {
      description,
    },
  };
}
