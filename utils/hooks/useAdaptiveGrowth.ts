import { useCallback, useEffect, useRef, useState } from "react";
import {
  type CostReport,
  computeCap,
  type LevelSamples,
  loadFromReport,
  readSamples,
  writeSamples,
} from "../perf/iterationBudget";

type Params = {
  /** Cache key for this fractal (and variant) on this machine. */
  storageKey: string;
  min: number;
  /** Hard maximum: the slider can still reach it by hand. */
  max: number;
  iterations: number;
  animate: boolean;
  setIterations: (iterations: number) => void;
  /** Pause after a step, before growing to the next level. */
  stepDelay?: number;
  /** Pause on the top level before wrapping back to `min`. */
  holdDelay?: number;
};

/**
 * Drives the "animate growth" loop for an iterated fractal, capped at the
 * deepest level this machine can render while staying snappy.
 *
 * The page reports every finished render through `onRendered` and its cost
 * through `onCost`. The loop waits for the current level to be drawn before
 * it schedules the next step, so slow levels never pile up.
 */
export function useAdaptiveGrowth({
  storageKey,
  min,
  max,
  iterations,
  animate,
  setIterations,
  stepDelay = 950,
  holdDelay = 1800,
}: Params) {
  const [samples, setSamples] = useState<LevelSamples>({});
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [renderedLevel, setRenderedLevel] = useState<number | null>(null);
  const [measureKey, setMeasureKey] = useState(0);
  // Bumped whenever a fractal has no cached budget and must be calibrated.
  const [calibrationId, setCalibrationId] = useState(0);
  const [calibrating, setCalibrating] = useState(false);
  const droppedHiddenSample = useRef(false);
  const setIterationsRef = useRef(setIterations);
  setIterationsRef.current = setIterations;
  const animateRef = useRef(animate);
  animateRef.current = animate;

  const cap = computeCap(samples, min, max);

  useEffect(() => {
    const stored = readSamples(storageKey);
    setSamples(stored);
    setLoadedKey(storageKey);
    setRenderedLevel(null);

    // Open on the deepest level this machine handles: the one found last
    // time, or, on a first visit, the one a calibration sweep finds.
    if (Object.keys(stored).length > 0) {
      setCalibrating(false);
      setIterationsRef.current(computeCap(stored, min, max));
    } else {
      setCalibrating(true);
      setCalibrationId((id) => id + 1);
    }
  }, [storageKey, min, max]);

  const onCost = useCallback(
    (report: CostReport) => {
      // Background tabs are throttled, so their timings mean nothing. Measure
      // again once the tab is visible, or the loop would wait forever for them.
      if (typeof document !== "undefined" && document.hidden) {
        droppedHiddenSample.current = true;
        return;
      }
      setSamples((old) => {
        const next = {
          ...old,
          [report.level]: { load: loadFromReport(report), work: Math.max(1, report.work) },
        };
        writeSamples(storageKey, next);
        return next;
      });
    },
    [storageKey],
  );

  const onRendered = useCallback((level: number) => setRenderedLevel(level), []);

  const onCalibrated = useCallback(
    (reports: CostReport[]) => {
      setSamples((old) => {
        const next = { ...old };
        for (const report of reports) {
          next[report.level] = { load: loadFromReport(report), work: Math.max(1, report.work) };
        }
        if (reports.length > 0) writeSamples(storageKey, next);
        setIterationsRef.current(computeCap(next, min, max));
        return next;
      });
      setCalibrating(false);
    },
    [storageKey, min, max],
  );

  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden || !droppedHiddenSample.current) return;
      droppedHiddenSample.current = false;
      setMeasureKey((key) => key + 1);
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  const ready = loadedKey === storageKey && !calibrating;
  const waitingForRender = renderedLevel !== iterations;

  useEffect(() => {
    if (!animate || !ready || waitingForRender) return;

    const atTop = iterations >= cap;
    const id = window.setTimeout(
      () => setIterationsRef.current(atTop ? min : iterations + 1),
      atTop ? holdDelay : stepDelay,
    );
    return () => window.clearTimeout(id);
  }, [animate, ready, waitingForRender, iterations, cap, min, stepDelay, holdDelay]);

  return {
    cap,
    onCost,
    onRendered,
    measureKey,
    /** True until the first-visit calibration has found where to start. */
    calibrating: calibrating || loadedKey !== storageKey,
    calibrationId,
    onCalibrated,
  };
}

/** Times a synchronous main-thread render, for pages that draw without a worker. */
export function timeRender(draw: () => void) {
  const start = performance.now();
  draw();
  return performance.now() - start;
}
