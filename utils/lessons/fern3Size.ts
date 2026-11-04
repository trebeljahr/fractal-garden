import type { ConstructionLead } from "../constructionLead";
import { expand, interpret } from "../lsystem/engine";
import { DEFAULT_SPEC } from "../lsystem/spec";

const SPEC = {
  ...DEFAULT_SPEC,
  axiom: "F",
  rules: [{ symbol: "F", replacement: "F[+FF][-FF]F[-F][+F]F" }],
  angle: 22.5,
  startAngle: 0,
};

/** The rule's nine F's, by position: these three are the stem, the old line in three steps. */
const STEM_STEPS = new Set([0, 5, 8]);

/** Whether a pen stroke lies along a line of the level before. */
export const fern3KeepsOldLine = (stroke: number) => STEM_STEPS.has(stroke % 9);

const KEPT_TINT = "#ffd23f";

/** The tints for kept lines and new lines, or null for one color. */
export function fern3Tints(keptLines: unknown, rounds: number, color: string) {
  return keptLines === "tint" && rounds > 0 ? [KEPT_TINT, color] : null;
}

const sizes = new Map<number, { lines: number; height: number; width: number }>();

/** The fern's size in lengths of the first line. Level 1 of the figure is that line. */
export function fern3Size(level: number) {
  const known = sizes.get(level);
  if (known) return known;
  const rounds = level - 1;
  const { positions, count } = interpret(expand(SPEC, rounds).sentence, SPEC, { legacy2d: true });
  let [left, right, top] = [0, 0, 0];
  for (let i = 3; i < count * 6; i += 6) {
    left = Math.min(left, positions[i]);
    right = Math.max(right, positions[i]);
    top = Math.max(top, positions[i + 1]);
  }
  const size = { lines: count, height: top / 3 ** rounds, width: (right - left) / 3 ** rounds };
  sizes.set(level, size);
  return size;
}

export const FERN3_LEAD: ConstructionLead = {
  initial: { keptLines: "tint" },
  control: {
    kind: "options",
    path: "keptLines",
    label: "Tint",
    options: [
      { value: "tint", label: "Old lines" },
      { value: "plain", label: "One color" },
    ],
  },
  readout: (_view, level) => {
    const { lines, height, width } = fern3Size(level);
    return [
      { label: "Height", value: height.toFixed(3) },
      { label: "Width", value: width.toFixed(3) },
      { label: "Lines", value: lines.toLocaleString("en-US") },
    ];
  },
};
