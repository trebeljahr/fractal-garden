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
import type { RendererKind } from "../utils/render/registry";
import { ConstructionIcon } from "./ConstructionIcon";
import { PanelBoolean, PanelColor, PanelNumber } from "./ExplorerControls";
import { FractalStudioControls } from "./ExplorerPanel";

export type ConstructionSpec = {
  identity: string;
  kind: RendererKind;
  params: unknown;
  config?: Record<string, unknown>;
  makeParams?: (config: Record<string, unknown>) => unknown;
  maxForConfig?: (config: Record<string, unknown>) => number;
  width: number;
  height: number;
  min: number;
  max: number;
  stepDelay?: number;
};

const ConstructionContext = createContext<ConstructionSpec | null>(null);
const RegistrationContext = createContext<Dispatch<SetStateAction<ConstructionSpec | null>>>(
  () => {},
);

const ControlsContext = createContext<ReactNode>(null);
const ControlsRegistrationContext = createContext<Dispatch<SetStateAction<ReactNode>>>(() => {});

export function FractalConstructionProvider({ children }: { children: ReactNode }) {
  const [construction, setConstruction] = useState<ConstructionSpec | null>(null);
  const [controls, setControls] = useState<ReactNode>(null);
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

export function useConstructionControls(children: ReactNode) {
  const spec = useContext(ConstructionContext);
  const register = useContext(ControlsRegistrationContext);
  useEffect(() => {
    register(children);
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
  onInteract,
  onReset,
}: {
  spec: ConstructionSpec;
  level: number;
  view: ConstructionView;
  setView: Dispatch<SetStateAction<ConstructionView>>;
  onReady: (level: number) => void;
  onInteract: () => void;
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
  useConstructionNavigation(canvas, scene, view, setView, onInteract, onReset);
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

function ConstructionSequence({
  spec,
  children,
}: {
  spec: ConstructionSpec;
  children?: ReactNode;
}) {
  const controls = useContext(ControlsContext);
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);
  const [inView, setInView] = useState(false);
  const [ready, setReady] = useState(false);
  const [renderedLevel, setRenderedLevel] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);
  const [view, setView] = useState<ConstructionView>(() => ({
    ...spec.config,
    ...initialConstructionView(spec.params),
  }));
  const autoplayed = useRef(false);
  const frame = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const limit = Math.min(spec.max, spec.maxForConfig?.(view) ?? spec.max);
  const max = Math.max(0, limit - spec.min);
  const selected = Math.min(step, max),
    level = spec.min + selected;
  const scene = constructionIs3D(spec.kind, spec.params);
  const pause = useCallback(() => {
    autoplayed.current = true;
    setPlaying(false);
  }, []);
  const reset = useCallback(() => {
    const initial = initialConstructionView(spec.params);
    setView((old) => ({
      ...old,
      x: 0,
      y: 0,
      zoom: 1,
      cameraDistance: 7.5,
      rotationX: initial.rotationX,
      rotationY: initial.rotationY,
      grab: undefined,
      autoRotate: false,
      resetId: old.resetId + 1,
    }));
  }, [spec.params]);
  const onReady = useCallback((level: number) => {
    setReady(true);
    setRenderedLevel(level);
  }, []);
  useEffect(() => {
    if (!frame.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setVisible(entry.isIntersecting);
        setInView(entry.intersectionRatio >= 0.35);
        if (!entry.isIntersecting) {
          setReady(false);
          setPlaying(false);
        }
      },
      { threshold: [0, 0.35] },
    );
    observer.observe(frame.current);
    return () => observer.disconnect();
  }, []);
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
    if (!inView || reduced) setPlaying(false);
  }, [inView, reduced]);
  useEffect(() => {
    if (!playing || !ready || renderedLevel !== level || !inView || !pageVisible) return;
    if (selected >= max) {
      setPlaying(false);
      return;
    }
    const timer = setTimeout(() => setStep(selected + 1), Math.max(1500, spec.stepDelay ?? 0));
    return () => clearTimeout(timer);
  }, [playing, ready, renderedLevel, level, inView, pageVisible, selected, max, spec.stepDelay]);
  const toggle = () => {
    autoplayed.current = true;
    if (selected >= max) {
      setPlaying(false);
      setStep(0);
      return;
    }
    setPlaying(!playing);
  };
  const change = (next: number) => {
    pause();
    setStep(Math.max(0, Math.min(max, next)));
  };
  const updateStudio = (data: ConstructionView & { iterations: number }) => {
    pause();
    const { iterations, ...next } = data;
    if (iterations !== level) setStep(Math.max(0, Math.min(max, iterations - spec.min)));
    setView(next as ConstructionView);
  };
  const parameters =
    spec.params && typeof spec.params === "object" ? (spec.params as Record<string, unknown>) : {};
  const fields = explorerControlNodes(controls)
    .filter((child) => !isValidElement(child) || child.props.path !== "iterations")
    .map((child) =>
      isValidElement(child) && child.type === PanelBoolean
        ? cloneElement(child, { respectExplorerZoom: false })
        : child,
    );
  const playbackAction = selected >= max ? "Reset" : playing ? "Pause" : "Play";
  const inputProgress = max ? (selected / max) * 100 : 0;
  return (
    <figure className={styles.demo} data-teaching-lesson="full-construction">
      <figcaption className={styles.title}>Build the fractal</figcaption>
      {children && <div className={styles.explanation}>{children}</div>}
      <div
        ref={frame}
        className={styles.workspace}
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
              disabled={max === 0}
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
            <FractalStudioControls data={{ ...view, iterations: level }} onUpdate={updateStudio}>
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
        <div className={styles.viewport} style={{ background: view.background }}>
          {visible && (
            <ConstructionSurface
              spec={spec}
              level={level}
              view={view}
              setView={setView}
              onReady={onReady}
              onInteract={pause}
              onReset={reset}
            />
          )}
        </div>
      </div>
    </figure>
  );
}

export function FractalConstruction({ children }: { children?: ReactNode }) {
  const spec = useContext(ConstructionContext);
  return spec ? (
    <ConstructionSequence key={spec.identity} spec={spec}>
      {children}
    </ConstructionSequence>
  ) : null;
}
