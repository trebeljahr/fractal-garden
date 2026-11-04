import type { ConstructionLead } from "../constructionLead";

/** Level 0 is the string `0`. Level −1 stands for the string `1`, which level 5 needs. */
export function fibonacciLines(level: number) {
  let [before, lines] = [1, 1];
  for (let i = 0; i < level; i++) [before, lines] = [lines, lines + before];
  return lines;
}

/** Where the walk ends, using the page's rule: after a 0, right at odd positions, left at even. */
export function fibonacciEnd(level: number, angle: number) {
  let [before, word] = ["1", "0"];
  for (let i = 0; i < level; i++) [before, word] = [word, word + before];
  const turn = (angle * Math.PI) / 180;
  let [x, y, heading] = [0, 0, 0];
  for (let i = 0; i < word.length; i++) {
    x += Math.cos(heading);
    y += Math.sin(heading);
    if (word[i] === "0") heading += (i + 1) % 2 === 0 ? turn : -turn;
  }
  return [x, y];
}

/** How far the walk ends from where it started. Whole numbers stay exact. */
export function fibonacciDistance(level: number, angle: number) {
  const distance = Math.hypot(...fibonacciEnd(level, angle));
  return Math.abs(distance - Math.round(distance)) < 1e-6 ? Math.round(distance) : distance;
}

const TWO_TINTS = ["#f3d26d", "#9ab8ff"];
/** Sideways, along, small, along, sideways. */
const FIVE_TINTS = ["#9ab8ff", "#f3d26d", "#f28fb1", "#f3d26d", "#9ab8ff"];

/** Where each tinted part of the path ends, counted in lines, or null for one color. */
export function fibonacciParts(parts: unknown, level: number) {
  if (parts === "two")
    return {
      ends: [fibonacciLines(level - 1), fibonacciLines(level)],
      tints: TWO_TINTS,
    };
  if (parts !== "five" || level < 5) return null;
  const copy = fibonacciLines(level - 3);
  const small = fibonacciLines(level - 6);
  return {
    ends: [copy, 2 * copy, 2 * copy + small, 3 * copy + small, 4 * copy + small],
    tints: FIVE_TINTS,
  };
}

const whole = (value: number) => value.toLocaleString("en-US");
const measure = (value: number) => (Number.isInteger(value) ? whole(value) : value.toFixed(2));

export const FIBONACCI_LEAD: ConstructionLead = {
  initial: { parts: "two" },
  control: {
    kind: "options",
    path: "parts",
    label: "Tint",
    options: [
      { value: "two", label: "Two strings" },
      { value: "five", label: "Five pieces" },
      { value: "one", label: "One color" },
    ],
  },
  readout: (view, level) => {
    const lines = fibonacciLines(level);
    if (view.parts === "two") {
      const first = fibonacciLines(level - 1);
      const second = lines - first;
      return [
        { label: "Joined", value: `${whole(first)} + ${whole(second)} lines` },
        {
          label: "Second string",
          value: second === 1 ? "one line" : first % 2 ? "mirror image" : "same turns",
        },
      ];
    }
    const angle = view.angle as number;
    const distance = fibonacciDistance(level, angle);
    const rows = [
      {
        label: "Lines",
        value:
          level < 5
            ? whole(lines)
            : `${whole(lines)} = 4 × ${whole(fibonacciLines(level - 3))} + ${whole(fibonacciLines(level - 6))}`,
      },
      {
        label: "Start to end",
        value:
          angle === 90 && level >= 6 && level % 3 === 0
            ? `${measure(distance)} = 2 × ${measure(fibonacciDistance(level - 3, angle))} + ${measure(fibonacciDistance(level - 6, angle))}`
            : measure(distance),
      },
    ];
    if (level >= 4)
      rows.push({
        label: "In three levels",
        value: `lines × ${(lines / fibonacciLines(level - 3)).toFixed(3)}, distance × ${(distance / fibonacciDistance(level - 3, angle)).toFixed(3)}`,
      });
    return rows;
  },
};
