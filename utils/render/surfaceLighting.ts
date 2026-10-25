// The light stays above and to the left of the viewer as the solid turns.
const LIGHT_LENGTH = Math.hypot(-0.65, 0.85, 0.65);
export const SURFACE_LIGHT = [-0.65, 0.85, 0.65].map((value) => value / LIGHT_LENGTH);
export const SURFACE_SHADE_STEPS = 96;

/** View-space relief shading for finite constructions, independent of zoom. */
export function surfaceBrightness(
  nx: number,
  ny: number,
  nz: number,
  depth: number,
  back: number,
  front: number,
) {
  const diffuse = Math.max(
    0,
    nx * SURFACE_LIGHT[0] + ny * SURFACE_LIGHT[1] + nz * SURFACE_LIGHT[2],
  );
  // Use the full solid's depth, including hidden faces, so culling cannot change the light.
  const near = front - back > 1e-6 ? Math.max(0, Math.min(1, (depth - back) / (front - back))) : 1;
  return Math.min(1, 0.32 + 0.82 * diffuse) * (0.55 + 0.45 * near);
}
