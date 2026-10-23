import type { Orientation } from "../orientation";
import { easeFlightAtmosphere } from "../voxelZoom/smoothing";
import {
  CAMERA_DISTANCE,
  inverseRotate,
  moveSpatialCamera,
  type SpatialCamera,
  type Vec3,
} from "./camera";

/** Turn or change working scale without moving the eye in world space. */
export function reframeSpatialEye(
  camera: SpatialCamera,
  before: Orientation,
  after: Orientation,
  zoom = camera.zoom,
  eyeDistance = CAMERA_DISTANCE,
): SpatialCamera {
  const oldEye = inverseRotate([0, 0, eyeDistance], before);
  const newEye = inverseRotate([0, 0, eyeDistance * 2 ** (camera.zoom - zoom)], after);
  return moveSpatialCamera(camera, oldEye.map((v, i) => v - newEye[i]) as Vec3, zoom);
}

/** Upright mouse look, matching the voxel flight camera's yaw and bounded pitch. */
export function lookSpatialRotation(rotation: Orientation, dx: number, dy: number): Orientation {
  const forward = inverseRotate([0, 0, -1], rotation);
  const yaw = Math.atan2(forward[0], -forward[2]) + dx * 0.0025;
  const pitch = Math.max(
    -1.54,
    Math.min(1.54, Math.asin(Math.max(-1, Math.min(1, forward[1]))) - dy * 0.0025),
  );
  const cy = Math.cos(yaw),
    sy = Math.sin(yaw),
    cp = Math.cos(pitch),
    sp = Math.sin(pitch);
  return [cy, 0, sy, -sy * sp, cp, cy * sp, -sy * cp, -sp, cy * cp];
}

/** Closest point on a triangle (including edges and vertices). */
export function closestTrianglePoint(p: Vec3, a: Vec3, b: Vec3, c: Vec3): Vec3 {
  const sub = (u: Vec3, v: Vec3) => u.map((x, i) => x - v[i]) as Vec3;
  const dot = (u: Vec3, v: Vec3) => u.reduce((s, x, i) => s + x * v[i], 0);
  const along = (u: Vec3, v: Vec3, t: number) => u.map((x, i) => x + v[i] * t) as Vec3;
  const ab = sub(b, a),
    ac = sub(c, a),
    ap = sub(p, a);
  const d1 = dot(ab, ap),
    d2 = dot(ac, ap);
  if (d1 <= 0 && d2 <= 0) return a;
  const bp = sub(p, b),
    d3 = dot(ab, bp),
    d4 = dot(ac, bp);
  if (d3 >= 0 && d4 <= d3) return b;
  const vc = d1 * d4 - d3 * d2;
  if (vc <= 0 && d1 >= 0 && d3 <= 0) return along(a, ab, d1 / (d1 - d3));
  const cp = sub(p, c),
    d5 = dot(ab, cp),
    d6 = dot(ac, cp);
  if (d6 >= 0 && d5 <= d6) return c;
  const vb = d5 * d2 - d1 * d6;
  if (vb <= 0 && d2 >= 0 && d6 <= 0) return along(a, ac, d2 / (d2 - d6));
  const va = d3 * d6 - d5 * d4;
  if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0)
    return along(b, sub(c, b), (d4 - d3) / (d4 - d3 + d5 - d6));
  const denominator = va + vb + vc;
  if (Math.abs(denominator) < 1e-30) return a;
  return a.map((v, i) => v + (ab[i] * vb + ac[i] * vc) / denominator) as Vec3;
}

/** Collision-only vertices store descendant padding in the unused normal slot. */
export function meshClearance(vertices: Float32Array, eye: Vec3 = [0, 0, CAMERA_DISTANCE]) {
  let nearest = Infinity;
  for (let i = 0; i < vertices.length; i += 36) {
    const point = closestTrianglePoint(
      eye,
      Array.from(vertices.subarray(i, i + 3)) as Vec3,
      Array.from(vertices.subarray(i + 12, i + 15)) as Vec3,
      Array.from(vertices.subarray(i + 24, i + 27)) as Vec3,
    );
    nearest = Math.min(
      nearest,
      Math.max(0, Math.hypot(...point.map((v, j) => v - eye[j])) - vertices[i + 3]),
    );
  }
  return nearest;
}

/** Advance at most one fifth of current clearance, even during a boosted frame. */
export function advanceSpatialFlight({
  camera,
  rotation,
  clearance,
  motion,
  elapsed,
  speed,
  boost = false,
  maxZoom = 240,
  eyeDistance = CAMERA_DISTANCE,
}: {
  camera: SpatialCamera;
  rotation: Orientation;
  clearance: number;
  motion: Vec3;
  elapsed: number;
  speed: number;
  boost?: boolean;
  maxZoom?: number;
  eyeDistance?: number;
}) {
  const dt = Math.max(0, Math.min(0.5, elapsed));
  const safe = Math.max(0, clearance);
  const desired = Math.min(3, safe * 0.75);
  const nextSpeed = desired < speed ? desired : Math.min(desired, speed * 2 ** (dt * 1.2));
  const length = Math.hypot(...motion);
  const step = Math.min(nextSpeed * dt * (boost ? 4 : 1), safe * 0.2);
  if (!length) return { camera, speed: nextSpeed };
  const horizontal = inverseRotate([motion[0], 0, motion[2]], rotation);
  horizontal[1] += motion[1];
  let next = moveSpatialCamera(
    camera,
    horizontal.map((v) => (v * step) / Math.max(1, length)) as Vec3,
  );
  const change = Math.log2(2 / Math.max(1e-12, safe));
  const zoom = Math.max(
    0,
    Math.min(maxZoom, camera.zoom + Math.max(-dt * 1.2, Math.min(dt * 4, change))),
  );
  next = reframeSpatialEye(next, rotation, rotation, zoom, eyeDistance);
  const atmosphere = easeFlightAtmosphere(
    camera.atmosphereZoom ?? camera.zoom,
    camera.atmosphereVelocity ?? 0,
    camera.zoom,
    zoom,
    dt,
    boost ? 3 : 0.75,
  );
  next.atmosphereZoom = Math.min(maxZoom, atmosphere.level);
  next.atmosphereVelocity = atmosphere.velocity;
  return { camera: next, speed: nextSpeed };
}
