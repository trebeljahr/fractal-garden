import type { Vec3 } from "../spatial/camera";
import {
  applyVector,
  composeTransforms,
  dot,
  type GpuFrame,
  type GpuTransform,
  inversePoint,
  inverseVector,
  normalize,
  type Plane,
  transformSize,
} from "./model";

export type GpuRayHit = {
  distance: number;
  normal: Vec3;
  edge: number;
  rank: number;
  visited: number;
};
export function intersectGpuHull(planes: Plane[], origin: Vec3, direction: Vec3, limit = Infinity) {
  let near = -Infinity,
    far = limit,
    normal: Vec3 = [0, 0, 0],
    exitNormal: Vec3 = [0, 0, 0];
  for (const plane of planes) {
    const n = plane.slice(0, 3) as Vec3,
      side = plane[3] - dot(n, origin),
      velocity = dot(n, direction);
    if (Math.abs(velocity) < 1e-20) {
      if (side < -1e-10) return null;
    } else {
      const t = side / velocity;
      if (velocity < 0 && t > near) {
        near = t;
        normal = n;
      }
      if (velocity > 0 && t < far) {
        far = t;
        exitNormal = n;
      }
      if (far < Math.max(0, near)) return null;
    }
  }
  return far >= Math.max(0, near) ? { near, far, normal, exitNormal } : null;
}

/** Small-query oracle and navigation fallback. It traverses instances, never builds triangles. */
export function traceGpuFrame(
  frame: GpuFrame,
  ray: Vec3,
  options: {
    pixelAngle?: number;
    nearFootprint?: number;
    detailScale?: number;
    maxRank?: number;
    maxDepth?: number;
    maxVisits?: number;
  } = {},
): GpuRayHit | null {
  const { shape } = frame,
    direction = normalize(ray),
    maxRank = options.maxRank ?? options.maxDepth ?? 1000;
  const pixelAngle = options.pixelAngle ?? 0.001,
    nearFootprint = options.nearFootprint ?? 0.00002,
    detailScale = options.detailScale ?? 2;
  let nearest = frame.horizon,
    result: GpuRayHit | null = null,
    visited = 0;
  const pending: GpuTransform[] = frame.roots.slice();
  while (pending.length) {
    if (++visited > (options.maxVisits ?? 1000000))
      throw new Error("GPU ray oracle traversal budget exhausted");
    const node = pending.pop()!,
      origin = inversePoint(node, [0, 0, 0]),
      localDirection = inverseVector(node, direction);
    const interval = intersectGpuHull(shape.hull, origin, localDirection, nearest);
    if (!interval) continue;
    const size = transformSize(node),
      footprint = Math.max(nearFootprint, Math.max(0, interval.near) * pixelAngle) * detailScale;
    if (node.rank < maxRank && size * shape.featureSize > footprint) {
      pending.push(...shape.children.map((child) => composeTransforms(node, child)));
      continue;
    }
    let distance: number,
      normal: Vec3,
      edge = Infinity;
    if (shape.kind === 0) {
      distance = interval.near >= 0 ? interval.near : interval.far;
      normal = interval.near >= 0 ? interval.normal : interval.exitNormal;
      const p = origin.map((v, i) => v + localDirection[i] * distance) as Vec3;
      for (const plane of shape.hull)
        if (dot(plane.slice(0, 3) as Vec3, normal) < 0.999)
          edge = Math.min(edge, plane[3] - dot(plane.slice(0, 3) as Vec3, p));
    } else {
      if (Math.abs(localDirection[2]) < 1e-20) continue;
      distance = -origin[2] / localDirection[2];
      normal = [0, 0, localDirection[2] < 0 ? 1 : -1];
      const p = origin.map((v, i) => v + localDirection[i] * distance) as Vec3;
      for (const plane of shape.edges)
        edge = Math.min(edge, plane[3] - dot(plane.slice(0, 3) as Vec3, p));
      if (edge < -1e-9) continue;
    }
    if (distance < 0 || distance >= nearest) continue;
    nearest = distance;
    result = {
      distance,
      normal: normalize(applyVector(node, normal)),
      edge: Math.max(0, edge * size),
      rank: node.rank,
      visited,
    };
  }
  if (result) result.visited = visited;
  return result;
}
