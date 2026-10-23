import { LOCAL_COORDINATE_LIMIT, MAX_VOXEL_DEPTH } from "./camera";

// Approaching a wall must not create finer detail than the selected zoom can
// resolve. Explicit wheel/pinch zoom still moves this floor continuously.
export const MIN_FLIGHT_DETAIL_DISTANCE = 0.02;
export function flightDetailDepth(viewLevel: number) {
  // At the maximum framebuffer budget, twelve extra subdivisions are already
  // below the minimum pixel cone. Do not build unreachable render levels.
  return Math.min(MAX_VOXEL_DEPTH, Math.ceil(viewLevel) + 12);
}

/** Width of a framebuffer pixel's cone for the flight camera's field of view.
 * All lengths share camera units; precision-level changes preserve detail. */
export function flightResolution(
  clearance: number,
  width: number,
  height: number,
  level = 0,
  viewLevel = level,
) {
  const pixelAngle = 1.16 / Math.max(1, Math.min(width, height));
  const minimumDistance = Math.min(
    LOCAL_COORDINATE_LIMIT,
    MIN_FLIGHT_DETAIL_DISTANCE * 3 ** (level - viewLevel),
  );
  return { pixelAngle, nearFootprint: Math.max(minimumDistance, clearance) * pixelAngle };
}
