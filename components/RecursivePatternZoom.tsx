import { type PointerEvent, useEffect, useRef, useState } from "react";
import styles from "../styles/EndlessZoom.module.css";
import { isRecord } from "../utils/explorerShare";
import { useExplorerPart } from "../utils/hooks/useExplorerPart";
import { useRenderSurface } from "../utils/hooks/useRenderSurface";
import {
  initialPatternCamera,
  movePatternCamera,
  type PatternCamera,
  type RecursivePattern,
  restorePatternCamera,
} from "../utils/recursiveZoom";
import { createZoomWheelGuard } from "../utils/shouldZoomWheel";

type Props = {
  pattern: RecursivePattern;
  width: number | null;
  height: number | null;
  onActive: () => void;
};

// Keep the calibrated, animated page underneath until the first gesture.
// The shared render host coalesces gestures and draws local detail on a worker.
export function RecursivePatternZoom({ pattern, width, height, onActive }: Props) {
  const [camera, setCamera] = useState<PatternCamera | null>(null);
  const stage = useRef<HTMLDivElement | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const latest = useRef({ camera, pattern, width, height, onActive });
  const restoring = useRef<string | null>(null);
  latest.current = { camera, pattern, width, height, onActive };
  const { containerRef } = useRenderSurface({
    kind: "recursiveZoom",
    params: camera ? { pattern, camera } : null,
    width,
    height,
  });

  // Geometry changes and an explicit depth edit return to the page's new
  // construction. Styling edits keep the precise camera in place.
  const shapeKey = JSON.stringify([
    pattern.kind,
    "variant" in pattern.config && pattern.config.variant,
    "ratio" in pattern.config && pattern.config.ratio,
    "sides" in pattern.config && [
      pattern.config.sides,
      pattern.config.includeCenter,
      pattern.config.rotation,
    ],
    pattern.config.iterations,
  ]);
  const shapeRef = useRef(shapeKey);
  shapeRef.current = shapeKey;
  useEffect(() => {
    if (restoring.current === shapeKey) {
      restoring.current = null;
      return;
    }
    restoring.current = null;
    setCamera(null);
  }, [shapeKey]);

  useEffect(() => {
    const reset = () => {
      latest.current.camera = null;
      setCamera(null);
    };
    window.addEventListener("garden:reset-pose", reset);
    return () => window.removeEventListener("garden:reset-pose", reset);
  }, []);

  const change = (factor: number, clientX: number, clientY: number, dx = 0, dy = 0) => {
    const current = latest.current;
    if (!current.width || !current.height || !stage.current) return;
    const before = current.camera ?? initialPatternCamera(current.pattern);
    const rect = stage.current.getBoundingClientRect();
    const next = movePatternCamera(
      before,
      current.width,
      current.height,
      factor,
      clientX - rect.left - current.width / 2,
      clientY - rect.top - current.height / 2,
      dx,
      dy,
    );
    if (!current.camera) current.onActive();
    latest.current.camera = next;
    setCamera(next);
  };
  const changeRef = useRef(change);
  changeRef.current = change;

  useEffect(() => {
    const element = stage.current;
    if (!element) return;
    const guard = createZoomWheelGuard(element);
    const wheel = (event: WheelEvent) => {
      if (!guard.shouldZoom(event, (latest.current.camera?.zoom ?? 1) <= 1)) return;
      event.preventDefault();
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? element.clientHeight : 1;
      changeRef.current(
        Math.exp(-event.deltaY * unit * (event.ctrlKey ? 0.01 : 0.0015)),
        event.clientX,
        event.clientY,
      );
    };
    let gestureScale = 1;
    const start = (event: Event) => {
      event.preventDefault();
      gestureScale = 1;
    };
    const gesture = (event: Event) => {
      event.preventDefault();
      const e = event as Event & { scale: number; clientX: number; clientY: number };
      changeRef.current(e.scale / gestureScale, e.clientX, e.clientY);
      gestureScale = e.scale;
    };
    element.addEventListener("wheel", wheel, { passive: false });
    element.addEventListener("gesturestart", start);
    element.addEventListener("gesturechange", gesture);
    return () => {
      guard.dispose();
      element.removeEventListener("wheel", wheel);
      element.removeEventListener("gesturestart", start);
      element.removeEventListener("gesturechange", gesture);
    };
  }, []);

  useExplorerPart(
    "pattern",
    () => {
      const view = latest.current.camera;
      return view
        ? { ...view, x: view.x.toString(), y: view.y.toString(), shape: shapeRef.current }
        : undefined;
    },
    (saved) => {
      const view = restorePatternCamera(saved);
      restoring.current =
        isRecord(saved) && typeof saved.shape === "string" && saved.shape !== shapeRef.current
          ? saved.shape
          : null;
      latest.current.camera = view;
      latest.current.onActive();
      setCamera(view);
    },
    Boolean(width && height),
  );

  const down = (event: PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
  };
  const move = (event: PointerEvent<HTMLDivElement>) => {
    const before = pointers.current.get(event.pointerId);
    if (!before) return;
    const dx = event.clientX - before.x;
    const dy = event.clientY - before.y;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (!dx && !dy) return;
    const other = Array.from(pointers.current).find(([id]) => id !== event.pointerId)?.[1];
    if (other) {
      const distance = Math.hypot(before.x - other.x, before.y - other.y);
      const factor = distance
        ? Math.hypot(event.clientX - other.x, event.clientY - other.y) / distance
        : 1;
      change(factor, (event.clientX + other.x) / 2, (event.clientY + other.y) / 2, dx / 2, dy / 2);
    } else change(1, event.clientX, event.clientY, dx, dy);
  };
  const up = (event: PointerEvent<HTMLDivElement>) => {
    pointers.current.delete(event.pointerId);
  };
  return (
    <div
      ref={stage}
      className={camera ? styles.stageActive : styles.stage}
      role="img"
      aria-label="Interactive fractal. Drag to pan; scroll or pinch to zoom; double-click to reset."
      data-fractal-stage
      data-pattern-zoom={camera?.zoom ?? 1}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
      onDoubleClick={() => {
        latest.current.camera = null;
        setCamera(null);
      }}
    >
      <div ref={containerRef} className={camera ? styles.layer : styles.layerWaiting} />
    </div>
  );
}
