import type { ScenePlace } from "../components/SceneFractalExplorer";
import { MOSELY_KOCH_VIEW } from "./moselyKochView";
import { exteriorFlightCamera, initialFlightCamera, restoreFlightCamera } from "./voxelZoom/camera";

export const MOSELY_PLACES: ScenePlace<"lighter" | "heavier">[] = [
  {
    label: "Default view",
    detail: "See the whole lattice from outside.",
    camera: initialFlightCamera,
  },
  {
    label: "Face-on lattice",
    detail: "Look straight at one face to see its rows of smaller squares.",
    camera: (pattern) => exteriorFlightCamera(pattern, 0, 0),
  },
  {
    label: "Koch opening",
    detail: "Look out from the airy lattice's center through a snowflake-shaped opening.",
    variant: "lighter",
    camera: () => restoreFlightCamera(MOSELY_KOCH_VIEW.voxelCamera, "mosely-light"),
  },
];
