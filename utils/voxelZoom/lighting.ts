import type { Vec3 } from "./camera";

/** Distance from the eye to the root box. Turning cannot move this reference. */
export function flightReliefFront(bounds: { low: Vec3; high: Vec3 }) {
  return Math.hypot(...bounds.low.map((v, axis) => Math.max(v, -bounds.high[axis], 0)));
}
