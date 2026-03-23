import { Dispatch, SetStateAction, useEffect } from "react";
import { constrain } from "../ctxHelpers";

type OrbitZoomConfig = {
  rotationX: number;
  rotationY: number;
  cameraDistance: number;
  autoRotate?: boolean;
};

type DragState<T extends OrbitZoomConfig> = {
  clientX: number;
  clientY: number;
  config: T;
};

type Params<T extends OrbitZoomConfig> = {
  canvas: HTMLCanvasElement | null;
  setConfig: Dispatch<SetStateAction<T>>;
  minDistance: number;
  maxDistance: number;
  rotationLimit?: number;
};

export function useOrbitZoomControls<T extends OrbitZoomConfig>({
  canvas,
  setConfig,
  minDistance,
  maxDistance,
  rotationLimit = 85,
}: Params<T>) {
  useEffect(() => {
    if (!canvas) return;

    let dragState: DragState<T> | null = null;
    canvas.style.cursor = "grab";

    const handleMouseDown = (event: MouseEvent) => {
      if (event.button !== 0) return;

      setConfig((old) => {
        dragState = {
          clientX: event.clientX,
          clientY: event.clientY,
          config: old,
        };
        return old;
      });
      canvas.style.cursor = "grabbing";
    };

    const handleMouseMove = (event: MouseEvent) => {
      const currentDragState = dragState;
      if (!currentDragState) return;

      const rect = canvas.getBoundingClientRect();
      const deltaX = (event.clientX - currentDragState.clientX) / rect.width;
      const deltaY = (event.clientY - currentDragState.clientY) / rect.height;

      setConfig((old) => ({
        ...old,
        autoRotate:
          typeof old.autoRotate === "boolean" ? false : old.autoRotate,
        rotationY: currentDragState.config.rotationY + deltaX * 180,
        rotationX: constrain(
          currentDragState.config.rotationX + deltaY * 120,
          -rotationLimit,
          rotationLimit
        ),
      }));
    };

    const handleMouseUp = () => {
      dragState = null;
      canvas.style.cursor = "grab";
    };

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();

      setConfig((old) => ({
        ...old,
        autoRotate:
          typeof old.autoRotate === "boolean" ? false : old.autoRotate,
        cameraDistance: constrain(
          old.cameraDistance * (event.deltaY > 0 ? 1.08 : 0.92),
          minDistance,
          maxDistance
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
  }, [canvas, maxDistance, minDistance, rotationLimit, setConfig]);
}
