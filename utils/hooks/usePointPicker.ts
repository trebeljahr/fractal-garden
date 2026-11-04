import { type PointerEvent, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { isSidewaysSlide } from "../touchSlide";

/**
 * Handlers for a button that picks a point. A mouse tries spots by hovering and keeps one with a
 * click. Up-and-down swipes scroll the page; a tap or a sideways slide picks. Pair it with
 * `touch-action: pan-y pinch-zoom`.
 */
export function usePointPicker<Point, Target extends Element = HTMLButtonElement>({
  under,
  onChange,
  onHover,
  onRelease,
}: {
  under: (event: PointerEvent<Target>) => Point;
  onChange: (point: Point) => void;
  onHover?: (point: Point | null) => void;
  onRelease?: () => void;
}) {
  const ref = useRef<Target>(null);
  const pointer = useRef<{ id: number; x: number; y: number; picking: boolean } | null>(null);
  // Once a finger slides sideways it can go anywhere on the picture without scrolling the page.
  // React's own touch listeners are passive and can't stop a scroll.
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const holdPage = (event: TouchEvent) => {
      if (pointer.current?.picking && event.cancelable) event.preventDefault();
    };
    element.addEventListener("touchmove", holdPage as EventListener, { passive: false });
    return () => element.removeEventListener("touchmove", holdPage as EventListener);
  }, []);
  return {
    ref,
    onPointerDown: (event: PointerEvent<Target>) => {
      if (!event.isPrimary || event.button !== 0) return;
      const mouse = event.pointerType === "mouse";
      pointer.current = { id: event.pointerId, x: event.clientX, y: event.clientY, picking: mouse };
      event.currentTarget.setPointerCapture(event.pointerId);
      // A finger may be starting to scroll, so it picks only when it slides sideways or lifts.
      if (mouse) onChange(under(event));
    },
    onPointerMove: (event: PointerEvent<Target>) => {
      const press = pointer.current;
      if (press?.id === event.pointerId) {
        if (isSidewaysSlide(event.clientX - press.x, event.clientY - press.y)) press.picking = true;
        if (press.picking) onChange(under(event));
      }
      // React would otherwise commit after this frame paints, one frame behind the pointer.
      else if (onHover && event.pointerType !== "touch") flushSync(() => onHover(under(event)));
    },
    onPointerLeave: (event: PointerEvent<Target>) => {
      if (event.pointerType !== "touch" && pointer.current === null) onHover?.(null);
    },
    onPointerUp: (event: PointerEvent<Target>) => {
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
