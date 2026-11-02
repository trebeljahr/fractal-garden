import { expandLSystem, traceTurtle } from "../turtleCurve";

/** One closed turtle route, split into its four sides. */
export function levyTapestrySides(round: number) {
  const word = expandLSystem("F++F++F++F", { F: "-F++F-" }, round);
  const { points } = traceTurtle(word, { "+": 45, "-": -45 }, 0);
  const strokes = 2 ** round;
  return Array.from({ length: 4 }, (_, side) => {
    const start = side * strokes * 2;
    return points.slice(start, start + (strokes + 1) * 2);
  });
}

/** How many strokes the pen makes, and how many different edges they cover. */
export function levyTapestryEdges(round: number) {
  const seen = new Set<string>();
  let strokes = 0;
  for (const side of levyTapestrySides(round)) {
    for (let i = 2; i < side.length; i += 2) {
      const a = `${Math.round(side[i - 2] * 2)},${Math.round(side[i - 1] * 2)}`;
      const b = `${Math.round(side[i] * 2)},${Math.round(side[i + 1] * 2)}`;
      seen.add(a < b ? `${a}|${b}` : `${b}|${a}`);
      strokes++;
    }
  }
  return { strokes, edges: seen.size };
}
