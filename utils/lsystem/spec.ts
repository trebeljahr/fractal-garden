// The L-system description shared by the explorer page, its share links, and the
// preset files in lsystem-presets/. Kept free of imports so the build-time
// validator (scripts/validate-lsystem-presets.mjs) can load it with plain Node.

export type Dimension = "2d" | "3d";
export type ColorMode = "solid" | "gradient" | "depth";

export type Rule = {
  symbol: string;
  replacement: string;
  // Several rules for one symbol make the system stochastic; weight picks between them.
  weight?: number;
};

export type LSystemSpec = {
  name: string;
  author?: string;
  description?: string;
  dimension: Dimension;
  axiom: string;
  rules: Rule[];
  angle: number;
  iterations: number;
  startAngle: number;
  lengthFactor: number;
  widthFactor: number;
  color: string;
  colorEnd: string;
  colorMode: ColorMode;
  background: string;
  lineWidth: number;
  drawSymbols: string;
  moveSymbols: string;
  seed: number;
};

export const LIMITS = {
  axiomLength: 500,
  rules: 40,
  replacementLength: 500,
  iterations: 24,
  nameLength: 60,
  textLength: 500,
};

export const DEFAULT_SPEC: LSystemSpec = {
  name: "Untitled",
  dimension: "2d",
  axiom: "F",
  rules: [{ symbol: "F", replacement: "F[+F]F[-F]F" }],
  angle: 25.7,
  iterations: 4,
  startAngle: 0,
  lengthFactor: 0.7,
  widthFactor: 0.7,
  color: "#adff00",
  colorEnd: "#18fce0",
  colorMode: "gradient",
  background: "#252424",
  lineWidth: 1.5,
  drawSymbols: "FG",
  moveSymbols: "f",
  seed: 1,
};

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

type Result = { spec: LSystemSpec; errors: string[] };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

// Turns untrusted input (a preset file, a share link) into a usable spec.
// Every problem is reported in `errors`; the returned spec always falls back to
// defaults so a half-broken link still renders something.
export function normalizeSpec(raw: unknown): Result {
  const errors: string[] = [];
  const spec: LSystemSpec = { ...DEFAULT_SPEC, rules: [] };

  if (!isRecord(raw)) {
    return { spec: { ...DEFAULT_SPEC }, errors: ["Expected a JSON object."] };
  }

  const text = (key: keyof LSystemSpec, max: number, required = false) => {
    const value = raw[key];
    if (value === undefined) {
      if (required) errors.push(`"${key}" is required.`);
      return undefined;
    }
    if (typeof value !== "string") {
      errors.push(`"${key}" must be a string.`);
      return undefined;
    }
    if (value.length > max) {
      errors.push(`"${key}" is longer than ${max} characters.`);
      return value.slice(0, max);
    }
    return value;
  };

  const number = (key: keyof LSystemSpec, min: number, max: number) => {
    const value = raw[key];
    if (value === undefined) return undefined;
    if (typeof value !== "number" || !Number.isFinite(value)) {
      errors.push(`"${key}" must be a number.`);
      return undefined;
    }
    if (value < min || value > max) {
      errors.push(`"${key}" must be between ${min} and ${max}.`);
    }
    return clamp(value, min, max);
  };

  const color = (key: keyof LSystemSpec) => {
    const value = text(key, 7);
    if (value === undefined) return undefined;
    if (!HEX_COLOR.test(value)) {
      errors.push(`"${key}" must be a hex color like #a1b2c3.`);
      return undefined;
    }
    return value.toLowerCase();
  };

  spec.name = text("name", LIMITS.nameLength, true)?.trim() || DEFAULT_SPEC.name;
  const author = text("author", LIMITS.nameLength);
  if (author) spec.author = author;
  const description = text("description", LIMITS.textLength);
  if (description) spec.description = description;

  if (raw.dimension !== undefined) {
    if (raw.dimension === "2d" || raw.dimension === "3d") {
      spec.dimension = raw.dimension as Dimension;
    } else {
      errors.push(`"dimension" must be "2d" or "3d".`);
    }
  }

  if (raw.colorMode !== undefined) {
    if (raw.colorMode === "solid" || raw.colorMode === "gradient" || raw.colorMode === "depth") {
      spec.colorMode = raw.colorMode as ColorMode;
    } else {
      errors.push(`"colorMode" must be "solid", "gradient" or "depth".`);
    }
  }

  spec.axiom = text("axiom", LIMITS.axiomLength, true) ?? DEFAULT_SPEC.axiom;

  if (!Array.isArray(raw.rules)) {
    errors.push(`"rules" must be a list.`);
  } else {
    if (raw.rules.length > LIMITS.rules) {
      errors.push(`At most ${LIMITS.rules} rules are allowed.`);
    }
    const rules: unknown[] = raw.rules.slice(0, LIMITS.rules);
    for (let index = 0; index < rules.length; index++) {
      const rule = rules[index];
      if (!isRecord(rule) || typeof rule.symbol !== "string") {
        errors.push(`Rule ${index + 1} needs a "symbol".`);
        continue;
      }
      if (Array.from(rule.symbol).length !== 1 || /\s/.test(rule.symbol)) {
        errors.push(`Rule ${index + 1}: the symbol must be one character.`);
        continue;
      }
      if (typeof rule.replacement !== "string") {
        errors.push(`Rule ${index + 1} needs a "replacement" string.`);
        continue;
      }
      const next: Rule = {
        symbol: rule.symbol,
        replacement: rule.replacement.slice(0, LIMITS.replacementLength),
      };
      if (rule.replacement.length > LIMITS.replacementLength) {
        errors.push(`Rule ${index + 1} is longer than ${LIMITS.replacementLength} characters.`);
      }
      if (rule.weight !== undefined) {
        if (typeof rule.weight === "number" && rule.weight > 0 && Number.isFinite(rule.weight)) {
          next.weight = rule.weight;
        } else {
          errors.push(`Rule ${index + 1}: "weight" must be a positive number.`);
        }
      }
      spec.rules.push(next);
    }
  }

  spec.angle = number("angle", -360, 360) ?? DEFAULT_SPEC.angle;
  spec.iterations = Math.round(number("iterations", 0, LIMITS.iterations) ?? 4);
  spec.startAngle = number("startAngle", -360, 360) ?? 0;
  spec.lengthFactor = number("lengthFactor", 0.01, 10) ?? DEFAULT_SPEC.lengthFactor;
  spec.widthFactor = number("widthFactor", 0.01, 10) ?? DEFAULT_SPEC.widthFactor;
  spec.lineWidth = number("lineWidth", 0.1, 20) ?? DEFAULT_SPEC.lineWidth;
  spec.seed = Math.round(number("seed", 0, 2 ** 31) ?? 1);
  spec.color = color("color") ?? DEFAULT_SPEC.color;
  spec.colorEnd = color("colorEnd") ?? spec.color;
  spec.background = color("background") ?? DEFAULT_SPEC.background;
  spec.drawSymbols = text("drawSymbols", 40) ?? DEFAULT_SPEC.drawSymbols;
  spec.moveSymbols = text("moveSymbols", 40) ?? DEFAULT_SPEC.moveSymbols;

  return { spec, errors };
}

// Drops fields that match the defaults so preset files and share links stay short.
export function compactSpec(spec: LSystemSpec) {
  const out: Record<string, unknown> = {};
  const defaults = DEFAULT_SPEC as Record<string, unknown>;
  const fields = spec as Record<string, unknown>;
  const alwaysKeep = ["name", "dimension", "axiom", "rules", "angle", "iterations", "color"];

  for (const key of Object.keys(fields)) {
    const value = fields[key];
    if (value === undefined || value === "") continue;
    if (key === "colorEnd" && value === spec.color) continue;
    if (!alwaysKeep.includes(key) && value === defaults[key]) continue;
    out[key] = key === "rules" ? spec.rules.map((rule) => ({ ...rule })) : value;
  }

  return out;
}

export function slugify(name: string) {
  return (
    name
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "my-l-system"
  );
}
