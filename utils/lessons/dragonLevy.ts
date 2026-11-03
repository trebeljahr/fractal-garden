import type { ConstructionLead } from "../constructionLead";

export const DRAGON_LEAD: ConstructionLead = {
  initial: { rule: "dragon" },
  control: {
    kind: "options",
    path: "rule",
    label: "Rule",
    options: [
      { value: "dragon", label: "Dragon" },
      { value: "levy", label: "Lévy" },
    ],
  },
  readout: (view, level) => [
    {
      label: "New corners turn",
      value: level < 2 ? "left" : view.rule === "levy" ? "always left" : "left, right in turn",
    },
  ],
};
