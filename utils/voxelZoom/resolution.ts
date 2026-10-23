import { MAX_VOXEL_DEPTH } from "./camera";

// Numerical floor in the local precision scale. Flying toward a surface
// refines that scale independently of the selected travel and fog scale.
export const MIN_FLIGHT_DETAIL_DISTANCE = 0.02;
export function flightDetailDepth(navigationLevel: number, level = navigationLevel) {
  // At the maximum framebuffer budget, twelve extra subdivisions are already
  // below the minimum pixel cone. Do not build unreachable render levels.
  return Math.min(MAX_VOXEL_DEPTH, Math.ceil(Math.max(navigationLevel, level)) + 12);
}

/** Width of a framebuffer pixel's cone for the flight camera's field of view.
 * All lengths share camera units; precision-level changes preserve detail. */
export function flightResolution(
  clearance: number,
  width: number,
  height: number,
  level = 0,
  navigationLevel = level,
) {
  const pixelAngle = 1.16 / Math.max(1, Math.min(width, height));
  const minimumDistance = MIN_FLIGHT_DETAIL_DISTANCE * Math.min(1, 3 ** (level - navigationLevel));
  return { pixelAngle, nearFootprint: Math.max(minimumDistance, clearance) * pixelAngle };
}
