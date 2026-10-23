import { type MutableRefObject, useEffect } from "react";
import {
  type LogisticView,
  logisticPoint,
  panLogisticView,
  zoomLogisticView,
} from "../logisticMap";
import { createZoomWheelGuard, listenForZoomWheel, zoomWheelDelta } from "../shouldZoomWheel";

type Point = { x: number; y: number };

export function useLogisticViewportControls(
  canvas: HTMLCanvasElement | null,
  viewRef: MutableRefObject<LogisticView>,
  onChange: () => void,
) {
  useEffect(() => {
    if (!canvas) return;
    const pointers = new Map<number, Point>();
    let startView = viewRef.current;
    let start: Point | null = null;
    let pinchDistance = 1;
    let shiftZoom = false;
    const point = (event: PointerEvent | WheelEvent): Point => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: (event.clientX - rect.left) / rect.width,
        y: (event.clientY - rect.top) / rect.height,
      };
    };
    const pair = () => {
      const [a, b] = Array.from(pointers.values());
      const rect = canvas.getBoundingClientRect();
      return {
        middle: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
        distance: Math.max(1, Math.hypot((a.x - b.x) * rect.width, (a.y - b.y) * rect.height)),
      };
    };
    const reanchor = () => {
      startView = viewRef.current;
      if (pointers.size >= 2) {
        const pinch = pair();
        start = pinch.middle;
        pinchDistance = pinch.distance;
        shiftZoom = false;
      } else start = pointers.values().next().value ?? null;
    };
    const down = (event: PointerEvent) => {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      event.preventDefault();
      pointers.set(event.pointerId, point(event));
      canvas.setPointerCapture?.(event.pointerId);
      shiftZoom = event.shiftKey;
      reanchor();
      canvas.style.cursor = shiftZoom ? "ns-resize" : "grabbing";
    };
    const move = (event: PointerEvent) => {
      if (!pointers.has(event.pointerId) || !start) return;
      event.preventDefault();
      const current = point(event);
      pointers.set(event.pointerId, current);
      if (pointers.size >= 2) {
        const pinch = pair();
        const zoomed = zoomLogisticView(
          startView,
          start.x,
          start.y,
          pinchDistance / pinch.distance,
        );
        // Move the original world anchor with the midpoint as well as changing scale.
        const anchor = logisticPoint(startView, start.x, start.y);
        const nextAnchor = logisticPoint(zoomed, pinch.middle.x, pinch.middle.y);
        const dr = anchor.r - nextAnchor.r;
        const dx = anchor.x - nextAnchor.x;
        viewRef.current = {
          rMin: zoomed.rMin + dr,
          rMax: zoomed.rMax + dr,
          xMin: zoomed.xMin + dx,
          xMax: zoomed.xMax + dx,
        };
      } else if (shiftZoom) {
        viewRef.current = zoomLogisticView(
          startView,
          start.x,
          start.y,
          Math.exp((current.y - start.y) * 2.2),
        );
      } else {
        viewRef.current = panLogisticView(startView, current.x - start.x, current.y - start.y);
      }
      onChange();
    };
    const up = (event: PointerEvent) => {
      pointers.delete(event.pointerId);
      reanchor();
      if (!pointers.size) canvas.style.cursor = "grab";
    };
    const guard = createZoomWheelGuard(canvas);
    const wheel = (event: WheelEvent) => {
      const view = viewRef.current;
      const atMinZoom = view.rMax - view.rMin >= 1.5 - 1e-9 || view.xMax - view.xMin >= 1 - 1e-9;
      if (!guard.shouldZoom(event, atMinZoom)) return;
      event.preventDefault();
      const focus = point(event);
      viewRef.current = zoomLogisticView(
        view,
        focus.x,
        focus.y,
        Math.exp(zoomWheelDelta(event, canvas)),
      );
      // Wheel/pinch and dragging can overlap on a trackpad.
      reanchor();
      onChange();
    };
    canvas.style.cursor = "grab";
    canvas.style.touchAction = "none";
    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", up);
    canvas.addEventListener("lostpointercapture", up);
    const removeZoomWheel = listenForZoomWheel(canvas, wheel);
    return () => {
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerup", up);
      canvas.removeEventListener("pointercancel", up);
      canvas.removeEventListener("lostpointercapture", up);
      removeZoomWheel();
      guard.dispose();
      canvas.style.touchAction = "";
    };
  }, [canvas, onChange, viewRef]);
}
