import { useEffect, useMemo, useState } from "react";
import styles from "../styles/Fullscreen.module.css";
import { useOrbitZoomControls } from "../utils/hooks/useOrbitZoomControls";
import { useWindowSize } from "../utils/hooks/useWindowResize";
import { drawPolyhedronScene, type PolyhedronScene } from "../utils/polyhedronFractals";
import { Canvas } from "./Canvas";
import { PanelBoolean, PanelColor, PanelNumber, PanelSelect } from "./ExplorerControls";
import { ExplorerPanel } from "./ExplorerPanel";
import { NavElement } from "./Navbar";
import { SideDrawer } from "./SideDrawer";

export type PolyhedronVariant = {
  label: string;
  maxIterations: number;
  buildScene: (iterations: number) => PolyhedronScene;
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
  title: string;
  controlsTitle: string;
  controlsHint: string;
  hint: string;
  variantLabel: string;
  variants: Record<V, PolyhedronVariant>;
  initialVariant: V;
  fillColor: string;
  strokeColor: string;
  rotationX?: number;
};

export function PolyhedronFractalExplorer<V extends string>({
  description,
  title,
  controlsTitle,
  controlsHint,
  hint,
  variantLabel,
  variants,
  initialVariant,
  fillColor,
  strokeColor,
  rotationX = 24,
}: Props<V>) {
  const { width, height } = useWindowSize();
  const [ctx, setCtx] = useState<CanvasRenderingContext2D | null>(null);
  const [config, setConfig] = useState<Config<V>>({
    variant: initialVariant,
    iterations: variants[initialVariant].maxIterations,
    animateIterations: true,
    autoRotate: true,
    rotationX,
    rotationY: 28,
    cameraDistance: 6,
    background: "#252424",
    fillColor,
    strokeColor,
    showFaces: true,
    showWireframe: true,
    lineWidth: 0.7,
  });
  const canvas = ctx?.canvas ?? null;
  const variant = variants[config.variant];
  const maxIterations = variant.maxIterations;
  const iterations = Math.min(config.iterations, maxIterations);
  const variantOptions = Object.keys(variants) as V[];

  useOrbitZoomControls({
    canvas,
    setConfig,
    minDistance: 3,
    maxDistance: 10,
  });

  useEffect(() => {
    if (config.iterations <= maxIterations) return;

    setConfig((old) => ({
      ...old,
      iterations: maxIterations,
    }));
  }, [config.iterations, maxIterations]);

  useEffect(() => {
    if (!config.animateIterations) return;

    const delay = config.iterations >= maxIterations ? 1800 : 950;
    const id = window.setTimeout(() => {
      setConfig((old) => ({
        ...old,
        iterations: old.iterations >= maxIterations ? 0 : old.iterations + 1,
      }));
    }, delay);

    return () => window.clearTimeout(id);
  }, [config.animateIterations, config.iterations, maxIterations]);

  const scene = useMemo(() => variant.buildScene(iterations), [variant, iterations]);

  useEffect(() => {
    if (!ctx || !width || !height) return;

    const ratio = window.devicePixelRatio || 1;
    let animationId = 0;
    let rotationOffset = 0;

    const draw = () => {
      ctx.resetTransform();
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

      drawPolyhedronScene(ctx, width, height, scene, {
        rotationX: config.rotationX,
        rotationY: config.rotationY + rotationOffset,
        cameraDistance: config.cameraDistance,
        background: config.background,
        fillColor: config.fillColor,
        strokeColor: config.strokeColor,
        lineWidth: config.lineWidth,
        showFaces: config.showFaces,
        showWireframe: config.showWireframe,
        doubleSided: variant.doubleSided,
      });

      if (!config.autoRotate) {
        return;
      }

      rotationOffset += 0.4;
      animationId = requestAnimationFrame(draw);
    };

    draw();

    return () => cancelAnimationFrame(animationId);
  }, [config, ctx, height, scene, variant.doubleSided, width]);

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
        <PanelSelect
          path="variant"
          label={variantLabel}
          optionLabels={variantOptions.map((option) => variants[option].label)}
          options={variantOptions}
        />
        <PanelNumber path="iterations" min={0} max={maxIterations} step={1} />
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
  );
}
