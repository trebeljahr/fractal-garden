import { type ConstructionLead, formatShare } from "../constructionLead";

/** How long each of the four new lines is, as a share of the line they replace. */
export const cesaroLine = (angle: number) => 1 / (2 + 2 * Math.cos((angle * Math.PI) / 180));

/** The angle at the tip of the notch. */
export const cesaroTip = (angle: number) => 180 - 2 * angle;

export const CESARO_LEAD: ConstructionLead = {
  control: {
    kind: "range",
    path: "angle",
    label: "Angle",
    min: 60,
    max: 90,
    step: 1,
    format: (value) => `${value}°`,
  },
  readout: (view, level) => {
    const angle = view.angle as number;
    const rows = [
      { label: "Each new line", value: formatShare(cesaroLine(angle)) },
      { label: "Notch tip", value: `${cesaroTip(angle)}°` },
    ];
    if (angle === 90) rows.push({ label: "Grid", value: `${2 ** level} × ${2 ** level}` });
    return rows;
  },
};
