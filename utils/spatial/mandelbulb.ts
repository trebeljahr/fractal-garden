import type { Orientation } from "../orientation";
import {
  cameraTarget,
  FOCAL_SCALE,
  inverseRotate,
  relativeNumber,
  rotationOf,
  type SpatialCamera,
  type Vec3,
} from "./camera";
export type BulbView = {
  power: number;
  detail: number;
  cameraDistance: number;
  offsetX: number;
  offsetY: number;
  rotationX: number;
  rotationY: number;
  grab?: Orientation;
};
export const MAX_BULB_ZOOM = 12;
/** CPU counterpart of the shader, used only to anchor a wheel gesture to the visible surface. */
export function bulbDistance(position: Vec3, power: number, detail: number) {
  let [x, y, z] = position,
    derivative = 1,
    radius = Math.hypot(x, y, z);
  for (let i = 0; i < detail && radius <= 2; i++) {
    const safe = Math.max(radius, 0.0001),
      theta = Math.acos(Math.max(-1, Math.min(1, z / safe))) * power,
      phi = Math.atan2(y, x) * power,
      raised = safe ** power;
    derivative = safe ** (power - 1) * power * derivative + 1;
    x = raised * Math.sin(theta) * Math.cos(phi) + position[0];
    y = raised * Math.sin(theta) * Math.sin(phi) + position[1];
    z = raised * Math.cos(theta) + position[2];
    radius = Math.hypot(x, y, z);
  }
  return (0.5 * Math.log(Math.max(radius, 0.0001)) * radius) / derivative;
}
export function bulbTarget(camera: SpatialCamera, view: BulbView): Vec3 {
  const t = cameraTarget(camera).map((v) => relativeNumber(v, camera.bits, 0) * 0.5) as Vec3;
  return [t[0] + view.offsetX, t[1] + view.offsetY, t[2]];
}
export function pickBulbPoint(
  camera: SpatialCamera,
  view: BulbView,
  x: number,
  y: number,
  width: number,
  height: number,
): Vec3 | null {
  const scale = 0.5 * 2 ** -camera.zoom,
    target = bulbTarget(camera, view),
    rotation = rotationOf(view),
    offset = inverseRotate([0, 0, view.cameraDistance * 2 * scale], rotation);
  const origin = target.map((v, i) => v + offset[i]) as Vec3;
  let direction = inverseRotate(
    [
      (x - width / 2) / (Math.min(width, height) * FOCAL_SCALE),
      -(y - height / 2) / (Math.min(width, height) * FOCAL_SCALE),
      -1,
    ],
    rotation,
  );
  const length = Math.hypot(...direction);
  direction = direction.map((v) => v / length) as Vec3;
  const b = origin.reduce((s, v, i) => s + v * direction[i], 0),
    c = origin.reduce((s, v) => s + v * v, 0) - 1.25 ** 2,
    h = b * b - c;
  if (h < 0) return null;
  let distance = Math.max(0, -b - Math.sqrt(h));
  const far = -b + Math.sqrt(h),
    detail = Math.min(48, view.detail + Math.ceil(camera.zoom * 2));
  for (let i = 0; i < 256 && distance <= far; i++) {
    const point = origin.map((v, j) => v + direction[j] * distance) as Vec3,
      d = bulbDistance(point, view.power, detail);
    if (d < Math.max((distance / Math.min(width, height)) * 0.5, 2e-7)) {
      const relative = point.map((v, j) => (v - target[j]) / scale);
      return [0, 1, 2].map(
        (j) =>
          rotation[j * 3] * relative[0] +
          rotation[j * 3 + 1] * relative[1] +
          rotation[j * 3 + 2] * relative[2],
      ) as Vec3;
    }
    distance += d;
  }
  return null;
}
