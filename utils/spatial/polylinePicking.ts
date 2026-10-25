import type { Polyline3D, Polyline3DDrawOptions } from "../polyline3d";
import { CAMERA_DISTANCE, cameraTarget, relativeNumber, rotationOf, type Vec3 } from "./camera";
import { spatialProjection } from "./projection";
/** Perspective-correct model point on the nearest drawn line; never connects culled pieces. */
export function pickPolylinePoint(
  polyline: Polyline3D,
  view: Polyline3DDrawOptions,
  x: number,
  y: number,
  width: number,
  height: number,
): Vec3 | null {
  const projection = spatialProjection(width, height, view.framing);
  const camera = view.spatialCamera;
  if (!camera) return null;
  const target = cameraTarget(camera).map((v) => relativeNumber(v, camera.bits, 0)),
    scale = 2 ** camera.zoom,
    rotation = rotationOf(view);
  const project = (p: Vec3) => {
    const v = p.map((n, i) => (n - target[i]) * scale),
      r = [0, 1, 2].map(
        (i) => rotation[i * 3] * v[0] + rotation[i * 3 + 1] * v[1] + rotation[i * 3 + 2] * v[2],
      ),
      d = CAMERA_DISTANCE - r[2];
    return [
      projection.centerX + (r[0] * projection.focal) / d,
      projection.centerY - (r[1] * projection.focal) / d,
      d,
    ];
  };
  let best = 12 ** 2,
    bestDepth = Infinity,
    result: Vec3 | null = null;
  for (let i = 1; i < polyline.count; i++) {
    if (polyline.breaks?.[i]) continue;
    const a = Array.from(polyline.points.slice((i - 1) * 3, i * 3)) as Vec3,
      b = Array.from(polyline.points.slice(i * 3, i * 3 + 3)) as Vec3,
      pa = project(a),
      pb = project(b);
    if (pa[2] < 0.05 || pb[2] < 0.05) continue;
    const dx = pb[0] - pa[0],
      dy = pb[1] - pa[1],
      length = dx * dx + dy * dy;
    const t = length ? Math.max(0, Math.min(1, ((x - pa[0]) * dx + (y - pa[1]) * dy) / length)) : 0;
    const distance = (x - pa[0] - t * dx) ** 2 + (y - pa[1] - t * dy) ** 2,
      depth = 1 / ((1 - t) / pa[2] + t / pb[2]);
    if (distance > best + 0.01 || (Math.abs(distance - best) < 0.01 && depth >= bestDepth))
      continue;
    best = distance;
    bestDepth = depth;
    result = a.map((v, k) => (((1 - t) * v) / pa[2] + (t * b[k]) / pb[2]) * depth) as Vec3;
  }
  return result;
}
