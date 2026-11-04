// Safari reports a small move before it starts a scroll, so a finger must clearly go sideways.
const SIDEWAYS_SLIDE_PX = 10;

/** Whether a finger's travel so far is a sideways slide, not the start of a page scroll. */
export function isSidewaysSlide(dx: number, dy: number) {
  const sideways = Math.abs(dx);
  return sideways > SIDEWAYS_SLIDE_PX && sideways > Math.abs(dy);
}
