import {
  cloneElement,
  createContext,
  type Dispatch,
  isValidElement,
  type ReactNode,
  type SetStateAction,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import panelStyles from "../styles/ExplorerPanel.module.css";
import viewStyles from "../styles/ExplorerViewControls.module.css";
import styles from "../styles/FractalConstruction.module.css";
import { constructionFrame } from "../utils/constructionFrame";
import type { ConstructionLead } from "../utils/constructionLead";
import {
  CONSTRUCTION_BOOLEANS,
  CONSTRUCTION_NUMBERS,
  type ConstructionView,
  constructionIs3D,
  constructionViewParams,
  initialConstructionView,
} from "../utils/constructionView";
import { explorerControlNodes } from "../utils/explorerControlNodes";
import { useConstructionNavigation } from "../utils/hooks/useConstructionNavigation";
import { useReducedMotion } from "../utils/hooks/useReducedMotion";
import { useRenderSurface } from "../utils/hooks/useRenderSurface";
import { hasLSystemPlayback } from "../utils/lsystem/playback";
import type { RendererKind } from "../utils/render/registry";
import { CAMERA_DISTANCE } from "../utils/spatial/camera";
import type { GpuSpatialSpec } from "../utils/spatialGpu/model";
import { ConstructionIcon } from "./ConstructionIcon";
import { ConstructionLeadStrip } from "./ConstructionLeadStrip";
import { PanelBoolean, PanelColor, PanelNumber } from "./ExplorerControls";
import { FractalStudioControls } from "./ExplorerPanel";
import { GpuConstructionSurface } from "./GpuConstructionSurface";
import LSystemProcess from "./LSystemProcess";

export type ConstructionSpec = {
  identity: string;
  kind: RendererKind;
  gpuSpec?: GpuSpatialSpec;
  params: unknown;
  config?: Record<string, unknown>;
  makeParams?: (config: Record<string, unknown>) => unknown;
  maxForConfig?: (config: Record<string, unknown>) => number;
  width: number;
  height: number;
  min: number;
  max: number;
  stepDelay?: number;
  lead?: ConstructionLead;
};

const ConstructionContext = createContext<ConstructionSpec | null>(null);
const RegistrationContext = createContext<Dispatch<SetStateAction<ConstructionSpec | null>>>(
  () => {},
);

export type ConstructionControls = ReactNode | ((view: ConstructionView) => ReactNode);

const ControlsContext = createContext<ConstructionControls>(null);
const ControlsRegistrationContext = createContext<Dispatch<SetStateAction<ConstructionControls>>>(
  () => {},
);

export function FractalConstructionProvider({ children }: { children: ReactNode }) {
  const [construction, setConstruction] = useState<ConstructionSpec | null>(null);
  const [controls, setControls] = useState<ConstructionControls>(null);
  return (
    <RegistrationContext.Provider value={setConstruction}>
      <ControlsRegistrationContext.Provider value={setControls}>
        <ConstructionContext.Provider value={construction}>
          <ControlsContext.Provider value={controls}>{children}</ControlsContext.Provider>
        </ConstructionContext.Provider>
      </ControlsRegistrationContext.Provider>
    </RegistrationContext.Provider>
  );
}
export function useConstructionRegistration(construction: ConstructionSpec | null) {
  const register = useContext(RegistrationContext);
  useEffect(() => {
    register(construction);
    return () => register(null);
  }, [register, construction]);
}

export function useConstructionControls(children: ConstructionControls) {
  const spec = useContext(ConstructionContext);
  const register = useContext(ControlsRegistrationContext);
  useEffect(() => {
    register(() => children);
    return () => register(null);
  }, [register, children]);
  return spec !== null;
}

function ConstructionSurface({
  spec,
  level,
  view,
  setView,
  onReady,
  onReset,
}: {
  spec: ConstructionSpec;
  level: number;
  view: ConstructionView;
  setView: Dispatch<SetStateAction<ConstructionView>>;
  onReady: (level: number) => void;
  onReset: () => void;
}) {
  const reducedMotion = useReducedMotion();
  const [size, setSize] = useState({ width: 720, height: 480 });
  const scene = constructionIs3D(spec.kind, spec.params);
  const params = useMemo(() => {
    const settings = Object.fromEntries(
      Object.entries(view).filter(([key]) => !["x", "y", "zoom", "resetId"].includes(key)),
    );
    const source = spec.makeParams
      ? spec.makeParams({ ...settings, iterations: level })
      : spec.params;
    const fitted = constructionFrame(
      spec.kind,
      source,
      level,
      spec.width,
      spec.height,
      size.width,
      size.height,
    );
    // Registered controls may map nested settings into flat renderer parameters.
    // Keep that mapping intact; only spatial cameras need a separate local override.
    return spec.makeParams && !scene ? fitted : constructionViewParams(spec.kind, fitted, view);
  }, [spec, level, size.width, size.height, view, scene]);
  const { containerRef, canvas } = useRenderSurface({
    kind: "construction",
    params: {
      kind: spec.kind,
      params,
      level,
      animate: !reducedMotion,
      resetKey: view.resetId,
      viewport: scene ? undefined : { x: view.x, y: view.y, zoom: view.zoom },
    },
    width: size.width,
    height: size.height,
    shareView: false,
    onEvent: (event) => {
      if (event.type === "rendered") onReady(event.level);
    },
  });
  useConstructionNavigation(canvas, scene, view, setView, onReset);
  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width && height)
        setSize((old) =>
          old.width === Math.round(width) && old.height === Math.round(height)
            ? old
            : { width: Math.round(width), height: Math.round(height) },
        );
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [containerRef]);
  useEffect(() => {
    if (canvas)
      canvas.setAttribute(
        "aria-label",
        scene
          ? "Construction view. Drag to rotate; scroll or pinch to zoom; double-click to reset."
          : "Construction view. Drag to pan; scroll or pinch to zoom; double-click to reset.",
      );
  }, [canvas, scene]);
  return <div ref={containerRef} className={styles.surface} />;
}

function ConstructionSequence({ spec }: { spec: ConstructionSpec }) {
  const controls = useContext(ControlsContext);
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);
  const [seen, setSeen] = useState(false);
  const [inView, setInView] = useState(false);
  const [ready, setReady] = useState(false);
  const [renderedLevel, setRenderedLevel] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [completedLevel, setCompletedLevel] = useState<number | null>(null);
  const [processReset, setProcessReset] = useState(0);
  const [processSpeed, setProcessSpeed] = useState(1);
  const lsystem = hasLSystemPlayback(spec.kind);
  const [pageVisible, setPageVisible] = useState(true);
  const [view, setView] = useState<ConstructionView>(() => ({
    ...spec.lead?.initial,
    ...spec.config,
    ...initialConstructionView(spec.params, spec.gpuSpec ? CAMERA_DISTANCE : undefined),
  }));
  const autoplayed = useRef(false);
  const frame = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const limit = Math.min(spec.max, spec.maxForConfig?.(view) ?? spec.max);
  const max = Math.max(0, limit - spec.min);
  const selected = Math.min(step, max),
    level = spec.min + selected;
  const processComplete = completedLevel === level;
  const onProcessComplete = useCallback(
    (done: boolean) => setCompletedLevel(done ? level : null),
    [level],
  );
  const scene = constructionIs3D(spec.kind, spec.params);
  const pause = useCallback(() => {
    autoplayed.current = true;
    setPlaying(false);
  }, []);
  const reset = useCallback(() => {
    const initial = initialConstructionView(
      spec.params,
      spec.gpuSpec ? CAMERA_DISTANCE : undefined,
    );
    setView((old) => ({
      ...old,
      x: 0,
      y: 0,
      zoom: 1,
      cameraDistance: initial.cameraDistance,
      rotationX: initial.rotationX,
      rotationY: initial.rotationY,
      grab: undefined,
      autoRotate: false,
      resetId: old.resetId + 1,
    }));
  }, [spec.params, spec.gpuSpec]);
  const onReady = useCallback((level: number) => {
    setReady(true);
    setRenderedLevel(level);
  }, []);
  useEffect(() => {
    if (!frame.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setVisible(entry.isIntersecting);
        if (entry.isIntersecting) setSeen(true);
        setInView(entry.intersectionRatio >= 0.35);
        if (!entry.isIntersecting && !lsystem) setReady(false);
      },
      { threshold: [0, 0.35] },
    );
    observer.observe(frame.current);
    return () => observer.disconnect();
  }, [lsystem]);
  useEffect(() => {
    const update = () => {
      setPageVisible(!document.hidden);
      if (document.hidden) setPlaying(false);
    };
    update();
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);
  useEffect(() => {
    if (inView && ready && pageVisible && !reduced && !autoplayed.current && max > 0) {
      autoplayed.current = true;
      setPlaying(true);
    }
  }, [inView, ready, pageVisible, reduced, max]);
  useEffect(() => {
    if (reduced) setPlaying(false);
  }, [reduced]);
  useEffect(() => {
    // Scrolling away only holds playback, because the picture isn't drawn off screen.
    if (!playing || !ready || renderedLevel !== level || !visible || !pageVisible) return;
    if (lsystem && !processComplete) return;
    if (selected >= max) {
      setPlaying(false);
      return;
    }
    const timer = setTimeout(() => setStep(selected + 1), Math.max(1500, spec.stepDelay ?? 0));
    return () => clearTimeout(timer);
  }, [
    playing,
    ready,
    renderedLevel,
    level,
    visible,
    pageVisible,
    selected,
    max,
    spec.stepDelay,
    lsystem,
    processComplete,
  ]);
  const toggle = () => {
    autoplayed.current = true;
    if (selected >= max && (!lsystem || processComplete)) {
      setPlaying(false);
      setStep(0);
      if (lsystem) {
        setCompletedLevel(null);
        setProcessReset((value) => value + 1);
      }
      return;
    }
    // A finished level plays from its start before moving on.
    if (lsystem && processComplete && !playing) {
      setCompletedLevel(null);
      setProcessReset((value) => value + 1);
    }
    setPlaying(!playing);
  };
  const change = (next: number) => {
    pause();
    setStep(Math.max(0, Math.min(max, next)));
  };
  const updateStudio = (data: ConstructionView & { iterations: number }) => {
    const { iterations, ...next } = data;
    if (iterations !== level) change(iterations - spec.min);
    setView(next as ConstructionView);
  };
  const parameters =
    spec.params && typeof spec.params === "object" ? (spec.params as Record<string, unknown>) : {};
  const fields = explorerControlNodes(typeof controls === "function" ? controls(view) : controls)
    .filter(
      (child) =>
        !isValidElement(child) ||
        (child.props.path !== "iterations" && child.props.path !== spec.lead?.control.path),
    )
    .map((child) =>
      isValidElement(child) && child.type === PanelBoolean
        ? cloneElement(child, { respectExplorerZoom: false })
        : child,
    );
  const playbackAction =
    selected >= max && (!lsystem || processComplete) ? "Reset" : playing ? "Pause" : "Play";
  const inputProgress = max ? (selected / max) * 100 : 0;
  return (
    <figure className={styles.demo} data-teaching-lesson="full-construction">
      <div
        ref={frame}
        className={`${styles.workspace} ${lsystem ? styles.lsystemWorkspace : ""}`}
        data-construction-level={level}
        data-construction-rendered={renderedLevel}
        data-construction-grab={JSON.stringify(view.grab ?? null)}
        data-construction-distance={view.cameraDistance}
        data-construction-zoom={view.zoom}
        data-construction-pose={JSON.stringify(view.grab ?? null)}
        data-construction-tilt={view.rotationX}
        data-construction-color={view.fillColor}
      >
        <div className={styles.toolbar}>
          <fieldset
            className={`${viewStyles.controls} ${styles.transport}`}
            disabled={!ready}
            aria-label="Fractal construction controls"
          >
            <button
              type="button"
              onClick={() => change(selected - 1)}
              disabled={selected === 0}
              aria-label="Previous construction step"
              title="Previous step"
            >
              <ConstructionIcon name="previous" />
            </button>
            <button
              type="button"
              onClick={toggle}
              disabled={max === 0 && !lsystem}
              aria-pressed={playbackAction === "Reset" ? undefined : playing}
              aria-label={`${playbackAction} construction`}
              title={`${playbackAction} construction`}
            >
              <ConstructionIcon
                name={playbackAction === "Reset" ? "reset" : playing ? "pause" : "play"}
              />
            </button>
            <button
              type="button"
              onClick={() => change(selected + 1)}
              disabled={selected === max}
              aria-label="Next construction step"
              title="Next step"
            >
              <ConstructionIcon name="next" />
            </button>
            <label className={styles.step}>
              <span>
                Level {level} of {limit}
              </span>
              <input
                className={panelStyles.numberSlider}
                type="range"
                min={0}
                max={max}
                step={1}
                value={selected}
                aria-label="Construction step"
                onChange={(event) => change(Number(event.target.value))}
                style={{
                  backgroundImage: `linear-gradient(90deg,var(--explorer-accent) ${inputProgress}%,var(--explorer-field) ${inputProgress}%)`,
                }}
              />
            </label>
          </fieldset>
          <div className={`${panelStyles.panel} ${styles.studioPanel}`}>
            <FractalStudioControls
              data={{ ...view, iterations: level }}
              onUpdate={updateStudio}
              title="Construction controls"
            >
              <PanelNumber
                path="iterations"
                label="Construction level"
                min={spec.min}
                max={limit}
                step={1}
              />
              {fields.length > 0 ? (
                fields
              ) : (
                <>
                  <PanelColor path="background" />
                  {spec.kind === "scene3d" ? (
                    <>
                      <PanelColor path="fillColor" />
                      <PanelColor path="strokeColor" />
                    </>
                  ) : spec.kind === "polylineScene" ? (
                    <>
                      <PanelColor path="nearColor" />
                      <PanelColor path="farColor" />
                    </>
                  ) : (
                    <PanelColor path="color" />
                  )}
                  <PanelNumber path="lineWidth" min={0} max={5} step={0.1} />
                  {scene && (
                    <>
                      <PanelNumber path="rotationX" min={-180} max={180} step={1} />
                      <PanelNumber path="rotationY" min={-180} max={180} step={1} />
                      <PanelNumber path="cameraDistance" min={2} max={12} step={0.1} />
                    </>
                  )}
                  {(spec.kind === "scene3d" || spec.kind === "polylineScene") && (
                    <PanelBoolean path="autoRotate" respectExplorerZoom={false} />
                  )}
                  {spec.kind === "scene3d" && (
                    <>
                      <PanelBoolean path="showFaces" />
                      <PanelBoolean path="showWireframe" />
                    </>
                  )}
                  {Object.entries(CONSTRUCTION_NUMBERS)
                    .filter(([key]) => typeof parameters[key] === "number")
                    .map(([key, range]) => (
                      <PanelNumber key={key} path={key} {...range} />
                    ))}
                  {CONSTRUCTION_BOOLEANS.filter((key) => typeof parameters[key] === "boolean").map(
                    (key) => (
                      <PanelBoolean key={key} path={key} />
                    ),
                  )}
                </>
              )}
            </FractalStudioControls>
          </div>
        </div>
        {spec.lead && (
          <ConstructionLeadStrip
            lead={spec.lead}
            view={view}
            level={level}
            onChange={(path, value) => {
              pause();
              setView((old) => ({ ...old, [path]: value }));
            }}
          />
        )}
        <div className={styles.viewport} style={{ background: view.background }}>
          {(lsystem ? seen : visible) &&
            (lsystem ? (
              <LSystemProcess
                key={`${spec.identity}:${level}:${processReset}`}
                kind={spec.kind}
                params={
                  spec.makeParams ? spec.makeParams({ ...view, iterations: level }) : spec.params
                }
                level={level}
                playing={playing}
                speed={processSpeed}
                onSpeedChange={setProcessSpeed}
                view={view}
                setView={setView}
                onReady={onReady}
                onComplete={onProcessComplete}
                onInteract={pause}
                onReset={reset}
              />
            ) : spec.gpuSpec ? (
              <GpuConstructionSurface
                spec={spec.gpuSpec}
                level={level}
                view={view}
                setView={setView}
                onReady={onReady}
                onReset={reset}
                overlay={spec.lead?.overlay}
              />
            ) : (
              <ConstructionSurface
                spec={spec}
                level={level}
                view={view}
                setView={setView}
                onReady={onReady}
                onReset={reset}
              />
            ))}
        </div>
      </div>
    </figure>
  );
}

export function FractalConstruction() {
  const spec = useContext(ConstructionContext);
  return spec ? <ConstructionSequence key={spec.identity} spec={spec} /> : null;
}
