import { useEffect, useMemo, useState } from "react";
import styles from "../styles/Fullscreen.module.css";
import flightStyles from "../styles/VoxelFlight.module.css";
import { useFractalRenderer } from "../utils/hooks/useFractalRenderer";
import { useFractalViewportSize } from "../utils/hooks/useFractalViewportSize";
import { useOrbitZoomControls } from "../utils/hooks/useOrbitZoomControls";
import { useWindowSize } from "../utils/hooks/useWindowResize";
import type { Orientation } from "../utils/orientation";
import type { Scene3DParams, SceneSpec } from "../utils/render/scene3d";
import type { VoxelPattern } from "../utils/voxelZoom/camera";
import { PanelBoolean, PanelColor, PanelNumber, PanelSelect } from "./ExplorerControls";
import { ExplorerPanel } from "./ExplorerPanel";
import { NavElement } from "./Navbar";
import { SideDrawer } from "./SideDrawer";
import { VoxelFlight } from "./VoxelFlight";

export type SceneVariant = {
  label: string;
  maxIterations: number;
  spec: SceneSpec;
  /** Draw back faces too, for open surfaces. */
  doubleSided?: boolean;
};

type Config<V extends string> = {
  variant: V;
  navigation: "orbit" | "explore";
  iterations: number;
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
  lighting: "classic" | "depth";
  occlusion: "off" | "soft" | "minecraft";
};

type Props<V extends string> = {
  description: string;
  /** Names this fractal's cached performance budget. */
  storageKey: string;
  title: string;
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

const INITIAL_CAMERA_DISTANCE = 6;

/**
 * Orbitable, auto-rotating 3D fractal page. Geometry is built and drawn on a
 * worker. The opening depth adapts to this machine; construction playback
 * lives in the explanation below.
 */
export function SceneFractalExplorer<V extends string>({
  description,
  storageKey,
  title,
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
  const { width, height } = useFractalViewportSize();
  const { width: flightWidth, height: flightHeight } = useWindowSize();
  const [config, setConfig] = useState<Config<V>>({
    variant: initialVariant,
    navigation: "orbit",
    iterations: 0,
    autoRotate: false,
    rotationX,
    rotationY,
    cameraDistance: INITIAL_CAMERA_DISTANCE,
    background: "#252424",
    fillColor,
    strokeColor,
    showFaces: true,
    showWireframe: true,
    lineWidth,
    lighting: "depth",
    occlusion: "soft",
  });
  const variant = variants[config.variant];
  const pattern: VoxelPattern | null =
    variant.spec.kind === "menger"
      ? "menger"
      : variant.spec.kind === "vicsek3d"
        ? "vicsek"
        : variant.spec.kind === "mosely"
          ? variant.spec.variant === "lighter"
            ? "mosely-light"
            : "mosely-heavy"
          : null;
  const exploring = config.navigation === "explore" && pattern !== null;
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

  const { containerRef, canvas } = useFractalRenderer({
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
    canvas: exploring ? null : canvas,
    cameraDistance: config.cameraDistance,
    setConfig,
    minDistance: 3,
    maxDistance: INITIAL_CAMERA_DISTANCE,
  });

  useEffect(() => {
    if (config.iterations <= maxIterations) return;
    setConfig((old) => ({ ...old, iterations: maxIterations }));
  }, [config.iterations, maxIterations]);

  const backOutside = () =>
    setConfig((old) => ({
      ...old,
      navigation: "orbit",
      cameraDistance: INITIAL_CAMERA_DISTANCE,
      rotationX,
      rotationY,
      grab: undefined,
      autoRotate: false,
    }));
  const handleUpdate = (newData: Config<V>) => {
    setConfig((old) => ({
      ...old,
      ...newData,
    }));
  };

  return (
    <main className={styles.fullScreen}>
      <ExplorerPanel
        data={config}
        introTitle={title}
        lines={exploring ? [] : [hint]}
        places={
          pattern && (
            <button
              className={flightStyles.navigation}
              type="button"
              data-fractal-places
              onClick={() =>
                exploring
                  ? backOutside()
                  : setConfig((old) => ({
                      ...old,
                      navigation: "explore",
                      autoRotate: false,
                    }))
              }
            >
              {exploring ? "Back outside" : "Explore inside"}
            </button>
          )
        }
        mode="scene"
        onUpdate={handleUpdate}
        shareRules={[
          { path: "navigation", kind: "select", options: ["orbit", "explore"] },
          { path: "lighting", kind: "select", options: ["classic", "depth"] },
          { path: "occlusion", kind: "select", options: ["off", "soft", "minecraft"] },
          { path: "cameraDistance", kind: "number", min: 3, max: INITIAL_CAMERA_DISTANCE },
          { path: "rotationX", kind: "number", min: -180, max: 180 },
          { path: "rotationY", kind: "number", min: -180, max: 180 },
          {
            path: "iterations",
            kind: "number",
            min: 0,
            max: Math.max(
              ...Object.values<SceneVariant>(variants).map((entry) => entry.maxIterations),
            ),
          },
        ]}
        onRestore={(saved) =>
          setConfig({
            ...saved,
            iterations: Math.min(saved.iterations, variants[saved.variant].maxIterations),
          })
        }
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
        {exploring && (
          <PanelSelect path="lighting" label="Lighting" options={["classic", "depth"]} />
        )}
        {exploring && (
          <PanelSelect
            path="occlusion"
            label="Corner shading"
            options={["off", "soft", "minecraft"]}
            optionLabels={["Off", "Soft", "Minecraft AO"]}
          />
        )}
        {!exploring && <PanelNumber path="iterations" min={0} max={maxIterations} step={1} />}
        {!exploring && <PanelBoolean path="autoRotate" />}
        {!exploring && <PanelNumber path="rotationX" min={-180} max={180} step={1} />}
        {!exploring && <PanelNumber path="rotationY" min={-180} max={180} step={1} />}
        {!exploring && (
          <PanelNumber path="cameraDistance" min={3} max={INITIAL_CAMERA_DISTANCE} step={0.1} />
        )}

        <PanelNumber path="lineWidth" min={0} max={2} step={0.1} />
        <PanelBoolean path="showFaces" />
        <PanelBoolean path="showWireframe" />
      </ExplorerPanel>
      <div
        data-fractal-viewport
        className={styles.viewport}
        ref={containerRef}
        aria-hidden={exploring || undefined}
        style={{
          background: config.background,
          visibility: exploring ? "hidden" : undefined,
          pointerEvents: exploring ? "none" : undefined,
        }}
      />
      {exploring && flightWidth && flightHeight && (
        <VoxelFlight
          key={config.variant}
          pattern={pattern}
          style={config}
          width={flightWidth}
          height={flightHeight}
        />
      )}
      <SideDrawer description={description} />
      <NavElement />
    </main>
  );
}
