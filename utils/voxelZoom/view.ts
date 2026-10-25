import type { FractalFrame } from "../fractalFrame";
import type { flightBasis, Vec3 } from "./camera";

/** Optical center uses bottom-up coordinates, matching fragment coordinates. */
export function flightProjection(width: number, height: number, frame?: FractalFrame | null) {
  const top = frame?.top ?? 0;
  const bottom = frame?.bottom ?? 0;
  const fitHeight = Math.max(1, height - top - bottom);
  return {
    centerX: width / 2,
    centerY: height - top - fitHeight / 2,
    side: Math.min(width, fitHeight),
  };
}

export type FlightScreenBounds = { x: number; y: number; width: number; height: number };

/** Conservative screen bounds of the root cube within the visible horizon.
 * A box crossing the camera plane keeps the full frame; perspective projection
 * is only bounded by its corners when every corner is in front of the camera. */
export function flightScreenBounds(
  bounds: { low: Vec3; high: Vec3 },
  basis: ReturnType<typeof flightBasis>,
  width: number,
  height: number,
  farDistance: number,
  frame?: FractalFrame | null,
): FlightScreenBounds | null {
  const low = bounds.low.map((v) => Math.max(v, -farDistance));
  const high = bounds.high.map((v) => Math.min(v, farDistance));
  if (low.some((v, axis) => v >= high[axis])) return null;
  const full = { x: 0, y: 0, width, height };
  const corners = [];
  for (let index = 0; index < 8; index++) {
    const point = low.map((v, axis) => (index & (1 << axis) ? high[axis] : v));
    const dot = (direction: Vec3) => point.reduce((sum, v, axis) => sum + v * direction[axis], 0);
    corners.push({ x: dot(basis.right), y: dot(basis.up), z: dot(basis.forward) });
  }
  if (corners.every((point) => point.z <= 0)) return null;
  if (corners.some((point) => point.z <= 0)) return full;
  const projection = flightProjection(width, height, frame);
  const scale = projection.side / 1.16;
  const x = corners.map((point) => projection.centerX + (scale * point.x) / point.z);
  const y = corners.map((point) => projection.centerY + (scale * point.y) / point.z);
  // Keep a pixel on either side for CPU/GPU rounding at the silhouette.
  const left = Math.max(0, Math.floor(Math.min(...x)) - 1);
  const bottom = Math.max(0, Math.floor(Math.min(...y)) - 1);
  const right = Math.min(width, Math.ceil(Math.max(...x)) + 1);
  const top = Math.min(height, Math.ceil(Math.max(...y)) + 1);
  return right > left && top > bottom
    ? { x: left, y: bottom, width: right - left, height: top - bottom }
    : null;
}
