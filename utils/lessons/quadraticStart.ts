import { type ConstructionLead, formatShare } from "../constructionLead";

/** The square the rule starts from: one or two drawing steps along each side. */
export const QUADRATIC_STARTS: Record<string, string> = {
  two: "FF+FF+FF+FF",
  one: "F+F+F+F",
};

/**
 * The share of the starting square still inside the line after some replacements. Every line goes
 * on to lose the right triangle built on it. Each replacement takes the notch out of that triangle
 * and leaves five smaller triangles, 5/9 of what was there.
 */
export function quadraticAreaLeft(stepsPerSide: number, replacements: number) {
  return 1 - 1 / stepsPerSide + (5 / 9) ** replacements / stepsPerSide;
}

/**
 * The tip of the right triangle whose long side is the line from a to b, in screen coordinates. The
 * line walks clockwise on screen, so the inside of the square is on its right.
 */
export function notchTriangleTip(ax: number, ay: number, bx: number, by: number) {
  return [(ax + bx - (by - ay)) / 2, (ay + by + (bx - ax)) / 2];
}

export const QUADRATIC_LEAD: ConstructionLead = {
  initial: { start: "two", notchRoom: true },
  control: {
    kind: "options",
    path: "start",
    label: "Start",
    options: [
      { value: "two", label: "Two steps per side" },
      { value: "one", label: "One step per side" },
    ],
  },
  // Level 1 is the starting square itself.
  readout: (view, level) => [
    {
      label: "Area left",
      value: formatShare(quadraticAreaLeft(view.start === "one" ? 1 : 2, level - 1)),
    },
  ],
};
