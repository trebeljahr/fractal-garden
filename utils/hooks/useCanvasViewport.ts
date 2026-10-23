import { useEffect, useRef, useState } from "react";
import { INITIAL_CANVAS_VIEW, moveCanvasViewport, restoreCanvasViewport } from "../canvasViewport";
import { createZoomWheelGuard, listenForZoomWheel, zoomWheelDelta } from "../shouldZoomWheel";
import { useExplorerPart } from "./useExplorerPart";

/** Pan and zoom for finite canvas drawings without an endless-detail renderer. */
export function useCanvasViewport(canvas: HTMLCanvasElement | null) {
  const [view, setView] = useState(INITIAL_CANVAS_VIEW);
  const latest = useRef(view);
  latest.current = view;
  useExplorerPart(
    "canvasViewport",
    () => latest.current,
    (saved) => {
      setView(restoreCanvasViewport(saved));
    },
    Boolean(canvas),
  );

  useEffect(() => {
    if (!canvas) return;
    const pointers = new Map<number, { x: number; y: number }>();
    const change = (factor: number, x: number, y: number, dx = 0, dy = 0) => {
      const rect = canvas.getBoundingClientRect();
      latest.current = moveCanvasViewport(
        latest.current,
        rect.width,
        rect.height,
        factor,
        x - rect.left,
        y - rect.top,
        dx,
        dy,
      );
      setView(latest.current);
    };
    const reset = () => {
      latest.current = INITIAL_CANVAS_VIEW;
      setView(INITIAL_CANVAS_VIEW);
    };
    const guard = createZoomWheelGuard(canvas);
    const wheel = (event: WheelEvent) => {
      if (!guard.shouldZoom(event, latest.current.zoom <= 1)) return;
      event.preventDefault();
      change(Math.exp(-zoomWheelDelta(event, canvas)), event.clientX, event.clientY);
    };
    const down = (event: PointerEvent) => {
      if (event.button !== 0) return;
      canvas.setPointerCapture(event.pointerId);
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    };
    const move = (event: PointerEvent) => {
      const before = pointers.get(event.pointerId);
      if (!before) return;
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      const dx = event.clientX - before.x;
      const dy = event.clientY - before.y;
      const other = Array.from(pointers).find(([id]) => id !== event.pointerId)?.[1];
      if (other) {
        const distance = Math.hypot(before.x - other.x, before.y - other.y);
        const factor = distance
          ? Math.hypot(event.clientX - other.x, event.clientY - other.y) / distance
          : 1;
        change(factor, (before.x + other.x) / 2, (before.y + other.y) / 2, dx / 2, dy / 2);
      } else change(1, before.x, before.y, dx, dy);
    };
    const up = (event: PointerEvent) => pointers.delete(event.pointerId);
    const previousTouchAction = canvas.style.touchAction;
    canvas.style.touchAction = "none";
    const stopWheel = listenForZoomWheel(canvas, wheel);
    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", up);
    canvas.addEventListener("lostpointercapture", up);
    canvas.addEventListener("dblclick", reset);
    window.addEventListener("garden:reset-pose", reset);
    return () => {
      guard.dispose();
      canvas.style.touchAction = previousTouchAction;
      stopWheel();
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerup", up);
      canvas.removeEventListener("pointercancel", up);
      canvas.removeEventListener("lostpointercapture", up);
      canvas.removeEventListener("dblclick", reset);
      window.removeEventListener("garden:reset-pose", reset);
    };
  }, [canvas]);

  useEffect(() => {
    if (!canvas) return;
    canvas.dataset.canvasZoom = String(view.zoom);
    canvas.style.cursor = view.zoom > 1 ? "grab" : "zoom-in";
    canvas.setAttribute(
      "aria-label",
      "Interactive fractal. Drag to pan; scroll or pinch to zoom; double-click to reset.",
    );
  }, [canvas, view]);
  return view;
}
