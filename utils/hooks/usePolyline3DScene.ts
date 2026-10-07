import { useEffect, useRef } from "react";
import {
  drawPolyline3D,
  type Polyline3D,
  type Polyline3DDrawOptions,
  trimPolyline,
} from "../polyline3d";

export type Polyline3DSceneConfig = Polyline3DDrawOptions & {
  autoRotate: boolean;
  animateTrail: boolean;
  trailSpeed: number;
  showHead?: boolean;
};

type Params = {
  ctx: CanvasRenderingContext2D | null;
  width: number | null;
  height: number | null;
  polyline: Polyline3D;
  config: Polyline3DSceneConfig;
  /**
   * Makes the trail endless: once the animated trail reaches the end of the
   * polyline, this is called to append more points.
   */
  extend?: (polyline: Polyline3D, extraPoints: number) => Polyline3D;
  /** Oldest points are dropped beyond this count so an endless trail stays fast. */
  maxPoints?: number;
};

// Trim in chunks so the buffer is not shifted on every frame.
const TRIM_CHUNK = 10000;

/**
 * Runs one requestAnimationFrame loop for a 3D polyline scene. The latest
 * config is read from a ref, so orbiting or tweaking colors never restarts
 * the trail animation; only a new polyline does.
 */
export function usePolyline3DScene({
  ctx,
  width,
  height,
  polyline,
  config,
  extend,
  maxPoints = Number.POSITIVE_INFINITY,
}: Params) {
  const configRef = useRef(config);
  const extendRef = useRef(extend);
  const polylineRef = useRef(polyline);
  const dirtyRef = useRef(true);
  const visibleRef = useRef(config.animateTrail ? 1 : polyline.count);
  const rotationOffsetRef = useRef(0);

  configRef.current = config;
  extendRef.current = extend;
  dirtyRef.current = true;

  useEffect(() => {
    polylineRef.current = polyline;
    visibleRef.current = configRef.current.animateTrail ? 1 : polyline.count;
    dirtyRef.current = true;
  }, [polyline]);

  useEffect(() => {
    visibleRef.current = config.animateTrail ? 1 : Number.POSITIVE_INFINITY;
    dirtyRef.current = true;
  }, [config.animateTrail]);

  useEffect(() => {
    if (!ctx || !width || !height) return;

    const ratio = window.devicePixelRatio || 1;
    let animationId = 0;

    const frame = () => {
      const current = configRef.current;
      const growing = current.animateTrail && extendRef.current;

      if (growing && visibleRef.current + current.trailSpeed > polylineRef.current.count) {
        polylineRef.current = extendRef.current!(polylineRef.current, current.trailSpeed);
        if (polylineRef.current.count > maxPoints + TRIM_CHUNK) {
          visibleRef.current -= trimPolyline(polylineRef.current, maxPoints);
        }
      }

      const polyline = polylineRef.current;
      const trailRunning = current.animateTrail && visibleRef.current < polyline.count;

      if (trailRunning) {
        visibleRef.current = Math.min(polyline.count, visibleRef.current + current.trailSpeed);
      }
      if (current.autoRotate) {
        rotationOffsetRef.current += 0.25;
      }

      if (dirtyRef.current || trailRunning || current.autoRotate) {
        dirtyRef.current = false;
        ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

        const head = drawPolyline3D(ctx, width, height, polyline, visibleRef.current, {
          ...current,
          rotationY: current.rotationY + rotationOffsetRef.current,
        });

        if (
          head &&
          current.showHead !== false &&
          (growing || visibleRef.current < polyline.count)
        ) {
          ctx.fillStyle = current.nearColor;
          ctx.beginPath();
          ctx.arc(head.x, head.y, Math.max(2.5, current.lineWidth * 2.5), 0, Math.PI * 2);
          ctx.fill();
        }
      }

      animationId = requestAnimationFrame(frame);
    };

    animationId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(animationId);
  }, [ctx, width, height, maxPoints]);
}
