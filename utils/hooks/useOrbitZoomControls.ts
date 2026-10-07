import { type Dispatch, type SetStateAction, useEffect } from "react";
import { constrain } from "../ctxHelpers";
import { dragRotation, IDENTITY, type Orientation } from "../orientation";

type OrbitZoomConfig = {
  cameraDistance: number;
  autoRotate?: boolean;
  /** Rotation added by dragging, in view space. */
  grab?: Orientation;
};

type Params<T extends OrbitZoomConfig> = {
  canvas: HTMLCanvasElement | null;
  setConfig: Dispatch<SetStateAction<T>>;
  minDistance: number;
  maxDistance: number;
};

// Dragging across the shorter side of the canvas turns the object half a turn.
const RADIANS_PER_SHORT_SIDE = Math.PI;

/**
 * Drag turns the object as if it were held under the cursor: the near side
 * follows the pointer from whatever pose it is in. The wheel dollies.
 */
export function useOrbitZoomControls<T extends OrbitZoomConfig>({
  canvas,
  setConfig,
  minDistance,
  maxDistance,
}: Params<T>) {
  useEffect(() => {
    if (!canvas) return;

    let last: { clientX: number; clientY: number } | null = null;
    canvas.style.cursor = "grab";

    const handleMouseDown = (event: MouseEvent) => {
      if (event.button !== 0) return;
      last = { clientX: event.clientX, clientY: event.clientY };
      canvas.style.cursor = "grabbing";
    };

    const handleMouseMove = (event: MouseEvent) => {
      if (!last) return;

      const rect = canvas.getBoundingClientRect();
      const dx = event.clientX - last.clientX;
      const dy = event.clientY - last.clientY;
      last = { clientX: event.clientX, clientY: event.clientY };
      const angle =
        (Math.hypot(dx, dy) / Math.max(Math.min(rect.width, rect.height), 1)) *
        RADIANS_PER_SHORT_SIDE;

      setConfig((old) => ({
        ...old,
        autoRotate: typeof old.autoRotate === "boolean" ? false : old.autoRotate,
        grab: dragRotation(old.grab ?? IDENTITY, dx, dy, angle),
      }));
    };

    const handleMouseUp = () => {
      last = null;
      canvas.style.cursor = "grab";
    };

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();

      setConfig((old) => ({
        ...old,
        autoRotate: typeof old.autoRotate === "boolean" ? false : old.autoRotate,
        cameraDistance: constrain(
          old.cameraDistance * (event.deltaY > 0 ? 1.08 : 0.92),
          minDistance,
          maxDistance,
        ),
      }));
    };

    canvas.addEventListener("mousedown", handleMouseDown);
    canvas.addEventListener("mouseleave", handleMouseUp);
    canvas.addEventListener("wheel", handleWheel, { passive: false });
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("blur", handleMouseUp);

    return () => {
      canvas.removeEventListener("mousedown", handleMouseDown);
      canvas.removeEventListener("mouseleave", handleMouseUp);
      canvas.removeEventListener("wheel", handleWheel);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("blur", handleMouseUp);
    };
  }, [canvas, maxDistance, minDistance, setConfig]);
}
