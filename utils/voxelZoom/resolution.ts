/** Width of a framebuffer pixel's cone for the flight camera's fixed field of view.
 * Clearance gives its near floor in zoom-scaled camera units. Multiplying both
 * clearance and ray distance by three preserves projected detail across levels. */
export function flightResolution(clearance: number, width: number, height: number) {
  const pixelAngle = 1.16 / Math.max(1, Math.min(width, height));
  return { pixelAngle, nearFootprint: Math.max(0, clearance) * pixelAngle };
}
