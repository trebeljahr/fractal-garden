import {
  createScratch,
  type Derivative,
  getNormalization,
  type Polyline3D,
  stepRK4,
} from "../polyline3d";
import type { Polyline3DSceneConfig, PolylineSource } from "../render/polylineScene";
import {
  CAMERA_DISTANCE,
  cameraTarget,
  FOCAL_SCALE,
  relativeNumber,
  rotationOf,
  type Vec3,
} from "./camera";
export type AttractorSource = Exclude<PolylineSource, { kind: "hilbert3d" }>;
export function attractorDerivative(source: AttractorSource): Derivative {
  return source.kind === "lorenz"
    ? (x, y, z, out) => {
        out[0] = source.sigma * (y - x);
        out[1] = x * (source.rho - z) - y;
        out[2] = x * y - source.beta * z;
      }
    : (x, y, z, out) => {
        out[0] = -y - z;
        out[1] = x + source.a * y;
        out[2] = source.b + z * (x - source.c);
      };
}
/** A longer orbit adds actual later flow, with a fixed fit so coverage cannot move the camera. */
export class AttractorDetail {
  private raw: number[] = [];
  private derivative: Derivative;
  private state: Float64Array;
  private scratch = createScratch();
  private escaped = false;
  private normalization: ReturnType<typeof getNormalization>;
  constructor(private source: AttractorSource) {
    this.derivative = attractorDerivative(source);
    this.state = Float64Array.from(source.kind === "lorenz" ? [0.1, 0, 0] : [1, 1, 0]);
    this.raw.push(...Array.from(this.state));
    this.extend(Math.max(source.steps, 20000));
    this.normalization = getNormalization(
      { points: Float64Array.from(this.raw), count: this.raw.length / 3 },
      [0, 2, 1],
    );
  }
  private extend(steps: number) {
    while (this.raw.length / 3 <= steps && !this.escaped) {
      // Substeps keep the user's interval and elapsed-time coverage while improving integration accuracy.
      for (let i = 0; i < 4; i++)
        if (!stepRK4(this.derivative, this.state, this.source.dt / 4, this.scratch)) {
          this.escaped = true;
          break;
        }
      if (!this.escaped) this.raw.push(...Array.from(this.state));
    }
  }
  sample(
    config: Polyline3DSceneConfig,
    width: number,
    height: number,
  ): Polyline3D & { coverage: number; refinements: number } {
    const camera = config.spatialCamera!,
      band = Math.min(12, Math.max(0, Math.ceil(camera.zoom)));
    const steps = Math.min(160000, Math.max(this.source.steps, 20000) * (1 + band));
    this.extend(steps);
    const count = Math.min(steps + 1, this.raw.length / 3),
      target = cameraTarget(camera).map((v) => relativeNumber(v, camera.bits, 0));
    const rotation = rotationOf(config),
      magnification = 2 ** camera.zoom,
      { center, scale, axisOrder } = this.normalization;
    const normalized = (p: ArrayLike<number>): Vec3 =>
      axisOrder.map((axis) => (p[axis] - center[axis]) * scale) as Vec3;
    const view = (p: Vec3): Vec3 => {
      const d = p.map((v, i) => (v - target[i]) * magnification);
      return [0, 1, 2].map(
        (i) => rotation[i * 3] * d[0] + rotation[i * 3 + 1] * d[1] + rotation[i * 3 + 2] * d[2],
      ) as Vec3;
    };
    const project = (p: Vec3): Vec3 => {
      const v = view(p),
        d = CAMERA_DISTANCE - v[2];
      return [
        width / 2 + (v[0] * Math.min(width, height) * FOCAL_SCALE) / Math.max(d, 0.02),
        height / 2 - (v[1] * Math.min(width, height) * FOCAL_SCALE) / Math.max(d, 0.02),
        d,
      ];
    };
    const output: number[] = [],
      breaks: number[] = [];
    let refinements = 0,
      lastEnd = -1;
    const d0 = new Float64Array(3),
      d1 = new Float64Array(3);
    for (let i = 0; i < count - 1 && output.length / 3 < 180000; i++) {
      const a = this.raw.slice(i * 3, i * 3 + 3),
        b = this.raw.slice(i * 3 + 3, i * 3 + 6);
      this.derivative(a[0], a[1], a[2], d0);
      this.derivative(b[0], b[1], b[2], d1);
      const curve = (t: number): Vec3 =>
        normalized(
          [0, 1, 2].map(
            (k) =>
              (2 * t * t * t - 3 * t * t + 1) * a[k] +
              (t * t * t - 2 * t * t + t) * this.source.dt * d0[k] +
              (-2 * t * t * t + 3 * t * t) * b[k] +
              (t * t * t - t * t) * this.source.dt * d1[k],
          ),
        );
      const pa = curve(0),
        pb = curve(1);
      const controls = [
        pa,
        normalized(a.map((v, k) => v + (this.source.dt * d0[k]) / 3)),
        normalized(b.map((v, k) => v - (this.source.dt * d1[k]) / 3)),
        pb,
      ].map(view);
      const tx = width / Math.min(width, height) / (2 * FOCAL_SCALE),
        ty = height / Math.min(width, height) / (2 * FOCAL_SCALE);
      // Cubic Hermite curves stay inside their Bezier control hull. These plane
      // tests also work across the camera plane, unlike projected endpoint bounds.
      if (
        controls.every((p) => p[2] > CAMERA_DISTANCE - 0.02) ||
        controls.every((p) => p[2] < CAMERA_DISTANCE - 128) ||
        controls.every((p) => p[0] > tx * (CAMERA_DISTANCE - p[2])) ||
        controls.every((p) => -p[0] > tx * (CAMERA_DISTANCE - p[2])) ||
        controls.every((p) => p[1] > ty * (CAMERA_DISTANCE - p[2])) ||
        controls.every((p) => -p[1] > ty * (CAMERA_DISTANCE - p[2]))
      )
        continue;
      if (lastEnd !== i) {
        output.push(...pa);
        breaks.push(1);
      }
      const refine = (t0: number, p0: Vec3, t1: number, p1: Vec3, depth: number) => {
        if (output.length / 3 >= 180000) return;
        const tm = (t0 + t1) / 2,
          mid = curve(tm),
          s0 = project(p0),
          s1 = project(p1),
          sm = project(mid);
        const dx = s1[0] - s0[0],
          dy = s1[1] - s0[1],
          length = dx * dx + dy * dy;
        const chordDistance = (s: Vec3) => {
          const t = length
            ? Math.max(0, Math.min(1, ((s[0] - s0[0]) * dx + (s[1] - s0[1]) * dy) / length))
            : 0;
          return Math.hypot(s[0] - s0[0] - t * dx, s[1] - s0[1] - t * dy);
        };
        // Quarter samples also detect inflections whose midpoint lies on the chord.
        const error = Math.max(
          chordDistance(sm),
          chordDistance(project(curve((3 * t0 + t1) / 4))),
          chordDistance(project(curve((t0 + 3 * t1) / 4))),
        );
        if (error > 0.35 && depth < 16 && output.length / 3 < 179998) {
          refinements++;
          refine(t0, p0, tm, mid, depth + 1);
          refine(tm, mid, t1, p1, depth + 1);
        } else {
          output.push(...p1);
          breaks.push(0);
        }
      };
      refine(0, pa, 1, pb, 0);
      lastEnd = i + 1;
    }
    return {
      points: Float64Array.from(output),
      count: output.length / 3,
      breaks: Uint8Array.from(breaks),
      coverage: (count - 1) * this.source.dt,
      refinements,
    };
  }
}
