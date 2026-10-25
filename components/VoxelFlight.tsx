import { useEffect, useRef, useState } from "react";
import styles from "../styles/VoxelFlight.module.css";
import { useExplorerPart } from "../utils/hooks/useExplorerPart";
import { useFractalFrame } from "../utils/hooks/useFractalFrame";
import { createZoomWheelGuard, listenForZoomWheel } from "../utils/shouldZoomWheel";
import {
  atFlightZoomLimit,
  dollyFlightCamera,
  type FlightCamera,
  initialFlightCamera,
  moveFlightCamera,
  restoreFlightCamera,
  serializeFlightCamera,
  type Vec3,
  type VoxelPattern,
} from "../utils/voxelZoom/camera";
import {
  createFlightFrameBudget,
  FLIGHT_SETTLE_MS,
  MAX_STILL_FLIGHT_PIXELS,
} from "../utils/voxelZoom/frameBudget";
import { createFlightRenderer, type FlightStyle } from "../utils/voxelZoom/renderer";
import { flightRenderSize } from "../utils/voxelZoom/resolution";

import {
  FlightTouchControls,
  type FlightTouchInput,
  resetFlightTouch,
} from "./FlightTouchControls";

const flightKey = (event: KeyboardEvent) => {
  const aliases: Record<string, string> = {
    KeyW: "w",
    KeyA: "a",
    KeyS: "s",
    KeyD: "d",
    KeyC: "c",
    KeyQ: "q",
    KeyE: "e",
    Space: " ",
    ShiftLeft: "shift",
    ShiftRight: "shift",
    ArrowUp: "w",
    ArrowDown: "s",
    ArrowLeft: "a",
    ArrowRight: "d",
  };
  return aliases[event.code] ?? event.key.toLowerCase();
};

export function VoxelFlight({
  pattern,
  style,
  width,
  height,
  cameraPreset,
}: {
  pattern: VoxelPattern;
  style: FlightStyle;
  width: number;
  height: number;
  cameraPreset?: FlightCamera;
}) {
  const framing = useFractalFrame(width, height);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cameraRef = useRef<FlightCamera>(initialFlightCamera(pattern));
  const latest = useRef({ pattern, style, width, height, framing });
  latest.current = { pattern, style, width, height, framing };
  const dirty = useRef(true);
  const held = useRef(new Set<string>());
  const touch = useRef<FlightTouchInput>({
    move: [0, 0],
    look: [0, 0],
    up: false,
    down: false,
    boost: false,
  });
  const [error, setError] = useState("");
  useExplorerPart(
    "voxelCamera",
    () => serializeFlightCamera(cameraRef.current),
    (saved) => {
      cameraRef.current = restoreFlightCamera(saved, latest.current.pattern);
      dirty.current = true;
    },
  );
  useEffect(() => {
    if (!cameraPreset) return;
    held.current.clear();
    resetFlightTouch(touch.current);
    if (document.pointerLockElement === canvasRef.current) document.exitPointerLock();
    cameraRef.current = cameraPreset;
    dirty.current = true;
  }, [cameraPreset]);
  // Camera-independent style and size changes need one new frame.
  // biome-ignore lint/correctness/useExhaustiveDependencies: invalidates the imperative renderer
  useEffect(() => {
    dirty.current = true;
  }, [pattern, style, width, height, framing]);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl", { preserveDrawingBuffer: true, antialias: false });
    if (!gl) {
      setError("Exploration needs WebGL. The construction below is still available.");
      return;
    }
    let renderer: ReturnType<typeof createFlightRenderer> | undefined;
    let frame = 0,
      previous = performance.now(),
      disposed = false;
    const budget = createFlightFrameBudget();
    let renderedLastFrame = false;
    let needsRefinement = false;
    let refineAt = 0;
    const pointers = new Map<number, { x: number; y: number }>();
    let pointerType = "";
    const release = () => {
      previous = performance.now();
      renderedLastFrame = false;
      budget.pause();
      held.current.clear();
      resetFlightTouch(touch.current);
      pointers.clear();
      if (document.pointerLockElement === canvas) document.exitPointerLock();
    };
    const capture = async () => {
      if (
        !renderer ||
        gl.isContextLost() ||
        !canvas.requestPointerLock ||
        document.pointerLockElement === canvas
      )
        return;
      try {
        // Await also works with older browsers returning void. Rejection keeps drag controls.
        await canvas.requestPointerLock();
        if (disposed && document.pointerLockElement === canvas) document.exitPointerLock();
      } catch {
        /* Drag, keyboard and touch navigation remain available. */
      }
    };
    const look = (dx: number, dy: number) => {
      const camera = cameraRef.current;
      cameraRef.current = {
        ...camera,
        yaw: camera.yaw + dx * 0.0025,
        pitch: Math.max(-1.54, Math.min(1.54, camera.pitch - dy * 0.0025)),
      };
      dirty.current = true;
    };
    const mousemove = (event: MouseEvent) => {
      if (document.pointerLockElement === canvas) look(event.movementX, event.movementY);
    };
    const lockChanged = () => {
      held.current.clear();
      resetFlightTouch(touch.current);
      pointers.clear();
    };
    const click = (event: MouseEvent) => {
      if (event.button === 0 && pointerType === "mouse" && !event.shiftKey) capture();
    };
    const contextmenu = (event: MouseEvent) => {
      if (document.pointerLockElement !== canvas) return;
      event.preventDefault();
      event.stopPropagation();
    };
    const dolly = (amount: number) => {
      cameraRef.current = dollyFlightCamera(cameraRef.current, latest.current.pattern, amount);
      dirty.current = true;
    };
    const move = (motion: Vec3, elapsedSeconds?: number) => {
      const next = moveFlightCamera(
        cameraRef.current,
        latest.current.pattern,
        motion,
        elapsedSeconds,
      );
      if (next !== cameraRef.current) {
        cameraRef.current = next;
        dirty.current = true;
      }
    };
    const draw = (pixelBudget?: number) => {
      if (!renderer || gl.isContextLost()) return;
      const { pattern, style, width, height, framing } = latest.current;
      if (!framing) return;
      renderer.draw(
        cameraRef.current,
        pattern,
        style,
        width,
        height,
        window.devicePixelRatio || 1,
        pixelBudget,
        framing,
      );
      const stillSize = flightRenderSize(
        width,
        height,
        window.devicePixelRatio || 1,
        MAX_STILL_FLIGHT_PIXELS,
      );
      needsRefinement = canvas.width < stillSize.width || canvas.height < stillSize.height;
      dirty.current = false;
    };
    const render = (now: number) => {
      if (disposed) return;
      const dt = Math.max(0, (now - previous) / 1000);
      previous = now;
      const keys = held.current;
      const input = touch.current;
      if (input.look[0] || input.look[1]) look(input.look[0] * dt * 600, input.look[1] * dt * 600);
      const motion: Vec3 = [
        Number(keys.has("d")) - Number(keys.has("a")) + input.move[0],
        Number(keys.has(" ") || keys.has("e") || input.up) -
          Number(keys.has("c") || keys.has("q") || input.down),
        Number(keys.has("w")) - Number(keys.has("s")) - input.move[1],
      ];
      const magnitude = Math.hypot(...motion);
      if (magnitude > 0) {
        const speed =
          (dt * 0.75 * (keys.has("shift") || input.boost ? 4 : 1)) / Math.max(1, magnitude);
        move(motion.map((component) => component * speed) as Vec3, dt);
      }
      if (renderedLastFrame && dirty.current)
        budget.sample(dt * 1000, canvas.width * canvas.height);
      else budget.pause();
      renderedLastFrame = false;
      try {
        if (dirty.current) {
          draw(budget.pixels);
          renderedLastFrame = true;
          refineAt = now + FLIGHT_SETTLE_MS;
        } else if (needsRefinement && now >= refineAt && !document.hidden) {
          // Movement may lower the pixel budget. Replace the last enlarged
          // flight frame once input stops, then leave the sharp view idle.
          // This draw must not feed the moving-frame budget.
          draw();
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not draw this view.");
        release();
        renderer?.destroy();
        renderer = undefined;
        return;
      }
      frame = requestAnimationFrame(render);
    };
    const start = () => {
      try {
        renderer = createFlightRenderer(gl);
        dirty.current = true;
        setError("");
        frame = requestAnimationFrame(render);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not start Explore.");
      }
    };
    const centroid = () => {
      const p = Array.from(pointers.values());
      return {
        x: (p[0].x + p[1].x) / 2,
        y: (p[0].y + p[1].y) / 2,
        span: Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y),
      };
    };
    const down = (event: PointerEvent) => {
      if (event.button !== 0) return;
      pointerType = event.pointerType;
      canvas.focus({ preventScroll: true });
      if (document.pointerLockElement === canvas) return;
      canvas.setPointerCapture(event.pointerId);
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    };
    const drag = (event: PointerEvent) => {
      if (document.pointerLockElement === canvas) return;
      const last = pointers.get(event.pointerId);
      if (!last) return;
      const oldCenter = pointers.size === 2 ? centroid() : null;
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      const short = Math.min(latest.current.width, latest.current.height);
      if (oldCenter) {
        const center = centroid();
        move([(-(center.x - oldCenter.x) / short) * 2, ((center.y - oldCenter.y) / short) * 2, 0]);
        dolly(Math.log(Math.max(1, center.span) / Math.max(1, oldCenter.span)) * 3);
      } else if (event.shiftKey)
        move([(-(event.clientX - last.x) / short) * 2, ((event.clientY - last.y) / short) * 2, 0]);
      else look(event.clientX - last.x, event.clientY - last.y);
    };
    const up = (event: PointerEvent) => pointers.delete(event.pointerId);
    const guard = createZoomWheelGuard(canvas);
    const wheel = (event: WheelEvent) => {
      if (!guard.shouldZoom(event, atFlightZoomLimit(cameraRef.current, latest.current.pattern)))
        return;
      event.preventDefault();
      canvas.focus({ preventScroll: true });
      const units = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? latest.current.height : 1;
      dolly(Math.max(-3, Math.min(3, -event.deltaY * units * (event.ctrlKey ? 0.02 : 0.012))));
    };
    const keydown = (event: KeyboardEvent) => {
      if (
        (event.target !== canvas && document.pointerLockElement !== canvas) ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey
      )
        return;
      const key = flightKey(event);
      // Shift may already be held when the view receives focus.
      if (event.shiftKey) held.current.add("shift");
      else held.current.delete("shift");
      if (key === "escape") {
        release();
      }
      if (key === "enter") capture();
      if (["w", "a", "s", "d", "q", "e", "c", " ", "shift"].includes(key)) {
        event.preventDefault();
        event.stopPropagation();
        if (held.current.size === 0) previous = performance.now();
        held.current.add(key);
      }
    };
    const keyup = (event: KeyboardEvent) => held.current.delete(flightKey(event));
    const blur = () => {
      held.current.clear();
      resetFlightTouch(touch.current);
      pointers.clear();
    };
    const visibility = () => {
      if (document.hidden) release();
      else blur();
    };
    const lost = (event: Event) => {
      event.preventDefault();
      cancelAnimationFrame(frame);
      release();
      renderer?.destroy();
      renderer = undefined;
      setError(
        "Graphics paused. Waiting for WebGL to recover. The construction below is still available.",
      );
    };
    const restored = () => {
      previous = performance.now();
      start();
    };
    const reset = () => {
      release();
      cameraRef.current = initialFlightCamera(latest.current.pattern);
      dirty.current = true;
    };
    const exported = () => {
      try {
        draw();
      } catch {
        /* The normal render loop exposes failures. */
      }
    };
    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("click", click);
    canvas.addEventListener("contextmenu", contextmenu);
    canvas.addEventListener("pointermove", drag);
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", up);
    canvas.addEventListener("lostpointercapture", up);
    const removeZoomWheel = listenForZoomWheel(canvas, wheel);
    window.addEventListener("keydown", keydown, true);
    canvas.addEventListener("blur", release);
    canvas.addEventListener("webglcontextlost", lost);
    canvas.addEventListener("webglcontextrestored", restored);
    canvas.addEventListener("garden:redraw", exported);
    window.addEventListener("garden:before-export", exported);
    window.addEventListener("garden:reset-pose", reset);
    document.addEventListener("visibilitychange", visibility);
    document.addEventListener("pointerlockchange", lockChanged);
    document.addEventListener("mousemove", mousemove);
    window.addEventListener("keyup", keyup);
    window.addEventListener("blur", release);
    start();
    canvas.focus({ preventScroll: true });
    return () => {
      disposed = true;
      guard.dispose();
      cancelAnimationFrame(frame);
      held.current.clear();
      resetFlightTouch(touch.current);
      renderer?.destroy();
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("click", click);
      canvas.removeEventListener("contextmenu", contextmenu);
      canvas.removeEventListener("pointermove", drag);
      canvas.removeEventListener("pointerup", up);
      canvas.removeEventListener("pointercancel", up);
      canvas.removeEventListener("lostpointercapture", up);
      removeZoomWheel();
      window.removeEventListener("keydown", keydown, true);
      canvas.removeEventListener("blur", release);
      canvas.removeEventListener("webglcontextlost", lost);
      canvas.removeEventListener("webglcontextrestored", restored);
      canvas.removeEventListener("garden:redraw", exported);
      window.removeEventListener("garden:before-export", exported);
      window.removeEventListener("garden:reset-pose", reset);
      document.removeEventListener("visibilitychange", visibility);
      document.removeEventListener("pointerlockchange", lockChanged);
      document.removeEventListener("mousemove", mousemove);
      window.removeEventListener("keyup", keyup);
      window.removeEventListener("blur", release);
      // Strict Mode and Fast Refresh replay effects on a connected canvas.
      // Wait for DOM removal before releasing the context itself.
      queueMicrotask(() => {
        if (!canvas.isConnected) {
          release();
          gl.getExtension("WEBGL_lose_context")?.loseContext();
        }
      });
    };
  }, []);
  return (
    <div className={styles.stage} style={{ background: style.background }}>
      <canvas
        ref={canvasRef}
        style={{ opacity: error ? 0 : undefined }}
        tabIndex={0}
        aria-label="Explore the fractal interior"
      />
      {error && (
        <output className={styles.error} role="alert" data-fractal-chrome>
          {error}
        </output>
      )}
      <FlightTouchControls input={touch.current} />
    </div>
  );
}
