import { CLASSIC_FERN_MATRIX } from "./barnsleyFern";

export type FernStyle = "tree" | "fishbone" | "culcita" | "cyclosorus" | "barnsley";
export type FernPreset = { matrix: number[][] };

const barnsley: FernPreset = {
  matrix: CLASSIC_FERN_MATRIX,
};

const cyclosorus: FernPreset = {
  matrix: [
    [0, 0, 0, 0.25, 0, -0.4, 0.02],
    [0.95, 0.005, -0.005, 0.93, -0.002, 0.5, 0.84],
    [0.035, -0.2, 0.16, 0.04, -0.09, 0.02, 0.07],
    [-0.04, 0.2, 0.16, 0.04, 0.083, 0.12, 0.07],
  ],
};

const culcita: FernPreset = {
  matrix: [
    [0, 0, 0, 0.25, 0, -0.14, 0.02],
    [0.85, 0.02, -0.02, 0.83, 0, 1, 0.84],
    [0.09, -0.28, 0.3, 0.11, 0, 0.6, 0.07],
    [-0.09, 0.28, 0.3, 0.09, 0, 0.7, 0.07],
  ],
};

const fishbone: FernPreset = {
  matrix: [
    [0, 0, 0, 0.25, 0, -0.4, 0.02],
    [0.95, 0.002, -0.002, 0.93, -0.002, 0.5, 0.84],
    [0.035, -0.11, 0.27, 0.01, -0.05, 0.005, 0.07],
    [-0.04, 0.11, 0.27, 0.01, 0.047, 0.06, 0.07],
  ],
};

const tree: FernPreset = {
  matrix: [
    [0, 0, 0, 0.5, 0, 0, 0.05],
    [0.42, -0.42, 0.42, 0.42, 0, 0.2, 0.4],
    [0.42, 0.42, -0.42, 0.42, 0, 0.2, 0.4],
    [0.1, 0, 0, 0.1, 0, 0.2, 0.15],
  ],
};

export const FERN_PRESETS: Record<FernStyle, FernPreset> = {
  tree,
  fishbone,
  culcita,
  cyclosorus,
  barnsley,
};

export const FERN_OPTIONS = Object.keys(FERN_PRESETS) as FernStyle[];
export const FERN_LABELS: Record<FernStyle, string> = {
  tree: "Tree fern",
  fishbone: "Fishbone fern",
  culcita: "Culcita",
  cyclosorus: "Cyclosorus",
  barnsley: "Classic Barnsley",
};
