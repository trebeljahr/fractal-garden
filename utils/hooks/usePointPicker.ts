import { type PointerEvent, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";

// Safari reports a small move before it starts a scroll, so a finger must clearly go sideways.
const SIDEWAYS_SLIDE_PX = 10;

/**
 * Handlers for a button that picks a point. A mouse tries spots by hovering and keeps one with a
 * click. Up-and-down swipes scroll the page; a tap or a sideways slide picks. Pair it with
 * `touch-action: pan-y pinch-zoom`.
 */
export function usePointPicker<Point>({
  under,
  onChange,
  onHover,
  onRelease,
}: {
  under: (event: PointerEvent<HTMLButtonElement>) => Point;
  onChange: (point: Point) => void;
  onHover?: (point: Point | null) => void;
  onRelease?: () => void;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const pointer = useRef<{ id: number; x: number; y: number; picking: boolean } | null>(null);
  // Once a finger slides sideways it can go anywhere on the picture without scrolling the page.
  // React's own touch listeners are passive and can't stop a scroll.
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const holdPage = (event: TouchEvent) => {
      if (pointer.current?.picking && event.cancelable) event.preventDefault();
    };
    element.addEventListener("touchmove", holdPage, { passive: false });
    return () => element.removeEventListener("touchmove", holdPage);
  }, []);
  return {
    ref,
    onPointerDown: (event: PointerEvent<HTMLButtonElement>) => {
      if (!event.isPrimary || event.button !== 0) return;
      const mouse = event.pointerType === "mouse";
      pointer.current = { id: event.pointerId, x: event.clientX, y: event.clientY, picking: mouse };
      event.currentTarget.setPointerCapture(event.pointerId);
      // A finger may be starting to scroll, so it picks only when it slides sideways or lifts.
      if (mouse) onChange(under(event));
    },
    onPointerMove: (event: PointerEvent<HTMLButtonElement>) => {
      const press = pointer.current;
      if (press?.id === event.pointerId) {
        const sideways = Math.abs(event.clientX - press.x);
        if (sideways > SIDEWAYS_SLIDE_PX && sideways > Math.abs(event.clientY - press.y))
          press.picking = true;
        if (press.picking) onChange(under(event));
      }
      // React would otherwise commit after this frame paints, one frame behind the pointer.
      else if (onHover && event.pointerType !== "touch") flushSync(() => onHover(under(event)));
    },
    onPointerLeave: (event: PointerEvent<HTMLButtonElement>) => {
      if (event.pointerType !== "touch" && pointer.current === null) onHover?.(null);
    },
    onPointerUp: (event: PointerEvent<HTMLButtonElement>) => {
      if (pointer.current?.id !== event.pointerId) return;
      onChange(under(event));
      pointer.current = null;
      event.currentTarget.releasePointerCapture(event.pointerId);
      onRelease?.();
    },
    onPointerCancel: () => {
      pointer.current = null;
    },
    onLostPointerCapture: () => {
      pointer.current = null;
    },
  };
}

// A pointer over a picture tries a spot out. Leaving brings back the spot that was kept.
export function useTriedPoint<Point>(first: Point) {
  const [kept, setKept] = useState(first);
  const [tried, setTried] = useState<Point | null>(null);
  const keep = (point: Point) => {
    setKept(point);
    setTried(null);
  };
  return { value: tried ?? kept, kept, tried, keep, tryOut: setTried };
}
