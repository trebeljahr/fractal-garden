import type { FractalFrame } from "../fractalFrame";
import { FOCAL_SCALE } from "./camera";

/** Fit the opening shape without restricting the drawable surface. */
export function spatialProjection(width: number, height: number, frame?: FractalFrame | null) {
  const top = frame?.top ?? 0;
  const bottom = frame?.bottom ?? 0;
  const fitHeight = Math.max(1, height - top - bottom);
  return {
    centerX: width / 2,
    centerY: top + fitHeight / 2,
    focal: FOCAL_SCALE * Math.min(width, fitHeight),
  };
}
