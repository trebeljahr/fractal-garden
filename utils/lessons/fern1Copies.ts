import type { ConstructionLead } from "../constructionLead";

const X_RULE = "F+[[X]-X]-F[-FX]+X";

export function fern1Rules(settings: Record<string, unknown>): Record<string, string> {
  return settings.stems === "same" ? { X: X_RULE } : { X: X_RULE, F: "FF" };
}

/** How many lines one stem and one copy hold after some rounds of replacing. */
export function fern1Lines(stems: unknown, rounds: number) {
  const stem = stems === "same" ? 1 : 2 ** (rounds - 1);
  let copy = 0;
  for (let round = 0; round < rounds - 1; round++)
    copy = 3 * (stems === "same" ? 1 : 2 ** round) + 4 * copy;
  return { stem, copy, all: 3 * stem + 4 * copy };
}

const STEM_TINT = "#eee8ce";
const COPY_TINTS = ["#adff00", "#f7b267", "#9ab8ff", "#f28fb1"];

/**
 * Where each part of the walk ends, counted in lines. X's rule reads as a stem, two copies, a stem,
 * a stem into a copy, and a last copy.
 */
export function fern1Parts(stems: unknown, rounds: number) {
  if (stems === undefined || rounds < 1) return null;
  const { stem, copy } = fern1Lines(stems, rounds);
  let total = 0;
  return {
    ends: [stem, copy, copy, stem, stem, copy, copy].map((lines) => (total += lines)),
    tints: [
      STEM_TINT,
      COPY_TINTS[0],
      COPY_TINTS[1],
      STEM_TINT,
      STEM_TINT,
      COPY_TINTS[2],
      COPY_TINTS[3],
    ],
  };
}

const number = (value: number) => value.toLocaleString("en-US");

export const FERN1_LEAD: ConstructionLead = {
  initial: { stems: "double" },
  control: {
    kind: "options",
    path: "stems",
    label: "F rule",
    options: [
      { value: "double", label: "F → FF" },
      { value: "same", label: "F stays F" },
    ],
  },
  // The figure's level 1 is the starting X, so its level is one above the rounds of replacing.
  readout: (view, level) => {
    const { stem, copy, all } = fern1Lines(view.stems, level - 1);
    return [
      { label: "All lines", value: number(all) },
      { label: "Each copy", value: number(copy) },
      { label: "Each stem", value: number(stem) },
    ];
  },
};
