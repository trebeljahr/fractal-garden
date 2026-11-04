import { type ConstructionLead, formatShare } from "../constructionLead";

export const LOOP_INSIDE_TINT = "#f7ad1c";
export const LOOP_OUTSIDE_TINT = "#6fb7f2";

/*
 * Level 1 is one small square. Each next level is four copies of the last, set against the sides
 * of a 3 by 3 square. So the width doubles and gains 3, and the inside multiplies by 4 and gains 9.
 */
export const loopWidth = (level: number) => 2 ** (level + 1) - 3;
export const loopInside = (level: number) => 4 ** level - 3;

/** How many small squares fit in the staircase diamond of this width. */
export const diamondSquares = (width: number) => (width * width + 1) / 2;

/** How far the farthest spot in the diamond is from the line: the middle of a 3 by 3 square. */
export const loopFarthest = (level: number) => (level === 1 ? 0.5 : Math.sqrt(2.5));

/**
 * The staircase around the diamond, in steps from its center, x right and y down. A quarter of the
 * way around is the same stairs turned 90 degrees.
 */
export function staircaseDiamond(width: number) {
  const reach = (width - 1) / 2;
  const quarter: [number, number][] = [];
  for (let i = 0; i < reach; i++)
    quarter.push([i - 0.5, i - reach - 0.5], [i + 0.5, i - reach - 0.5]);
  quarter.push([reach - 0.5, -0.5]);
  const corners: [number, number][] = [];
  for (let turn = 0; turn < 4; turn++)
    for (const [x, y] of quarter) {
      const [a, b] = [
        [x, y],
        [-y, x],
        [-x, -y],
        [y, -x],
      ][turn];
      corners.push([a, b]);
    }
  return corners;
}

export const SIERPINSKI_CURVE_LEAD: ConstructionLead = {
  initial: { loopRegions: true },
  control: {
    kind: "options",
    path: "loopRegions",
    label: "Show",
    options: [
      { value: true, label: "Inside and outside" },
      { value: false, label: "Line alone" },
    ],
  },
  readout: (_view, level) => {
    const width = loopWidth(level);
    const inside = loopInside(level) / diamondSquares(width);
    return [
      { label: "Width", value: width === 1 ? "1 step" : `${width} steps` },
      { label: "Farthest from the line", value: `${loopFarthest(level).toFixed(1)} steps` },
      { label: "Inside", value: formatShare(inside), tint: LOOP_INSIDE_TINT },
      { label: "Outside", value: formatShare(1 - inside), tint: LOOP_OUTSIDE_TINT },
    ];
  },
};
