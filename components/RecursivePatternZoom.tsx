import { type PointerEvent, useEffect, useRef, useState } from "react";
import styles from "../styles/EndlessZoom.module.css";
import { isRecord } from "../utils/explorerShare";
import { useExplorerPart } from "../utils/hooks/useExplorerPart";
import { useRenderSurface } from "../utils/hooks/useRenderSurface";
import { fixedFromNumber } from "../utils/lsystem/bigfixed";
import {
  initialPatternCamera,
  movePatternCamera,
  type PatternCamera,
  type RecursivePattern,
  restorePatternCamera,
} from "../utils/recursiveZoom";
import { createZoomWheelGuard, listenForZoomWheel, zoomWheelDelta } from "../utils/shouldZoomWheel";
import { useZoomActivity } from "./ZoomActivity";

type Props = {
  pattern: RecursivePattern;
  ready?: boolean;
  width: number | null;
  height: number | null;
};

// Show the whole recursive shape as soon as its opening depth is calibrated.
// The shared render host coalesces gestures and draws local detail on a worker.
export function RecursivePatternZoom({ pattern, width, height, ready = true }: Props) {
  const { setActive: setZoomActive } = useZoomActivity();
  const [camera, setCamera] = useState<PatternCamera | null>(null);
  const stage = useRef<HTMLDivElement | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const latest = useRef({ camera, pattern, width, height });
  const restoring = useRef<string | null>(null);
  const restoringFrame = useRef(false);
  latest.current = { camera, pattern, width, height };
  const { containerRef } = useRenderSurface({
    kind: "recursiveZoom",
    params: ready
      ? { pattern, camera: camera ?? initialPatternCamera(pattern, width ?? 1000, height ?? 1000) }
      : null,
    width,
    height,
  });

  const expanded = pattern.kind === "canopy" && (camera?.zoom ?? 1) > 1;
  useEffect(() => {
    if (pattern.kind !== "canopy") return;
    setZoomActive(expanded);
    return () => setZoomActive(false);
  }, [expanded, pattern.kind, setZoomActive]);

  const previousFrame = useRef<{ side: number; x: number; y: number } | null>(null);
  useEffect(() => {
    if (pattern.kind !== "canopy" || !width || !height || !stage.current) return;
    const rect = stage.current.getBoundingClientRect();
    if (Math.abs(rect.height - height) > 1) return;
    const nextFrame = {
      side: Math.min(width, height),
      x: rect.left + width / 2,
      y: rect.top + height / 2,
    };
    const before = previousFrame.current;
    previousFrame.current = nextFrame;
    if (restoringFrame.current) {
      restoringFrame.current = false;
      return;
    }
    const view = latest.current.camera;
    if (!before || !view) return;
    const scale = view.frame * before.side * view.zoom;
    const next = {
      ...view,
      frame: (view.frame * before.side) / nextFrame.side,
      x: view.x + fixedFromNumber((nextFrame.x - before.x) / scale, view.bits),
      y: view.y + fixedFromNumber((nextFrame.y - before.y) / scale, view.bits),
    };
    latest.current.camera = next;
    setCamera(next);
  }, [width, height, pattern.kind]);

  // Geometry changes and an explicit depth edit return to the page's new
  // full view. Styling edits keep the precise camera in place.
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
    pattern.kind === "canopy" && [
      pattern.config.angle,
      pattern.config.branches,
      pattern.config.lengthFactor,
      pattern.config.widthFactor,
      pattern.config.rootWidth,
    ],
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
    const before =
      current.camera ?? initialPatternCamera(current.pattern, current.width, current.height);
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
    latest.current.camera =
      factor < 1 && next.zoom === 1 && current.pattern.kind === "canopy" ? null : next;
    setCamera(latest.current.camera);
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
      changeRef.current(Math.exp(-zoomWheelDelta(event, element)), event.clientX, event.clientY);
    };
    const removeZoomWheel = listenForZoomWheel(element, wheel);
    return () => {
      guard.dispose();
      removeZoomWheel();
    };
  }, []);

  useExplorerPart(
    "pattern",
    () => {
      const view =
        latest.current.camera ??
        initialPatternCamera(
          latest.current.pattern,
          latest.current.width ?? 1000,
          latest.current.height ?? 1000,
        );
      return view
        ? { ...view, x: view.x.toString(), y: view.y.toString(), shape: shapeRef.current }
        : undefined;
    },
    (saved) => {
      const view = restorePatternCamera(saved);
      restoringFrame.current =
        pattern.kind === "canopy" &&
        view.zoom > 1 &&
        !document.body.hasAttribute("data-fractal-zoom");
      restoring.current =
        isRecord(saved) && typeof saved.shape === "string" && saved.shape !== shapeRef.current
          ? saved.shape
          : null;
      latest.current.camera = view;
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
      className={ready ? styles.stageActive : styles.stage}
      role="img"
      aria-label="Interactive fractal. Drag to pan; scroll or pinch to zoom; double-click to reset."
      data-fractal-stage
      data-pattern-zoom={camera?.zoom ?? 1}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
      onLostPointerCapture={up}
      onDoubleClick={() => {
        latest.current.camera = null;
        setCamera(null);
      }}
    >
      <div ref={containerRef} className={ready ? styles.layer : styles.layerWaiting} />
    </div>
  );
}
