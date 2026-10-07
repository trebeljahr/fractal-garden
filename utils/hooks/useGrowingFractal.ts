import { type Dispatch, type SetStateAction, useCallback } from "react";
import type { RendererKind } from "../render/registry";
import type { HostEvent } from "../render/types";
import { useAdaptiveGrowth } from "./useAdaptiveGrowth";
import { useRenderSurface } from "./useRenderSurface";

type GrowthConfig = { iterations: number; animateIterations: boolean };

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
 * Worker-rendered fractal with an adaptive "animate growth" loop: the usual
 * pairing of useRenderSurface and useAdaptiveGrowth for one page. Attach
 * `containerRef` to the element that should hold the canvas.
 */
export function useGrowingFractal<C extends GrowthConfig, P>({
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
    animate: config.animateIterations,
    setIterations,
    stepDelay,
    holdDelay,
  });

  const { onCost, onRendered } = growth;
  const onEvent = useCallback(
    (event: HostEvent) => {
      if (event.type === "rendered") onRendered(event.level);
      if (event.type === "cost") onCost(event.report);
    },
    [onCost, onRendered],
  );

  const surface = useRenderSurface({
    kind,
    params,
    width,
    height,
    onEvent,
    measureKey: growth.measureKey,
  });

  return {
    ...surface,
    cap: growth.cap,
    /** Label for the animate toggle that names the cap when it is below the maximum. */
    animateLabel: growth.cap < max ? `Animate growth (to ${growth.cap})` : undefined,
  };
}
