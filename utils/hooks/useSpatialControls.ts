import { type Dispatch, type SetStateAction, useEffect, useRef, useState } from "react";
import { dragRotation, IDENTITY, type Orientation } from "../orientation";
import { createZoomWheelGuard, listenForZoomWheel, zoomWheelDelta } from "../shouldZoomWheel";
import {
  CAMERA_DISTANCE,
  cameraTarget,
  FOCAL_SCALE,
  INITIAL_SPATIAL_CAMERA,
  inverseRotate,
  moveSpatialCamera,
  readSpatialCamera,
  relativeNumber,
  rotationOf,
  type SpatialCamera,
  type Vec3,
} from "../spatial/camera";
import { useExplorerPart } from "./useExplorerPart";

type View = { rotationX: number; rotationY: number; grab?: Orientation; autoRotate: boolean };
export function useSpatialControls<T extends View>({
  canvas,
  view,
  setView,
  pick,
  worldPick,
  animateOrbit = false,
  maxZoom = 240,
  identity,
  controlled,
}: {
  canvas: HTMLCanvasElement | null;
  view: T;
  setView: Dispatch<SetStateAction<T>>;
  pick?: (x: number, y: number) => Vec3 | null;
  animateOrbit?: boolean;
  worldPick?: (x: number, y: number) => Promise<Vec3 | null>;
  maxZoom?: number;
  identity: string;
  controlled?: { camera: SpatialCamera; setCamera: Dispatch<SetStateAction<SpatialCamera>> };
}) {
  const [ownCamera, setOwnCamera] = useState<SpatialCamera>(INITIAL_SPATIAL_CAMERA);
  const camera = controlled?.camera ?? ownCamera;
  const setCamera = controlled?.setCamera ?? setOwnCamera;
  const current = useRef({ view, camera, pick, worldPick });
  current.current = { view, camera, pick, worldPick };
  useExplorerPart(
    "spatialZoom",
    () => camera,
    (value) => {
      const restored = readSpatialCamera(value);
      if (restored.zoom > maxZoom) throw new Error("Zoom exceeds this renderer’s precision");
      setCamera(restored);
    },
  );
  const openingView = useRef(view);
  const lastIdentity = useRef(identity);
  useEffect(() => {
    if (lastIdentity.current === identity) return;
    lastIdentity.current = identity;
    setCamera(INITIAL_SPATIAL_CAMERA);
  }, [identity, setCamera]);
  useEffect(() => {
    if (!canvas) return;
    const reset = () => {
      setCamera(INITIAL_SPATIAL_CAMERA);
      setView((old) => ({
        ...old,
        rotationX: openingView.current.rotationX,
        rotationY: openingView.current.rotationY,
        grab: undefined,
        autoRotate: false,
      }));
    };
    const pointers = new Map<number, { x: number; y: number }>();
    const oldTouch = canvas.style.touchAction;
    canvas.style.touchAction = "none";
    canvas.style.cursor = "grab";
    const stop = () => setView((old) => ({ ...old, autoRotate: false }));
    const pan = (dx: number, dy: number) => {
      const { view, camera } = current.current,
        rect = canvas.getBoundingClientRect();
      const scale = CAMERA_DISTANCE / (Math.min(rect.width, rect.height) * FOCAL_SCALE);
      const next = moveSpatialCamera(
        camera,
        inverseRotate([-dx * scale, dy * scale, 0], rotationOf(view)),
      );
      current.current.camera = next;
      setCamera(next);
    };
    let disposed = false;
    const zoom = (x: number, y: number, change: number) => {
      const rect = canvas.getBoundingClientRect(),
        frame = current.current;
      const apply = (world: Vec3 | null) => {
        if (disposed) return;
        const { camera, view, pick } = current.current;
        const next = Math.max(0, Math.min(maxZoom, camera.zoom + change));
        if (next === camera.zoom) return;
        const rotation = rotationOf(view),
          scale = CAMERA_DISTANCE / (Math.min(rect.width, rect.height) * FOCAL_SCALE);
        let point = pick?.(x - rect.left, y - rect.top) ?? [
          (x - rect.left - rect.width / 2) * scale,
          -(y - rect.top - rect.height / 2) * scale,
          0,
        ];
        if (world) {
          const target = cameraTarget(camera).map((v) => relativeNumber(v, camera.bits, 0)),
            relative = world.map((v, i) => (v - target[i]) * 2 ** camera.zoom);
          point = [0, 1, 2].map(
            (i) =>
              rotation[i * 3] * relative[0] +
              rotation[i * 3 + 1] * relative[1] +
              rotation[i * 3 + 2] * relative[2],
          ) as Vec3;
        }
        const factor = 1 - 2 ** (camera.zoom - next),
          nextCamera = moveSpatialCamera(
            camera,
            inverseRotate(point.map((v) => v * factor) as Vec3, rotation),
            next,
          );
        current.current.camera = nextCamera;
        setCamera(nextCamera);
        stop();
      };
      if (frame.worldPick) void frame.worldPick(x - rect.left, y - rect.top).then(apply);
      else apply(null);
    };
    const down = (e: PointerEvent) => {
      if (e.button !== 0 && e.button !== 2) return;
      stop();
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      canvas.setPointerCapture(e.pointerId);
      canvas.style.cursor = "grabbing";
    };
    const move = (e: PointerEvent) => {
      const previous = pointers.get(e.pointerId);
      if (!previous) return;
      const other = Array.from(pointers.entries()).find(([id]) => id !== e.pointerId)?.[1];
      const dx = e.clientX - previous.x,
        dy = e.clientY - previous.y;
      if (other) {
        pan(dx / 2, dy / 2);
        const before = Math.hypot(previous.x - other.x, previous.y - other.y),
          after = Math.hypot(e.clientX - other.x, e.clientY - other.y);
        if (before > 4 && after > 4)
          zoom((e.clientX + other.x) / 2, (e.clientY + other.y) / 2, Math.log2(after / before));
      } else if (e.shiftKey || e.buttons === 2) pan(dx, dy);
      else {
        const rect = canvas.getBoundingClientRect();
        const angle = (Math.hypot(dx, dy) / Math.min(rect.width, rect.height)) * Math.PI;
        setView((old) => ({
          ...old,
          autoRotate: false,
          grab: dragRotation(old.grab ?? IDENTITY, dx, dy, angle),
        }));
      }
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    };
    const up = (e: PointerEvent) => {
      pointers.delete(e.pointerId);
      if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
      canvas.style.cursor = "grab";
    };
    const clear = () => {
      pointers.clear();
      canvas.style.cursor = "grab";
    };
    const guard = createZoomWheelGuard(canvas);
    const removeWheel = listenForZoomWheel(canvas, (e) => {
      if (!guard.shouldZoom(e, current.current.camera.zoom <= 0)) return;
      e.preventDefault();
      zoom(e.clientX, e.clientY, -zoomWheelDelta(e, canvas) / Math.LN2);
    });
    const context = (e: Event) => e.preventDefault();
    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", up);
    const lost = (e: PointerEvent) => {
      pointers.delete(e.pointerId);
    };
    canvas.addEventListener("lostpointercapture", lost);
    canvas.addEventListener("dblclick", reset);
    canvas.addEventListener("contextmenu", context);
    window.addEventListener("blur", clear);
    window.addEventListener("garden:reset-pose", reset);
    return () => {
      disposed = true;
      removeWheel();
      guard.dispose();
      canvas.style.touchAction = oldTouch;
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerup", up);
      canvas.removeEventListener("pointercancel", up);
      canvas.removeEventListener("lostpointercapture", lost);
      canvas.removeEventListener("dblclick", reset);
      canvas.removeEventListener("contextmenu", context);
      window.removeEventListener("blur", clear);
      window.removeEventListener("garden:reset-pose", reset);
    };
  }, [canvas, setView, maxZoom, setCamera]);
  useEffect(() => {
    if (!animateOrbit || !view.autoRotate) return;
    let id = 0,
      last = 0;
    const frame = (time: number) => {
      if (!last) last = time;
      const dt = time - last;
      if (dt >= 70) {
        last = time;
        setView((old) => ({ ...old, rotationY: old.rotationY + Math.min(dt, 0.2 * 1000) * 0.015 }));
      }
      id = requestAnimationFrame(frame);
    };
    id = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(id);
  }, [animateOrbit, view.autoRotate, setView]);
  return { camera, setCamera };
}
