import type { ConstructionLead } from "../constructionLead";

/** How many lines Y and X draw after some rounds of replacing. */
export function fern2Lines(rounds: number) {
  let [y, x] = [0, 0];
  for (let round = 0; round < rounds; round++) [y, x] = [3 * y + 1 + x, 2 * x + 7];
  return { y, x };
}

const OLD_TINT = "#ffd23f";
const STEM_TINT = "#eee8ce";
const COPY_TINT = "#3cf7d2";

/**
 * Where each part of the walk ends, counted in lines. Y's rule reads as the old plant, more stem,
 * and two turned copies of the old plant.
 */
export function fern2Parts(oldPlant: unknown, rounds: number) {
  if (oldPlant !== "tint" || rounds < 1) return null;
  const { y, x } = fern2Lines(rounds - 1);
  return {
    ends: [y, y + 1 + x, 2 * y + 1 + x, 3 * y + 1 + x],
    tints: [OLD_TINT, STEM_TINT, COPY_TINT, COPY_TINT],
  };
}

const number = (value: number) => value.toLocaleString("en-US");

export const FERN2_LEAD: ConstructionLead = {
  initial: { oldPlant: "tint" },
  control: {
    kind: "options",
    path: "oldPlant",
    label: "Tint",
    options: [
      { value: "tint", label: "Old and new" },
      { value: "plain", label: "One color" },
    ],
  },
  // The figure's level 1 is the starting Y, so its level is one above the rounds of replacing.
  readout: (view, level) => {
    const { y, x } = fern2Lines(level - 2);
    const tint = (color: string) => (view.oldPlant === "tint" ? color : undefined);
    return [
      { label: "Old plant", value: number(y), tint: tint(OLD_TINT) },
      { label: "New stem", value: number(1 + x), tint: tint(STEM_TINT) },
      { label: "Two copies", value: number(2 * y), tint: tint(COPY_TINT) },
    ];
  },
};
