import {
  createEndlessOrbit,
  drawPolyline3D,
  generateHilbertCurve3D,
  integrateRK4,
  normalizePolyline,
  type Polyline3D,
  type Polyline3DDrawOptions,
  trimPolyline,
} from "../polyline3d";
import type { Context2D, Renderer } from "./types";

export type Polyline3DSceneConfig = Polyline3DDrawOptions & {
  autoRotate: boolean;
  animateTrail: boolean;
  trailSpeed: number;
  showHead?: boolean;
};

/** Serializable description of a polyline, so it can be built in a worker. */
export type PolylineSource =
  | { kind: "lorenz"; sigma: number; rho: number; beta: number; dt: number; steps: number }
  | { kind: "rossler"; a: number; b: number; c: number; dt: number; steps: number }
  | { kind: "hilbert3d"; order: number };

export type PolylineSceneParams = {
  source: PolylineSource;
  config: Polyline3DSceneConfig;
  /** Oldest points are dropped beyond this count so an endless trail stays fast. */
  maxPoints?: number;
};

type Extend = (polyline: Polyline3D, extraPoints: number) => Polyline3D;

// Trim in chunks so the buffer is not shifted on every frame.
const TRIM_CHUNK = 10000;

function buildPolyline(source: PolylineSource): { polyline: Polyline3D; extend?: Extend } {
  switch (source.kind) {
    case "lorenz": {
      const { sigma, rho, beta } = source;
      // Show z as the vertical axis, like the classic butterfly picture.
      return createEndlessOrbit(
        (x, y, z, out) => {
          out[0] = sigma * (y - x);
          out[1] = x * (rho - z) - y;
          out[2] = x * y - beta * z;
        },
        [0.1, 0, 0],
        source.dt,
        source.steps,
        [0, 2, 1],
      );
    }
    case "rossler": {
      const { a, b, c } = source;
      const orbit = integrateRK4(
        (x, y, z, out) => {
          out[0] = -y - z;
          out[1] = x + a * y;
          out[2] = b + z * (x - c);
        },
        [1, 1, 0],
        source.dt,
        source.steps,
      );
      // Show z as the vertical axis so the folding spike points upward.
      return { polyline: normalizePolyline(orbit, [0, 2, 1]) };
    }
    case "hilbert3d":
      return { polyline: normalizePolyline(generateHilbertCurve3D(source.order)) };
  }
}

/**
 * Orbitable 3D polyline with an optional growing trail. The trail and the
 * auto-rotation keep running across parameter updates; only a new source
 * restarts them.
 */
export class PolylineSceneRenderer implements Renderer<PolylineSceneParams> {
  private params: PolylineSceneParams | null = null;
  private sourceKey = "";
  private polyline: Polyline3D = { points: new Float32Array(0), count: 0 };
  private baseCount = 0;
  private extend: Extend | undefined;
  private visible = 0;
  private yawOffset = 0;

  update(params: PolylineSceneParams) {
    const previous = this.params;
    const sourceKey = JSON.stringify(params.source);

    if (sourceKey !== this.sourceKey) {
      const built = buildPolyline(params.source);
      this.sourceKey = sourceKey;
      this.polyline = built.polyline;
      this.baseCount = built.polyline.count;
      this.extend = built.extend;
      this.visible = params.config.animateTrail ? 1 : built.polyline.count;
    } else if (previous && previous.config.animateTrail !== params.config.animateTrail) {
      this.visible = params.config.animateTrail ? 1 : Number.POSITIVE_INFINITY;
    }

    this.params = params;
  }

  draw(ctx: Context2D, width: number, height: number) {
    const params = this.params;
    if (!params) return false;

    const { config } = params;
    const maxPoints = params.maxPoints ?? Number.POSITIVE_INFINITY;
    const extend = config.animateTrail ? this.extend : undefined;

    if (extend && this.visible + config.trailSpeed > this.polyline.count) {
      this.polyline = extend(this.polyline, config.trailSpeed);
      if (this.polyline.count > maxPoints + TRIM_CHUNK) {
        this.visible -= trimPolyline(this.polyline, maxPoints);
      }
    }

    const trailRunning = config.animateTrail && this.visible < this.polyline.count;
    if (trailRunning) {
      this.visible = Math.min(this.polyline.count, this.visible + config.trailSpeed);
    }
    if (config.autoRotate) {
      this.yawOffset += 0.25;
    }

    const head = drawPolyline3D(
      ctx as CanvasRenderingContext2D,
      width,
      height,
      this.polyline,
      this.visible,
      { ...config, rotationY: config.rotationY + this.yawOffset },
    );

    if (head && config.showHead !== false && (extend || this.visible < this.polyline.count)) {
      ctx.fillStyle = config.nearColor;
      ctx.beginPath();
      ctx.arc(head.x, head.y, Math.max(2.5, config.lineWidth * 2.5), 0, Math.PI * 2);
      ctx.fill();
    }

    return Boolean(extend) || trailRunning || config.autoRotate;
  }

  describe() {
    // Only the Hilbert curve has growth levels to budget.
    if (this.params?.source.kind !== "hilbert3d") return null;
    return { level: this.params.source.order, work: this.baseCount };
  }
}
