import { expand, interpret } from "./engine";
import { DEFAULT_SPEC, dimensionOf, type LSystemSpec } from "./spec";

// Helpers for giving the garden's L-system pages endless zoom: each page
// describes its curve as an explorer spec plus the frame it draws it in, so
// the zoom starts from exactly the picture the page shows.

// Where generation n of the spec lands on screen: the turtle starts at the
// origin with step 1, and a drawing point (x, y) with y up is drawn at
// (originX + scale * x, originY - scale * y) in CSS pixels.
export type ZoomFrame = { originX: number; originY: number; scale: number };

type Curve = {
  axiom: string;
  rules: Record<string, string>;
  // Degrees per "+", counterclockwise with y up (the turtle helpers' way).
  turn: number;
  // Starting heading in degrees, counterclockwise from +x.
  start?: number;
  draw?: string;
  color: string;
  background: string;
  lineWidth: number;
};

// The spec for a curve traced by utils/turtleCurve(s).ts. The explorer's
// turtle turns clockwise on "+" and measures the start clockwise from up.
export function turtleSpec({
  axiom,
  rules,
  turn,
  start = 0,
  draw = "FG",
  color,
  background,
  lineWidth,
}: Curve): LSystemSpec {
  const spec: LSystemSpec = {
    ...DEFAULT_SPEC,
    axiom,
    rules: Object.entries(rules).map(([symbol, replacement]) => ({ symbol, replacement })),
    angle: -turn,
    startAngle: 90 - start,
    drawSymbols: draw,
    moveSymbols: "",
    color,
    colorEnd: color,
    colorMode: "solid",
    background,
    lineWidth,
  };
  return { ...spec, dimension: dimensionOf(spec) };
}

// The frame of a curve scaled to fit the canvas with padding and centered on
// its bounds, as drawFittedCurve and fitBounds do. `minSpan` mirrors their
// guard against a flat curve.
export function fittedFrame(
  spec: LSystemSpec,
  generation: number,
  width: number,
  height: number,
  padding = 0.08,
  minSpan = 1e-9,
): ZoomFrame {
  const geometry = interpret(expand(spec, generation).sentence, spec);
  const spanX = Math.max(geometry.max[0] - geometry.min[0], minSpan);
  const spanY = Math.max(geometry.max[1] - geometry.min[1], minSpan);
  const scale = Math.min((width * (1 - 2 * padding)) / spanX, (height * (1 - 2 * padding)) / spanY);
  return {
    scale,
    originX: (width - spanX * scale) / 2 - geometry.min[0] * scale,
    originY: (height - spanY * scale) / 2 + geometry.max[1] * scale,
  };
}
