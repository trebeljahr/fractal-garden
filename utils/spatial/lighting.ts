import { fixedFromNumber } from "../deepZoom/math";
import type { Orientation } from "../orientation";
import { CAMERA_DISTANCE, relativeNumber, type SpatialCamera } from "./camera";

/** Front of a fixed model-space enclosure, independent of the visible mesh or LOD. */
export function spatialReliefFront(camera: SpatialCamera, rotation: Orientation) {
  // Subtract in fixed point before scaling: a nearby plane must survive deep zoom.
  const corner = camera.target.map((value, axis) => {
    const bound = rotation[6 + axis] >= 0 ? 1.6 : -1.6;
    return relativeNumber(
      fixedFromNumber(bound, camera.bits) - BigInt(value),
      camera.bits,
      camera.zoom,
    );
  });
  const front =
    CAMERA_DISTANCE - rotation[6] * corner[0] - rotation[7] * corner[1] - rotation[8] * corner[2];
  return Math.max(0, front);
}
