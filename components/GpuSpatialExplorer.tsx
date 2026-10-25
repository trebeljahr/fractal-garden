import { type Dispatch, type SetStateAction, useEffect, useRef, useState } from "react";
import flightStyles from "../styles/VoxelFlight.module.css";
import { useFractalFrame } from "../utils/hooks/useFractalFrame";
import { useSpatialControls } from "../utils/hooks/useSpatialControls";
import {
  INITIAL_SPATIAL_CAMERA,
  reframeSpatialPoint,
  rotationOf,
  type SpatialCamera,
} from "../utils/spatial/camera";
import type { SpatialStyle } from "../utils/spatial/geometry";
import type { GpuSpatialSpec } from "../utils/spatialGpu/model";
import { createSpatialGpuRenderer } from "../utils/spatialGpu/renderer";
import {
  createFlightFrameBudget,
  FLIGHT_SETTLE_MS,
  MAX_STILL_FLIGHT_PIXELS,
} from "../utils/voxelZoom/frameBudget";

/** Recursive surfaces are evaluated by the GPU for the current camera each draw. */
export function GpuSpatialExplorer<T extends SpatialStyle>({
  spec,
  style,
  setStyle,
  width,
  height,
}: {
  spec: GpuSpatialSpec;
  style: T;
  setStyle: Dispatch<SetStateAction<T>>;
  width: number;
  height: number;
}) {
  const framing = useFractalFrame(width, height);
  const [error, setError] = useState("");
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);
  const renderer = useRef<ReturnType<typeof createSpatialGpuRenderer> | null>(null);
  const drawn = useRef<{ camera: SpatialCamera; style: SpatialStyle } | null>(null);
  const live = useRef({ camera: INITIAL_SPATIAL_CAMERA, style });
  const { camera, flying, navigation } = useSpatialControls({
    canvas,
    frame: framing,
    view: style,
    setView: setStyle,
    identity: JSON.stringify(spec),
    clearance: (camera, view) => {
      try {
        return renderer.current?.clearance(camera, spec, view) ?? null;
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Could not check the nearby surface.");
        return null;
      }
    },
    pick: (x, y) => {
      const point = renderer.current?.pick(x, y),
        from = drawn.current,
        to = live.current;
      return point && from
        ? reframeSpatialPoint(
            point,
            from.camera,
            rotationOf(from.style),
            to.camera,
            rotationOf(to.style),
          )
        : null;
    },
  });
  live.current = { camera, style };
  const latest = useRef({ camera, spec, style, width, height, framing });
  latest.current = { camera, spec, style, width, height, framing };
  const dirty = useRef(true);
  useEffect(() => {
    dirty.current = true;
  });
  useEffect(() => {
    if (!canvas) return;
    const gl = canvas.getContext("webgl2", {
      alpha: false,
      antialias: false,
      preserveDrawingBuffer: true,
    });
    if (!gl) {
      setError("Exploration needs WebGL 2. The construction below is still available.");
      return;
    }
    let disposed = false;
    let animation = 0;
    let previousDraw = 0;
    let needsRefinement = false;
    let refineAt = 0;
    const budget = createFlightFrameBudget();
    const init = () => {
      try {
        renderer.current = createSpatialGpuRenderer(gl);
        setError("");
        dirty.current = true;
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Could not start this view.");
      }
    };
    const draw = (pixels: number) => {
      if (disposed || gl.isContextLost() || !renderer.current) return false;
      const { camera, spec, style, width, height, framing } = latest.current;
      try {
        renderer.current.draw(
          camera,
          spec,
          style,
          width,
          height,
          window.devicePixelRatio || 1,
          pixels,
          framing,
        );
        const stillScale = Math.min(
          window.devicePixelRatio || 1,
          2,
          Math.sqrt(MAX_STILL_FLIGHT_PIXELS / Math.max(1, width * height)),
        );
        needsRefinement =
          canvas.width < Math.max(1, Math.round(width * stillScale)) ||
          canvas.height < Math.max(1, Math.round(height * stillScale));
        drawn.current = { camera, style };
        canvas.dataset.renderZoom = String(camera.zoom);
        canvas.dataset.pixelBudget = String(pixels);
        setError("");
        return true;
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Could not draw this view.");
        return false;
      }
    };
    const tick = (time: number) => {
      if (dirty.current) {
        if (previousDraw) budget.sample(time - previousDraw, canvas.width * canvas.height);
        dirty.current = false;
        previousDraw = draw(budget.pixels) ? time : 0;
        refineAt = time + FLIGHT_SETTLE_MS;
      } else {
        previousDraw = 0;
        budget.pause();
        if (needsRefinement && time >= refineAt && !document.hidden) draw(MAX_STILL_FLIGHT_PIXELS);
      }
      animation = requestAnimationFrame(tick);
    };
    const redraw = () => {
      dirty.current = true;
    };
    const exportFrame = () => {
      draw(MAX_STILL_FLIGHT_PIXELS);
      dirty.current = false;
      previousDraw = 0;
    };
    const lost = (event: Event) => {
      event.preventDefault();
      previousDraw = 0;
      budget.pause();
    };
    const restored = () => {
      renderer.current = null;
      init();
    };
    init();
    animation = requestAnimationFrame(tick);
    canvas.addEventListener("webglcontextlost", lost);
    canvas.addEventListener("webglcontextrestored", restored);
    canvas.addEventListener("garden:redraw", redraw);
    window.addEventListener("garden:before-export", exportFrame);
    return () => {
      disposed = true;
      cancelAnimationFrame(animation);
      canvas.removeEventListener("webglcontextlost", lost);
      canvas.removeEventListener("webglcontextrestored", restored);
      canvas.removeEventListener("garden:redraw", redraw);
      window.removeEventListener("garden:before-export", exportFrame);
      renderer.current?.destroy();
      renderer.current = null;
      drawn.current = null;
      queueMicrotask(() => {
        if (!canvas.isConnected) gl.getExtension("WEBGL_lose_context")?.loseContext();
      });
    };
  }, [canvas]);
  useEffect(() => {
    if (!style.autoRotate) return;
    let animation = 0;
    let previous = 0;
    const rotate = (time: number) => {
      if (previous) {
        const elapsed = (time - previous) / 1000;
        setStyle((old) => ({ ...old, rotationY: old.rotationY + elapsed * 8 }));
      }
      previous = time;
      animation = requestAnimationFrame(rotate);
    };
    animation = requestAnimationFrame(rotate);
    return () => cancelAnimationFrame(animation);
  }, [style.autoRotate, setStyle]);
  return (
    <>
      {navigation}
      {error && (
        <output role="alert" className={flightStyles.error} data-fractal-chrome>
          {error}
        </output>
      )}
      <canvas
        ref={setCanvas}
        data-spatial-explorer
        data-gpu-spatial-explorer
        data-zoom={camera.zoom}
        data-flying={flying}
        aria-label={
          flying
            ? "Explore the fractal interior. Click to look. WASD to move. Space up. C down. Shift faster. Escape releases the mouse."
            : "Drag to rotate. Shift-drag to pan. Scroll or pinch to zoom. Double-click to reset."
        }
        style={{ width, height, display: "block", background: style.background }}
      />
    </>
  );
}
