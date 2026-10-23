import { finite, isRecord } from "./explorerShare";
import type { Context2D } from "./render/types";

// Offsets use the shorter canvas side, so resizing keeps the scene center.
export type CanvasViewport = { x: number; y: number; zoom: number };
export const INITIAL_CANVAS_VIEW: CanvasViewport = { x: 0, y: 0, zoom: 1 };
export const MAX_CANVAS_ZOOM = 64;

export function restoreCanvasViewport(value: unknown): CanvasViewport {
  if (
    !isRecord(value) ||
    !finite(value.x, -1e6, 1e6) ||
    !finite(value.y, -1e6, 1e6) ||
    !finite(value.zoom, 1, MAX_CANVAS_ZOOM)
  )
    return INITIAL_CANVAS_VIEW;
  return { x: value.x, y: value.y, zoom: value.zoom };
}

export function moveCanvasViewport(
  view: CanvasViewport,
  width: number,
  height: number,
  factor: number,
  x: number,
  y: number,
  dx = 0,
  dy = 0,
): CanvasViewport {
  const zoom = Math.max(1, Math.min(MAX_CANVAS_ZOOM, view.zoom * factor));
  if (zoom === 1) return INITIAL_CANVAS_VIEW;
  const side = Math.max(1, Math.min(width, height));
  const anchorX = (x - width / 2) / side;
  const anchorY = (y - height / 2) / side;
  return {
    x: view.x + anchorX / view.zoom - (anchorX + dx / side) / zoom,
    y: view.y + anchorY / view.zoom - (anchorY + dy / side) / zoom,
    zoom,
  };
}

// Call after clearing the full background, before drawing scene geometry.
export function applyCanvasViewport(
  ctx: Context2D,
  width: number,
  height: number,
  view: CanvasViewport = INITIAL_CANVAS_VIEW,
) {
  const side = Math.min(width, height);
  ctx.translate(width / 2, height / 2);
  ctx.scale(view.zoom, view.zoom);
  ctx.translate(-width / 2 - view.x * side, -height / 2 - view.y * side);
}
