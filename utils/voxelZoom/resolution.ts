import { MAX_VOXEL_DEPTH } from "./camera";

// Numerical floor in the local precision scale. Flying toward a surface
// refines that scale independently of the selected travel and fog scale.
export const MIN_FLIGHT_DETAIL_DISTANCE = 0.02;
// Refine down to half a display pixel when the framebuffer can sample it.
export const FLIGHT_DETAIL_PIXELS = 0.5;

export function flightRenderSize(
  width: number,
  height: number,
  ratio: number,
  pixelBudget: number,
) {
  const scale = Math.min(ratio, 2, Math.sqrt(pixelBudget / Math.max(1, width * height)));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}
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
  displayWidth = width,
  displayHeight = height,
) {
  const pixelAngle = 1.16 / Math.max(1, Math.min(width, height));
  const minimumDistance = MIN_FLIGHT_DETAIL_DISTANCE * Math.min(1, 3 ** (level - navigationLevel));
  const displayScale =
    Math.max(1, Math.min(width, height)) / Math.max(1, Math.min(displayWidth, displayHeight));
  return {
    pixelAngle,
    nearFootprint: Math.max(minimumDistance, clearance) * pixelAngle,
    // A reduced flight framebuffer cannot resolve the display's finer holes.
    // Keep a cell at least one framebuffer pixel wide during reduced resolution.
    detailScale: Math.max(1, FLIGHT_DETAIL_PIXELS * displayScale),
  };
}
