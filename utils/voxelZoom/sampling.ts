/** Nine subpixel rays, accumulated only while the camera is stationary.
 * The center is drawn first for immediate feedback. The full set is symmetric. */
export const FLIGHT_SAMPLE_OFFSETS: readonly (readonly [number, number])[] = [
  [0, 0],
  [-1 / 3, -1 / 3],
  [1 / 3, 1 / 3],
  [1 / 3, -1 / 3],
  [-1 / 3, 1 / 3],
  [0, -1 / 3],
  [0, 1 / 3],
  [-1 / 3, 0],
  [1 / 3, 0],
];
