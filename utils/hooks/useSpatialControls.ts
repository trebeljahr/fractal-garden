import {
  createElement,
  type Dispatch,
  type SetStateAction,
  useEffect,
  useRef,
  useState,
} from "react";
import { type FlightTouchInput, resetFlightTouch } from "../../components/FlightTouchControls";
import { SpatialNavigation } from "../../components/SpatialNavigation";
import { type FractalFrame, readFractalFrame } from "../fractalFrame";
import { dragRotation, IDENTITY, type Orientation } from "../orientation";
import { createZoomWheelGuard, listenForZoomWheel, zoomWheelDelta } from "../shouldZoomWheel";
import {
  CAMERA_DISTANCE,
  cameraTarget,
  INITIAL_SPATIAL_CAMERA,
  inverseRotate,
  moveSpatialCamera,
  readSpatialCamera,
  relativeNumber,
  rotationOf,
  type SpatialCamera,
  type Vec3,
} from "../spatial/camera";
import { advanceSpatialFlight, lookSpatialRotation, reframeSpatialEye } from "../spatial/flight";
import { spatialProjection } from "../spatial/projection";
import { useExplorerPart } from "./useExplorerPart";

type View = {
  rotationX: number;
  rotationY: number;
  grab?: Orientation;
  autoRotate: boolean;
  cameraDistance?: number;
  offsetX?: number;
  offsetY?: number;
};
export function useSpatialControls<T extends View>({
  canvas,
  frame,
  view,
  setView,
  pick,
  worldPick,
  animateOrbit = false,
  maxZoom = 240,
  identity,
  controlled,
  clearance,
  eyeDistance = CAMERA_DISTANCE,
}: {
  canvas: HTMLCanvasElement | null;
  frame?: FractalFrame | null;
  /** Current surrounding surface distance, in camera-relative units. Null waits for geometry. */
  clearance?: (camera: SpatialCamera, view: T) => number | null;
  eyeDistance?: number;
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
  const [flying, setFlying] = useState(true);
  const touch = useRef<FlightTouchInput>({
    move: [0, 0],
    look: [0, 0],
    up: false,
    down: false,
    boost: false,
  });
  const current = useRef({ view, camera, pick, worldPick, clearance, flying, eyeDistance, frame });
  current.current = { view, camera, pick, worldPick, clearance, flying, eyeDistance, frame };
  useExplorerPart(
    "spatialNavigation",
    () => current.current.flying,
    (value) => {
      if (typeof value !== "boolean") throw new Error("Invalid navigation mode");
      setFlying(value);
    },
  );
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
      release();
      speed = 1;
      anchor = null;
      setCamera(INITIAL_SPATIAL_CAMERA);
      setView((old) => ({
        ...old,
        rotationX: openingView.current.rotationX,
        rotationY: openingView.current.rotationY,
        grab: undefined,
        autoRotate: false,
        cameraDistance: openingView.current.cameraDistance,
        offsetX: openingView.current.offsetX,
        offsetY: openingView.current.offsetY,
      }));
    };
    const pointers = new Map<number, { x: number; y: number }>();
    const oldTouch = canvas.style.touchAction;
    canvas.style.touchAction = "none";
    canvas.style.cursor = "grab";
    const stop = () => setView((old) => ({ ...old, autoRotate: false }));
    const pan = (dx: number, dy: number) => {
      if (current.current.flying) {
        travel([-dx, dy, 0], Math.hypot(dx, dy) / 200);
        return;
      }
      const { view, camera } = current.current,
        rect = canvas.getBoundingClientRect();
      const scale =
        CAMERA_DISTANCE /
        spatialProjection(
          rect.width,
          rect.height,
          current.current.frame ?? readFractalFrame(canvas),
        ).focal;
      const next = moveSpatialCamera(
        camera,
        inverseRotate([-dx * scale, dy * scale, 0], rotationOf(view)),
      );
      current.current.camera = next;
      setCamera(next);
    };
    let disposed = false;
    let flightFrame = 0,
      previousTime = 0,
      speed = 1;
    let anchor: Vec3 | null = null,
      anchorPending = false,
      anchorTime = 0;
    const held = new Set<string>();
    const look = (dx: number, dy: number) => {
      const frame = current.current;
      const next = {
        ...frame.view,
        autoRotate: false,
        rotationX: 0,
        rotationY: 0,
        grab: lookSpatialRotation(rotationOf(frame.view), dx, dy),
      };
      const camera = reframeSpatialEye(
        frame.camera,
        rotationOf(frame.view),
        rotationOf(next),
        frame.camera.zoom,
        frame.eyeDistance,
      );
      current.current = { ...frame, view: next, camera };
      setCamera(camera);
      setView(next);
    };
    const travel = (motion: Vec3, dt: number, boost = false) => {
      const frame = current.current;
      let distance = frame.clearance?.(frame.camera, frame.view);
      if (distance === undefined) {
        const rect = canvas.getBoundingClientRect();
        const projection = spatialProjection(
          rect.width,
          rect.height,
          frame.frame ?? readFractalFrame(canvas),
        );
        const hit = frame.pick?.(projection.centerX, projection.centerY);
        if (hit) distance = Math.hypot(hit[0], hit[1], frame.eyeDistance - hit[2]);
        else if (anchor) {
          const target = cameraTarget(frame.camera).map((v) =>
            relativeNumber(v, frame.camera.bits, 0),
          );
          const eye = inverseRotate([0, 0, frame.eyeDistance], rotationOf(frame.view));
          distance = Math.hypot(
            ...anchor.map((v, i) => (v - target[i]) * 2 ** frame.camera.zoom - eye[i]),
          );
        }
      }
      if (distance === null) return;
      const next = advanceSpatialFlight({
        camera: frame.camera,
        rotation: rotationOf(frame.view),
        clearance: distance ?? 2,
        motion,
        elapsed: dt,
        speed,
        boost,
        maxZoom,
        eyeDistance: frame.eyeDistance,
      });
      speed = next.speed;
      current.current.camera = next.camera;
      setCamera(next.camera);
      stop();
    };
    const release = () => {
      held.clear();
      resetFlightTouch(touch.current);
      pointers.clear();
      if (document.pointerLockElement === canvas) document.exitPointerLock();
    };
    const capture = async () => {
      if (
        !current.current.flying ||
        document.pointerLockElement === canvas ||
        !canvas.requestPointerLock
      )
        return;
      try {
        await canvas.requestPointerLock();
        if (disposed && document.pointerLockElement === canvas) document.exitPointerLock();
      } catch {
        /* Drag remains available when capture is denied. */
      }
    };
    const key = (e: KeyboardEvent) =>
      ({
        ArrowUp: "w",
        ArrowDown: "s",
        ArrowLeft: "a",
        ArrowRight: "d",
        Space: " ",
        ShiftLeft: "shift",
        ShiftRight: "shift",
      })[e.code] ?? e.key.toLowerCase();
    const keydown = (e: KeyboardEvent) => {
      if (
        !current.current.flying ||
        (e.target !== canvas && document.pointerLockElement !== canvas) ||
        e.metaKey ||
        e.ctrlKey ||
        e.altKey
      )
        return;
      const k = key(e);
      if (k === "escape") release();
      if (k === "enter") void capture();
      if (["w", "a", "s", "d", "q", "e", "c", " ", "shift"].includes(k)) {
        e.preventDefault();
        e.stopPropagation();
        held.add(k);
      }
    };
    const keyup = (e: KeyboardEvent) => held.delete(key(e));
    const mousemove = (e: MouseEvent) => {
      if (document.pointerLockElement === canvas && current.current.flying)
        look(e.movementX, e.movementY);
    };
    const click = (e: MouseEvent) => {
      if (e.detail === 1 && e.button === 0 && lastPointer === "mouse") void capture();
    };
    let lastPointer = "";
    const visibility = () => {
      if (document.hidden) release();
    };
    const lockChanged = () => {
      held.clear();
      resetFlightTouch(touch.current);
      pointers.clear();
    };
    const tick = (time: number) => {
      const dt = Math.min(0.05, Math.max(0, (time - (previousTime || time)) / 1000));
      previousTime = time;
      if (current.current.flying) {
        const frame = current.current;
        if (
          frame.worldPick &&
          (held.size > 0 || touch.current.move.some(Boolean)) &&
          !anchorPending &&
          time - anchorTime > 150
        ) {
          anchorPending = true;
          anchorTime = time;
          const rect = canvas.getBoundingClientRect();
          const projection = spatialProjection(
            rect.width,
            rect.height,
            frame.frame ?? readFractalFrame(canvas),
          );
          void frame
            .worldPick(projection.centerX, projection.centerY)
            .then((point) => {
              anchor = point;
            })
            .catch(() => {})
            .finally(() => {
              anchorPending = false;
            });
        }
        const input = touch.current;
        if (input.look[0] || input.look[1])
          look(input.look[0] * dt * 600, input.look[1] * dt * 600);
        const motion: Vec3 = [
          Number(held.has("d")) - Number(held.has("a")) + input.move[0],
          Number(held.has(" ") || held.has("e") || input.up) -
            Number(held.has("c") || held.has("q") || input.down),
          Number(held.has("s")) - Number(held.has("w")) + input.move[1],
        ];
        if (Math.hypot(...motion)) travel(motion, dt, held.has("shift") || input.boost);
      } else if (document.pointerLockElement === canvas) release();
      flightFrame = requestAnimationFrame(tick);
    };
    flightFrame = requestAnimationFrame(tick);
    canvas.tabIndex = 0;
    canvas.addEventListener("click", click);
    canvas.addEventListener("blur", release);
    canvas.addEventListener("webglcontextlost", release);
    document.addEventListener("mousemove", mousemove);
    document.addEventListener("pointerlockchange", lockChanged);
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("keydown", keydown, true);
    window.addEventListener("keyup", keyup);
    window.addEventListener("blur", release);
    const zoom = (x: number, y: number, change: number) => {
      if (!change) return;
      if (current.current.flying) {
        travel([0, 0, change > 0 ? -1 : 1], Math.min(0.5, Math.abs(change) * 0.5), false);
        return;
      }
      const rect = canvas.getBoundingClientRect(),
        frame = current.current;
      const apply = (world: Vec3 | null) => {
        if (disposed) return;
        const { camera, view, pick } = current.current;
        const next = Math.max(0, Math.min(maxZoom, camera.zoom + change));
        if (next === camera.zoom) return;
        const projection = spatialProjection(
          rect.width,
          rect.height,
          current.current.frame ?? readFractalFrame(canvas),
        );
        const rotation = rotationOf(view),
          scale = CAMERA_DISTANCE / projection.focal;
        let point = pick?.(x - rect.left, y - rect.top) ?? [
          (x - rect.left - projection.centerX) * scale,
          -(y - rect.top - projection.centerY) * scale,
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
      lastPointer = e.pointerType;
      canvas.focus({ preventScroll: true });
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      canvas.setPointerCapture(e.pointerId);
      canvas.style.cursor = "grabbing";
    };
    const move = (e: PointerEvent) => {
      if (document.pointerLockElement === canvas) return;
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
      } else if (current.current.flying) {
        if (e.shiftKey || e.buttons === 2) travel([-dx, dy, 0], Math.hypot(dx, dy) / 200);
        else look(dx, dy);
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
      cancelAnimationFrame(flightFrame);
      release();
      canvas.removeEventListener("click", click);
      canvas.removeEventListener("blur", release);
      canvas.removeEventListener("webglcontextlost", release);
      document.removeEventListener("mousemove", mousemove);
      document.removeEventListener("pointerlockchange", lockChanged);
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("keydown", keydown, true);
      window.removeEventListener("keyup", keyup);
      window.removeEventListener("blur", release);
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
  const navigation = createElement(SpatialNavigation, {
    flying,
    setFlying: (value: boolean) => {
      setFlying(value);
      if (!value) window.dispatchEvent(new Event("garden:reset-pose"));
    },
    input: touch.current,
  });
  return { camera, setCamera, flying, navigation };
}
