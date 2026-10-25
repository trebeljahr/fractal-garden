import type { ScenePlace } from "../../components/SceneFractalExplorer";
import { DEFAULT_SPATIAL_PLACE } from "../spatial/places";
import {
  exteriorFlightCamera,
  initialFlightCamera,
  restoreFlightCamera,
  type VoxelPattern,
} from "./camera";

export function voxelPlaces<V extends string>(pattern: VoxelPattern): ScenePlace<V>[] {
  return [
    {
      ...DEFAULT_SPATIAL_PLACE,
      detail: "Return to the starting view.",
      camera: initialFlightCamera,
    },
    {
      label: "Corner view",
      detail: "Look along a diagonal of the cube.",
      camera: (pattern) =>
        exteriorFlightCamera(pattern, -Math.PI / 4, -Math.asin(1 / Math.sqrt(3))),
    },
    ...(pattern === "menger"
      ? [
          {
            label: "Inside a tunnel",
            detail: "Look through the center of the sponge.",
            camera: () =>
              restoreFlightCamera(
                {
                  kind: "voxel-flight",
                  position: ["0", "0", "0"],
                  bits: 160,
                  level: 0,
                  yaw: 0,
                  pitch: 0,
                },
                "menger",
              ),
          },
        ]
      : []),
  ];
}
