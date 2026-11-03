import {
  type ComponentType,
  type Dispatch,
  type SetStateAction,
  useEffect,
  useRef,
  useState,
} from "react";
import styles from "../styles/FractalConstruction.module.css";
import flightStyles from "../styles/VoxelFlight.module.css";
import type { ConstructionOverlayProps } from "../utils/constructionLead";
import { CONSTRUCTION_MOTION_MS } from "../utils/constructionMotion";
import type { ConstructionView } from "../utils/constructionView";
import { useConstructionNavigation } from "../utils/hooks/useConstructionNavigation";
import { useReducedMotion } from "../utils/hooks/useReducedMotion";
import {
  bigPoint,
  CAMERA_DISTANCE,
  INITIAL_SPATIAL_CAMERA,
  inverseRotate,
  rotationOf,
  type SpatialCamera,
} from "../utils/spatial/camera";
import type { SpatialStyle } from "../utils/spatial/geometry";
import type { GpuSpatialSpec } from "../utils/spatialGpu/model";
import { createSpatialGpuRenderer } from "../utils/spatialGpu/renderer";
import { MAX_FLIGHT_PIXELS } from "../utils/voxelZoom/frameBudget";

/** Finite construction uses the same analytic solid as the explorer. */
export function GpuConstructionSurface({
  spec,
  level,
  view,
  setView,
  onReady,
  onReset,
  overlay: Overlay,
}: {
  spec: GpuSpatialSpec;
  level: number;
  view: ConstructionView;
  setView: Dispatch<SetStateAction<ConstructionView>>;
  onReady: (level: number) => void;
  onReset: () => void;
  overlay?: ComponentType<ConstructionOverlayProps>;
}) {
  const container = useRef<HTMLDivElement>(null);
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);
  const [size, setSize] = useState({ width: 720, height: 480 });
  const [error, setError] = useState("");
  const reducedMotion = useReducedMotion();
  const latest = useRef({ spec, level, view, size, reducedMotion, onReady });
  const dirty = useRef(true);
  useEffect(() => {
    latest.current = { spec, level, view, size, reducedMotion, onReady };
    dirty.current = true;
  }, [spec, level, view, size, reducedMotion, onReady]);
  useConstructionNavigation(canvas, true, view, setView, onReset, CAMERA_DISTANCE);

  useEffect(() => {
    if (!container.current) return;
    const observer = new ResizeObserver(([entry]) => {
      const width = Math.round(entry.contentRect.width);
      const height = Math.round(entry.contentRect.height);
      if (width && height)
        setSize((old) => (old.width === width && old.height === height ? old : { width, height }));
    });
    observer.observe(container.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!canvas) return;
    const gl = canvas.getContext("webgl2", {
      alpha: false,
      antialias: false,
      preserveDrawingBuffer: true,
    });
    if (!gl) {
      setError("Construction needs WebGL 2.");
      return;
    }
    let renderer: ReturnType<typeof createSpatialGpuRenderer> | null = null;
    let animation = 0;
    let disposed = false;
    let previous: { level: number; resetId: number; spec: string } | null = null;
    let started: number | null = null;
    let previousTime: number | null = null;
    let yaw = 0;
    let readyLevel: number | null = null;
    let presented: number | null = null;
    const init = () => {
      try {
        renderer = createSpatialGpuRenderer(gl, { kind: spec.kind });
        dirty.current = true;
        readyLevel = null;
        setError("");
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Could not start this construction.");
      }
    };
    const tick = (time: number) => {
      if (disposed) return;
      const current = latest.current;
      const key = JSON.stringify(current.spec);
      if (presented !== null && presented === current.level) {
        current.onReady(presented);
        presented = null;
      }
      const changed =
        !previous ||
        previous.level !== current.level ||
        previous.resetId !== current.view.resetId ||
        previous.spec !== key;
      if (changed) {
        started =
          previous &&
          previous.spec === key &&
          previous.resetId === current.view.resetId &&
          current.level === previous.level + 1 &&
          !current.reducedMotion
            ? time
            : null;
        if (!previous || previous.resetId !== current.view.resetId || previous.spec !== key)
          yaw = 0;
        previous = { level: current.level, resetId: current.view.resetId, spec: key };
        readyLevel = null;
        dirty.current = true;
      }
      if (current.reducedMotion) started = null;
      const elapsed = previousTime === null ? 0 : (time - previousTime) / 1000;
      previousTime = time;
      if (current.view.autoRotate) {
        const speed =
          typeof current.view.rotationSpeed === "number" ? current.view.rotationSpeed : 0.4;
        yaw += elapsed * speed * 60;
        dirty.current = true;
      }
      const t = started === null ? 1 : Math.min(1, (time - started) / CONSTRUCTION_MOTION_MS);
      if (started !== null) dirty.current = true;
      if (renderer && !gl.isContextLost() && dirty.current) {
        dirty.current = false;
        const style: SpatialStyle = {
          ...current.view,
          rotationY: current.view.rotationY + yaw,
          lighting: current.view.lighting === "depth" ? "depth" : "classic",
          occlusion:
            current.view.occlusion === "off" || current.view.occlusion === "minecraft"
              ? current.view.occlusion
              : "soft",
        };
        // The GPU camera has a fixed eye distance. Move its target so the
        // construction's distance control still orbits the model's origin.
        const offset = inverseRotate(
          [0, 0, current.view.cameraDistance - CAMERA_DISTANCE],
          rotationOf(style),
        );
        const camera: SpatialCamera = {
          ...INITIAL_SPATIAL_CAMERA,
          target: bigPoint(offset, INITIAL_SPATIAL_CAMERA.bits).map(
            String,
          ) as SpatialCamera["target"],
        };
        try {
          const growth = t * t * (3 - 2 * t);
          renderer.draw(
            camera,
            current.spec,
            style,
            current.size.width,
            current.size.height,
            window.devicePixelRatio || 1,
            MAX_FLIGHT_PIXELS,
            undefined,
            { maxRank: current.level, growth },
          );
          canvas.dataset.constructionLevel = String(current.level);
          canvas.dataset.constructionGrowth = String(growth);
          canvas.dataset.pixelBudget = String(MAX_FLIGHT_PIXELS);
          if (readyLevel !== current.level) {
            readyLevel = current.level;
            presented = current.level;
          }
          if (t === 1) started = null;
          setError("");
        } catch (cause) {
          started = null;
          setError(cause instanceof Error ? cause.message : "Could not draw this construction.");
        }
      }
      animation = requestAnimationFrame(tick);
    };
    const lost = (event: Event) => {
      event.preventDefault();
      presented = null;
      setError("Waiting for WebGL to recover.");
    };
    const restored = () => {
      renderer?.destroy();
      renderer = null;
      init();
    };
    canvas.addEventListener("webglcontextlost", lost);
    canvas.addEventListener("webglcontextrestored", restored);
    init();
    animation = requestAnimationFrame(tick);
    return () => {
      disposed = true;
      cancelAnimationFrame(animation);
      canvas.removeEventListener("webglcontextlost", lost);
      canvas.removeEventListener("webglcontextrestored", restored);
      renderer?.destroy();
      renderer = null;
      queueMicrotask(() => {
        if (!canvas.isConnected) gl.getExtension("WEBGL_lose_context")?.loseContext();
      });
    };
  }, [canvas, spec.kind]);

  return (
    <div ref={container} className={styles.surface}>
      {error && (
        <output role="alert" className={flightStyles.error}>
          {error}
        </output>
      )}
      <canvas
        ref={setCanvas}
        data-gpu-construction
        aria-label="Construction view. Drag to rotate; scroll or pinch to zoom; double-click to reset."
      />
      {Overlay && <Overlay view={view} level={level} width={size.width} height={size.height} />}
    </div>
  );
}
