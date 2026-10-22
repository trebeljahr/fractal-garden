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

// A trackpad's momentum belongs to the mode in which the gesture started.
// Require a quiet gap before handing the wheel from the page to the drawing
// (or back), so one gesture cannot accidentally do both.
const MODE_PAUSE_MS = 300;

export function createZoomWheelGuard(surface: HTMLElement) {
  let mode: boolean | null = null;
  let lastWheelTime = -Infinity;
  const document = surface.ownerDocument;

  // Page scrolling can start over the description, before the canvas moves
  // beneath the pointer. Observe those events without interfering with them.
  const observePageWheel = (event: WheelEvent) => {
    if (event.deltaY === 0 || event.ctrlKey || surface.contains(event.target as Node)) return;
    mode = false;
    lastWheelTime = event.timeStamp;
  };
  document.addEventListener("wheel", observePageWheel, { capture: true, passive: true });

  return {
    shouldZoom(event: WheelEvent, atMinZoom: boolean) {
      if (event.deltaY === 0) return false;
      // A pinch explicitly asks for zoom and does not inherit scroll momentum.
      if (event.ctrlKey) {
        mode = null;
        lastWheelTime = -Infinity;
        return true;
      }
      const zoom = shouldZoomWheel(event, surface, atMinZoom);
      const continuing = event.timeStamp - lastWheelTime < MODE_PAUSE_MS;
      lastWheelTime = event.timeStamp;
      if (mode !== null && mode !== zoom && continuing) {
        event.preventDefault();
        return false;
      }
      mode = zoom;
      return zoom;
    },
    dispose() {
      document.removeEventListener("wheel", observePageWheel, true);
    },
  };
}
