/** Give the page its scroll gestures while the drawing is clipped or fully zoomed out. */
export function shouldZoomWheel(
  event: Pick<WheelEvent, "deltaY" | "ctrlKey">,
  surface: HTMLElement,
  atMinZoom: boolean,
) {
  if (event.deltaY === 0) return false;
  // Trackpad pinches are deliberate zoom gestures, even on a scrolled page.
  if (event.ctrlKey) return true;

  const rect = surface.getBoundingClientRect();
  const viewportHeight = surface.ownerDocument.defaultView?.innerHeight ?? 0;
  // Allow a pixel for fractional viewport dimensions and layout rounding.
  if (rect.top < -1 || rect.bottom > viewportHeight + 1) return false;

  return !(event.deltaY > 0 && atMinZoom);
}
