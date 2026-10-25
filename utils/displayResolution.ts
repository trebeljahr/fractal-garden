/** DPR can change without a CSS resize, e.g. when a window changes monitors. */
export function watchDisplayResolution(changed: () => void) {
  let query: MediaQueryList;
  let frame = 0;
  let ratio = 0;
  const update = () => {
    frame = 0;
    query?.removeEventListener("change", schedule);
    ratio = window.devicePixelRatio || 1;
    query = window.matchMedia(`(resolution: ${ratio}dppx)`);
    query.addEventListener("change", schedule);
    changed();
  };
  // Read the new density after the browser applies its display change.
  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(update);
  };
  const resized = () => {
    if (ratio !== (window.devicePixelRatio || 1)) schedule();
  };
  update();
  window.addEventListener("resize", resized);
  return () => {
    cancelAnimationFrame(frame);
    query.removeEventListener("change", schedule);
    window.removeEventListener("resize", resized);
  };
}
