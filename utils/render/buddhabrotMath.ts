import { type CanvasViewport, INITIAL_CANVAS_VIEW } from "../canvasViewport";
import type { FractalFrame } from "../fractalFrame";
import type { BuddhabrotParams } from "./buddhabrot";

export function normalizeBuddhabrotParams(params: BuddhabrotParams): BuddhabrotParams {
  const integer = (value: number, fallback: number, min: number, max: number) =>
    Math.max(min, Math.min(max, Math.round(Number.isFinite(value) ? value : fallback)));
  const maxIterations = integer(params.maxIterations, 20, 1, 20000);
  return {
    ...params,
    maxIterations,
    minOrbitLength: integer(params.minOrbitLength, 0, 0, maxIterations),
    samplesPerFrame: integer(params.samplesPerFrame, 16384, 50, 131072),
    exposure: Number.isFinite(params.exposure) ? Math.max(0.1, Math.min(3, params.exposure)) : 0.9,
  };
}

/** Camera-independent sampling domain. Any orbit entering |z| <= 2 starts here. */
export const BUDDHABROT_SAMPLE_MIN = -2;
export const BUDDHABROT_SAMPLE_SIZE = 4;

/** Upright projection: horizontal = imaginary, vertical = negative real. */
export function getBuddhabrotViewport(
  width: number,
  height: number,
  view: CanvasViewport = INITIAL_CANVAS_VIEW,
  framing?: FractalFrame,
) {
  // Use the full canvas's shorter side for the same anchor math as useCanvasViewport.
  const side = Math.max(1, Math.min(width, height));
  const fitHeight = Math.max(1, height - (framing?.top ?? 0) - (framing?.bottom ?? 0));
  const units = Math.max(3 / Math.max(1, width), 2 / fitHeight);
  const zoom = Math.max(1, view.zoom);
  const centerX = view.x * side * units;
  const framingOffset = (((framing?.top ?? 0) - (framing?.bottom ?? 0)) * units) / 2;
  const centerY = 0.5 + framingOffset - view.y * side * units;
  return {
    minX: centerX - (width * units) / (2 * zoom),
    maxX: centerX + (width * units) / (2 * zoom),
    minY: centerY - (height * units) / (2 * zoom),
    maxY: centerY + (height * units) / (2 * zoom),
  };
}

export function buddhabrotOrbitKey(params: BuddhabrotParams) {
  return `${params.maxIterations}:${params.minOrbitLength}`;
}

export function isInsideCardioidOrBulb(cx: number, cy: number) {
  const q = (cx - 0.25) ** 2 + cy * cy;
  return q * (q + cx - 0.25) <= 0.25 * cy * cy || (cx + 1) ** 2 + cy * cy <= 0.0625;
}
