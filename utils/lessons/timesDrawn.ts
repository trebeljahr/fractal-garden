import type { ConstructionLead } from "../constructionLead";
import { expand, interpret } from "../lsystem/engine";
import { DEFAULT_SPEC } from "../lsystem/spec";

/** A line's tint by how often it has been drawn: once, twice, up to 4, 8, 16 and 32 times. */
export const TIMES_DRAWN_TINTS = ["#8fa3bf", "#18fce0", "#b8f24c", "#ffd23f", "#ff8a3d", "#ff5c93"];

export const timesDrawnTint = (times: number) => Math.ceil(Math.log2(times));

const pack = (x: number, y: number) => x * 65536 + y;

/** Strokes are one grid step long, so a line's midpoint names it whichever way it is drawn. */
function lineKey(positions: ArrayLike<number>, stroke: number) {
  const o = stroke * 6;
  return pack(
    Math.round(positions[o] + positions[o + 3]),
    Math.round(positions[o + 1] + positions[o + 4]),
  );
}

/** For each pen stroke, how many times its line has been drawn so far, that stroke included. */
export function strokePasses(positions: ArrayLike<number>, count: number) {
  const seen = new Map<number, number>();
  const passes = new Uint32Array(count);
  for (let i = 0; i < count; i++) {
    const key = lineKey(positions, i);
    const times = (seen.get(key) ?? 0) + 1;
    seen.set(key, times);
    passes[i] = times;
  }
  return passes;
}

export type Census = {
  strokes: number;
  lines: number;
  /** Separate regions the lines enclose. The pen never lifts, so this is lines - points + 1. */
  gaps: number;
  /** How many lines are drawn exactly that many times, fewest times first. */
  drawn: [times: number, lines: number][];
};

const censuses = new Map<string, Census>();

/** Counts one level of the figure, where level 1 is the starting shape. */
export function timesDrawnCensus(axiom: string, rule: string, level: number): Census {
  const key = `${axiom}:${rule}:${level}`;
  const known = censuses.get(key);
  if (known) return known;
  const spec = {
    ...DEFAULT_SPEC,
    axiom,
    rules: [{ symbol: "F", replacement: rule }],
    angle: 90,
    startAngle: 0,
  };
  const { positions, count } = interpret(expand(spec, level - 1).sentence, spec, {
    legacy2d: true,
  });
  const times = new Map<number, number>();
  const points = new Set<number>();
  for (let i = 0; i < count; i++) {
    const line = lineKey(positions, i);
    times.set(line, (times.get(line) ?? 0) + 1);
    points.add(pack(Math.round(positions[i * 6]), Math.round(positions[i * 6 + 1])));
    points.add(pack(Math.round(positions[i * 6 + 3]), Math.round(positions[i * 6 + 4])));
  }
  const drawn = new Map<number, number>();
  times.forEach((value) => drawn.set(value, (drawn.get(value) ?? 0) + 1));
  const census: Census = {
    strokes: count,
    lines: times.size,
    gaps: times.size - points.size + 1,
    drawn: Array.from(drawn).sort(([a], [b]) => a - b),
  };
  censuses.set(key, census);
  return census;
}

const number = (value: number) => value.toLocaleString("en-US");

const timesLabel = (times: number) =>
  times === 1 ? "Drawn once" : times === 2 ? "Drawn twice" : `Drawn ${times} times`;

export function timesDrawnLead(
  axiom: string,
  rule: string,
  { gaps = false }: { gaps?: boolean } = {},
): ConstructionLead {
  return {
    initial: { timesDrawn: "tint" },
    control: {
      kind: "options",
      path: "timesDrawn",
      label: "Tint",
      options: [
        { value: "tint", label: "Times drawn" },
        { value: "plain", label: "One color" },
      ],
    },
    readout: (view, level) => {
      const census = timesDrawnCensus(axiom, rule, level);
      const rows: { label: string; value: string; tint?: string }[] = [
        { label: "Pen strokes", value: number(census.strokes) },
        { label: "Different lines", value: number(census.lines) },
        ...census.drawn.map(([times, lines]) => ({
          label: timesLabel(times),
          value: number(lines),
          tint: view.timesDrawn === "tint" ? TIMES_DRAWN_TINTS[timesDrawnTint(times)] : undefined,
        })),
      ];
      if (gaps) rows.push({ label: "Gaps inside", value: number(census.gaps) });
      return rows;
    },
  };
}
