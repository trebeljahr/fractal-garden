import { fixedFromNumber, rescaleFixed } from "../deepZoom/math";
import { finite, isRecord } from "../explorerShare";
import { type Orientation, viewRotation } from "../orientation";

export type Vec3 = [number, number, number];
export type BigVec3 = [bigint, bigint, bigint];
export type SpatialCamera = {
  target: [string, string, string];
  bits: number;
  zoom: number;
  atmosphereZoom?: number;
  atmosphereVelocity?: number;
};
export const MAX_SPATIAL_ZOOM = 240;
export const INITIAL_SPATIAL_CAMERA: SpatialCamera = {
  target: ["0", "0", "0"],
  bits: 160,
  zoom: 0,
};
export const CAMERA_DISTANCE = 6;
export const FOCAL_SCALE = 1.8;
export const FAR_PLANE = 128;
export const NEAR_PLANE = 0.02;
export function readSpatialCamera(value: unknown): SpatialCamera {
  if (
    !isRecord(value) ||
    !finite(value.zoom, 0, MAX_SPATIAL_ZOOM) ||
    !Number.isInteger(value.bits) ||
    !finite(value.bits, 128, 512) ||
    !Array.isArray(value.target) ||
    value.target.length !== 3 ||
    !value.target.every((v) => typeof v === "string" && /^-?\d{1,160}$/.test(v))
  )
    throw new Error("Invalid spatial camera");
  if (
    (value.atmosphereZoom !== undefined && !finite(value.atmosphereZoom, 0, MAX_SPATIAL_ZOOM)) ||
    (value.atmosphereVelocity !== undefined && !finite(value.atmosphereVelocity, -1000, 1000))
  )
    throw new Error("Invalid flight atmosphere");
  const camera = value as SpatialCamera;
  if (camera.bits < Math.ceil(camera.zoom) + 128) throw new Error("Insufficient camera precision");
  const limit = BigInt(1000000) << BigInt(camera.bits);
  if (camera.target.some((v) => BigInt(v) > limit || BigInt(v) < -limit))
    throw new Error("Invalid spatial target");
  return camera;
}
export function cameraTarget(camera: SpatialCamera): BigVec3 {
  return camera.target.map(BigInt) as BigVec3;
}
export function bigPoint(point: Vec3, bits: number): BigVec3 {
  return point.map((v) => fixedFromNumber(v, bits)) as BigVec3;
}
export function relativeNumber(value: bigint, bits: number, zoom: number) {
  if (value === BigInt(0)) return 0;
  const drop = Math.max(0, (value < BigInt(0) ? -value : value).toString(2).length - 52);
  return Number(value >> BigInt(drop)) * 2 ** (drop - bits + zoom);
}
export function moveSpatialCamera(
  camera: SpatialCamera,
  delta: Vec3,
  nextZoom = camera.zoom,
): SpatialCamera {
  const zoom = Math.max(0, Math.min(MAX_SPATIAL_ZOOM, nextZoom));
  const bits = Math.max(160, Math.ceil(zoom) + 160);
  const target = cameraTarget(camera).map(
    (v, i) =>
      rescaleFixed(v, camera.bits, bits) + fixedFromNumber(delta[i] * 2 ** -camera.zoom, bits),
  );
  return { ...camera, target: target.map(String) as SpatialCamera["target"], bits, zoom };
}
export function inverseRotate(point: Vec3, rotation: Orientation): Vec3 {
  return [0, 1, 2].map(
    (i) => rotation[i] * point[0] + rotation[3 + i] * point[1] + rotation[6 + i] * point[2],
  ) as Vec3;
}
export function rotationOf(view: { rotationX: number; rotationY: number; grab?: Orientation }) {
  return viewRotation(view.rotationX, view.rotationY, view.grab);
}

/** Convert a picked point from the last completed worker frame to the live camera frame. */
export function reframeSpatialPoint(
  point: Vec3,
  from: SpatialCamera,
  fromRotation: Orientation,
  to: SpatialCamera,
  toRotation: Orientation,
): Vec3 {
  const absolute = cameraTarget(from).map(
    (v, i) =>
      rescaleFixed(v, from.bits, to.bits) +
      fixedFromNumber(inverseRotate(point, fromRotation)[i] * 2 ** -from.zoom, to.bits),
  );
  const target = cameraTarget(to),
    relative = absolute.map((v, i) => relativeNumber(v - target[i], to.bits, to.zoom));
  return [0, 1, 2].map(
    (i) =>
      toRotation[i * 3] * relative[0] +
      toRotation[i * 3 + 1] * relative[1] +
      toRotation[i * 3 + 2] * relative[2],
  ) as Vec3;
}

export type SpatialFrameTransform = { matrix: number[]; offset: Vec3; scale: number };
/** GPU-ready change of frame; only the small relative origin crosses into floating point. */
export function spatialFrameTransform(
  from: SpatialCamera,
  fromRotation: Orientation,
  to: SpatialCamera,
  toRotation: Orientation,
): SpatialFrameTransform {
  const matrix: number[] = [];
  for (let col = 0; col < 3; col++) {
    const axis = [0, 0, 0] as Vec3;
    axis[col] = 1;
    const world = inverseRotate(axis, fromRotation);
    for (let row = 0; row < 3; row++)
      matrix.push(
        toRotation[row * 3] * world[0] +
          toRotation[row * 3 + 1] * world[1] +
          toRotation[row * 3 + 2] * world[2],
      );
  }
  return {
    matrix,
    offset: reframeSpatialPoint([0, 0, 0], from, fromRotation, to, toRotation),
    scale: 2 ** (to.zoom - from.zoom),
  };
}
export function transformSpatialPoint(point: Vec3, transform: SpatialFrameTransform): Vec3 {
  const { matrix: m, offset, scale } = transform;
  return [0, 1, 2].map(
    (i) => (m[i] * point[0] + m[3 + i] * point[1] + m[6 + i] * point[2]) * scale + offset[i],
  ) as Vec3;
}
