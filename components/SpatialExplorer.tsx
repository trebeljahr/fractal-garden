import { type Dispatch, type SetStateAction, useEffect, useRef, useState } from "react";
import flightStyles from "../styles/VoxelFlight.module.css";
import { watchDisplayResolution } from "../utils/displayResolution";
import { useFractalFrame } from "../utils/hooks/useFractalFrame";
import { useSpatialControls } from "../utils/hooks/useSpatialControls";
import { registerPngExporter, renderCanvasPng } from "../utils/pngExport";
import type { SceneSpec } from "../utils/render/scene3d";
import {
  CAMERA_DISTANCE,
  INITIAL_SPATIAL_CAMERA,
  reframeSpatialPoint,
  rotationOf,
  spatialFrameTransform,
} from "../utils/spatial/camera";
import { meshClearance } from "../utils/spatial/flight";
import {
  buildSpatialFrame,
  type SpatialGeometry,
  type SpatialRequest,
  type SpatialStyle,
} from "../utils/spatial/geometry";
import { spatialReliefFront } from "../utils/spatial/lighting";
import { pickSpatialPoint } from "../utils/spatial/picking";
import { SPATIAL_PLACES } from "../utils/spatial/places";
import { createSpatialRenderer } from "../utils/spatial/renderer";

export function SpatialExplorer<T extends SpatialStyle>({
  spec,
  style,
  setStyle,
  width,
  height,
}: {
  spec: SceneSpec | { kind: "hilbert3d" };
  style: T;
  setStyle: Dispatch<SetStateAction<T>>;
  width: number;
  height: number;
}) {
  const frame = useFractalFrame(width, height);
  const [error, setError] = useState("");
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);
  const geometry = useRef<SpatialGeometry | null>(null);
  const geometryFrame = useRef<SpatialRequest | null>(null);
  const currentFrame = useRef({ camera: INITIAL_SPATIAL_CAMERA, style });
  const { camera, navigation } = useSpatialControls({
    canvas,
    frame,
    view: style,
    setView: setStyle,
    identity: JSON.stringify(spec),
    places: SPATIAL_PLACES[spec.kind as keyof typeof SPATIAL_PLACES],
    clearance:
      spec.kind === "hilbert3d"
        ? undefined
        : (camera, style) => {
            const frame = geometryFrame.current,
              data = geometry.current;
            if (!frame || !data?.collision) return null;
            const eye = reframeSpatialPoint(
              [0, 0, CAMERA_DISTANCE],
              camera,
              rotationOf(style),
              frame.camera,
              rotationOf(frame.style),
            );
            return meshClearance(data.collision, eye) * 2 ** (camera.zoom - frame.camera.zoom);
          },
    pick: (x, y) => {
      const source = geometryFrame.current,
        live = currentFrame.current;
      if (!geometry.current || !source) return null;
      return pickSpatialPoint(
        geometry.current.vertices,
        x,
        y,
        width,
        height,
        spatialFrameTransform(
          source.camera,
          rotationOf(source.style),
          live.camera,
          rotationOf(live.style),
        ),
        frame,
      );
    },
  });
  currentFrame.current = { camera, style };
  const latest = useRef({ style, width, height, frame });
  latest.current = { style, width, height, frame };
  const drawRef = useRef<() => void>(() => {});
  const requestRef = useRef<(request: SpatialRequest) => void>(() => {});
  const [ready, setReady] = useState(0);
  useEffect(() => {
    if (!canvas) return;
    let disposed = false,
      worker: Worker | null = null,
      busy = false,
      pending: SpatialRequest | null = null,
      sequence = 0;
    let activeRequest: SpatialRequest | null = null;
    const gl = canvas.getContext("webgl", {
      alpha: false,
      antialias: true,
      preserveDrawingBuffer: true,
    });
    if (!gl) {
      setError("Exploration needs WebGL. The construction below is still available.");
      return;
    }
    let renderer: ReturnType<typeof createSpatialRenderer> | undefined;
    const init = () => {
      renderer = undefined;
      try {
        renderer = createSpatialRenderer(gl);
        setError("");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not start this view.");
      }
    };
    init();
    const draw = (ratio = window.devicePixelRatio || 1) => {
      if (disposed || gl.isContextLost() || !renderer) return false;
      const { style, width, height, frame } = latest.current;
      const data = geometry.current,
        old = geometryFrame.current,
        live = currentFrame.current;
      const transform = old
        ? spatialFrameTransform(
            old.camera,
            rotationOf(old.style),
            live.camera,
            rotationOf(live.style),
          )
        : undefined;
      try {
        renderer.draw(
          data,
          transform,
          style,
          width,
          height,
          2 ** ((live.camera.atmosphereZoom ?? live.camera.zoom) - live.camera.zoom) / 96,
          spatialReliefFront(live.camera, rotationOf(live.style)),
          frame,
          ratio,
        );
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not draw this view.");
        return false;
      }
      canvas.dataset.renderZoom = String(old?.camera.zoom ?? 0);
      canvas.dataset.detailDepth = String(data?.depth ?? 0);
      canvas.dataset.leaves = String(data?.leaves ?? 0);
      canvas.dataset.limited = String(data?.limited ?? false);
      return true;
    };
    const redraw = () => {
      draw();
    };
    drawRef.current = redraw;
    const accept = (result: SpatialGeometry) => {
      if (disposed) return;
      geometry.current = result;
      geometryFrame.current = activeRequest;
      draw();
    };
    try {
      worker = new Worker(new URL("../workers/spatial.worker.ts", import.meta.url));
      worker.onmessage = (event: MessageEvent<{ result?: SpatialGeometry; error?: string }>) => {
        busy = false;
        if (event.data.error) setError(event.data.error);
        if (event.data.result) {
          if (renderer) setError("");
          accept(event.data.result);
        }
        if (pending) {
          const next = pending;
          pending = null;
          send(next);
        }
      };
      worker.onerror = (event) => {
        event.preventDefault();
        const request = pending ?? activeRequest;
        worker?.terminate();
        worker = null;
        busy = false;
        pending = null;
        if (request) send(request);
      };
    } catch {
      worker = null;
    }
    const send = (request: SpatialRequest) => {
      if (disposed) return;
      if (busy) {
        pending = request;
        return;
      }
      activeRequest = request;
      if (worker) {
        busy = true;
        worker.postMessage({ id: ++sequence, request });
      } else {
        try {
          accept(buildSpatialFrame(request));
        } catch (e) {
          setError(e instanceof Error ? e.message : "Could not build this view.");
        }
      }
    };
    requestRef.current = send;
    const lost = (e: Event) => {
      e.preventDefault();
    };
    const restored = () => {
      init();
      draw();
    };
    canvas.addEventListener("webglcontextlost", lost);
    canvas.addEventListener("webglcontextrestored", restored);
    canvas.addEventListener("garden:redraw", redraw);
    window.addEventListener("garden:before-export", redraw);
    const unregister = registerPngExporter(canvas, (size) => {
      if (!geometry.current) return Promise.reject(new Error("Drawing not ready"));
      return renderCanvasPng(canvas, size, (ratio) => {
        if (!draw(ratio)) throw new Error("Drawing not ready");
      });
    });
    const unwatch = watchDisplayResolution(redraw);
    setReady((v) => v + 1);
    return () => {
      disposed = true;
      unregister();
      unwatch();
      worker?.terminate();
      requestRef.current = () => {};
      drawRef.current = () => {};
      canvas.removeEventListener("webglcontextlost", lost);
      canvas.removeEventListener("webglcontextrestored", restored);
      canvas.removeEventListener("garden:redraw", redraw);
      window.removeEventListener("garden:before-export", redraw);
      renderer?.destroy();
      queueMicrotask(() => {
        if (!canvas.isConnected) gl.getExtension("WEBGL_lose_context")?.loseContext();
      });
    };
  }, [canvas]);
  // biome-ignore lint/correctness/useExhaustiveDependencies: Colors redraw existing buffers; only the listed view fields change geometry.
  useEffect(() => {
    if (!ready || !frame) return;
    const request = { spec, camera, style, width, height, frame, flight: true };
    requestRef.current({ ...request, pixelSize: geometry.current?.pixelSize });
    const idle = window.setTimeout(() => requestRef.current(request), 300);
    return () => window.clearTimeout(idle);
  }, [
    ready,
    spec,
    camera,
    style.rotationX,
    style.rotationY,
    style.grab,
    style.lineWidth,
    width,
    height,
    frame,
  ]);
  useEffect(() => drawRef.current());
  useEffect(() => {
    if (!style.autoRotate) return;
    let frame = 0,
      last = 0;
    const rotate = (time: number) => {
      if (last && time - last > 50) {
        setStyle((old) => ({ ...old, rotationY: old.rotationY + 0.4 }));
        last = time;
      } else if (!last) last = time;
      frame = requestAnimationFrame(rotate);
    };
    frame = requestAnimationFrame(rotate);
    return () => cancelAnimationFrame(frame);
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
        data-zoom={camera.zoom}
        data-flying="true"
        aria-label="Explore the fractal interior. Click to look. WASD to move. Space up. C down. Shift faster. Escape releases the mouse."
        style={{ width, height, display: "block", background: style.background }}
      />
    </>
  );
}
