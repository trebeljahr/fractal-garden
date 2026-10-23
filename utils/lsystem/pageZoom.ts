import { expand, interpret } from "./engine";
import { DEFAULT_SPEC, dimensionOf, type LSystemSpec } from "./spec";

// Helpers for giving the garden's L-system pages endless zoom: each page
// describes its curve as an explorer spec plus the frame it draws it in, so
// the zoom starts from exactly the picture the page shows.

// Where generation n of the spec lands on screen: the turtle starts at the
// origin with step 1, and a drawing point (x, y) with y up is drawn at
// (originX + scale * x, originY - scale * y) in CSS pixels.
export type ZoomFrame = { originX: number; originY: number; scale: number };

// Keep the scene center independent of viewport pixels. Rebuilding it from a
// resized screen frame introduces rounding that becomes visible at deep zoom.
export type CenteredZoomFrame = { centerX: number; centerY: number; scale: number };

export function centerZoomFrame(
  frame: ZoomFrame,
  width: number,
  height: number,
): CenteredZoomFrame {
  return {
    centerX: (width / 2 - frame.originX) / frame.scale,
    centerY: (frame.originY - height / 2) / frame.scale,
    scale: frame.scale,
  };
}

export function projectZoomFrame(
  frame: CenteredZoomFrame,
  width: number,
  height: number,
): ZoomFrame {
  return {
    originX: width / 2 - frame.centerX * frame.scale,
    originY: height / 2 + frame.centerY * frame.scale,
    scale: frame.scale,
  };
}

export function restoreZoomFrame(
  frame: ZoomFrame,
  savedWidth: number,
  savedHeight: number,
  width: number,
  height: number,
  center?: { centerX: number; centerY: number },
): CenteredZoomFrame {
  const { centerX, centerY } = center ?? centerZoomFrame(frame, savedWidth, savedHeight);
  return {
    centerX,
    centerY,
    scale: frame.scale * (Math.min(width, height) / Math.min(savedWidth, savedHeight)),
  };
}

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
