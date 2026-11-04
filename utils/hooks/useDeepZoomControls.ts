import { type MutableRefObject, useEffect, useRef } from "react";
import {
  type DeepViewport,
  deserializeViewport,
  MAX_DEPTH_BITS,
  moveViewport,
  serializeViewport,
  zoomViewport,
} from "../deepZoom/math";
import { createZoomGlide } from "../deepZoom/zoomGlide";
import { createZoomWheelGuard, listenForZoomWheel, zoomWheelDelta } from "../shouldZoomWheel";
import { useExplorerPart } from "./useExplorerPart";

type Point = { x: number; y: number };

export function useDeepZoomControls({
  canvas,
  viewportRef,
  maxZoomSize,
  minLogZoom = -MAX_DEPTH_BITS,
  flipY,
  glide = false,
  onChange,
}: {
  canvas: HTMLCanvasElement | null;
  viewportRef: MutableRefObject<DeepViewport>;
  maxZoomSize: number;
  /** Stops zooming where a renderer without deep arithmetic runs out of precision. */
  minLogZoom?: number;
  flipY: boolean;
  /** Cover wheel zooming in even per-frame steps instead of jumping on each event. */
  glide?: boolean;
  onChange: (interaction?: boolean) => void;
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
    const clamp = (log: number) => Math.max(minLogZoom, Math.min(Math.log2(maxZoomSize), log));
    let glideRender: ReturnType<typeof setTimeout> | undefined;
    const zoomGlide = createZoomGlide((bits, anchor) => {
      const before = viewportRef.current.logZoom;
      const next = clamp(before + bits);
      viewportRef.current = zoomViewport(viewportRef.current, next, anchor.x, anchor.y);
      // Rendering from inside an animation frame measured half the frame rate (33 ms, not 16).
      clearTimeout(glideRender);
      glideRender = setTimeout(() => change.current(true), 4);
      return next - before;
    });
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
      zoomGlide.stop();
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
          clamp(view.logZoom + Math.log2(before.distance / after.distance)),
          before.x,
          before.y,
        );
      }
      viewportRef.current = moveViewport(view, before.x - after.x, before.y - after.y);
      change.current(true);
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
      const bits = Math.max(-2, Math.min(2, zoomWheelDelta(event, canvas) / Math.LN2));
      if (glide) {
        zoomGlide.add(bits, anchor, event.ctrlKey);
        return;
      }
      const next = clamp(viewportRef.current.logZoom + bits);
      viewportRef.current = zoomViewport(viewportRef.current, next, anchor.x, anchor.y);
      change.current(true);
    };
    canvas.style.touchAction = "none";
    canvas.style.cursor = "grab";
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
      zoomGlide.stop();
      clearTimeout(glideRender);
      wheelGuard.dispose();
      canvas.style.touchAction = "";
    };
  }, [canvas, flipY, glide, maxZoomSize, minLogZoom, viewportRef]);
}
