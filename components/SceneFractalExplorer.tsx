import { useCallback, useEffect, useMemo, useState } from "react";
import styles from "../styles/Fullscreen.module.css";
import type { ConstructionLead } from "../utils/constructionLead";
import type { ConstructionView } from "../utils/constructionView";
import { useFractalViewportSize } from "../utils/hooks/useFractalViewportSize";
import type { Orientation } from "../utils/orientation";
import type { SceneSpec } from "../utils/render/scene3d";
import type { FlightCamera, VoxelPattern } from "../utils/voxelZoom/camera";
import { voxelPlaces } from "../utils/voxelZoom/places";
import { PanelBoolean, PanelColor, PanelNumber, PanelSelect } from "./ExplorerControls";
import { ExplorerPanel } from "./ExplorerPanel";
import { useConstructionRegistration } from "./FractalConstruction";
import { PlacesMenu } from "./FractalPlaces";
import { GpuSpatialExplorer } from "./GpuSpatialExplorer";
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

export type ScenePlace<V extends string> = {
  label: string;
  detail: string;
  variant?: V;
  camera: (pattern: VoxelPattern) => FlightCamera;
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
  showWireframe?: boolean;
  lighting?: "classic" | "depth";
  /** Degrees of yaw added per frame while auto-rotating. */
  rotationSpeed?: number;
  places?: ScenePlace<V>[];
  /** The control the article leans on, shown in the construction figure. */
  constructionLead?: ConstructionLead;
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
  showWireframe = true,
  lighting = "depth",
  rotationSpeed = 0.4,
  places = [],
  constructionLead,
}: Props<V>) {
  const { width, height } = useFractalViewportSize();
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
    showWireframe,
    lineWidth,
    lighting,
    occlusion: "soft",
  });
  const [destination, setDestination] = useState<{ variant: V; camera: FlightCamera }>();
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
  const spatialSpec =
    variant.spec.kind === "romanesco" ||
    variant.spec.kind === "jerusalem" ||
    variant.spec.kind === "flake" ||
    variant.spec.kind === "kochSurface" ||
    variant.spec.kind === "quadraticKoch3d"
      ? variant.spec
      : null;
  const maxIterations = variant.maxIterations;
  const variantOptions = useMemo(() => Object.keys(variants) as V[], [variants]);

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
      lighting: config.lighting,
      occlusion: config.occlusion,
      autoRotate: false,
      rotationSpeed,
    };
    return width && height
      ? {
          kind: "scene3d" as const,
          gpuSpec: variant.spec.kind === "romanesco" ? variant.spec : undefined,
          identity: `${storageKey}:${config.variant}`,
          lead: constructionLead,
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
    config.lighting,
    config.occlusion,
    constructionLead,
  ]);
  useConstructionRegistration(construction);

  useEffect(() => {
    if (config.iterations <= maxIterations) return;
    setConfig((old) => ({ ...old, iterations: maxIterations }));
  }, [config.iterations, maxIterations]);

  const handleUpdate = (newData: Config<V>) => {
    if (newData.variant !== config.variant) setDestination(undefined);
    setConfig((old) => ({
      ...old,
      ...newData,
    }));
  };

  const constructionControls = useCallback(
    (view: ConstructionView) => (
      <>
        {variant.spec.kind === "romanesco" && view.showFaces && (
          <>
            <PanelSelect path="lighting" label="Lighting" options={["classic", "depth"]} />
            <PanelSelect
              path="occlusion"
              label="Corner shading"
              options={["off", "soft", "minecraft"]}
              optionLabels={["Off", "Soft", "Strong"]}
            />
          </>
        )}
        <PanelColor path="background" />
        {(view.showFaces || view.showWireframe) && <PanelColor path="fillColor" />}
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
        <PanelNumber path="cameraDistance" min={2} max={12} step={0.1} />
        <PanelBoolean path="showFaces" />
        <PanelBoolean path="showWireframe" />
        {view.showWireframe && (
          <>
            <PanelColor path="strokeColor" />
            <PanelNumber path="lineWidth" min={0} max={2} step={0.1} />
          </>
        )}
      </>
    ),
    [variant.spec.kind, variants, variantOptions, variantLabel],
  );

  return (
    <main className={styles.fullScreen}>
      <ExplorerPanel
        data={config}
        introTitle={title}
        lines={[]}
        places={
          exploring && (
            <PlacesMenu
              views={places.length > 0 ? places : voxelPlaces<V>(pattern)}
              onSelect={(place) => {
                const nextVariant = place.variant ?? config.variant;
                const spec = variants[nextVariant].spec;
                const nextPattern =
                  spec.kind === "mosely"
                    ? spec.variant === "lighter"
                      ? "mosely-light"
                      : "mosely-heavy"
                    : pattern;
                setConfig((old) => ({ ...old, variant: nextVariant }));
                setDestination({ variant: nextVariant, camera: place.camera(nextPattern) });
              }}
            />
          )
        }
        constructionControls={constructionControls}
        explorationControls={
          <>
            {config.showFaces && (
              <>
                <PanelSelect path="lighting" label="Lighting" options={["classic", "depth"]} />
                <PanelSelect
                  path="occlusion"
                  label="Corner shading"
                  options={["off", "soft", "minecraft"]}
                  optionLabels={["Off", "Soft", exploring ? "Minecraft AO" : "Strong"]}
                />
              </>
            )}
            <PanelColor path="background" />
            {(config.showFaces || config.showWireframe) && <PanelColor path="fillColor" />}
            {variantOptions.length > 1 && (
              <PanelSelect
                path="variant"
                label={variantLabel}
                optionLabels={variantOptions.map((option) => variants[option].label)}
                options={variantOptions}
              />
            )}
            {!exploring && (
              <>
                <PanelBoolean path="autoRotate" />
                <PanelNumber path="rotationX" min={-180} max={180} step={1} />
                <PanelNumber path="rotationY" min={-180} max={180} step={1} />
              </>
            )}
            <PanelBoolean path="showFaces" />
            <PanelBoolean path="showWireframe" />
            {config.showWireframe && (
              <>
                <PanelColor path="strokeColor" />
                <PanelNumber path="lineWidth" min={0} max={2} step={0.1} />
              </>
            )}
          </>
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
        onRestore={(saved) => {
          setDestination(undefined);
          setConfig({
            ...saved,
            iterations: Math.min(saved.iterations, variants[saved.variant].maxIterations),
          });
        }}
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
        {spatialSpec && width && height && (
          <GpuSpatialExplorer
            key={config.variant}
            spec={spatialSpec}
            style={config}
            setStyle={setConfig}
            width={width}
            height={height}
          />
        )}
        {exploring && width && height && (
          <VoxelFlight
            key={config.variant}
            pattern={pattern}
            style={config}
            width={width}
            height={height}
            cameraPreset={destination?.variant === config.variant ? destination.camera : undefined}
          />
        )}
      </div>
      <SideDrawer description={description} />
      <NavElement />
    </main>
  );
}
