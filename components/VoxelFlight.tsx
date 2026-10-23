import { useEffect, useRef, useState } from "react";
import styles from "../styles/VoxelFlight.module.css";
import { useExplorerPart } from "../utils/hooks/useExplorerPart";
import { createZoomWheelGuard } from "../utils/shouldZoomWheel";
import {
  type FlightCamera,
  initialFlightCamera,
  moveFlightCamera,
  restoreFlightCamera,
  serializeFlightCamera,
  type Vec3,
  type VoxelPattern,
} from "../utils/voxelZoom/camera";
import { createFlightRenderer, type FlightStyle } from "../utils/voxelZoom/renderer";

export function FlightInstructions() {
  return (
    <p className={styles.instructions} id="flight-instructions">
      Click the view to capture the mouse. Move the mouse to look, WASD to fly, Q/E to move down/up.
      Hold Shift to fly faster. Esc releases the mouse. Scroll or pinch to move; drag to look on
      touch screens or when capture is unavailable. Back outside ends Explore.
    </p>
  );
}
export function VoxelFlight({
  pattern,
  style,
  width,
  height,
}: {
  pattern: VoxelPattern;
  style: FlightStyle;
  width: number;
  height: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cameraRef = useRef<FlightCamera>(initialFlightCamera(pattern));
  const latest = useRef({ pattern, style, width, height });
  latest.current = { pattern, style, width, height };
  const dirty = useRef(true);
  const held = useRef(new Set<string>());
  const [error, setError] = useState("");
  useExplorerPart(
    "voxelCamera",
    () => serializeFlightCamera(cameraRef.current),
    (saved) => {
      cameraRef.current = restoreFlightCamera(saved);
      dirty.current = true;
    },
  );
  // Camera-independent style and size changes need one new frame.
  // biome-ignore lint/correctness/useExhaustiveDependencies: invalidates the imperative renderer
  useEffect(() => {
    dirty.current = true;
  }, [pattern, style, width, height]);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl", { preserveDrawingBuffer: true, antialias: false });
    if (!gl) {
      setError("Explore needs WebGL. Use Back outside to return to the whole shape.");
      return;
    }
    let renderer: ReturnType<typeof createFlightRenderer> | undefined;
    let frame = 0,
      previous = performance.now(),
      disposed = false;
    const pointers = new Map<number, { x: number; y: number }>();
    let pointerType = "";
    const release = () => {
      held.current.clear();
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
    const move = (motion: Vec3) => {
      cameraRef.current = moveFlightCamera(cameraRef.current, latest.current.pattern, motion);
      dirty.current = true;
    };
    const draw = () => {
      if (!renderer || gl.isContextLost()) return;
      const { pattern, style, width, height } = latest.current;
      renderer.draw(cameraRef.current, pattern, style, width, height, window.devicePixelRatio || 1);
      dirty.current = false;
    };
    const render = (now: number) => {
      if (disposed) return;
      const dt = Math.min(0.1, (now - previous) / 1000);
      previous = now;
      const keys = held.current;
      const motion: Vec3 = [
        Number(keys.has("d")) - Number(keys.has("a")),
        Number(keys.has("e")) - Number(keys.has("q")),
        Number(keys.has("w")) - Number(keys.has("s")),
      ];
      const magnitude = Math.hypot(...motion);
      if (magnitude > 0) {
        const speed = (dt * 4 * (keys.has("shift") ? 4 : 1)) / magnitude;
        move(motion.map((component) => component * speed) as Vec3);
      }
      try {
        if (dirty.current) draw();
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
        move([
          (-(center.x - oldCenter.x) / short) * 2,
          ((center.y - oldCenter.y) / short) * 2,
          Math.log(Math.max(1, center.span) / Math.max(1, oldCenter.span)) * 3,
        ]);
      } else if (event.shiftKey)
        move([(-(event.clientX - last.x) / short) * 2, ((event.clientY - last.y) / short) * 2, 0]);
      else look(event.clientX - last.x, event.clientY - last.y);
    };
    const up = (event: PointerEvent) => pointers.delete(event.pointerId);
    const guard = createZoomWheelGuard(canvas);
    const wheel = (event: WheelEvent) => {
      if (!guard.shouldZoom(event, false)) return;
      event.preventDefault();
      canvas.focus({ preventScroll: true });
      const units = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? latest.current.height : 1;
      move([
        0,
        0,
        Math.max(-3, Math.min(3, -event.deltaY * units * (event.ctrlKey ? 0.02 : 0.012))),
      ]);
    };
    const keydown = (event: KeyboardEvent) => {
      if (event.target !== canvas || event.metaKey || event.ctrlKey || event.altKey) return;
      const key = event.key.toLowerCase();
      if (key === "escape") {
        release();
      }
      if (key === "enter") capture();
      if (["w", "a", "s", "d", "q", "e", "shift"].includes(key)) {
        event.preventDefault();
        held.current.add(key);
      }
    };
    const keyup = (event: KeyboardEvent) => held.current.delete(event.key.toLowerCase());
    const blur = () => {
      held.current.clear();
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
      setError("Graphics paused. Waiting for WebGL to recover. Back outside is still available.");
    };
    const restored = () => {
      previous = performance.now();
      start();
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
    canvas.addEventListener("wheel", wheel, { passive: false });
    canvas.addEventListener("keydown", keydown);
    canvas.addEventListener("blur", release);
    canvas.addEventListener("webglcontextlost", lost);
    canvas.addEventListener("webglcontextrestored", restored);
    canvas.addEventListener("garden:redraw", exported);
    window.addEventListener("garden:before-export", exported);
    document.addEventListener("visibilitychange", visibility);
    document.addEventListener("pointerlockchange", lockChanged);
    document.addEventListener("mousemove", mousemove);
    window.addEventListener("keyup", keyup);
    window.addEventListener("blur", release);
    start();
    canvas.focus({ preventScroll: true });
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      held.current.clear();
      renderer?.destroy();
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("click", click);
      canvas.removeEventListener("contextmenu", contextmenu);
      canvas.removeEventListener("pointermove", drag);
      canvas.removeEventListener("pointerup", up);
      canvas.removeEventListener("pointercancel", up);
      canvas.removeEventListener("lostpointercapture", up);
      canvas.removeEventListener("wheel", wheel);
      canvas.removeEventListener("keydown", keydown);
      canvas.removeEventListener("blur", release);
      canvas.removeEventListener("webglcontextlost", lost);
      canvas.removeEventListener("webglcontextrestored", restored);
      canvas.removeEventListener("garden:redraw", exported);
      window.removeEventListener("garden:before-export", exported);
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
        aria-describedby="flight-instructions"
      />
      {error && (
        <output className={styles.error} role="alert" data-fractal-chrome>
          {error}
        </output>
      )}
      <fieldset
        className={styles.movement}
        aria-label="Move through the fractal"
        data-fractal-chrome
      >
        {[
          ["a", "Move left", "←"],
          ["w", "Move forward", "↑"],
          ["s", "Move backward", "↓"],
          ["d", "Move right", "→"],
        ].map(([key, label, icon]) => (
          <button
            key={key}
            type="button"
            aria-label={label}
            onPointerDown={(event) => {
              event.preventDefault();
              event.currentTarget.setPointerCapture(event.pointerId);
              held.current.add(key);
            }}
            onPointerUp={() => held.current.delete(key)}
            onPointerCancel={() => held.current.delete(key)}
            onLostPointerCapture={() => held.current.delete(key)}
            onBlur={() => held.current.delete(key)}
            onClick={() => {
              cameraRef.current = moveFlightCamera(cameraRef.current, pattern, [
                key === "a" ? -0.2 : key === "d" ? 0.2 : 0,
                0,
                key === "w" ? 0.2 : key === "s" ? -0.2 : 0,
              ]);
              dirty.current = true;
            }}
          >
            {icon}
          </button>
        ))}
      </fieldset>
    </div>
  );
}
