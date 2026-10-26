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
          {
            label: "Smaller tunnels",
            detail: "Explore the sponge fifteen levels down.",
            camera: () =>
              restoreFlightCamera(
                {
                  kind: "voxel-flight",
                  position: [
                    "3fffdc50ce265c34a91a3183f5b0534324c8b6e0cd6fd8cd2",
                    "3b7eb1a2f49033420734d0a47cbd6f0f547625cdfcf1fefd1",
                    "3fda8b30013abc811017423151519452405a4ef36943ce368",
                  ],
                  bits: 194,
                  level: 15,
                  viewLevel: 0,
                  navigationLevel: 15.275740883672698,
                  atmosphereLevel: 15.6193923459728,
                  atmosphereVelocity: -0.6798987707598482,
                  yaw: -2.2228981633974563,
                  pitch: 0.4545202913296138,
                },
                "menger",
              ),
          },
        ]
      : []),
  ];
}
