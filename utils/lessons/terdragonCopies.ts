import type { ConstructionLead } from "../constructionLead";
import { expand } from "../lsystem/engine";
import { DEFAULT_SPEC } from "../lsystem/spec";

/** One tint per copy, each copy turned 60 degrees from the last. The first is the explorer's color. */
export const TERDRAGON_COPY_TINTS = [
  "#7ee8a2",
  "#f7b267",
  "#9ab8ff",
  "#f28fb1",
  "#ffe27a",
  "#c79bff",
];

/** A grid corner is a·u + b·v, where u is the first line and v is u turned 60 degrees. */
const GRID_STEPS = [
  [1, 0],
  [0, 1],
  [-1, 1],
  [-1, 0],
  [0, -1],
  [1, -1],
];

/** How many lines a walk along the grid needs from the start to reach this corner. */
export const gridDistance = (a: number, b: number) =>
  Math.max(Math.abs(a), Math.abs(b), Math.abs(a + b));

/** A line's midpoint names it whichever way it is drawn. */
export const gridLineKey = (a: number, b: number, nextA: number, nextB: number) =>
  (a + nextA + 32768) * 65536 + (b + nextB + 32768);

/** How many times each line is drawn, walking the rule's own word in whole grid coordinates. */
export function terdragonLines(level: number, copies: number) {
  const word = expand(
    { ...DEFAULT_SPEC, axiom: "F", rules: [{ symbol: "F", replacement: "F+F-F" }] },
    level,
  ).sentence;
  const drawn = new Map<number, number>();
  for (let copy = 0; copy < copies; copy++) {
    let a = 0;
    let b = 0;
    let direction = copy;
    for (const symbol of word) {
      if (symbol === "+") direction = (direction + 2) % 6;
      else if (symbol === "-") direction = (direction + 4) % 6;
      else {
        const nextA = a + GRID_STEPS[direction][0];
        const nextB = b + GRID_STEPS[direction][1];
        const line = gridLineKey(a, b, nextA, nextB);
        drawn.set(line, (drawn.get(line) ?? 0) + 1);
        a = nextA;
        b = nextB;
      }
    }
  }
  return drawn;
}

/** The side, in lines, of the largest hexagon around the start with every grid line in it drawn. */
export function fullHexagonSide(drawn: Map<number, number>) {
  for (let side = 1; ; side++) {
    for (let a = -side; a <= side; a++) {
      for (let b = -side; b <= side; b++) {
        if (gridDistance(a, b) !== side) continue;
        for (const [stepA, stepB] of GRID_STEPS) {
          const nextA = a + stepA;
          const nextB = b + stepB;
          if (gridDistance(nextA, nextB) <= side && !drawn.has(gridLineKey(a, b, nextA, nextB)))
            return side - 1;
        }
      }
    }
  }
}

export type TerdragonCensus = {
  strokes: number;
  /** Lines drawn more than once. */
  twice: number;
  hexagonSide: number;
};

const censuses = new Map<string, TerdragonCensus>();

export function terdragonCensus(level: number, copies: number): TerdragonCensus {
  const key = `${level}:${copies}`;
  const known = censuses.get(key);
  if (known) return known;
  const drawn = terdragonLines(level, copies);
  let strokes = 0;
  let twice = 0;
  drawn.forEach((times) => {
    strokes += times;
    if (times > 1) twice++;
  });
  const census = { strokes, twice, hexagonSide: fullHexagonSide(drawn) };
  censuses.set(key, census);
  return census;
}

export const TERDRAGON_LEAD: ConstructionLead = {
  initial: { copies: 1, showOldLines: true, lineWidth: 1.25 },
  control: {
    kind: "range",
    path: "copies",
    label: "Copies",
    min: 1,
    max: 6,
    step: 1,
    format: String,
  },
  readout: (view, level) => {
    const { strokes, twice, hexagonSide } = terdragonCensus(level, view.copies as number);
    return [
      { label: "Lines drawn", value: strokes.toLocaleString("en-US") },
      { label: "Drawn twice", value: twice.toLocaleString("en-US") },
      {
        label: "Full hexagon",
        value: hexagonSide
          ? `${hexagonSide} ${hexagonSide === 1 ? "line" : "lines"} a side`
          : "none",
      },
    ];
  },
};
