import { type ConstructionLead, formatShare } from "../constructionLead";

/** One tint per copy, in the order the path walks them. The first is the explorer's color. */
export const GOSPER_COPY_TINTS = [
  "#89f7d1",
  "#f7b267",
  "#9ab8ff",
  "#f28fb1",
  "#d8e99c",
  "#c79bff",
  "#6fd3f3",
];

export const GOSPER_LEAD: ConstructionLead = {
  initial: { copies: "seven" },
  control: {
    kind: "options",
    path: "copies",
    label: "Tint",
    options: [
      { value: "seven", label: "Seven copies" },
      { value: "one", label: "One color" },
    ],
  },
  readout: (_view, level) => [
    { label: "Lines in each copy", value: (7 ** (level - 1)).toLocaleString("en-US") },
    { label: "Each copy's size", value: formatShare(1 / Math.sqrt(7)) },
  ],
};
