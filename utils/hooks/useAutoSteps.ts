import { useEffect, useRef } from "react";
import { AUTO_STEPS_MAX_DEPTH_BITS, type StepLimitProbe } from "../deepZoom/autoSteps";
import type { DeepViewport } from "../deepZoom/math";

const SETTLE_MS = 250;
/** A long zoom still needs new limits, or the picture turns black before it stops. */
const MAX_WAIT_MS = 600;

type Options = {
  enabled: boolean;
  viewport: DeepViewport;
  width: number | null;
  height: number | null;
  colorDensity: number;
  onLimit: (limit: number) => void;
};

/** Measures a step limit in a worker whenever the view changes, keeping only the latest request. */
export function useAutoSteps({ enabled, viewport, width, height, colorDensity, onLimit }: Options) {
  const latest = useRef({ viewport, width, height, colorDensity, onLimit });
  latest.current = { viewport, width, height, colorDensity, onLimit };
  const scheduleRef = useRef<() => void>(() => {});

  useEffect(() => {
    if (!enabled) return;
    const worker = new Worker(new URL("../../workers/autoSteps.worker.ts", import.meta.url));
    let timer: ReturnType<typeof setTimeout> | null = null;
    let waitingSince = 0;
    let busy = false;
    let again = false;
    let lastId = 0;

    const send = () => {
      timer = null;
      const { viewport: view, width: w, height: h, colorDensity: density } = latest.current;
      if (!w || !h || -view.logZoom > AUTO_STEPS_MAX_DEPTH_BITS) return;
      if (busy) {
        again = true;
        return;
      }
      busy = true;
      const ratio = window.devicePixelRatio || 1;
      const probe: StepLimitProbe = {
        view,
        width: Math.round(w * ratio),
        height: Math.round(h * ratio),
        colorDensity: density,
      };
      worker.postMessage({ id: ++lastId, ...probe });
    };

    worker.onmessage = (event) => {
      busy = false;
      if (event.data.id === lastId) latest.current.onLimit(event.data.limit);
      if (again) {
        again = false;
        send();
      }
    };

    scheduleRef.current = () => {
      const now = performance.now();
      if (timer) clearTimeout(timer);
      else waitingSince = now;
      timer = setTimeout(send, Math.min(SETTLE_MS, Math.max(0, waitingSince + MAX_WAIT_MS - now)));
    };
    scheduleRef.current();

    return () => {
      if (timer) clearTimeout(timer);
      scheduleRef.current = () => {};
      worker.terminate();
    };
  }, [enabled]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: each of these changes the measurement
  useEffect(() => {
    scheduleRef.current();
  }, [viewport, width, height, colorDensity]);
}
