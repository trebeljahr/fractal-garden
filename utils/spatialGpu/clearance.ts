import { fixedFromNumber, rescaleFixed } from "../deepZoom/math";
import {
  type BigVec3,
  CAMERA_DISTANCE,
  cameraTarget,
  inverseRotate,
  relativeNumber,
  rotationOf,
  type SpatialCamera,
} from "../spatial/camera";
import type { SpatialStyle } from "../spatial/geometry";

function physicalEye(camera: SpatialCamera, style: SpatialStyle): BigVec3 {
  const offset = inverseRotate([0, 0, CAMERA_DISTANCE], rotationOf(style));
  return cameraTarget(camera).map(
    (v, i) => v + fixedFromNumber(offset[i] * 2 ** -camera.zoom, camera.bits),
  ) as BigVec3;
}

/** A distance lower bound at one point certifies a whole collision-free ball. */
export function createGpuClearanceCache() {
  let anchor:
    | { key: string; eye: BigVec3; bits: number; zoom: number; distance: number }
    | undefined;
  return {
    read(camera: SpatialCamera, style: SpatialStyle, key: string): number | null {
      if (!anchor || anchor.key !== key) return null;
      const certified = anchor;
      const eye = physicalEye(camera, style),
        bits = Math.max(camera.bits, anchor.bits);
      const delta = eye.map((v, i) =>
        relativeNumber(
          rescaleFixed(v, camera.bits, bits) - rescaleFixed(certified.eye[i], certified.bits, bits),
          bits,
          certified.zoom,
        ),
      );
      // Subtract before converting to doubles, including at zoom 240. The
      // rounding margin covers that conversion and the Euclidean norm.
      const travel =
        Math.hypot(...delta) * (1 + 8 * Number.EPSILON) + 4 * 2 ** (anchor.zoom - bits);
      if (travel > anchor.distance * 0.2) return null;
      const lower = (anchor.distance - travel) * 2 ** (camera.zoom - anchor.zoom);
      return lower > 0 && Number.isFinite(lower) ? lower : null;
    },
    write(camera: SpatialCamera, style: SpatialStyle, key: string, distance: number) {
      // A zero, failed or nearly unresolved query cannot certify a useful ball.
      const lower = distance - Math.max(0.000002, Math.abs(distance) * 0.000004);
      anchor =
        Number.isFinite(lower) && lower > 0
          ? {
              key,
              eye: physicalEye(camera, style),
              bits: camera.bits,
              zoom: camera.zoom,
              distance: lower,
            }
          : undefined;
    },
  };
}
