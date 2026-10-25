import type { Vec3, VoxelPattern } from "./camera";

/** Tangent of half the field of view in the shorter screen dimension. */
export const FLIGHT_PROJECTION = 0.58;
export const MOSELY_EXTERIOR_PROJECTION = 0.24;

/** A long exterior lens opens smoothly to the navigation lens near the center.
 * Ratios of local lengths keep the transition independent of precision level. */
export function flightLens(pattern: VoxelPattern, bounds: { low: Vec3; high: Vec3 }) {
  if (!pattern.startsWith("mosely")) return FLIGHT_PROJECTION;
  const width = Math.max(...bounds.high.map((v, axis) => v - bounds.low[axis]));
  const radius = Math.hypot(...bounds.low.map((v, axis) => (v + bounds.high[axis]) / 2)) / width;
  // Spread the lens change over distance in logarithmic space. Magnification
  // still rises as a centered camera approaches; the lens never zooms backward.
  const t = Math.max(0, Math.min(1, Math.log(Math.max(0.4, radius) / 0.4) / Math.log(5)));
  const blend = t * t * (3 - 2 * t);
  return FLIGHT_PROJECTION + (MOSELY_EXTERIOR_PROJECTION - FLIGHT_PROJECTION) * blend;
}
