import { useEffect, useMemo, useState } from "react";
import styles from "../styles/Fullscreen.module.css";
import { useGrowingFractal } from "../utils/hooks/useGrowingFractal";
import { useOrbitZoomControls } from "../utils/hooks/useOrbitZoomControls";
import { useWindowSize } from "../utils/hooks/useWindowResize";
import type { Orientation } from "../utils/orientation";
import type { Scene3DParams, SceneSpec } from "../utils/render/scene3d";
import { PanelBoolean, PanelColor, PanelNumber, PanelSelect } from "./ExplorerControls";
import { ExplorerPanel } from "./ExplorerPanel";
import { NavElement } from "./Navbar";
import { SideDrawer } from "./SideDrawer";

export type SceneVariant = {
  label: string;
  maxIterations: number;
  spec: SceneSpec;
  /** Draw back faces too, for open surfaces. */
  doubleSided?: boolean;
};

type Config<V extends string> = {
  variant: V;
  iterations: number;
  animateIterations: boolean;
  autoRotate: boolean;
  rotationX: number;
  rotationY: number;
  grab?: Orientation;
  cameraDistance: number;
  background: string;
  fillColor: string;
  strokeColor: string;
  showFaces: boolean;
  showWireframe: boolean;
  lineWidth: number;
};

type Props<V extends string> = {
  description: string;
  /** Names this fractal's cached performance budget. */
  storageKey: string;
  title: string;
  controlsTitle: string;
  controlsHint: string;
  hint: string;
  variantLabel?: string;
  variants: Record<V, SceneVariant>;
  initialVariant: V;
  fillColor: string;
  strokeColor: string;
  rotationX?: number;
  rotationY?: number;
  lineWidth?: number;
  /** Degrees of yaw added per frame while auto-rotating. */
  rotationSpeed?: number;
};

/**
 * Orbitable, auto-rotating 3D fractal page. Geometry is built and drawn on a
 * worker, and the growth animation stops at the deepest level this machine
 * draws smoothly.
 */
export function SceneFractalExplorer<V extends string>({
  description,
  storageKey,
  title,
  controlsTitle,
  controlsHint,
  hint,
  variantLabel = "Variant",
  variants,
  initialVariant,
  fillColor,
  strokeColor,
  rotationX = 24,
  rotationY = 28,
  lineWidth = 0.7,
  rotationSpeed = 0.4,
}: Props<V>) {
  const { width, height } = useWindowSize();
  const [config, setConfig] = useState<Config<V>>({
    variant: initialVariant,
    iterations: 0,
    animateIterations: true,
    autoRotate: true,
    rotationX,
    rotationY,
    cameraDistance: 6,
    background: "#252424",
    fillColor,
    strokeColor,
    showFaces: true,
    showWireframe: true,
    lineWidth,
  });
  const variant = variants[config.variant];
  const maxIterations = variant.maxIterations;
  const iterations = Math.min(config.iterations, maxIterations);
  const variantOptions = Object.keys(variants) as V[];

  const params = useMemo<Scene3DParams>(
    () => ({
      spec: variant.spec,
      iterations,
      view: {
        rotationX: config.rotationX,
        rotationY: config.rotationY,
        grab: config.grab,
        cameraDistance: config.cameraDistance,
        background: config.background,
        fillColor: config.fillColor,
        strokeColor: config.strokeColor,
        lineWidth: config.lineWidth,
        showFaces: config.showFaces,
        showWireframe: config.showWireframe,
        doubleSided: variant.doubleSided,
        autoRotate: config.autoRotate,
        rotationSpeed,
      },
    }),
    [
      variant,
      iterations,
      config.rotationX,
      config.rotationY,
      config.grab,
      config.cameraDistance,
      config.background,
      config.fillColor,
      config.strokeColor,
      config.lineWidth,
      config.showFaces,
      config.showWireframe,
      config.autoRotate,
      rotationSpeed,
    ],
  );

  const { containerRef, canvas, animateLabel } = useGrowingFractal({
    kind: "scene3d",
    storageKey: `${storageKey}:${config.variant}`,
    config,
    setConfig,
    params,
    width,
    height,
    max: maxIterations,
  });

  useOrbitZoomControls({
    canvas,
    setConfig,
    minDistance: 3,
    maxDistance: 10,
  });

  useEffect(() => {
    if (config.iterations <= maxIterations) return;
    setConfig((old) => ({ ...old, iterations: maxIterations }));
  }, [config.iterations, maxIterations]);

  const handleUpdate = (newData: Config<V>) => {
    setConfig((old) => ({
      ...old,
      ...newData,
    }));
  };

  return (
    <main className={styles.fullScreen}>
      <ExplorerPanel
        controlsHint={controlsHint}
        controlsTitle={controlsTitle}
        data={config}
        introTitle={title}
        lines={[hint]}
        mode="scene"
        onUpdate={handleUpdate}
      >
        <PanelColor path="background" />
        <PanelColor path="fillColor" />
        <PanelColor path="strokeColor" />
        {variantOptions.length > 1 && (
          <PanelSelect
            path="variant"
            label={variantLabel}
            optionLabels={variantOptions.map((option) => variants[option].label)}
            options={variantOptions}
          />
        )}
        <PanelNumber path="iterations" min={0} max={maxIterations} step={1} />
        <PanelBoolean path="animateIterations" label={animateLabel} />
        <PanelBoolean path="autoRotate" />
        <PanelNumber path="rotationX" min={-180} max={180} step={1} />
        <PanelNumber path="rotationY" min={-180} max={180} step={1} />
        <PanelNumber path="cameraDistance" min={3} max={10} step={0.1} />
        <PanelNumber path="lineWidth" min={0} max={2} step={0.1} />
        <PanelBoolean path="showFaces" />
        <PanelBoolean path="showWireframe" />
      </ExplorerPanel>
      <div className={styles.fullScreen} ref={containerRef} />
      <SideDrawer description={description} />
      <NavElement />
    </main>
  );
}
