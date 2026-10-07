import { useCallback, useEffect, useRef, useState } from "react";
import { RenderHost } from "../render/host";
import type { RendererKind } from "../render/registry";
import type { HostEvent } from "../render/types";

type Channel = {
  setParams: (params: unknown) => void;
  resize: (width: number, height: number, ratio: number) => void;
  remeasure: () => void;
  dispose: () => void;
};

type Params<P> = {
  kind: RendererKind;
  /** Null while the page cannot describe the picture yet (e.g. size unknown). */
  params: P | null;
  width: number | null;
  height: number | null;
  onEvent?: (event: HostEvent) => void;
  /** Changing this asks the renderer to time the current level again. */
  measureKey?: number;
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
          dispose: () => host.dispose(),
        });
      });
    }

    return () => {
      disposed = true;
      channelRef.current?.dispose();
      channelRef.current = null;
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

  // For pages that change the picture faster than React should re-render,
  // such as a pan: posts straight to the renderer.
  const setParams = useCallback((next: P) => {
    latestParams.current = next;
    channelRef.current?.setParams(next);
  }, []);

  return { containerRef, canvas, setParams };
}
