import type { LSystemSpec, Rule } from "./spec";

// Hard caps that keep the page responsive while someone types a rule that
// explodes. Hitting one stops early and reports it instead of freezing the tab.
export const MAX_SENTENCE_LENGTH = 3_000_000;
export const MAX_SEGMENTS = 400_000;

export type Expansion = {
  sentence: string;
  iterations: number;
  limited: boolean;
};

export type Geometry = {
  // Six floats per segment: x1 y1 z1 x2 y2 z2.
  positions: Float32Array;
  // Relative width per segment (1 = base line width), changed by ! and #.
  widths: Float32Array;
  // Bracket nesting depth per segment, for the "branch depth" color mode.
  depths: Uint16Array;
  count: number;
  maxDepth: number;
  min: [number, number, number];
  max: [number, number, number];
  limited: boolean;
  warnings: string[];
};

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Choice = { replacement: string; cumulative: number };

function buildRuleTable(rules: Rule[]) {
  const table = new Map<string, { total: number; choices: Choice[]; longest: number }>();

  for (const rule of rules) {
    if (!rule.symbol) continue;
    const entry = table.get(rule.symbol) ?? { total: 0, choices: [], longest: 0 };
    entry.total += rule.weight ?? 1;
    entry.choices.push({ replacement: rule.replacement, cumulative: entry.total });
    entry.longest = Math.max(entry.longest, rule.replacement.length);
    table.set(rule.symbol, entry);
  }

  return table;
}

export function isStochastic(rules: Rule[]) {
  const seen = new Set<string>();
  for (const rule of rules) {
    if (seen.has(rule.symbol)) return true;
    seen.add(rule.symbol);
  }
  return false;
}

export function expand(
  spec: Pick<LSystemSpec, "axiom" | "rules" | "seed">,
  iterations: number,
): Expansion {
  const table = buildRuleTable(spec.rules);
  const random = mulberry32(spec.seed);
  let sentence = spec.axiom;

  for (let i = 0; i < iterations; i++) {
    // Measure the next generation before building it so a runaway rule
    // never allocates a gigantic string.
    let nextLength = 0;
    for (const char of sentence) {
      const entry = table.get(char);
      nextLength += entry ? entry.longest : char.length;
    }
    if (nextLength > MAX_SENTENCE_LENGTH) {
      return { sentence, iterations: i, limited: true };
    }

    let next = "";
    for (const char of sentence) {
      const entry = table.get(char);
      if (!entry) {
        next += char;
      } else if (entry.choices.length === 1) {
        next += entry.choices[0].replacement;
      } else {
        const pick = random() * entry.total;
        const choice = entry.choices.find((c) => pick < c.cumulative) ?? entry.choices[0];
        next += choice.replacement;
      }
    }
    sentence = next;
  }

  return { sentence, iterations, limited: false };
}

const DEG = Math.PI / 180;

// A 3D turtle in the style of "The Algorithmic Beauty of Plants". In 2D the
// pitch and roll symbols are simply never used, so the same turtle draws both.
// World axes: x right, y up, z towards the viewer. The turtle starts at the
// origin heading up (+y).
export function interpret(
  sentence: string,
  spec: Pick<
    LSystemSpec,
    "angle" | "startAngle" | "lengthFactor" | "widthFactor" | "drawSymbols" | "moveSymbols"
  >,
): Geometry {
  const positions = new Float32Array(
    Math.min(countDraws(sentence, spec.drawSymbols), MAX_SEGMENTS) * 6,
  );
  const widths = new Float32Array(positions.length / 6);
  const depths = new Uint16Array(positions.length / 6);
  const draw = new Set(spec.drawSymbols);
  const move = new Set(spec.moveSymbols);
  const warnings: string[] = [];

  const a = spec.angle * DEG;
  const cosA = Math.cos(a);
  const sinA = Math.sin(a);

  // Position, heading H, left L, up U, step length, width, depth.
  let px = 0;
  let py = 0;
  let pz = 0;
  const start = -spec.startAngle * DEG;
  let hx = -Math.sin(start);
  let hy = Math.cos(start);
  let hz = 0;
  let lx = -Math.cos(start);
  let ly = -Math.sin(start);
  let lz = 0;
  let ux = 0;
  let uy = 0;
  let uz = 1;
  let len = 1;
  let width = 1;
  let depth = 0;
  const stack: number[] = [];
  const STATE = 15;

  let count = 0;
  let maxDepth = 0;
  let limited = false;
  let unmatched = 0;
  const min: [number, number, number] = [0, 0, 0];
  const max: [number, number, number] = [0, 0, 0];

  // Rotate vectors (ax, ay, az) and (bx, by, bz) in their shared plane.
  // Returns via closure variables to avoid allocating per symbol.
  let ra0 = 0;
  let ra1 = 0;
  let ra2 = 0;
  let rb0 = 0;
  let rb1 = 0;
  let rb2 = 0;
  const rotate = (
    ax: number,
    ay: number,
    az: number,
    bx: number,
    by: number,
    bz: number,
    c: number,
    s: number,
  ) => {
    ra0 = ax * c + bx * s;
    ra1 = ay * c + by * s;
    ra2 = az * c + bz * s;
    rb0 = -ax * s + bx * c;
    rb1 = -ay * s + by * c;
    rb2 = -az * s + bz * c;
  };

  for (let i = 0; i < sentence.length; i++) {
    const char = sentence[i];

    if (draw.has(char) || move.has(char)) {
      const nx = px + hx * len;
      const ny = py + hy * len;
      const nz = pz + hz * len;

      if (draw.has(char)) {
        if (count >= MAX_SEGMENTS) {
          limited = true;
          break;
        }
        const o = count * 6;
        positions[o] = px;
        positions[o + 1] = py;
        positions[o + 2] = pz;
        positions[o + 3] = nx;
        positions[o + 4] = ny;
        positions[o + 5] = nz;
        widths[count] = width;
        depths[count] = depth;
        if (count === 0) {
          min[0] = Math.min(px, nx);
          min[1] = Math.min(py, ny);
          min[2] = Math.min(pz, nz);
          max[0] = Math.max(px, nx);
          max[1] = Math.max(py, ny);
          max[2] = Math.max(pz, nz);
        } else {
          if (nx < min[0]) min[0] = nx;
          if (ny < min[1]) min[1] = ny;
          if (nz < min[2]) min[2] = nz;
          if (nx > max[0]) max[0] = nx;
          if (ny > max[1]) max[1] = ny;
          if (nz > max[2]) max[2] = nz;
        }
        count++;
      }

      px = nx;
      py = ny;
      pz = nz;
      continue;
    }

    switch (char) {
      // Turn right / left: rotate H and L around U. "+" turns clockwise on
      // screen, matching the other L-system pages of the garden.
      case "+":
        rotate(hx, hy, hz, lx, ly, lz, cosA, -sinA);
        hx = ra0;
        hy = ra1;
        hz = ra2;
        lx = rb0;
        ly = rb1;
        lz = rb2;
        break;
      case "-":
        rotate(hx, hy, hz, lx, ly, lz, cosA, sinA);
        hx = ra0;
        hy = ra1;
        hz = ra2;
        lx = rb0;
        ly = rb1;
        lz = rb2;
        break;
      // Pitch down / up: rotate H and U around L.
      case "&":
        rotate(hx, hy, hz, ux, uy, uz, cosA, -sinA);
        hx = ra0;
        hy = ra1;
        hz = ra2;
        ux = rb0;
        uy = rb1;
        uz = rb2;
        break;
      case "^":
        rotate(hx, hy, hz, ux, uy, uz, cosA, sinA);
        hx = ra0;
        hy = ra1;
        hz = ra2;
        ux = rb0;
        uy = rb1;
        uz = rb2;
        break;
      // Roll left / right: rotate L and U around H.
      case "\\":
        rotate(lx, ly, lz, ux, uy, uz, cosA, sinA);
        lx = ra0;
        ly = ra1;
        lz = ra2;
        ux = rb0;
        uy = rb1;
        uz = rb2;
        break;
      case "/":
        rotate(lx, ly, lz, ux, uy, uz, cosA, -sinA);
        lx = ra0;
        ly = ra1;
        lz = ra2;
        ux = rb0;
        uy = rb1;
        uz = rb2;
        break;
      case "|":
        hx = -hx;
        hy = -hy;
        hz = -hz;
        lx = -lx;
        ly = -ly;
        lz = -lz;
        break;
      // Roll until L is horizontal, as plants do against gravity.
      case "$": {
        // L = normalize(V x H) with V = world up (0, 1, 0).
        const cx = hz;
        const cz = -hx;
        const n = Math.hypot(cx, cz);
        if (n > 1e-6) {
          lx = cx / n;
          ly = 0;
          lz = cz / n;
          ux = hy * lz - hz * ly;
          uy = hz * lx - hx * lz;
          uz = hx * ly - hy * lx;
        }
        break;
      }
      case "[":
        stack.push(px, py, pz, hx, hy, hz, lx, ly, lz, ux, uy, uz, len, width, depth);
        depth++;
        if (depth > maxDepth) maxDepth = depth;
        break;
      case "]": {
        if (stack.length < STATE) {
          unmatched++;
          break;
        }
        const s = stack.splice(stack.length - STATE, STATE);
        [px, py, pz, hx, hy, hz, lx, ly, lz, ux, uy, uz, len, width, depth] = s;
        break;
      }
      case ">":
        len *= spec.lengthFactor;
        break;
      case "<":
        len /= spec.lengthFactor;
        break;
      case "!":
        width *= spec.widthFactor;
        break;
      case "#":
        width /= spec.widthFactor;
        break;
      default:
        break;
    }
  }

  if (unmatched > 0) warnings.push(`${unmatched} "]" without a matching "[" were ignored.`);
  if (stack.length > 0) warnings.push(`${stack.length / STATE} "[" never closed.`);

  return {
    positions,
    widths,
    depths,
    count,
    maxDepth,
    min,
    max,
    limited,
    warnings,
  };
}

function countDraws(sentence: string, drawSymbols: string) {
  const draw = new Set(drawSymbols);
  let n = 0;
  for (let i = 0; i < sentence.length; i++) {
    if (draw.has(sentence[i])) n++;
  }
  return n;
}
