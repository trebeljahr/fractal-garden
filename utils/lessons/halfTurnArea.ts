import { type ConstructionLead, formatShare } from "../constructionLead";

export const REMOVED_TINT = "#f7ad1c";
export const ADDED_TINT = "#6fb7f2";

export type HalfTurnRule = {
  rule: string;
  /** How many times shorter each new line is than the line it replaces. */
  shrink: number;
  /** The small squares in the detour on each side of the old line. */
  detourSquares: number;
  /** What the first detour does to the area, walking the island the way this page's start does. */
  firstDetour: "added" | "removed";
  /** The explorer's color for this line. */
  color: string;
};

export const HALF_TURN_RULES: Record<string, HalfTurnRule> = {
  minkowski: {
    rule: "F+F-F-FF+F+F-F",
    shrink: 4,
    detourSquares: 1,
    firstDetour: "removed",
    color: "#ff8fab",
  },
};

/** How many new lines replace one old line. */
export const replacementLines = ({ rule }: HalfTurnRule) => rule.replace(/[^F]/g, "").length;

/** The line's length at this level, as a multiple of its length at the start. */
export const lineGrowth = (rule: HalfTurnRule, level: number) =>
  (replacementLines(rule) / rule.shrink) ** level;

/**
 * The share of the starting square that this level adds, and also the share it removes. Every line
 * of the level before has one detour of each kind.
 */
export const areaMoved = (rule: HalfTurnRule, level: number) =>
  (4 * replacementLines(rule) ** (level - 1) * rule.detourSquares) / rule.shrink ** (2 * level);

/**
 * Each detour as the run of lines that draws it. A replacement's middle point lies on its old line,
 * so the lines before that point and the old line close around one detour, and those after it
 * around the other.
 */
export function detourRuns(lines: number, rule: HalfTurnRule) {
  const steps = replacementLines(rule);
  const runs: { from: number; to: number; effect: "added" | "removed" }[] = [];
  const second = rule.firstDetour === "added" ? "removed" : "added";
  for (let start = 0; start + steps <= lines; start += steps) {
    runs.push({ from: start, to: start + steps / 2, effect: rule.firstDetour });
    runs.push({ from: start + steps / 2, to: start + steps, effect: second });
  }
  return runs;
}

/** One replacement in whole steps, with its middle point at (0, 0) and y pointing up. */
export function replacementPoints({ rule }: HalfTurnRule) {
  let [x, y, dx, dy] = [0, 0, 1, 0];
  const points = [[x, y]];
  for (const symbol of rule) {
    if (symbol === "F") {
      x += dx;
      y += dy;
      points.push([x, y]);
    } else [dx, dy] = symbol === "+" ? [-dy, dx] : [dy, -dx];
  }
  const [middleX, middleY] = points[(points.length - 1) / 2];
  return points.map(([px, py]) => [px - middleX, py - middleY]);
}

/** Symbols shown in a row of the player, fewer than its usual 80: the picture is the point here. */
const SYMBOL_WIDTH = 40;

export const MINKOWSKI_LEAD: ConstructionLead = {
  initial: { detours: "minkowski", symbolWidth: SYMBOL_WIDTH },
  control: {
    kind: "options",
    path: "island",
    label: "Start",
    options: [
      { value: false, label: "One line" },
      { value: true, label: "Around a square" },
    ],
  },
  readout: (view, level) => {
    const rule = HALF_TURN_RULES.minkowski;
    const length = { label: "Line length", value: `×${lineGrowth(rule, level)}` };
    if (!view.island) return [length];
    const moved = formatShare(areaMoved(rule, level));
    return [
      length,
      { label: "Removed", value: moved, tint: REMOVED_TINT },
      { label: "Added", value: moved, tint: ADDED_TINT },
      { label: "Area", value: "100%" },
    ];
  },
};
