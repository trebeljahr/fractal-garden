import { type Dispatch, type SetStateAction, useEffect, useRef, useState } from "react";
import flightStyles from "../styles/VoxelFlight.module.css";
import { watchDisplayResolution } from "../utils/displayResolution";
import { useFractalFrame } from "../utils/hooks/useFractalFrame";
import { useSpatialControls } from "../utils/hooks/useSpatialControls";
import { registerPngExporter, renderCanvasPng } from "../utils/pngExport";
import {
  INITIAL_SPATIAL_CAMERA,
  reframeSpatialPoint,
  rotationOf,
  type SpatialCamera,
} from "../utils/spatial/camera";
import type { SpatialStyle } from "../utils/spatial/geometry";
import { SPATIAL_PLACES } from "../utils/spatial/places";
import type { GpuSpatialSpec } from "../utils/spatialGpu/model";
import { createSpatialGpuRenderer } from "../utils/spatialGpu/renderer";
import { MAX_FLIGHT_PIXELS } from "../utils/voxelZoom/frameBudget";

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
  const { camera, navigation } = useSpatialControls({
    canvas,
    frame: framing,
    view: style,
    setView: setStyle,
    identity: JSON.stringify(spec),
    places: SPATIAL_PLACES[spec.kind as keyof typeof SPATIAL_PLACES],
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
      setError(
        latest.current.spec.kind === "romanesco"
          ? "This view needs WebGL 2."
          : "Exploration needs WebGL 2. The construction below is still available.",
      );
      return;
    }
    let disposed = false;
    let animation = 0;
    const init = () => {
      try {
        renderer.current = createSpatialGpuRenderer(gl, { kind: spec.kind });
        setError("");
        dirty.current = true;
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Could not start this view.");
      }
    };
    const draw = (pixels: number, ratio = window.devicePixelRatio || 1) => {
      if (disposed || gl.isContextLost() || !renderer.current) return false;
      const { camera, spec, style, width, height, framing } = latest.current;
      try {
        const statistics = renderer.current.draw(
          camera,
          spec,
          style,
          width,
          height,
          ratio,
          pixels,
          framing,
        );
        drawn.current = { camera, style };
        canvas.dataset.renderZoom = String(camera.zoom);
        canvas.dataset.pixelBudget = String(pixels);
        canvas.dataset.stackDepth = String(statistics.stackDepth);
        canvas.dataset.seed = String(statistics.seed);
        setError("");
        return true;
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Could not draw this view.");
        return false;
      }
    };
    const tick = () => {
      if (dirty.current) {
        dirty.current = false;
        draw(MAX_FLIGHT_PIXELS);
      }
      animation = requestAnimationFrame(tick);
    };
    const redraw = () => {
      dirty.current = true;
    };
    const exportFrame = () => {
      draw(MAX_FLIGHT_PIXELS);
      dirty.current = false;
    };
    const lost = (event: Event) => {
      event.preventDefault();
    };
    const restored = () => {
      renderer.current = null;
      init();
    };
    const unregister = registerPngExporter(canvas, (size) =>
      renderCanvasPng(canvas, size, (ratio) => {
        if (!draw(Number.POSITIVE_INFINITY, ratio)) throw new Error("Drawing not ready");
        dirty.current = true;
      }),
    );
    const unwatch = watchDisplayResolution(redraw);
    init();
    animation = requestAnimationFrame(tick);
    canvas.addEventListener("webglcontextlost", lost);
    canvas.addEventListener("webglcontextrestored", restored);
    canvas.addEventListener("garden:redraw", redraw);
    window.addEventListener("garden:before-export", exportFrame);
    return () => {
      disposed = true;
      unregister();
      unwatch();
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
  }, [canvas, spec.kind]);
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
        data-flying="true"
        aria-label="Explore the fractal interior. Click to look. WASD to move. Space up. C down. Shift faster. Escape releases the mouse."
        style={{ width, height, display: "block", background: style.background }}
      />
    </>
  );
}
