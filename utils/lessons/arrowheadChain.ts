import { type ConstructionLead, formatShare } from "../constructionLead";

const TRIANGLE_HEIGHT = Math.sqrt(3) / 2;

/**
 * The corner of a line's small triangle that the pen never touches, in turtle coordinates. Generation
 * 0 is the single first line. The triangles lie on alternate sides of the pen, starting from a side
 * that flips with each generation.
 */
export function untouchedCorner(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  line: number,
  generation: number,
): [number, number] {
  const side = (line + generation) % 2 ? TRIANGLE_HEIGHT : -TRIANGLE_HEIGHT;
  return [(ax + bx) / 2 - side * (by - ay), (ay + by) / 2 + side * (bx - ax)];
}

/** Level 1 is the first line. Each level replaces every line with three. */
export const arrowheadLines = (level: number) => 3 ** (level - 1);

/** The line stays one small triangle's height from the dot, here as a share of the big side. */
export const lineToDot = (level: number) => TRIANGLE_HEIGHT / 2 ** (level - 1);

export const ARROWHEAD_LEAD: ConstructionLead = {
  initial: { smallTriangles: true },
  control: {
    kind: "options",
    path: "smallTriangles",
    label: "Show",
    options: [
      { value: true, label: "Triangles" },
      { value: false, label: "Line only" },
    ],
  },
  readout: (view, level) => {
    const count = arrowheadLines(level).toLocaleString("en-US");
    const rows = [{ label: "Lines", value: count }];
    if (!view.smallTriangles) return rows;
    rows.push({ label: "Small triangles", value: count });
    if (level > 1)
      rows.push({ label: "Line to dot", value: `${formatShare(lineToDot(level))} of side` });
    return rows;
  },
};
