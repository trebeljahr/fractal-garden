import type { ScenePlace } from "../components/SceneFractalExplorer";
import { fixedFromNumber } from "./deepZoom/math";
import { MOSELY_KOCH_VIEW } from "./moselyKochView";
import { exteriorFlightCamera, initialFlightCamera, restoreFlightCamera } from "./voxelZoom/camera";

export const MOSELY_PLACES: ScenePlace<"lighter" | "heavier">[] = [
  {
    label: "Whole snowflake",
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
  {
    label: "Inside the dense lattice",
    detail: "Enter a smaller cavity in the dense lattice and look toward a corner.",
    variant: "heavier",
    camera: () =>
      restoreFlightCamera(
        {
          ...MOSELY_KOCH_VIEW.voxelCamera,
          position: Array(3).fill(fixedFromNumber(-1 / 8, 160).toString(16)),
        },
        "mosely-heavy",
      ),
  },
];
