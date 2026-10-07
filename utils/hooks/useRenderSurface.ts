import { useCallback, useEffect, useRef, useState } from "react";
import { calibrate } from "../render/calibrate";
import { RenderHost } from "../render/host";
import type { RendererKind } from "../render/registry";
import type { CalibrationRequest, HostEvent } from "../render/types";

type Channel = {
  setParams: (params: unknown) => void;
  resize: (width: number, height: number, ratio: number) => void;
  remeasure: () => void;
  calibrate: (request: CalibrationRequest<unknown>) => void;
  dispose: () => void;
};

/** Asks the renderer how deep this machine can go; a new `id` asks again. */
export type Calibration<P> = { id: number; params: P; min: number; max: number };

type Params<P> = {
  kind: RendererKind;
  /** Null while the page cannot describe the picture yet (e.g. size unknown). */
  params: P | null;
  width: number | null;
  height: number | null;
  onEvent?: (event: HostEvent) => void;
  /** Changing this asks the renderer to time the current level again. */
  measureKey?: number;
  calibration?: Calibration<P> | null;
};

function openWorkerChannel(
  canvas: HTMLCanvasElement,
  kind: RendererKind,
  onEvent: (event: HostEvent) => void,
): Channel | null {
  if (typeof Worker === "undefined" || typeof canvas.transferControlToOffscreen !== "function") {
    return null;
  }

  let worker: Worker | null = null;
  try {
    worker = new Worker(new URL("../../workers/render.worker.ts", import.meta.url));
    const offscreen = canvas.transferControlToOffscreen();
    worker.onmessage = (event: MessageEvent<HostEvent>) => onEvent(event.data);
    worker.postMessage({ type: "init", kind, canvas: offscreen, width: 0, height: 0, ratio: 1 }, [
      offscreen,
    ]);
  } catch {
    worker?.terminate();
    return null;
  }

  const active = worker;
  return {
    setParams: (params) => active.postMessage({ type: "params", params }),
    resize: (width, height, ratio) => active.postMessage({ type: "resize", width, height, ratio }),
    remeasure: () => active.postMessage({ type: "remeasure" }),
    calibrate: (request) => active.postMessage({ type: "calibrate", request }),
    dispose: () => active.terminate(),
  };
}

/**
 * Renders a fractal into a canvas from a worker thread, so heavy levels never
 * block the page. Falls back to the main thread where OffscreenCanvas is
 * missing. Attach `containerRef` to an element; the canvas is created inside
 * it, because a canvas can hand its control to a worker only once.
 */
export function useRenderSurface<P>({
  kind,
  params,
  width,
  height,
  onEvent,
  measureKey,
  calibration,
}: Params<P>) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);
  const channelRef = useRef<Channel | null>(null);
  const latestParams = useRef(params);
  latestParams.current = params;
  const latestSize = useRef({ width, height });
  latestSize.current = { width, height };
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;
  const latestCalibration = useRef(calibration);
  latestCalibration.current = calibration;
  const sentCalibration = useRef<number | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const element = document.createElement("canvas");
    element.style.display = "block";
    container.appendChild(element);
    setCanvas(element);

    let disposed = false;
    const handle = (event: HostEvent) => {
      if (event.type === "error") console.error(`[${kind}] ${event.message}`);
      onEventRef.current?.(event);
    };
    const connect = (channel: Channel) => {
      channelRef.current = channel;
      const { width: w, height: h } = latestSize.current;
      if (w && h) channel.resize(w, h, window.devicePixelRatio || 1);
      if (latestParams.current != null) channel.setParams(latestParams.current);
      setConnected(true);
    };

    const workerChannel = openWorkerChannel(element, kind, handle);
    if (workerChannel) {
      connect(workerChannel);
    } else {
      import("../render/registry").then(({ createRenderer }) => {
        if (disposed) return;
        const host = new RenderHost(element, createRenderer(kind), handle, false);
        connect({
          setParams: (next) => host.setParams(next),
          resize: (w, h, ratio) => host.resize(w, h, ratio),
          remeasure: () => host.remeasure(),
          calibrate: (request) => {
            const reports = calibrate({
              ...request,
              template: request.params,
              createRenderer: () => createRenderer(kind),
              offThread: false,
            });
            handle({ type: "calibrated", reports });
          },
          dispose: () => host.dispose(),
        });
      });
    }

    return () => {
      disposed = true;
      channelRef.current?.dispose();
      channelRef.current = null;
      sentCalibration.current = null;
      setConnected(false);
      element.remove();
      setCanvas(null);
    };
  }, [kind]);

  useEffect(() => {
    if (!canvas || !width || !height) return;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    channelRef.current?.resize(width, height, window.devicePixelRatio || 1);
  }, [canvas, width, height]);

  useEffect(() => {
    if (params != null) channelRef.current?.setParams(params);
  }, [params]);

  useEffect(() => {
    if (measureKey) channelRef.current?.remeasure();
  }, [measureKey]);

  // Keyed by id, and re-checked once the page can describe its params.
  const calibrationId = calibration ? calibration.id : null;
  useEffect(() => {
    const request = latestCalibration.current;
    const channel = channelRef.current;
    if (!connected || !channel || !request || !width || !height) return;
    if (sentCalibration.current === request.id) return;
    sentCalibration.current = request.id;
    channel.calibrate({
      params: request.params,
      min: request.min,
      max: request.max,
      width,
      height,
      ratio: window.devicePixelRatio || 1,
    });
  }, [connected, calibrationId, width, height]);

  // For pages that change the picture faster than React should re-render,
  // such as a pan: posts straight to the renderer.
  const setParams = useCallback((next: P) => {
    latestParams.current = next;
    channelRef.current?.setParams(next);
  }, []);

  return { containerRef, canvas, setParams };
}
