import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PanelBoolean, PanelColor, PanelNumber, PanelSelect } from "../components/ExplorerControls";
import { ExplorerPanel } from "../components/ExplorerPanel";
import { NavElement } from "../components/Navbar";
import { SideDrawer } from "../components/SideDrawer";
import { useZoomActivity } from "../components/ZoomActivity";
import styles from "../styles/Fullscreen.module.css";
import { useFractalViewportSize } from "../utils/hooks/useFractalViewportSize";
import { useRenderSurface } from "../utils/hooks/useRenderSurface";
import { useShaderViewportControls } from "../utils/hooks/useShaderViewportControls";
import { type PenroseStart, type PenroseVariant, PHI } from "../utils/penroseTiling";
import { getDescription } from "../utils/readFiles";
import { getMinTilePx, type PenroseParams } from "../utils/render/penrose";

type Props = {
  description: string;
};

type Config = {
  variant: PenroseVariant;
  start: PenroseStart;
  rotation: number;
  background: string;
  kiteColor: string;
  dartColor: string;
  thinColor: string;
  thickColor: string;
  showOutline: boolean;
  outlineColor: string;
  lineWidth: number;
};

type Viewport = {
  center: [number, number];
  zoomSize: number;
};

const PADDING = 0.06;
const INITIAL_ZOOM_SIZE = 1 / (1 - 2 * PADDING);
const MIN_ZOOM_SIZE = 0.000001;
const TILE_LEVEL = 5;

function toParams(config: Config, { center, zoomSize }: Viewport): PenroseParams {
  return {
    variant: config.variant,
    start: config.start,
    iterations: TILE_LEVEL,
    rotation: config.rotation,
    background: config.background,
    colors:
      config.variant === "p2"
        ? [config.kiteColor, config.dartColor]
        : [config.thinColor, config.thickColor],
    showOutline: config.showOutline,
    outlineColor: config.outlineColor,
    lineWidth: config.lineWidth,
    center: [center[0], center[1]],
    zoomSize,
  };
}

const variantOptions: PenroseVariant[] = ["p2", "p3"];
const variantLabels: Record<PenroseVariant, string> = {
  p2: "P2 kite and dart",
  p3: "P3 rhombus",
};

const startOptions: PenroseStart[] = ["sun", "star"];
const startLabels: Record<PenroseStart, string> = {
  sun: "Sun",
  star: "Star",
};

const PenroseTiling = ({ description }: Props) => {
  const { width, height } = useFractalViewportSize();
  const [zoomed, setZoomed] = useState(false);
  const { setActive: setZoomActive } = useZoomActivity();
  const [config, setConfig] = useState<Config>({
    variant: "p2",
    start: "sun",
    rotation: 0,
    background: "#252424",
    kiteColor: "#f2b134",
    dartColor: "#3d7ea6",
    thinColor: "#e4572e",
    thickColor: "#76b041",
    showOutline: true,
    outlineColor: "#1b1a1a",
    lineWidth: 1,
  });
  const viewportRef = useRef<Viewport>({
    center: [0, 0],
    zoomSize: INITIAL_ZOOM_SIZE,
  });
  const configRef = useRef(config);
  configRef.current = config;
  const frameRef = useRef(0);

  // The view lives in a ref, so this only rebuilds on config changes; pans
  // post their own params below without re-rendering the page.
  const params = useMemo(() => toParams(config, viewportRef.current), [config]);

  const { containerRef, canvas, setParams } = useRenderSurface({
    kind: "penrose",
    params,
    width,
    height,
  });

  // Stop zooming out at the renderer's tile budget, keeping tile size fixed.
  const maxZoomSize =
    width && height
      ? Math.min(width, height) / (2 * getMinTilePx(width, height) * PHI ** TILE_LEVEL)
      : INITIAL_ZOOM_SIZE;

  const requestRender = useCallback(() => {
    if (frameRef.current) return;
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = 0;
      setParams(toParams(configRef.current, viewportRef.current));
    });
  }, [setParams]);

  useEffect(() => () => cancelAnimationFrame(frameRef.current), []);

  useEffect(() => {
    setZoomActive(zoomed);
    return () => setZoomActive(false);
  }, [zoomed, setZoomActive]);

  const onViewportChange = useCallback(() => {
    const { center, zoomSize } = viewportRef.current;
    setZoomed(zoomSize !== INITIAL_ZOOM_SIZE || center[0] !== 0 || center[1] !== 0);
    requestRender();
  }, [requestRender]);

  useShaderViewportControls({
    canvas,
    viewportRef,
    minZoomSize: MIN_ZOOM_SIZE,
    maxZoomSize,
    onViewportChange,
    flipY: true,
  });

  const resetView = useCallback(() => {
    viewportRef.current = {
      center: [0, 0],
      zoomSize: INITIAL_ZOOM_SIZE,
    };
    onViewportChange();
  }, [onViewportChange]);

  const handleUpdate = (newData: Config) => {
    setConfig((old) => ({
      ...old,
      ...newData,
    }));
  };

  return (
    <main className={styles.fullScreen}>
      <ExplorerPanel
        actions={[{ label: "Reset view", onClick: resetView }]}
        data={config}
        lines={["Drag to pan. Scroll or pinch to zoom."]}
        mode="pattern"
        onUpdate={handleUpdate}
      >
        <PanelSelect
          path="variant"
          optionLabels={variantOptions.map((option) => variantLabels[option])}
          options={variantOptions}
        />
        <PanelSelect
          path="start"
          label="Pattern"
          optionLabels={startOptions.map((option) => startLabels[option])}
          options={startOptions}
        />
        <PanelNumber path="rotation" label="Rotation" min={-180} max={180} step={1} />
        <PanelColor path="background" />
        {config.variant === "p2" ? (
          <PanelColor key="kiteColor" path="kiteColor" label="Kite color" />
        ) : (
          <PanelColor key="thinColor" path="thinColor" label="Thin rhombus color" />
        )}
        {config.variant === "p2" ? (
          <PanelColor key="dartColor" path="dartColor" label="Dart color" />
        ) : (
          <PanelColor key="thickColor" path="thickColor" label="Thick rhombus color" />
        )}
        <PanelBoolean path="showOutline" label="Outline" />
        <PanelColor path="outlineColor" label="Outline color" />
        <PanelNumber path="lineWidth" min={0} max={4} step={0.1} />
      </ExplorerPanel>
      <div data-fractal-viewport className={styles.viewport} ref={containerRef} />
      <SideDrawer description={description} />
      <NavElement />
    </main>
  );
};

export default PenroseTiling;

export async function getStaticProps() {
  const description = await getDescription("penrose-tiling.md");
  return {
    props: {
      description,
    },
  };
}
