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
      Drag to look. Scroll or pinch to move. Shift-drag to slide. WASD moves, Q/E moves down/up.
      Escape returns outside.
    </p>
  );
}
export function VoxelFlight({
  pattern,
  style,
  width,
  height,
  onExit,
}: {
  pattern: VoxelPattern;
  style: FlightStyle;
  width: number;
  height: number;
  onExit: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cameraRef = useRef<FlightCamera>(initialFlightCamera(pattern));
  const latest = useRef({ pattern, style, width, height, onExit });
  latest.current = { pattern, style, width, height, onExit };
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
      const dt = Math.min(0.04, (now - previous) / 1000);
      previous = now;
      const keys = held.current;
      if (keys.size)
        move([
          (Number(keys.has("d")) - Number(keys.has("a"))) * dt * 2,
          (Number(keys.has("e")) - Number(keys.has("q"))) * dt * 2,
          (Number(keys.has("w")) - Number(keys.has("s"))) * dt * 2,
        ]);
      try {
        if (dirty.current) draw();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not draw this view.");
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
      canvas.focus({ preventScroll: true });
      canvas.setPointerCapture(event.pointerId);
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    };
    const drag = (event: PointerEvent) => {
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
      else {
        const camera = cameraRef.current;
        cameraRef.current = {
          ...camera,
          yaw: camera.yaw - ((event.clientX - last.x) / short) * 2.8,
          pitch: Math.max(
            -1.54,
            Math.min(1.54, camera.pitch + ((event.clientY - last.y) / short) * 2.8),
          ),
        };
        dirty.current = true;
      }
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
        Math.max(-2, Math.min(2, -event.deltaY * units * (event.ctrlKey ? 0.02 : 0.006))),
      ]);
    };
    const keydown = (event: KeyboardEvent) => {
      if (event.target !== canvas || event.metaKey || event.ctrlKey || event.altKey) return;
      const key = event.key.toLowerCase();
      if (key === "escape") {
        event.preventDefault();
        latest.current.onExit();
      }
      if (["w", "a", "s", "d", "q", "e"].includes(key)) {
        event.preventDefault();
        held.current.add(key);
      }
    };
    const keyup = (event: KeyboardEvent) => held.current.delete(event.key.toLowerCase());
    const blur = () => {
      held.current.clear();
      pointers.clear();
    };
    const lost = (event: Event) => {
      event.preventDefault();
      cancelAnimationFrame(frame);
      held.current.clear();
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
    canvas.addEventListener("pointermove", drag);
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", up);
    canvas.addEventListener("lostpointercapture", up);
    canvas.addEventListener("wheel", wheel, { passive: false });
    canvas.addEventListener("keydown", keydown);
    canvas.addEventListener("blur", blur);
    canvas.addEventListener("webglcontextlost", lost);
    canvas.addEventListener("webglcontextrestored", restored);
    canvas.addEventListener("garden:redraw", exported);
    window.addEventListener("garden:before-export", exported);
    document.addEventListener("visibilitychange", blur);
    window.addEventListener("keyup", keyup);
    window.addEventListener("blur", blur);
    start();
    canvas.focus({ preventScroll: true });
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      held.current.clear();
      renderer?.destroy();
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", drag);
      canvas.removeEventListener("pointerup", up);
      canvas.removeEventListener("pointercancel", up);
      canvas.removeEventListener("lostpointercapture", up);
      canvas.removeEventListener("wheel", wheel);
      canvas.removeEventListener("keydown", keydown);
      canvas.removeEventListener("blur", blur);
      canvas.removeEventListener("webglcontextlost", lost);
      canvas.removeEventListener("webglcontextrestored", restored);
      canvas.removeEventListener("garden:redraw", exported);
      window.removeEventListener("garden:before-export", exported);
      document.removeEventListener("visibilitychange", blur);
      window.removeEventListener("keyup", keyup);
      window.removeEventListener("blur", blur);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, []);
  return (
    <div className={styles.stage}>
      <canvas
        ref={canvasRef}
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
