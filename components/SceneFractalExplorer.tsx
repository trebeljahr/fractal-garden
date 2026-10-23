import { useEffect, useMemo, useState } from "react";
import styles from "../styles/Fullscreen.module.css";
import flightStyles from "../styles/VoxelFlight.module.css";
import { useFractalViewportSize } from "../utils/hooks/useFractalViewportSize";
import { useWindowSize } from "../utils/hooks/useWindowResize";
import type { Orientation } from "../utils/orientation";
import type { SceneSpec } from "../utils/render/scene3d";
import type { VoxelPattern } from "../utils/voxelZoom/camera";
import { PanelBoolean, PanelColor, PanelNumber, PanelSelect } from "./ExplorerControls";
import { ExplorerPanel } from "./ExplorerPanel";
import { useConstructionRegistration } from "./FractalConstruction";
import { NavElement } from "./Navbar";
import { SideDrawer } from "./SideDrawer";
import { SpatialExplorer } from "./SpatialExplorer";
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
  /** Identifies this fractal’s independent construction state. */
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
 * Recursive 3D exploration with independent finite construction playback.
 * Register the lesson without allocating a second, hidden exploration renderer.
 */
export function SceneFractalExplorer<V extends string>({
  description,
  storageKey,
  title,
  hint: _hint,
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
  const exploring = pattern !== null;
  const maxIterations = variant.maxIterations;
  const variantOptions = Object.keys(variants) as V[];

  const construction = useMemo(() => {
    const view = {
      rotationX,
      rotationY,
      cameraDistance: INITIAL_CAMERA_DISTANCE,
      background: config.background,
      fillColor: config.fillColor,
      strokeColor: config.strokeColor,
      showFaces: config.showFaces,
      showWireframe: config.showWireframe,
      lineWidth: config.lineWidth,
      autoRotate: false,
      rotationSpeed,
    };
    return width && height
      ? {
          kind: "scene3d" as const,
          identity: `${storageKey}:${config.variant}`,
          params: {
            spec: variant.spec,
            iterations: 0,
            view: { ...view, doubleSided: variant.doubleSided },
          },
          config: { ...view, variant: config.variant, iterations: 0 },
          width,
          height,
          min: 0,
          max: Math.max(
            ...Object.values<SceneVariant>(variants).map((entry) => entry.maxIterations),
          ),
          maxForConfig: (settings: Record<string, unknown>) =>
            variants[settings.variant as V].maxIterations,
          makeParams: (settings: Record<string, unknown>) => ({
            spec: variants[settings.variant as V].spec,
            iterations: settings.iterations,
            view: {
              ...settings,
              doubleSided: variants[settings.variant as V].doubleSided,
              rotationSpeed,
            },
          }),
        }
      : null;
  }, [
    variant,
    variants,
    storageKey,
    config.variant,
    width,
    height,
    rotationX,
    rotationY,
    rotationSpeed,
    config.background,
    config.fillColor,
    config.strokeColor,
    config.showFaces,
    config.showWireframe,
    config.lineWidth,
  ]);
  useConstructionRegistration(construction);

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
        data={config}
        introTitle={title}
        lines={exploring ? [] : ["Drag to rotate. Shift-drag to pan. Scroll to zoom."]}
        places={
          exploring && (
            <button
              className={flightStyles.navigation}
              type="button"
              onClick={() => window.dispatchEvent(new Event("garden:reset-pose"))}
            >
              Reset view
            </button>
          )
        }
        explorationControls={
          exploring ? (
            <>
              <PanelSelect path="lighting" label="Lighting" options={["classic", "depth"]} />
              <PanelSelect
                path="occlusion"
                label="Corner shading"
                options={["off", "soft", "minecraft"]}
                optionLabels={["Off", "Soft", "Minecraft AO"]}
              />
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
              <PanelBoolean path="showFaces" />
              <PanelBoolean path="showWireframe" />
              <PanelNumber path="lineWidth" min={0} max={2} step={0.1} />
            </>
          ) : (
            <>
              <PanelSelect path="lighting" label="Lighting" options={["classic", "depth"]} />
              <PanelSelect
                path="occlusion"
                label="Corner shading"
                options={["off", "soft", "minecraft"]}
                optionLabels={["Off", "Soft", "Strong"]}
              />
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
              <PanelBoolean path="autoRotate" />
              <PanelNumber path="rotationX" min={-180} max={180} step={1} />
              <PanelNumber path="rotationY" min={-180} max={180} step={1} />
              <PanelBoolean path="showFaces" />
              <PanelBoolean path="showWireframe" />
              <PanelNumber path="lineWidth" min={0} max={2} step={0.1} />
            </>
          )
        }
        mode="scene"
        onUpdate={handleUpdate}
        shareRules={[
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
        <PanelNumber path="iterations" min={0} max={maxIterations} step={1} />
        <PanelBoolean path="autoRotate" />
        <PanelNumber path="rotationX" min={-180} max={180} step={1} />
        <PanelNumber path="rotationY" min={-180} max={180} step={1} />
        <PanelNumber path="cameraDistance" min={2} max={12} step={0.1} />

        <PanelNumber path="lineWidth" min={0} max={2} step={0.1} />
        <PanelBoolean path="showFaces" />
        <PanelBoolean path="showWireframe" />
      </ExplorerPanel>
      <div
        data-fractal-viewport
        className={styles.viewport}
        style={{ background: config.background }}
      >
        {!exploring && width && height && (
          <SpatialExplorer
            key={config.variant}
            spec={variant.spec}
            style={config}
            setStyle={setConfig}
            width={width}
            height={height}
          />
        )}
      </div>
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
