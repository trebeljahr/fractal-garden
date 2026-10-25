import type { FractalFrame } from "../fractalFrame";
import {
  CAMERA_DISTANCE,
  NEAR_PLANE,
  type SpatialFrameTransform,
  transformSpatialPoint,
  type Vec3,
} from "./camera";
import { spatialProjection } from "./projection";

const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const sub = (a: Vec3, b: Vec3): Vec3 => a.map((v, i) => v - b[i]) as Vec3;
/** Exact ray/triangle picking in the same camera-relative frame the GPU draws. */
export function pickSpatialPoint(
  vertices: Float32Array,
  x: number,
  y: number,
  width: number,
  height: number,
  transform?: SpatialFrameTransform,
  frame?: FractalFrame | null,
): Vec3 | null {
  const projection = spatialProjection(width, height, frame);
  const direction: Vec3 = [
      (x - projection.centerX) / projection.focal,
      -(y - projection.centerY) / projection.focal,
      -1,
    ],
    origin: Vec3 = [0, 0, CAMERA_DISTANCE];
  let nearest = Infinity;
  for (let i = 0; i < vertices.length; i += 36) {
    const read = (offset: number) => {
      const p = Array.from(vertices.subarray(offset, offset + 3)) as Vec3;
      return transform ? transformSpatialPoint(p, transform) : p;
    };
    const a = read(i),
      b = read(i + 12),
      c = read(i + 24);
    const ab = sub(b, a),
      ac = sub(c, a),
      p = cross(direction, ac),
      det = dot(ab, p);
    if (Math.abs(det) < 1e-15) continue;
    const t = sub(origin, a),
      u = dot(t, p) / det;
    if (u < 0 || u > 1) continue;
    const q = cross(t, ab),
      v = dot(direction, q) / det;
    if (v < 0 || u + v > 1) continue;
    const distance = dot(ac, q) / det;
    if (distance >= NEAR_PLANE && distance < nearest) nearest = distance;
  }
  return Number.isFinite(nearest)
    ? (direction.map((v, i) => origin[i] + v * nearest) as Vec3)
    : null;
}
