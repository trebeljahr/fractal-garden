import type { ConstructionLead } from "../constructionLead";

/** The rule, and the same rule with its final plus moved inside the bracket before it. */
const OUTSIDE = "F[+X]F[-X]+X";
const INSIDE = "F[+X]F[-X+]X";

export function fern4Rules(settings: Record<string, unknown>) {
  return { X: settings.finalPlus === "inside" ? INSIDE : OUTSIDE, F: "FF" };
}

/** How far the top of the main stem has turned. The newest X draws nothing, so its turn doesn't show. */
export function fern4StemTurn(finalPlus: unknown, generation: number) {
  return finalPlus === "inside" ? 0 : 20 * Math.max(0, generation - 1);
}

export const FERN4_LEAD: ConstructionLead = {
  initial: { finalPlus: "outside" },
  control: {
    kind: "options",
    path: "finalPlus",
    label: "Final plus",
    options: [
      { value: "outside", label: "Plus outside" },
      { value: "inside", label: "Plus inside" },
    ],
  },
  readout: (view, level) => [
    { label: "Top of main stem", value: `turned ${fern4StemTurn(view.finalPlus, level - 1)}°` },
  ],
};
