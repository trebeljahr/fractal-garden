import type { LSystem2DParams } from "../render/lsystem2d";
import { expand, interpret } from "./engine";
import { DEFAULT_SPEC, type LSystemSpec } from "./spec";

export const TURTLE_PLAYBACK_KINDS = [
  "dragonCurve",
  "terdragon",
  "gosperCurve",
  "peanoCurve",
  "kochAntiSnowflake",
  "levyTapestry",
  "quadraticKochIsland",
  "minkowskiSausage",
  "cesaroFractal",
  "fibonacciWordFractal",
  "twindragon",
] as const;

export function hasLSystemPlayback(kind: string) {
  return (
    kind === "lsystemConstruction" ||
    kind === "lsystem2d" ||
    (TURTLE_PLAYBACK_KINDS as readonly string[]).includes(kind)
  );
}

export function playbackSource(kind: string, params: unknown) {
  if (kind === "lsystemConstruction") return { spec: params as LSystemSpec, legacy: false };
  if ((TURTLE_PLAYBACK_KINDS as readonly string[]).includes(kind)) {
    const settings = params as {
      iterations: number;
      angle: number;
      island: boolean;
      color: string;
      background: string;
      lineWidth: number;
      firstDragon?: string;
      secondDragon?: string;
      rule?: string;
      copies?: unknown;
    };
    const recipes: Record<
      string,
      {
        axiom: string;
        rules: Record<string, string>;
        angle: number;
        startAngle?: number;
        turns?: Record<string, number>;
      }
    > = {
      fibonacciWordFractal: { axiom: "0", rules: { "0": "01", "1": "0" }, angle: -settings.angle },
      twindragon: {
        axiom: "F",
        rules: { F: "F+G", G: "F-G" },
        angle: -90,
        startAngle: 90 + settings.iterations * 45,
      },
      dragonCurve:
        settings.rule === "levy"
          ? { axiom: "F", rules: { F: "-F++F-" }, angle: -45, startAngle: -90 }
          : { axiom: "F", rules: { F: "F+G", G: "F-G" }, angle: -90, startAngle: 45 },
      terdragon: {
        axiom: "F",
        rules: { F: "F+F-F" },
        angle: -120,
        startAngle: 90 + settings.iterations * 30,
      },
      gosperCurve: {
        // F comes first: with XF, later rounds are not exact copies of the one before.
        axiom: "FX",
        rules: { X: "X+YF++YF-FX--FXFX-YF+", Y: "-FX+YFYF++YF+FX--FX-Y" },
        angle: -60,
      },
      peanoCurve: {
        axiom: "X",
        rules: { X: "XFYFX+F+YFXFY-F-XFYFX", Y: "YFXFY-F-XFYFX+F+YFXFY" },
        angle: -90,
      },
      kochAntiSnowflake: { axiom: "F++F++F", rules: { F: "F+F--F+F" }, angle: -60 },
      levyTapestry: { axiom: "F++F++F++F", rules: { F: "-F++F-" }, angle: -45 },
      quadraticKochIsland: {
        axiom: "F-F-F-F",
        rules: { F: "F+FF-FF-F-F+F+FF-F-F+F+FF+FF-F" },
        angle: -90,
      },
      minkowskiSausage: {
        axiom: settings.island ? "F+F+F+F" : "F",
        rules: { F: "F+F-F-FF+F+F-F" },
        angle: -90,
      },
      cesaroFractal: {
        axiom: "FLFLFLF",
        rules: { F: "F+F--F+F" },
        angle: -settings.angle,
        turns: { L: 90 },
      },
    };
    const recipe = recipes[kind];
    return {
      legacy: false,
      turns: recipe.turns,
      repeat: kind === "twindragon" ? 2 : 1,
      copies: kind === "terdragon" ? ((settings.copies as number | undefined) ?? 1) : 1,
      fibonacci: kind === "fibonacciWordFractal" ? settings.angle : undefined,
      spec: {
        ...DEFAULT_SPEC,
        ...settings,
        ...recipe,
        startAngle: recipe.startAngle ?? 90,
        drawSymbols: kind === "fibonacciWordFractal" ? "01" : "FG",
        color: settings.firstDragon ?? settings.color,
        rules: Object.entries(recipe.rules).map(([symbol, replacement]) => ({
          symbol,
          replacement,
        })),
      },
    };
  }
  if (kind !== "lsystem2d") return null;
  const source = params as LSystem2DParams;
  return {
    legacy: true,
    spec: {
      ...DEFAULT_SPEC,
      axiom: source.axiom,
      rules: Object.entries(source.replace).map(([symbol, replacement]) => ({
        symbol,
        replacement,
      })),
      angle: source.angle,
      startAngle: source.startAngle,
      color: source.color,
      background: source.background,
      lineWidth: source.lineWidth,
    },
  };
}

const COPY_TURN = Math.PI / 3;
const FULL_TURN_COPIES = 6;

/**
 * Walks `copies` copies of the path from its start, each turned 60 degrees from the last. The
 * positions always hold all six, so from two copies up the frame stays put as copies are added.
 */
function withTurnedCopies(
  geometry: ReturnType<typeof interpret>,
  poses: Float32Array,
  drawn: Uint32Array,
  symbols: number,
  copies: number,
) {
  const lines = geometry.count;
  const positions = new Float32Array(lines * 6 * FULL_TURN_COPIES);
  const widths = new Float32Array(lines * copies);
  const depths = new Uint16Array(lines * copies);
  for (let copy = 0; copy < FULL_TURN_COPIES; copy++) {
    const c = Math.cos(copy * COPY_TURN);
    const s = Math.sin(copy * COPY_TURN);
    for (let i = 0; i < lines * 6; i += 3) {
      const x = geometry.positions[i];
      const y = geometry.positions[i + 1];
      const offset = copy * lines * 6 + i;
      positions[offset] = c * x - s * y;
      positions[offset + 1] = s * x + c * y;
      positions[offset + 2] = geometry.positions[i + 2];
    }
    if (copy >= copies) continue;
    widths.set(geometry.widths.subarray(0, lines), copy * lines);
    depths.set(geometry.depths.subarray(0, lines), copy * lines);
    if (!copy) continue;
    for (let i = 1; i <= symbols; i++) {
      const from = i * 6;
      const to = (copy * symbols + i) * 6;
      poses[to] = c * poses[from] - s * poses[from + 1];
      poses[to + 1] = s * poses[from] + c * poses[from + 1];
      poses[to + 2] = poses[from + 2];
      poses[to + 3] = c * poses[from + 3] - s * poses[from + 4];
      poses[to + 4] = s * poses[from + 3] + c * poses[from + 4];
      poses[to + 5] = poses[from + 5];
      drawn[copy * symbols + i] = copy * lines + drawn[i];
    }
  }
  return { ...geometry, positions, widths, depths, count: lines * copies };
}

export function buildPlayback(
  spec: LSystemSpec,
  generation: number,
  legacy = false,
  turns?: Record<string, number>,
  repeat = 1,
  fibonacci?: number,
  copies = 1,
) {
  const history = [spec.axiom.slice(0, 160)];
  let offsets = new Uint32Array(0);
  let nextOffsets = new Uint32Array(spec.axiom.length + 1);
  let previous = spec.axiom;
  // The same seeded pass chooses replacements for both the picture and the text.
  const expansion = expand(spec, generation, {
    onRewrite: (_level, index, replacement, offset) => {
      nextOffsets[index] = offset;
      nextOffsets[index + 1] = offset + replacement.length;
    },
    onGeneration: (_level, input, output) => {
      previous = input;
      offsets = nextOffsets;
      nextOffsets = new Uint32Array(output.length + 1);
      history.push(output.slice(0, 160));
    },
  });
  const word = expansion.sentence;
  // Six floats for position + heading and one segment count per symbol, rather
  // than millions of JS objects for a large generation.
  const walks = Math.max(repeat, copies);
  const poses = new Float32Array((word.length * walks + 1) * 6);
  const drawn = new Uint32Array(word.length * walks + 1);
  let geometry = interpret(word, spec, {
    legacy2d: legacy,
    turns,
    fibonacciTurn: fibonacci,
    onInstruction: (index, x, y, z, hx, hy, hz, count) => {
      poses.set([x, y, z, hx, hy, hz], index * 6);
      drawn[index] = count;
    },
  });
  if (repeat === 2 && word.length) {
    const end = poses.slice(word.length * 6, word.length * 6 + 3);
    const positions = new Float32Array(geometry.positions.length * 2);
    positions.set(geometry.positions);
    for (let i = 0; i < geometry.positions.length; i++)
      positions[geometry.positions.length + i] = end[i % 3] - geometry.positions[i];
    const widths = new Float32Array(geometry.widths.length * 2);
    widths.set(geometry.widths);
    widths.set(geometry.widths, geometry.widths.length);
    for (let i = 1; i <= word.length; i++) {
      const offset = (word.length + i) * 6;
      for (let axis = 0; axis < 3; axis++) {
        poses[offset + axis] = end[axis] - poses[i * 6 + axis];
        poses[offset + 3 + axis] = -poses[i * 6 + 3 + axis];
      }
      drawn[word.length + i] = geometry.count + drawn[i];
    }
    const depths = new Uint16Array(geometry.depths.length * 2);
    depths.set(geometry.depths);
    depths.set(geometry.depths, geometry.depths.length);
    const min: [number, number, number] = [Infinity, Infinity, Infinity];
    const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < positions.length; i++) {
      const axis = i % 3;
      min[axis] = Math.min(min[axis], positions[i]);
      max[axis] = Math.max(max[axis], positions[i]);
    }
    geometry = { ...geometry, positions, widths, depths, min, max, count: geometry.count * 2 };
  }
  if (copies > 1) geometry = withTurnedCopies(geometry, poses, drawn, word.length, copies);
  const actual = expansion.iterations;
  if (actual === 0) offsets = new Uint32Array(0);
  return {
    word,
    repeat,
    copies,
    instructionLength: word.length * walks,
    previous,
    offsets,
    poses,
    drawn,
    geometry,
    history: history.slice(0, actual + 1),
    generation: actual,
    limited: expansion.limited || geometry.limited,
    rewriteLength: actual > 0 ? offsets.length - 1 : 0,
  };
}
export type Playback = ReturnType<typeof buildPlayback>;

// Each stage of a level plays in about this long however long its string is, so a
// reader reaches the shape in seconds. Next symbol still reads one symbol at a time.
const STAGE_MS = 2000;
const SLOWEST_TICK_MS = 300;
const FASTEST_TICK_MS = 50;

export function playbackPace(symbols: number, speed = 1) {
  const budget = STAGE_MS / speed;
  const delay = Math.max(
    FASTEST_TICK_MS,
    Math.min(SLOWEST_TICK_MS / speed, budget / Math.max(1, symbols)),
  );
  return { delay, advance: Math.max(1, Math.ceil((symbols * delay) / budget)) };
}

export function symbolWindow(word: string, index: number, width = 80) {
  const start = Math.max(0, Math.min(word.length - width, index - Math.floor(width / 2)));
  return {
    start,
    text: word.slice(start, start + width),
    before: start > 0,
    after: start + width < word.length,
  };
}

export function turtleAction(symbol: string, spec: LSystemSpec, legacy = false) {
  if (!symbol) return "Start at the outlined dot. The arrow shows the direction.";
  if (spec.drawSymbols.includes(symbol)) return `${symbol}: draw a line and move forward.`;
  if (spec.moveSymbols.includes(symbol)) return `${symbol}: move forward without drawing.`;
  if (symbol === "[") return "[: remember this position and direction.";
  if (symbol === "]") return "]: jump back to the last [ without drawing.";
  if (symbol === "+" || symbol === "-")
    return `${symbol}: turn ${Math.abs(spec.angle)}°. Stay in place.`;
  if (symbol === "|") return "|: turn around. Stay in place.";
  if (legacy && symbol === "&") return "&: reverse the direction of later turns.";
  if ("&^".includes(symbol)) return `${symbol}: tilt the arrow ${Math.abs(spec.angle)}°.`;
  if ("\\/".includes(symbol)) return `${symbol}: roll the arrow ${Math.abs(spec.angle)}°.`;
  if (symbol === "$") return "$: roll the arrow back to level.";
  if (symbol === ">" || symbol === "<") return `${symbol}: change the length of later steps.`;
  if (symbol === "!" || symbol === "#") return `${symbol}: change the width of later lines.`;
  return `${symbol}: skip this symbol while drawing. Its rule can change it in the next iteration.`;
}
