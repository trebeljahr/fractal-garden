import type { Vec3 } from "../spatial/camera";
import {
  type AncestorCone,
  applyVector,
  composeTransforms,
  dot,
  type GpuFrame,
  type GpuShape,
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

function quadraticRoots(a: number, b: number, c: number) {
  if (Math.abs(a) < 1e-20) return Math.abs(b) < 1e-20 ? [] : [-c / b];
  const discriminant = b * b - 4 * a * c;
  if (discriminant < 0) return [];
  const q = -0.5 * (b + (b >= 0 ? 1 : -1) * Math.sqrt(discriminant));
  return Math.abs(q) < 1e-30 ? [-b / (2 * a)] : [q / a, c / q].sort((x, y) => x - y);
}
/** Conservative round-cone envelope; polygon hulls remain the other kinds' bounds. */
export function intersectGpuBound(
  shape: GpuShape,
  origin: Vec3,
  direction: Vec3,
  limit = Infinity,
) {
  if (shape.kind !== 3) return intersectGpuHull(shape.hull, origin, direction, limit);
  const k = shape.boundConeSlope!,
    k2 = k * k;
  const error = 0.0000005 * Math.max(1, ...origin.map(Math.abs));
  const tip = 1 + error / k,
    base = -1 - error;
  const shift = -dot(origin, direction) / dot(direction, direction);
  const o = origin.map((v, i) => v + shift * direction[i]) as Vec3,
    d = direction;
  let enter = -Infinity,
    leave = limit - shift;
  if (Math.abs(d[1]) < 1e-20) {
    if (o[1] < base || o[1] > tip) return null;
  } else {
    const a = (base - o[1]) / d[1],
      b = (tip - o[1]) / d[1];
    enter = Math.min(a, b);
    leave = Math.min(leave, Math.max(a, b));
  }
  const a = d[0] ** 2 + d[2] ** 2 - k2 * d[1] ** 2;
  const b = 2 * (o[0] * d[0] + o[2] * d[2] + k2 * (tip - o[1]) * d[1]);
  const c = o[0] ** 2 + o[2] ** 2 - k2 * (tip - o[1]) ** 2;
  if (Math.abs(a) < 1e-20) {
    if (Math.abs(b) < 1e-20) {
      if (c > 0) return null;
    } else if (b > 0) leave = Math.min(leave, -c / b);
    else enter = Math.max(enter, -c / b);
  } else {
    const roots = quadraticRoots(a, b, c);
    if (roots.length) {
      if (a > 0) {
        enter = Math.max(enter, roots[0]);
        leave = Math.min(leave, roots.at(-1)!);
      } else if (d[1] > 0) leave = Math.min(leave, roots[0]);
      else enter = Math.max(enter, roots.at(-1)!);
    } else if (a > 0) return null;
  }
  const near = enter + shift,
    far = leave + shift;
  if (far < Math.max(0, near)) return null;
  const surfaceNormal = (at: number): Vec3 => {
    const p = o.map((v, i) => v + at * d[i]);
    return p[1] <= base + error ? [0, -1, 0] : normalize([p[0], k2 * (tip - p[1]), p[2]]);
  };
  return { near, far, normal: surfaceNormal(enter), exitNormal: surfaceNormal(leave) };
}
/** Exact circular cone, capped at y=-1, with apex y=1. */
export function intersectGpuCone(
  origin: Vec3,
  direction: Vec3,
  slope: number,
  limit = Infinity,
  minimum = 0,
  farthest = false,
) {
  const k2 = slope * slope,
    a = direction[0] ** 2 + direction[2] ** 2 - k2 * direction[1] ** 2,
    b =
      2 *
      (origin[0] * direction[0] + origin[2] * direction[2] + k2 * (1 - origin[1]) * direction[1]),
    c = origin[0] ** 2 + origin[2] ** 2 - k2 * (1 - origin[1]) ** 2;
  let result: { distance: number; normal: Vec3; edge: number } | null = null;
  const accepts = (t: number) =>
    t >= minimum &&
    t < limit &&
    (!result || (farthest ? t > result.distance : t < result.distance));
  for (const distance of quadraticRoots(a, b, c)) {
    const p = origin.map((v, i) => v + direction[i] * distance) as Vec3;
    if (!accepts(distance) || p[1] < -1 || p[1] > 1) continue;
    result = {
      distance,
      normal:
        Math.hypot(p[0], k2 * (1 - p[1]), p[2]) > 1e-12
          ? normalize([p[0], k2 * (1 - p[1]), p[2]])
          : [0, 1, 0],
      edge: Math.max(0, p[1] + 1),
    };
  }
  if (Math.abs(direction[1]) > 1e-20) {
    const distance = (-1 - origin[1]) / direction[1],
      x = origin[0] + direction[0] * distance,
      z = origin[2] + direction[2] * distance;
    if (accepts(distance) && x * x + z * z <= 4 * k2)
      result = { distance, normal: [0, -1, 0], edge: Math.max(0, 2 * slope - Math.hypot(x, z)) };
    if (minimum < 0) {
      const tip = (1 - origin[1]) / direction[1];
      const x = origin[0] + tip * direction[0],
        z = origin[2] + tip * direction[2];
      const error =
        1e-12 *
        (Math.hypot(origin[0], origin[2]) + Math.abs(tip) * Math.hypot(direction[0], direction[2]));
      if (accepts(tip) && x * x + z * z <= error * error)
        result = { distance: tip, normal: [0, 1, 0], edge: 2 };
    }
  }
  return result;
}
export function intersectAncestorCone(
  cone: AncestorCone,
  direction: Vec3,
  slope: number,
  limit = Infinity,
  minimum = 0,
  farthest = false,
) {
  const k2 = slope * slope,
    along = dot(cone.axis, direction),
    a = cone.quadraticScale * (dot(direction, direction) - (1 + k2) * along * along),
    b = dot(cone.linear, direction),
    c = cone.constant;
  let result: { distance: number; normal: Vec3; edge: number } | null = null;
  const accepts = (t: number) =>
    t >= minimum &&
    t < limit &&
    (!result || (farthest ? t > result.distance : t < result.distance));
  for (const distance of quadraticRoots(a, b, c)) {
    if (
      !accepts(distance) ||
      cone.baseDistance + along * distance < 0 ||
      cone.tipDistance - along * distance < 0
    )
      continue;
    result = {
      distance,
      normal: normalize(
        cone.linear.map(
          (v, i) =>
            v +
            2 * cone.quadraticScale * distance * (direction[i] - (1 + k2) * cone.axis[i] * along),
        ) as Vec3,
      ),
      edge: Infinity,
    };
  }
  if (Math.abs(along) > 1e-20) {
    const distance = -cone.baseDistance / along;
    if (accepts(distance) && (a * distance + b) * distance + c <= 0)
      result = { distance, normal: cone.axis.map((v) => -v) as Vec3, edge: Infinity };
    if (minimum < 0) {
      const tip = cone.tipDistance / along;
      const delta = direction.map(
        (v, i) => 2 * cone.quadraticScale * tip * (v - (1 + k2) * cone.axis[i] * along),
      );
      const gradient = cone.linear.map((v, i) => v + delta[i]);
      const error = 1e-12 * (Math.hypot(...cone.linear) + Math.hypot(...delta));
      if (accepts(tip) && Math.hypot(...gradient) <= error)
        result = { distance: tip, normal: cone.axis, edge: Infinity };
    }
  }
  return result;
}

type GpuTraceOptions = {
  pixelAngle?: number;
  nearFootprint?: number;
  detailScale?: number;
  maxRank?: number;
  growth?: number;
  maxDepth?: number;
  maxVisits?: number;
};
function childrenOf(node: GpuTransform, frame: GpuFrame, maxRank: number, growth: number) {
  return frame.shape.children.flatMap((child) => {
    const combined = composeTransforms(node, child);
    if (frame.shape.kind !== 3 || combined.rank !== maxRank) return [combined];
    if (growth === 0) return [];
    return [
      {
        ...combined,
        center: combined.center.map((v, i) => v + combined.axes[1][i] * (growth - 1)) as Vec3,
        axes: combined.axes.map((axis) => axis.map((v) => v * growth)) as GpuTransform["axes"],
      },
    ];
  });
}

// The CPU oracle sorts complete intervals, independently of the GPU's repeated
// bounded sweeps. Only intervals connected to zero belong to the initial solid.
function traceUnionExit(frame: GpuFrame, direction: Vec3, options: GpuTraceOptions) {
  const { shape } = frame,
    maxRank = options.maxRank ?? options.maxDepth ?? 1000;
  const pending = frame.roots.slice(),
    intervals: Array<GpuRayHit & { enter: number }> = [];
  let visited = 0;
  while (pending.length) {
    if (++visited > (options.maxVisits ?? 1000000))
      throw new Error("GPU union oracle traversal budget exhausted");
    const node = pending.pop()!;
    if (node.cone) {
      const near = intersectAncestorCone(
        node.cone,
        direction,
        shape.coneSlope!,
        Infinity,
        -Infinity,
      );
      const far = intersectAncestorCone(
        node.cone,
        direction,
        shape.coneSlope!,
        Infinity,
        -Infinity,
        true,
      );
      if (near && far && far.distance >= 0)
        intervals.push({ ...far, enter: near.distance, rank: node.rank, visited });
      continue;
    }
    const origin = inversePoint(node, [0, 0, 0]),
      localDirection = inverseVector(node, direction);
    const bound = intersectGpuBound(shape, origin, localDirection, frame.horizon);
    if (!bound) continue;
    const size = transformSize(node);
    const footprint =
      Math.max(
        options.nearFootprint ?? 0.00002,
        Math.max(0, bound.near) * (options.pixelAngle ?? 0.001),
      ) * (options.detailScale ?? 2);
    if (node.rank < maxRank && size * shape.featureSize > footprint)
      pending.push(
        ...childrenOf(node, frame, maxRank, Math.max(0, Math.min(1, options.growth ?? 1))),
      );
    const near = intersectGpuCone(origin, localDirection, shape.coneSlope!, Infinity, -Infinity);
    const far = intersectGpuCone(
      origin,
      localDirection,
      shape.coneSlope!,
      Infinity,
      -Infinity,
      true,
    );
    if (near && far && far.distance >= 0)
      intervals.push({
        ...far,
        enter: near.distance,
        normal: normalize(applyVector(node, far.normal)),
        edge: far.edge * size,
        rank: node.rank,
        visited,
      });
  }
  intervals.sort((a, b) => a.enter - b.enter);
  let end = 0,
    result: GpuRayHit | null = null;
  for (const interval of intervals) {
    if (interval.enter > end) break;
    if (interval.distance > end) {
      end = interval.distance;
      result = interval;
    }
  }
  return result && end < frame.horizon ? { ...result, visited } : null;
}

/** Small-query oracle and navigation fallback. It traverses instances, never builds triangles. */
export function traceGpuFrame(
  frame: GpuFrame,
  ray: Vec3,
  options: GpuTraceOptions = {},
): GpuRayHit | null {
  const { shape } = frame,
    direction = normalize(ray),
    maxRank = options.maxRank ?? options.maxDepth ?? 1000;
  const pixelAngle = options.pixelAngle ?? 0.001,
    nearFootprint = options.nearFootprint ?? 0.00002,
    detailScale = options.detailScale ?? 2;
  let nearest = frame.horizon,
    result: GpuRayHit | null = null,
    visited = 0,
    inside = false;
  const pending: GpuTransform[] = frame.roots.slice();
  while (pending.length) {
    if (++visited > (options.maxVisits ?? 1000000))
      throw new Error("GPU ray oracle traversal budget exhausted");
    const node = pending.pop()!;
    if (node.cone) {
      inside ||=
        node.cone.constant <= 0 && node.cone.baseDistance >= 0 && node.cone.tipDistance >= 0;
      const hit = intersectAncestorCone(node.cone, direction, shape.coneSlope!, nearest);
      if (hit) {
        nearest = hit.distance;
        result = { ...hit, rank: node.rank, visited };
      }
      continue;
    }
    const origin = inversePoint(node, [0, 0, 0]),
      localDirection = inverseVector(node, direction);
    const interval = intersectGpuBound(shape, origin, localDirection, nearest);
    if (!interval) continue;
    const size = transformSize(node),
      footprint = Math.max(nearFootprint, Math.max(0, interval.near) * pixelAngle) * detailScale;
    if (node.rank < maxRank && size * shape.featureSize > footprint) {
      pending.push(
        ...childrenOf(node, frame, maxRank, Math.max(0, Math.min(1, options.growth ?? 1))),
      );
      if (shape.kind !== 3) continue;
    }
    let distance: number,
      normal: Vec3,
      edge = Infinity;
    if (shape.kind === 3) {
      inside ||=
        origin[1] >= -1 &&
        origin[1] <= 1 &&
        origin[0] ** 2 + origin[2] ** 2 <= (shape.coneSlope! * (1 - origin[1])) ** 2;
      const hit = intersectGpuCone(origin, localDirection, shape.coneSlope!, nearest);
      if (!hit) continue;
      ({ distance, normal, edge } = hit);
    } else if (shape.kind === 0) {
      const solid = intersectGpuHull(shape.hull, origin, localDirection, nearest)!;
      distance = solid.near >= 0 ? solid.near : solid.far;
      normal = solid.near >= 0 ? solid.normal : solid.exitNormal;
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
  if (shape.kind === 3 && inside) return traceUnionExit(frame, direction, options);
  if (result) result.visited = visited;
  return result;
}
