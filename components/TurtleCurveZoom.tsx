import { type Dispatch, type SetStateAction, useCallback, useMemo } from "react";
import { fittedFrame, turtleSpec } from "../utils/lsystem/pageZoom";
import { EndlessZoom } from "./EndlessZoom";

type Config = {
  iterations: number;
  animateIterations: boolean;
  color: string;
  background: string;
  lineWidth: number;
};

type Props<C extends Config> = {
  axiom: string;
  rules: Record<string, string>;
  // Degrees per "+", counterclockwise with y up, and the starting heading.
  turn: number;
  start?: number;
  draw?: string;
  // How the page fits the curve: utils/turtleCurve.ts guards a flat curve with
  // a tiny span, utils/turtleCurves.ts with 1.
  minSpan: number;
  config: C;
  setConfig: Dispatch<SetStateAction<C>>;
  width: number | null;
  height: number | null;
};

const PADDING = 0.08;

// Endless zoom for the pages that trace a turtle curve and fit it to the
// canvas (the dragon curve, Gosper curve, Koch islands and the like).
export function TurtleCurveZoom<C extends Config>({
  axiom,
  rules,
  turn,
  start = 0,
  draw = "FG",
  minSpan,
  config,
  setConfig,
  width,
  height,
}: Props<C>) {
  const rulesKey = JSON.stringify(rules);
  // biome-ignore lint/correctness/useExhaustiveDependencies: rules are compared by value
  const spec = useMemo(
    () =>
      turtleSpec({
        axiom,
        rules,
        turn,
        start,
        draw,
        color: config.color,
        background: config.background,
        lineWidth: config.lineWidth,
      }),
    [axiom, rulesKey, turn, start, draw, config.color, config.background, config.lineWidth],
  );
  const frame = useCallback(
    () => fittedFrame(spec, config.iterations, width ?? 0, height ?? 0, PADDING, minSpan),
    [spec, config.iterations, width, height, minSpan],
  );
  // Growing further while zoomed in would pull the picture away.
  const onActiveChange = useCallback(
    (active: boolean) => {
      if (active) setConfig((old) => ({ ...old, animateIterations: false }));
    },
    [setConfig],
  );

  return (
    <EndlessZoom
      spec={spec}
      generation={config.iterations}
      frame={frame}
      width={width}
      height={height}
      onActiveChange={onActiveChange}
    />
  );
}
