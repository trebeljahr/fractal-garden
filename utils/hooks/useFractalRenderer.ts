import { type Dispatch, type SetStateAction, useCallback, useEffect, useMemo, useRef } from "react";
import { useConstructionRegistration } from "../../components/FractalConstruction";
import { useZoomActivity } from "../../components/ZoomActivity";
import type { RendererKind } from "../render/registry";
import type { HostEvent } from "../render/types";
import { useAdaptiveGrowth } from "./useAdaptiveGrowth";
import { useRenderSurface } from "./useRenderSurface";

type GrowthConfig = { iterations: number };

type Params<C extends GrowthConfig, P> = {
  kind: RendererKind;
  /** Names this fractal's cached performance budget. */
  storageKey: string;
  config: C;
  setConfig: Dispatch<SetStateAction<C>>;
  /** What the renderer draws from; null until it can be described. */
  params: P | null;
  width: number | null;
  height: number | null;
  min?: number;
  max: number;
  stepDelay?: number;
  holdDelay?: number;
};

/**
 * Opens a complete fractal at a depth this machine handles. Construction
 * playback uses a separate renderer in the explanation. Attach
 * `containerRef` to the element that should hold the canvas.
 */
export function useFractalRenderer<C extends GrowthConfig, P>({
  kind,
  storageKey,
  config,
  setConfig,
  params,
  width,
  height,
  min = 0,
  max,
  stepDelay,
  holdDelay,
}: Params<C, P>) {
  const setIterations = useCallback(
    (iterations: number) => setConfig((old) => ({ ...old, iterations })),
    [setConfig],
  );

  const growth = useAdaptiveGrowth({
    storageKey,
    min,
    max,
    iterations: config.iterations,
    animate: false,
    setIterations,
    stepDelay,
    holdDelay,
  });

  const { active: zoomActive } = useZoomActivity();
  const wasZoomActive = useRef(false);
  useEffect(() => {
    if (wasZoomActive.current && !zoomActive) {
      // Return to the deepest level this machine can draw on this machine.
      setConfig((old) => ({ ...old, iterations: growth.cap }));
    }
    wasZoomActive.current = zoomActive;
  }, [zoomActive, growth.cap, setConfig]);

  const { onCost, onRendered, onCalibrated, calibrating, calibrationId } = growth;
  const onEvent = useCallback(
    (event: HostEvent) => {
      if (event.type === "rendered") onRendered(event.level);
      if (event.type === "cost") onCost(event.report);
      if (event.type === "calibrated") onCalibrated(event.reports);
      // A failed sweep must not leave the canvas empty.
      if (event.type === "error" && calibrating) onCalibrated([]);
    },
    [onCost, onRendered, onCalibrated, calibrating],
  );

  const calibration = useMemo(
    () => (calibrating && params ? { id: calibrationId, params, min, max } : null),
    [calibrating, calibrationId, params, min, max],
  );

  const surface = useRenderSurface({
    kind,
    // Nothing is drawn until calibration picks the level to open on.
    params: calibrating ? null : params,
    width,
    height,
    onEvent,
    measureKey: growth.measureKey,
    calibration,
  });

  const { setParams: postParams } = surface;
  const setParams = useCallback(
    (next: P) => {
      // Keep the canvas empty until calibration has picked the opening level.
      if (!calibrating) postParams(next);
    },
    [calibrating, postParams],
  );

  const construction = useMemo(
    () =>
      params && width && height && !calibrating
        ? { kind, params, width, height, min, max: growth.cap, stepDelay, identity: storageKey }
        : null,
    [kind, params, width, height, calibrating, min, growth.cap, stepDelay, storageKey],
  );
  useConstructionRegistration(construction);

  return {
    ...surface,
    setParams,
    cap: growth.cap,
  };
}
