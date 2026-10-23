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
const MODE_PAUSE_MS = 120;

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

/** Signed change in log scale; trackpad pinches report much smaller wheel deltas. */
export function zoomWheelDelta(event: WheelEvent, surface: HTMLElement) {
  const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? surface.clientHeight : 1;
  return event.deltaY * unit * (event.ctrlKey ? 0.01 : 0.0015);
}

/** Keep browser pinch zoom inside this viewer, including WebKit's native gestures. */
export function listenForZoomWheel(surface: HTMLElement, onWheel: (event: WheelEvent) => void) {
  let gestureScale: number | null = null;
  const wheel = (event: WheelEvent) => {
    if (event.ctrlKey) {
      // Even a zero-delta pinch belongs to the drawing, including at its zoom limit.
      event.preventDefault();
      // Some browsers expose both forms of the same pinch.
      if (gestureScale !== null) return;
    }
    onWheel(event);
  };
  const scaleOf = (event: Event) => {
    const { scale } = event as Event & { scale: number };
    return Number.isFinite(scale) && scale > 0 ? scale : null;
  };
  const start = (event: Event) => {
    event.preventDefault();
    gestureScale = scaleOf(event) ?? 1;
  };
  const change = (event: Event) => {
    event.preventDefault();
    const scale = scaleOf(event);
    if (scale === null) return;
    const factor = scale / (gestureScale ?? 1);
    gestureScale = scale;
    if (factor === 1) return;
    const { clientX, clientY } = event as Event & { clientX: number; clientY: number };
    const rect = surface.getBoundingClientRect();
    // Reuse each renderer's zoom bounds and anchor math. This event is passed
    // directly to the handler, so it cannot trigger a second browser gesture.
    onWheel(
      new WheelEvent("wheel", {
        ctrlKey: true,
        deltaY: -Math.log(factor) / 0.01,
        clientX: Number.isFinite(clientX) ? clientX : rect.left + rect.width / 2,
        clientY: Number.isFinite(clientY) ? clientY : rect.top + rect.height / 2,
        cancelable: true,
      }),
    );
  };
  const end = (event: Event) => {
    event.preventDefault();
    gestureScale = null;
  };
  const reset = () => {
    gestureScale = null;
  };
  const view = surface.ownerDocument.defaultView;
  surface.addEventListener("wheel", wheel, { passive: false });
  surface.addEventListener("gesturestart", start, { passive: false });
  surface.addEventListener("gesturechange", change, { passive: false });
  surface.addEventListener("gestureend", end, { passive: false });
  view?.addEventListener("blur", reset);
  return () => {
    surface.removeEventListener("wheel", wheel);
    surface.removeEventListener("gesturestart", start);
    surface.removeEventListener("gesturechange", change);
    surface.removeEventListener("gestureend", end);
    view?.removeEventListener("blur", reset);
  };
}
