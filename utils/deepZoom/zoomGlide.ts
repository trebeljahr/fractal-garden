export type ZoomAnchor = { x: number; y: number };

/** Most of a wheel notch is covered within about three of these. */
const WHEEL_TIME_MS = 80;
/** Pinches follow fingers, so they get less delay. */
const PINCH_TIME_MS = 30;
const STOP_BITS = 1e-4;
/** A long-delayed frame must not jump, which would undo the glide. */
const LONGEST_STEP_MS = 50;

/**
 * Wheel events arrive unevenly and can jump far. This turns them into a distance
 * to cover, and covers it in a smaller share each animation frame.
 */
export function createZoomGlide(
  /** Moves the camera, returning the zoom change that the limits allowed. */
  apply: (bits: number, anchor: ZoomAnchor) => number,
) {
  let remaining = 0;
  let anchor: ZoomAnchor = { x: 0, y: 0 };
  let time = WHEEL_TIME_MS;
  let frame = 0;
  let last: number | null = null;
  const step = (now: number) => {
    frame = 0;
    const elapsed = last === null ? 1000 / 60 : Math.min(LONGEST_STEP_MS, now - last);
    last = now;
    const share = 1 - Math.exp(-elapsed / time);
    const finishing = Math.abs(remaining) * (1 - share) < STOP_BITS;
    const bits = finishing ? remaining : remaining * share;
    const moved = apply(bits, anchor);
    // The zoom limit took the rest, so nothing is left to cover.
    remaining = Math.abs(moved) < Math.abs(bits) * 0.5 || finishing ? 0 : remaining - bits;
    if (remaining) frame = requestAnimationFrame(step);
    else last = null;
  };
  return {
    add(bits: number, nextAnchor: ZoomAnchor, pinch = false) {
      // Reversing direction should respond at once, not finish the old distance.
      if (remaining * bits < 0) remaining = 0;
      remaining += bits;
      anchor = nextAnchor;
      time = pinch ? PINCH_TIME_MS : WHEEL_TIME_MS;
      if (!frame) frame = requestAnimationFrame(step);
    },
    stop() {
      cancelAnimationFrame(frame);
      frame = 0;
      remaining = 0;
      last = null;
    },
  };
}
