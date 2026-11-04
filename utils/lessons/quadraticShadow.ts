import { type ConstructionLead, formatShare } from "../constructionLead";
import { expandLSystem, traceTurtle } from "../turtleCurve";
import { notchTriangleTip } from "./quadraticStart";

/** The shadow draws no faces, so it goes further than the solid's three levels. */
export const SHADOW_LEVELS = 5;
// Past this the lines between triangles blur together and hide the gaps.
const LAST_LEVEL_WITH_TRIANGLES = 3;

/** Surface area, as a share of the starting cube's. Nine squares become thirteen. */
export const surfaceArea = (level: number) => (13 / 9) ** level;

/** Volume, as a share of the starting cube's: 6 * 13^k added cubes of width 3^-(k+1) at level k+1. */
export const solidVolume = (level: number) => 1 + (3 / 7) * (1 - (13 / 27) ** level);

/** Shadow area, as a share of a face's. The rest of the diamond is (5/9)^level, and the diamond is 2. */
export const shadowArea = (level: number) => 2 - (5 / 9) ** level;

/**
 * The shadow's outline as a flat [x, y, ...] list in whole steps. The face is 3^level steps wide
 * with a corner at the origin. Bumps turn right, away from the inside of the counterclockwise walk.
 */
export function shadowOutline(level: number) {
  const walk = expandLSystem("F+F+F+F", { F: "F-F+F+F-F" }, level);
  return traceTurtle(walk, { "+": 90, "-": -90 }).points.map(Math.round);
}

/** The triangles still empty: one on the outer side of each line, with that line as its long side. */
export function shadowGaps(outline: number[]) {
  const gaps: number[][] = [];
  for (let i = 0; i + 3 < outline.length; i += 2) {
    const [ax, ay, bx, by] = outline.slice(i, i + 4);
    gaps.push([ax, ay, bx, by, ...notchTriangleTip(bx, by, ax, ay)]);
  }
  return gaps;
}

const loop = (points: number[]) => {
  let path = `M${points[0]} ${points[1]}`;
  for (let i = 2; i < points.length; i += 2) path += `L${points[i]} ${points[i + 1]}`;
  return `${path}Z`;
};

/** SVG paths for the figure, in the same whole steps as the outline. */
export function shadowPaths(level: number) {
  const outline = shadowOutline(level);
  return {
    outline: loop(outline),
    gaps: level > LAST_LEVEL_WITH_TRIANGLES ? "" : shadowGaps(outline).map(loop).join(""),
  };
}

export const QUADRATIC_SHADOW_LEAD: ConstructionLead = {
  initial: { show: "solid" },
  control: {
    kind: "options",
    path: "show",
    label: "Show",
    options: [
      { value: "solid", label: "Solid" },
      { value: "shadow", label: "Shadow" },
    ],
  },
  readout: (view, level) =>
    view.show === "shadow"
      ? [
          { label: "Shadow area", value: `${shadowArea(level).toFixed(2)} × the face` },
          { label: "Diamond filled", value: formatShare(shadowArea(level) / 2) },
        ]
      : [
          { label: "Surface area", value: `${surfaceArea(level).toFixed(2)} × the cube's` },
          { label: "Volume", value: `${solidVolume(level).toFixed(2)} × the cube's` },
        ],
};
