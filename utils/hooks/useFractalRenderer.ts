import { type Dispatch, type SetStateAction, useCallback, useMemo } from "react";
import { useConstructionRegistration } from "../../components/FractalConstruction";
import type { ConstructionLead } from "../constructionLead";
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
  constructionParams?: (config: C) => P;
  constructionMax?: (config: C) => number;
  width: number | null;
  height: number | null;
  min?: number;
  max: number;
  stepDelay?: number;
  holdDelay?: number;
  /** The control the article leans on, shown in the construction figure. */
  constructionLead?: ConstructionLead;
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
  constructionParams,
  constructionMax,
  width,
  height,
  min = 0,
  max,
  stepDelay,
  holdDelay,
  constructionLead,
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
        ? {
            kind,
            params,
            config,
            width,
            height,
            min,
            max: growth.cap,
            stepDelay,
            identity: storageKey,
            lead: constructionLead,
            maxForConfig: constructionMax
              ? (settings: Record<string, unknown>) => constructionMax(settings as C)
              : undefined,
            makeParams: (settings: Record<string, unknown>) =>
              constructionParams ? constructionParams(settings as C) : { ...params, ...settings },
          }
        : null,
    [
      kind,
      params,
      config,
      constructionParams,
      constructionMax,
      width,
      height,
      calibrating,
      min,
      growth.cap,
      stepDelay,
      storageKey,
      constructionLead,
    ],
  );
  useConstructionRegistration(construction);

  return {
    ...surface,
    setParams,
    cap: growth.cap,
    ready: !calibrating,
  };
}
