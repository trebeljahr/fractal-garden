import { useCallback, useEffect, useRef, useState } from "react";
import { watchDisplayResolution } from "../displayResolution";
import { registerPngExporter } from "../pngExport";
import { calibrate } from "../render/calibrate";
import { RenderHost } from "../render/host";
import type { RendererKind } from "../render/registry";
import type { CalibrationRequest, HostEvent } from "../render/types";
import { useExplorerPart } from "./useExplorerPart";
import { useFractalFrame } from "./useFractalFrame";

type Channel = {
  exportPng: (ratio: number) => Promise<Blob>;
  setParams: (params: unknown) => void;
  pick: (x: number, y: number) => Promise<[number, number, number] | null>;
  resize: (width: number, height: number, ratio: number) => void;
  remeasure: () => void;
  calibrate: (request: CalibrationRequest<unknown>) => void;
  dispose: () => void;
  snapshotView: () => Promise<unknown>;
  restoreView: (state: unknown) => void;
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
  /** Explanation demos must not capture or restore the main explorer view. */
  shareView?: boolean;
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
  let sequence = 0;
  const pending = new Map<number, (state: unknown) => void>();
  try {
    worker = new Worker(new URL("../../workers/render.worker.ts", import.meta.url));
    const offscreen = canvas.transferControlToOffscreen();
    worker.onmessage = (event: MessageEvent<HostEvent>) => {
      if (event.data.type === "png") {
        pending.get(event.data.id)?.(
          event.data.blob ?? new Error(event.data.error ?? "PNG encoding failed"),
        );
        pending.delete(event.data.id);
      } else if (event.data.type === "snapshot") {
        pending.get(event.data.id)?.(event.data.state);
        pending.delete(event.data.id);
      } else if (event.data.type === "picked") {
        pending.get(event.data.id)?.(event.data.point);
        pending.delete(event.data.id);
      } else onEvent(event.data);
    };
    worker.onerror = () => {
      pending.forEach((resolve) => {
        resolve(new Error("Renderer failed"));
      });
      pending.clear();
      onEvent({ type: "error", message: "The renderer stopped. Reload to try again." });
    };
    worker.postMessage({ type: "init", kind, canvas: offscreen, width: 0, height: 0, ratio: 1 }, [
      offscreen,
    ]);
  } catch {
    worker?.terminate();
    return null;
  }

  const active = worker;
  return {
    exportPng: (ratio) =>
      new Promise((resolve, reject) => {
        const id = ++sequence;
        const timeout = window.setTimeout(() => {
          pending.delete(id);
          reject(new Error("PNG rendering timed out"));
        }, 120000);
        pending.set(id, (value) => {
          window.clearTimeout(timeout);
          if (value instanceof Blob) resolve(value);
          else reject(value instanceof Error ? value : new Error("Renderer closed"));
        });
        active.postMessage({ type: "export-png", id, ratio });
      }),
    setParams: (params) => active.postMessage({ type: "params", params }),
    resize: (width, height, ratio) => active.postMessage({ type: "resize", width, height, ratio }),
    remeasure: () => active.postMessage({ type: "remeasure" }),
    calibrate: (request) => active.postMessage({ type: "calibrate", request }),
    snapshotView: () =>
      new Promise((resolve, reject) => {
        const id = ++sequence;
        const timeout = window.setTimeout(() => {
          pending.delete(id);
          reject(new Error("The renderer is still busy. Try sharing again in a moment."));
        }, 2000);
        pending.set(id, (value) => {
          window.clearTimeout(timeout);
          resolve(value);
        });
        active.postMessage({ type: "snapshot", id });
      }),
    pick: (x, y) =>
      new Promise((resolve) => {
        const id = ++sequence;
        const timeout = window.setTimeout(() => {
          pending.delete(id);
          resolve(null);
        }, 2000);
        pending.set(id, (value) => {
          window.clearTimeout(timeout);
          resolve((value ?? null) as [number, number, number] | null);
        });
        active.postMessage({ type: "pick", id, x, y });
      }),
    restoreView: (state) => active.postMessage({ type: "restore-view", state }),
    dispose: () => {
      pending.forEach((resolve) => {
        resolve(undefined);
      });
      pending.clear();
      active.terminate();
    },
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
  shareView = true,
}: Params<P>) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);
  const channelRef = useRef<Channel | null>(null);
  const frame = useFractalFrame(width, height);
  const framing = shareView && canvas?.closest("[data-fractal-viewport]") ? frame : null;
  const framingRef = useRef(framing);
  framingRef.current = framing;
  const prepareParams = useCallback(
    (next: P) =>
      next && typeof next === "object" && framingRef.current
        ? { ...next, framing: framingRef.current }
        : next,
    [],
  );
  const latestParams = useRef(params);
  const previousParams = useRef(params);
  if (previousParams.current !== params) {
    previousParams.current = params;
    latestParams.current = params;
  }
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
      if (latestParams.current != null) channel.setParams(prepareParams(latestParams.current));
      setConnected(true);
    };

    const unregister = registerPngExporter(element, (size) => {
      if (!channelRef.current) return Promise.reject(new Error("Drawing not ready"));
      return channelRef.current.exportPng(size.ratio);
    });
    const unwatch = watchDisplayResolution(() => {
      const { width: w, height: h } = latestSize.current;
      if (w && h) channelRef.current?.resize(w, h, window.devicePixelRatio || 1);
    });
    const workerChannel = openWorkerChannel(element, kind, handle);
    if (workerChannel) {
      connect(workerChannel);
    } else {
      import("../render/registry").then(({ createRenderer }) => {
        if (disposed) return;
        const host = new RenderHost(element, createRenderer(kind), handle, false);
        connect({
          exportPng: (ratio) => host.exportPng(ratio, () => createRenderer(kind)),
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
          snapshotView: async () => host.snapshotView(),
          pick: async (x, y) => host.pick(x, y),
          restoreView: (state) => host.restoreView(state),
        });
      });
    }

    return () => {
      disposed = true;
      unregister();
      unwatch();
      channelRef.current?.dispose();
      channelRef.current = null;
      sentCalibration.current = null;
      setConnected(false);
      element.remove();
      setCanvas(null);
    };
  }, [kind, prepareParams]);

  useExplorerPart(
    "renderer",
    () => channelRef.current?.snapshotView(),
    (saved) => channelRef.current?.restoreView(saved),
    connected && shareView,
  );

  useEffect(() => {
    if (!shareView) return;
    const reset = () => channelRef.current?.restoreView(0);
    window.addEventListener("garden:reset-pose", reset);
    return () => window.removeEventListener("garden:reset-pose", reset);
  }, [shareView]);

  useEffect(() => {
    if (!canvas || !width || !height) return;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    channelRef.current?.resize(width, height, window.devicePixelRatio || 1);
  }, [canvas, width, height]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: fit changes must redraw the current imperative view too
  useEffect(() => {
    if (latestParams.current != null)
      channelRef.current?.setParams(prepareParams(latestParams.current));
  }, [params, framing, prepareParams]);

  useEffect(() => {
    if (measureKey) channelRef.current?.remeasure();
  }, [measureKey]);

  // Keyed by id, and re-checked once the page can describe its params.
  const calibrationId = calibration ? calibration.id : null;
  useEffect(() => {
    const request = latestCalibration.current;
    if (request?.id !== calibrationId) return;
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
  const setParams = useCallback(
    (next: P) => {
      latestParams.current = next;
      channelRef.current?.setParams(prepareParams(next));
    },
    [prepareParams],
  );

  const restoreView = useCallback((state: unknown) => channelRef.current?.restoreView(state), []);

  const pick = useCallback(
    async (x: number, y: number) => channelRef.current?.pick(x, y) ?? null,
    [],
  );
  return { containerRef, canvas, setParams, restoreView, pick };
}
