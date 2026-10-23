import {
  createContext,
  type Dispatch,
  isValidElement,
  type PointerEvent,
  type ReactNode,
  type SetStateAction,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import DatGui from "react-dat-gui";
import panelStyles from "../styles/ExplorerPanel.module.css";
import styles from "../styles/FractalConstruction.module.css";
import { INITIAL_CANVAS_VIEW, moveCanvasViewport } from "../utils/canvasViewport";
import { constructionFrame } from "../utils/constructionFrame";
import { explorerControlNodes } from "../utils/explorerControlNodes";
import { isRecord } from "../utils/explorerShare";
import { useReducedMotion } from "../utils/hooks/useReducedMotion";
import { useRenderSurface } from "../utils/hooks/useRenderSurface";
import { dragRotation, IDENTITY, type Orientation } from "../utils/orientation";
import type { RendererKind } from "../utils/render/registry";
import type { HostEvent } from "../utils/render/types";
import { createZoomWheelGuard, listenForZoomWheel, zoomWheelDelta } from "../utils/shouldZoomWheel";
import { LessonFrame, LessonSteps } from "./lessons/LessonFrame";

type Settings = Record<string, unknown>;
export type ConstructionSpec = {
  identity: string;
  kind: RendererKind;
  params: unknown;
  config?: Settings;
  makeParams?: (config: Settings) => unknown;
  maxForConfig?: (config: Settings) => number;
  width: number;
  height: number;
  min: number;
  max: number;
  stepDelay?: number;
};
const ConstructionContext = createContext<ConstructionSpec | null>(null);
const ControlsContext = createContext<ReactNode>(null);
const RegistrationContext = createContext<Dispatch<SetStateAction<ConstructionSpec | null>>>(
  () => {},
);
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

function ConstructionSequence({
  spec,
  children,
}: {
  spec: ConstructionSpec;
  children?: ReactNode;
}) {
  const controls = useContext(ControlsContext);
  const reducedMotion = useReducedMotion();
  const [config, setConfig] = useState<Settings>(() => ({
    ...spec.config,
    iterations: spec.min,
    autoRotate: false,
    grab: undefined,
    cameraDistance: spec.kind === "scene3d" ? 7.5 : spec.config?.cameraDistance,
  }));
  const [viewport, setViewport] = useState(INITIAL_CANVAS_VIEW);
  const [visible, setVisible] = useState(false);
  const frame = useRef<HTMLDivElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const spatial = spec.kind === "scene3d" || spec.kind === "polylineScene";
  const limit = Math.min(spec.max, spec.maxForConfig?.(config) ?? spec.max);
  const max = Math.max(0, limit - spec.min);
  const level = Math.max(spec.min, Math.min(Number(config.iterations), limit));
  const step = level - spec.min;
  const params = useMemo(() => {
    const source = spec.makeParams ? spec.makeParams(config) : spec.params;
    const fitted = constructionFrame(spec.kind, source, level, spec.width, spec.height);
    if (!isRecord(fitted)) return fitted;
    if (spec.kind === "scene3d")
      return {
        ...fitted,
        view: {
          ...(isRecord(fitted.view) ? fitted.view : {}),
          ...config,
          autoRotate: visible && config.autoRotate,
        },
      };
    if (spec.kind === "polylineScene")
      return {
        ...fitted,
        config: {
          ...(isRecord(fitted.config) ? fitted.config : {}),
          ...config,
          animateTrail: false,
          autoRotate: visible && config.autoRotate,
        },
      };
    if (spec.kind === "lsystem2d") {
      const translation = fitted.translation as number[];
      return {
        ...fitted,
        initialLength: Number(fitted.initialLength) * viewport.zoom,
        translation: [
          360 + (translation[0] - 360 - viewport.x * 480) * viewport.zoom,
          240 + (translation[1] - 240 - viewport.y * 480) * viewport.zoom,
        ],
      };
    }
    return { ...fitted, viewport };
  }, [spec, config, level, viewport, visible]);
  const [renderedLevel, setRenderedLevel] = useState<number | null>(null);
  const onEvent = useCallback((event: HostEvent) => {
    if (event.type === "rendered") setRenderedLevel(event.level);
  }, []);
  const renderParams = useMemo(
    () =>
      spatial || visible
        ? { kind: spec.kind, params, level, animate: visible && !reducedMotion }
        : null,
    [spatial, visible, spec.kind, params, level, reducedMotion],
  );
  const { containerRef, restoreView } = useRenderSurface({
    onEvent,
    kind: "construction",
    params: renderParams,
    width: 720,
    height: 480,
    shareView: false,
  });
  const latest = useRef({ config, viewport });
  latest.current = { config, viewport };

  useEffect(() => {
    const element = frame.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const reset = () => {
    restoreView(0);
    setViewport(INITIAL_CANVAS_VIEW);
    setConfig((old) => ({
      ...old,
      grab: undefined,
      autoRotate: false,
      rotationX: spec.config?.rotationX,
      rotationY: spec.config?.rotationY,
      cameraDistance: spec.kind === "scene3d" ? 7.5 : (spec.config?.cameraDistance ?? 6),
    }));
  };
  const change = (factor: number, x: number, y: number, dx = 0, dy = 0) => {
    const rect = frame.current?.getBoundingClientRect();
    if (!rect) return;
    if (spatial) {
      setConfig((old) => ({
        ...old,
        autoRotate: false,
        cameraDistance: Math.max(2, Math.min(12, Number(old.cameraDistance ?? 6) / factor)),
        grab:
          dx || dy
            ? dragRotation(
                (old.grab as Orientation) ?? IDENTITY,
                dx,
                dy,
                (Math.hypot(dx, dy) / Math.min(rect.width, rect.height)) * Math.PI,
              )
            : old.grab,
      }));
    } else
      setViewport((old) =>
        moveCanvasViewport(
          old,
          rect.width,
          rect.height,
          factor,
          x - rect.left,
          y - rect.top,
          dx,
          dy,
        ),
      );
  };
  const changeRef = useRef(change);
  changeRef.current = change;
  useEffect(() => {
    const element = frame.current;
    if (!element) return;
    const guard = createZoomWheelGuard(element);
    const remove = listenForZoomWheel(element, (event) => {
      if (
        !guard.shouldZoom(
          event,
          spatial
            ? Number(latest.current.config.cameraDistance ?? 6) >=
                (spec.kind === "scene3d" ? 7.5 : 6)
            : latest.current.viewport.zoom <= 1,
        )
      )
        return;
      event.preventDefault();
      changeRef.current(Math.exp(-zoomWheelDelta(event, element)), event.clientX, event.clientY);
    });
    return () => {
      remove();
      guard.dispose();
    };
  }, [spatial, spec.kind]);
  const down = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
  };
  const move = (event: PointerEvent<HTMLDivElement>) => {
    const before = pointers.current.get(event.pointerId);
    if (!before) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const other = Array.from(pointers.current).find(([id]) => id !== event.pointerId)?.[1];
    const dx = event.clientX - before.x;
    const dy = event.clientY - before.y;
    if (other) {
      const distance = Math.hypot(before.x - other.x, before.y - other.y);
      const factor = distance
        ? Math.hypot(event.clientX - other.x, event.clientY - other.y) / distance
        : 1;
      change(factor, (event.clientX + other.x) / 2, (event.clientY + other.y) / 2, dx / 2, dy / 2);
    } else change(1, event.clientX, event.clientY, dx, dy);
  };
  const up = (event: PointerEvent<HTMLDivElement>) => pointers.current.delete(event.pointerId);
  const fields = explorerControlNodes(controls).filter(
    (child) => !isValidElement(child) || child.props.path !== "iterations",
  );
  return (
    <LessonFrame title="Build the fractal" kind="full-construction">
      {children}
      <div
        ref={frame}
        className={styles.frame}
        role="img"
        aria-label={`Interactive construction at level ${level}`}
        data-construction-level={level}
        data-construction-rendered={renderedLevel}
        data-construction-zoom={viewport.zoom}
        data-construction-grab={JSON.stringify(config.grab ?? null)}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        onLostPointerCapture={up}
        onDoubleClick={reset}
      >
        <div ref={containerRef} className={styles.surface} />
      </div>
      <div className={styles.caption}>
        <span>
          {spatial
            ? "Drag to rotate. Scroll or pinch to zoom."
            : "Scroll or pinch to zoom. Drag to pan."}
        </span>
        <button type="button" onClick={reset}>
          Reset view
        </button>
      </div>
      <LessonSteps
        label="Fractal construction"
        step={step}
        max={max}
        disabled={renderedLevel === null}
        onChange={(next) => setConfig((old) => ({ ...old, iterations: spec.min + next }))}
        duration={max * Math.max(1500, spec.stepDelay ?? 0)}
      />
      {fields.length > 0 && (
        <details className={`${panelStyles.panel} ${panelStyles.inlinePanel} ${styles.controls}`}>
          <summary>Construction controls</summary>
          <DatGui
            className="exploration-gui"
            data={config}
            labelWidth={160}
            onUpdate={(next) => setConfig((old) => ({ ...old, ...next }))}
          >
            {fields}
          </DatGui>
        </details>
      )}
    </LessonFrame>
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
