import { type MutableRefObject, useEffect, useRef } from "react";
import {
  type DeepViewport,
  deserializeViewport,
  MAX_DEPTH_BITS,
  moveViewport,
  serializeViewport,
  zoomViewport,
} from "../deepZoom/math";
import { createZoomWheelGuard } from "../shouldZoomWheel";
import { useExplorerPart } from "./useExplorerPart";

type Point = { x: number; y: number };

export function useDeepZoomControls({
  canvas,
  viewportRef,
  maxZoomSize,
  flipY,
  getRenderedViewport,
  onChange,
}: {
  canvas: HTMLCanvasElement | null;
  viewportRef: MutableRefObject<DeepViewport>;
  maxZoomSize: number;
  flipY: boolean;
  getRenderedViewport: () => DeepViewport | null;
  onChange: () => void;
}) {
  const change = useRef(onChange);
  change.current = onChange;
  useExplorerPart(
    "viewport",
    () => serializeViewport(viewportRef.current),
    (saved) => {
      viewportRef.current = deserializeViewport(saved, maxZoomSize);
      change.current();
    },
    Boolean(canvas),
  );

  useEffect(() => {
    if (!canvas) return;
    const pointers = new Map<number, Point>();
    const point = (event: PointerEvent | WheelEvent): Point => {
      const rect = canvas.getBoundingClientRect();
      const size = Math.max(1, Math.min(rect.width, rect.height));
      return {
        x: (2 * (event.clientX - rect.left) - rect.width) / size,
        y: ((rect.height - 2 * (event.clientY - rect.top)) / size) * (flipY ? -1 : 1),
      };
    };
    const clamp = (log: number) => Math.max(-MAX_DEPTH_BITS, Math.min(Math.log2(maxZoomSize), log));
    const pace = (log: number) => {
      const rendered = getRenderedViewport();
      // A saved destination may still be loading. Do not pull that camera back
      // to the previous destination if a gesture arrives before it is shown.
      const base =
        rendered && Math.abs(viewportRef.current.logZoom - rendered.logZoom) <= 0.5
          ? rendered.logZoom
          : viewportRef.current.logZoom;
      // Queue at most a small zoom step beyond the sharp frame on screen.
      // Excess wheel/pinch input is discarded, not played back after release.
      return clamp(Math.max(base - 0.25, Math.min(base + 0.25, log)));
    };
    const gesture = () => {
      const pair = Array.from(pointers.values());
      const first = pair[0];
      const second = pair[1];
      return second
        ? {
            x: (first.x + second.x) / 2,
            y: (first.y + second.y) / 2,
            distance: Math.max(1e-6, Math.hypot(first.x - second.x, first.y - second.y)),
          }
        : { ...first, distance: 0 };
    };
    const down = (event: PointerEvent) => {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      event.preventDefault();
      pointers.set(event.pointerId, point(event));
      canvas.setPointerCapture(event.pointerId);
      canvas.style.cursor = "grabbing";
    };
    const move = (event: PointerEvent) => {
      if (!pointers.has(event.pointerId)) return;
      event.preventDefault();
      const before = gesture();
      pointers.set(event.pointerId, point(event));
      const after = gesture();
      let view = viewportRef.current;
      if (before.distance && after.distance) {
        view = zoomViewport(
          view,
          pace(view.logZoom + Math.log2(before.distance / after.distance)),
          before.x,
          before.y,
        );
      }
      viewportRef.current = moveViewport(view, before.x - after.x, before.y - after.y);
      change.current();
    };
    const up = (event: PointerEvent) => {
      pointers.delete(event.pointerId);
      if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
      if (!pointers.size) canvas.style.cursor = "grab";
    };
    const wheelGuard = createZoomWheelGuard(canvas);
    const wheel = (event: WheelEvent) => {
      if (!wheelGuard.shouldZoom(event, viewportRef.current.logZoom >= Math.log2(maxZoomSize)))
        return;
      event.preventDefault();
      const anchor = point(event);
      const pixels =
        event.deltaY *
        (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? canvas.clientHeight : 1);
      const next = pace(
        viewportRef.current.logZoom + Math.max(-2, Math.min(2, (pixels * 0.0015) / Math.LN2)),
      );
      if (next === viewportRef.current.logZoom) return;
      viewportRef.current = zoomViewport(viewportRef.current, next, anchor.x, anchor.y);
      change.current();
    };
    canvas.style.touchAction = "none";
    canvas.style.cursor = "grab";
    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", up);
    canvas.addEventListener("lostpointercapture", up);
    canvas.addEventListener("wheel", wheel, { passive: false });
    return () => {
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerup", up);
      canvas.removeEventListener("pointercancel", up);
      canvas.removeEventListener("lostpointercapture", up);
      canvas.removeEventListener("wheel", wheel);
      wheelGuard.dispose();
      canvas.style.touchAction = "";
    };
  }, [canvas, flipY, maxZoomSize, viewportRef, getRenderedViewport]);
}
