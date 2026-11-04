import { type Dispatch, type SetStateAction, useEffect, useRef } from "react";
import { moveCanvasViewport } from "../canvasViewport";
import type { ConstructionView } from "../constructionView";
import { dragRotation, IDENTITY } from "../orientation";
import { createZoomWheelGuard, listenForZoomWheel, zoomWheelDelta } from "../shouldZoomWheel";
import { isSidewaysSlide } from "../touchSlide";

export function zoomConstruction(view: ConstructionView, scene: boolean, factor: number) {
  return scene
    ? {
        ...view,
        autoRotate: false,
        cameraDistance: Math.max(2, Math.min(12, view.cameraDistance / factor)),
      }
    : { ...view, ...moveCanvasViewport(view, 1, 1, factor, 0.5, 0.5) };
}

export function useConstructionNavigation(
  canvas: HTMLCanvasElement | null,
  scene: boolean,
  view: ConstructionView,
  setView: Dispatch<SetStateAction<ConstructionView>>,
  onReset: () => void,
  initialDistance = 7.5,
) {
  const latest = useRef({ view, onReset });
  latest.current = { view, onReset };
  useEffect(() => {
    if (!canvas) return;
    const pointers = new Map<number, { x: number; y: number }>();
    // These figures sit in an article, so one finger going up or down scrolls the page. It moves
    // the view only after sliding sideways, and from then on it can go anywhere.
    let moving = false;
    const change = (factor: number, x: number, y: number, dx = 0, dy = 0) => {
      const rect = canvas.getBoundingClientRect();
      setView((old) =>
        scene
          ? factor !== 1
            ? zoomConstruction(old, true, factor)
            : {
                ...old,
                autoRotate: false,
                grab: dragRotation(
                  old.grab ?? IDENTITY,
                  dx,
                  dy,
                  (Math.hypot(dx, dy) / Math.max(1, Math.min(rect.width, rect.height))) * Math.PI,
                ),
              }
          : {
              ...old,
              ...moveCanvasViewport(
                old,
                rect.width,
                rect.height,
                factor,
                x - rect.left,
                y - rect.top,
                dx,
                dy,
              ),
            },
      );
    };
    const down = (e: PointerEvent) => {
      if (e.button !== 0) return;
      canvas.focus({ preventScroll: true });
      canvas.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      moving = e.pointerType === "mouse" || pointers.size > 1;
      canvas.style.cursor = "grabbing";
    };
    const move = (e: PointerEvent) => {
      const before = pointers.get(e.pointerId);
      if (!before) return;
      if (!moving && !isSidewaysSlide(e.clientX - before.x, e.clientY - before.y)) return;
      moving = true;
      const other = Array.from(pointers).find(([id]) => id !== e.pointerId)?.[1];
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const dx = e.clientX - before.x,
        dy = e.clientY - before.y;
      if (other) {
        const distance = Math.hypot(before.x - other.x, before.y - other.y);
        change(
          distance ? Math.hypot(e.clientX - other.x, e.clientY - other.y) / distance : 1,
          (before.x + other.x) / 2,
          (before.y + other.y) / 2,
          dx / 2,
          dy / 2,
        );
      } else change(1, before.x, before.y, dx, dy);
    };
    const up = (e: PointerEvent) => {
      pointers.delete(e.pointerId);
      if (!pointers.size) moving = false;
      canvas.style.cursor = "grab";
    };
    const holdPage = (e: TouchEvent) => {
      if (moving && e.cancelable) e.preventDefault();
    };
    const guard = createZoomWheelGuard(canvas);
    const wheel = (e: WheelEvent) => {
      if (
        !guard.shouldZoom(
          e,
          scene
            ? latest.current.view.cameraDistance >= initialDistance
            : latest.current.view.zoom <= 1,
        )
      )
        return;
      e.preventDefault();
      change(Math.exp(-zoomWheelDelta(e, canvas)), e.clientX, e.clientY);
    };
    const reset = () => {
      latest.current.onReset();
    };
    const key = (e: KeyboardEvent) => {
      if (["+", "=", "-"].includes(e.key)) {
        e.preventDefault();
        e.stopPropagation();
        setView((old) => zoomConstruction(old, scene, e.key === "-" ? 0.8 : 1.25));
      } else if (e.key.toLowerCase() === "r") {
        e.preventDefault();
        e.stopPropagation();
        reset();
      }
    };
    canvas.style.touchAction = "pan-y";
    canvas.style.cursor = "grab";
    canvas.tabIndex = 0;
    const stopWheel = listenForZoomWheel(canvas, wheel);
    canvas.addEventListener("touchmove", holdPage, { passive: false });
    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", up);
    canvas.addEventListener("lostpointercapture", up);
    canvas.addEventListener("dblclick", reset);
    canvas.addEventListener("keydown", key);
    return () => {
      guard.dispose();
      stopWheel();
      canvas.removeEventListener("touchmove", holdPage);
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerup", up);
      canvas.removeEventListener("pointercancel", up);
      canvas.removeEventListener("lostpointercapture", up);
      canvas.removeEventListener("dblclick", reset);
      canvas.removeEventListener("keydown", key);
    };
  }, [canvas, scene, setView, initialDistance]);
}
