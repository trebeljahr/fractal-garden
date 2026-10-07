import { type PointerEvent, useCallback, useEffect, useRef, useState } from "react";
import styles from "../styles/EndlessZoom.module.css";
import { fixedFromNumber, fixedToNumber, rescale } from "../utils/lsystem/bigfixed";
import type { ZoomFrame } from "../utils/lsystem/pageZoom";
import { createRenderer, type Renderer } from "../utils/lsystem/render";
import type { LSystemSpec } from "../utils/lsystem/spec";
import type { ZoomRequest, ZoomResult } from "../utils/lsystem/worker";
import { MAX_ZOOM, type ZoomDetail } from "../utils/lsystem/zoom";
import { WebGLCanvas } from "./Canvas";

type Props = {
  // The curve as an explorer spec, and the generation the page shows.
  spec: LSystemSpec;
  generation: number;
  // Where the page draws that generation, worked out when zooming starts.
  frame: () => ZoomFrame;
  width: number | null;
  height: number | null;
  // Called when zooming starts and when the view is reset to the page's.
  onActiveChange?: (active: boolean) => void;
};

type View = {
  zoom: number;
  panX: number;
  panY: number;
  deepX: bigint;
  deepY: bigint;
  deepBits: number;
  // The page's curve, generation and frame when zooming started. The page
  // may keep growing underneath; the zoomed view stays on what you saw.
  frame: ZoomFrame;
  spec: LSystemSpec;
  generation: number;
};

const ZERO = BigInt(0);

// 1234 -> "1,234×", 3.4e47 -> "3.4 × 10⁴⁷".
function formatZoom(zoom: number) {
  if (zoom < 1e6)
    return `${zoom < 10 ? zoom.toFixed(1) : Math.round(zoom).toLocaleString("en-US")}×`;
  const power = Math.floor(Math.log10(zoom));
  const digits = Array.from(String(power), (digit) => "⁰¹²³⁴⁵⁶⁷⁸⁹"[Number(digit)]).join("");
  return `${(zoom / 10 ** power).toFixed(1)} × 10${digits}`;
}

/**
 * Endless zoom over an L-system page. At rest it is invisible and the page
 * draws as usual. The first scroll, pinch or drag takes over with a layer that
 * starts from exactly the page's picture and then grows later generations
 * where you look (see utils/lsystem/zoom.ts). Double-click returns to the page.
 */
export const EndlessZoom = ({ spec, generation, frame, width, height, onActiveChange }: Props) => {
  const [active, setActive] = useState(false);
  const [gl, setGl] = useState<WebGLRenderingContext | null>(null);
  const [renderer, setRenderer] = useState<Renderer | null>(null);
  const [info, setInfo] = useState<{ zoom: number; generation: number } | null>(null);
  const [unsupported, setUnsupported] = useState<string | null>(null);
  const viewRef = useRef<View | null>(null);
  const detailRef = useRef<ZoomDetail | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef(0);
  const workerRef = useRef<Worker | null>(null);
  const busyRef = useRef(false);
  const pendingRef = useRef<ZoomRequest | null>(null);
  const jobRef = useRef(0);
  const validFromRef = useRef(1);
  const pointers = useRef(new Map<number, { x: number; y: number }>());

  const style = {
    color: spec.color,
    colorEnd: spec.colorEnd,
    colorMode: spec.colorMode,
    background: spec.background,
    lineWidth: spec.lineWidth,
  };
  const styleRef = useRef(style);
  styleRef.current = style;
  const specRef = useRef(spec);
  specRef.current = spec;
  const generationRef = useRef(generation);
  generationRef.current = generation;
  const pageFrameRef = useRef(frame);
  pageFrameRef.current = frame;

  const reset = useCallback(() => {
    viewRef.current = null;
    detailRef.current = null;
    validFromRef.current = jobRef.current + 1;
    setInfo(null);
    setActive(false);
  }, []);

  // New rules make the zoomed view stale. A resize does not: the view keeps
  // the frame it started from and stays centered.
  const rulesKey = `${spec.axiom}|${JSON.stringify(spec.rules)}|${spec.angle}`;
  // biome-ignore lint/correctness/useExhaustiveDependencies: these are the triggers
  useEffect(() => {
    reset();
    setUnsupported(null);
  }, [rulesKey, reset]);

  useEffect(() => {
    onActiveChange?.(active);
  }, [active, onActiveChange]);

  useEffect(() => {
    if (!gl) return;
    const created = createRenderer(gl);
    setRenderer(created);
    return () => created?.dispose();
  }, [gl]);

  useEffect(
    () => () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    },
    [],
  );

  const draw = useCallback(() => {
    const view = viewRef.current;
    const detail = detailRef.current;
    if (!renderer || !view || !width || !height) return;
    const scale = view.frame.scale * view.zoom;
    let originX = width / 2 + view.panX;
    let originY = height / 2 + view.panY;
    let stretch = 1;
    if (detail) {
      // Place the detail's middle relative to the current one; the gap is
      // taken in fixed point, so only small numbers reach the GPU.
      const made = detail.view;
      const bits = Math.max(made.bits, view.deepBits);
      const centerX = (width / 2 - view.frame.originX) / view.frame.scale;
      const centerY = (view.frame.originY - height / 2) / view.frame.scale;
      const shiftX =
        fixedToNumber(
          rescale(made.offsetX, made.bits, bits) - rescale(view.deepX, view.deepBits, bits),
          bits,
        ) +
        (made.originX - centerX);
      const shiftY =
        fixedToNumber(
          rescale(made.offsetY, made.bits, bits) - rescale(view.deepY, view.deepBits, bits),
          bits,
        ) +
        (made.originY - centerY);
      originX += shiftX * scale;
      originY -= shiftY * scale;
      stretch = scale / made.scale;
    }
    renderer.drawDetail(detail, styleRef.current, originX, originY, stretch);
  }, [renderer, width, height]);

  const send = useCallback(
    (request: ZoomRequest) => {
      if (busyRef.current) {
        pendingRef.current = request;
        return;
      }
      let worker = workerRef.current;
      if (!worker) {
        worker = new Worker(new URL("../utils/lsystem/worker.ts", import.meta.url));
        worker.onmessage = (event: MessageEvent<ZoomResult>) => {
          busyRef.current = false;
          const pending = pendingRef.current;
          pendingRef.current = null;
          if (pending) send(pending);
          const { id, detail, reason } = event.data;
          if (id < validFromRef.current || !viewRef.current) return;
          if (!detail) {
            setUnsupported(reason);
            reset();
            return;
          }
          detailRef.current = detail;
          setInfo({ zoom: detail.view.zoom, generation: detail.generation });
          requestDrawRef.current();
        };
        worker.onerror = () => {
          busyRef.current = false;
        };
        workerRef.current = worker;
      }
      busyRef.current = true;
      worker.postMessage(request);
    },
    [reset],
  );

  // Moves the pan into the fixed-point center and asks for the detail of the
  // current view.
  const schedule = useCallback(() => {
    const view = viewRef.current;
    if (!view || !width || !height) return;
    const scale = view.frame.scale * view.zoom;
    const bits = Math.max(view.deepBits, Math.ceil(Math.log2(Math.max(scale, 1))) + 64);
    view.deepX =
      rescale(view.deepX, view.deepBits, bits) + fixedFromNumber(-view.panX / scale, bits);
    view.deepY =
      rescale(view.deepY, view.deepBits, bits) + fixedFromNumber(view.panY / scale, bits);
    view.deepBits = bits;
    view.panX = 0;
    view.panY = 0;
    send({
      id: ++jobRef.current,
      spec: { ...view.spec, color: specRef.current.color, colorEnd: specRef.current.colorEnd },
      iterations: view.generation,
      view: {
        originX: (width / 2 - view.frame.originX) / view.frame.scale,
        originY: (view.frame.originY - height / 2) / view.frame.scale,
        offsetX: view.deepX,
        offsetY: view.deepY,
        bits,
        scale,
        halfWidth: width * 0.65,
        halfHeight: height * 0.65,
        zoom: view.zoom,
      },
    });
  }, [width, height, send]);

  const requestDraw = useCallback(() => {
    cancelAnimationFrame(frameRef.current);
    frameRef.current = requestAnimationFrame(draw);
    schedule();
  }, [draw, schedule]);
  const requestDrawRef = useRef(requestDraw);
  requestDrawRef.current = requestDraw;

  useEffect(() => {
    requestDraw();
    return () => cancelAnimationFrame(frameRef.current);
  }, [requestDraw]);

  // The zoomed view, created from the page's frame on the first gesture.
  const takeOver = () => {
    if (!viewRef.current) {
      viewRef.current = {
        zoom: 1,
        panX: 0,
        panY: 0,
        deepX: ZERO,
        deepY: ZERO,
        deepBits: 64,
        frame: pageFrameRef.current(),
        spec: specRef.current,
        generation: generationRef.current,
      };
      setActive(true);
    }
    return viewRef.current;
  };

  const zoomAt = (clientX: number, clientY: number, factor: number) => {
    const stage = stageRef.current;
    if (!stage || !width || !height || unsupported) return;
    const view = takeOver();
    const zoom = Math.min(Math.max(view.zoom * factor, 0.05), MAX_ZOOM);
    const k = zoom / view.zoom;
    const rect = stage.getBoundingClientRect();
    const cx = clientX - rect.left - width / 2;
    const cy = clientY - rect.top - height / 2;
    view.panX = cx - (cx - view.panX) * k;
    view.panY = cy - (cy - view.panY) * k;
    view.zoom = zoom;
    requestDrawRef.current();
  };
  const zoomAtRef = useRef(zoomAt);
  zoomAtRef.current = zoomAt;

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const unit =
        event.deltaMode === WheelEvent.DOM_DELTA_LINE
          ? 16
          : event.deltaMode === WheelEvent.DOM_DELTA_PAGE
            ? stage.clientHeight
            : 1;
      const speed = event.ctrlKey ? 0.01 : 0.0015;
      zoomAtRef.current(event.clientX, event.clientY, Math.exp(-event.deltaY * unit * speed));
    };
    let gestureScale = 1;
    const onGestureStart = (event: Event) => {
      event.preventDefault();
      gestureScale = 1;
    };
    const onGestureChange = (event: Event) => {
      event.preventDefault();
      const gesture = event as Event & { scale: number; clientX: number; clientY: number };
      zoomAtRef.current(gesture.clientX, gesture.clientY, gesture.scale / gestureScale);
      gestureScale = gesture.scale;
    };
    stage.addEventListener("wheel", onWheel, { passive: false });
    stage.addEventListener("gesturestart", onGestureStart);
    stage.addEventListener("gesturechange", onGestureChange);
    return () => {
      stage.removeEventListener("wheel", onWheel);
      stage.removeEventListener("gesturestart", onGestureStart);
      stage.removeEventListener("gesturechange", onGestureChange);
    };
  }, []);

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const previous = pointers.current.get(event.pointerId);
    if (!previous || unsupported) return;
    const dx = event.clientX - previous.x;
    const dy = event.clientY - previous.y;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (dx === 0 && dy === 0) return;
    const view = takeOver();
    if (pointers.current.size >= 2) {
      const [a, b] = Array.from(pointers.current.values());
      const other = a.x === event.clientX && a.y === event.clientY ? b : a;
      const before = Math.hypot(previous.x - other.x, previous.y - other.y);
      const after = Math.hypot(event.clientX - other.x, event.clientY - other.y);
      view.panX += dx / 2;
      view.panY += dy / 2;
      if (before > 0) {
        zoomAt((event.clientX + other.x) / 2, (event.clientY + other.y) / 2, after / before);
        return;
      }
    } else {
      view.panX += dx;
      view.panY += dy;
    }
    requestDraw();
  };

  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    pointers.current.delete(event.pointerId);
  };

  return (
    <div
      ref={stageRef}
      className={active ? styles.stageActive : styles.stage}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onDoubleClick={reset}
    >
      {active && (
        <>
          <div className={info ? styles.layer : styles.layerWaiting}>
            <WebGLCanvas setGl={setGl} setCnv={() => {}} width={width} height={height} />
          </div>
          <div className={styles.status}>
            <span>
              {info
                ? `Zoomed ${formatZoom(info.zoom)} · generation ${info.generation}`
                : "Zooming…"}
            </span>
            <button type="button" onClick={reset} onPointerDown={(e) => e.stopPropagation()}>
              Back to the page
            </button>
          </div>
        </>
      )}
      {unsupported && !active && (
        <div className={styles.status}>
          <span>Zooming cannot add detail here: {unsupported}.</span>
        </div>
      )}
    </div>
  );
};
