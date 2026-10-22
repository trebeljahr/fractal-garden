import { expand, type Geometry, interpret } from "../lsystem/engine";
import { DEFAULT_SPEC, type Dimension, type LSystemSpec } from "../lsystem/spec";

export type Species = "tree" | "fern" | "spire" | "shrub" | "rosette";
export type Plant = {
  id: number;
  species: Species;
  x: number;
  z: number;
  size: number;
  angle: number;
  iterations: number;
  ratio: number;
  rotation: number;
  seed: number;
  color: string;
};

export const MAX_PLANTS = 24;
// Bound the whole bed's cost, including the denser fern and whorled grammar.
export const generationLimit = (species: Species) =>
  species === "fern" || species === "spire" ? 5 : 6;

export function isStoredGarden(value: unknown): value is Plant[] {
  if (!Array.isArray(value) || value.length > MAX_PLANTS) return false;
  return (
    value.every((item) => {
      if (!item || typeof item !== "object" || !Object.hasOwn(SPECIES, item.species)) return false;
      return (
        /^#[\da-f]{6}$/i.test(item.color) &&
        ["id", "x", "z", "size", "angle", "iterations", "ratio", "rotation", "seed"].every(
          (key) => typeof item[key] === "number" && Number.isFinite(item[key]),
        ) &&
        Number.isInteger(item.iterations) &&
        item.iterations >= 2 &&
        item.iterations <= generationLimit(item.species) &&
        item.size >= 0.4 &&
        item.size <= 5 &&
        item.ratio >= 0.5 &&
        item.ratio <= 0.88 &&
        Math.abs(item.x) <= 4.5 &&
        Math.abs(item.z) <= 3 &&
        item.angle >= 10 &&
        item.angle <= (item.species === "rosette" ? 160 : 65) &&
        Math.abs(item.rotation) <= 180 &&
        Number.isSafeInteger(item.id) &&
        item.id > 0 &&
        item.id < 1e9
      );
    }) && new Set(value.map((item) => item.id)).size === value.length
  );
}
export const SPECIES: Record<
  Species,
  { name: string; detail: string; color: string; size: number; angle: number }
> = {
  tree: {
    name: "Branching tree",
    detail: "Stochastic branching",
    color: "#a4bc79",
    size: 3.6,
    angle: 28,
  },
  fern: { name: "Fern", detail: "Repeated fronds", color: "#70a488", size: 1.7, angle: 24 },
  spire: { name: "Spire", detail: "Whorled branches", color: "#7e9d6b", size: 3.1, angle: 18 },
  shrub: {
    name: "Flowering shrub",
    detail: "Branching + blossoms",
    color: "#d5ac99",
    size: 1.65,
    angle: 36,
  },
  rosette: {
    name: "Rosette",
    detail: "Golden-angle phyllotaxis",
    color: "#b4bd7c",
    size: 0.85,
    angle: 137.5,
  },
};

export function makePlant(species: Species, id: number, x = 0, z = 0): Plant {
  const defaults = SPECIES[species];
  return {
    id,
    species,
    x,
    z,
    size: defaults.size,
    angle: defaults.angle,
    iterations: species === "fern" ? 4 : 5,
    ratio: 0.73,
    rotation: 0,
    seed: id * 137 + 19,
    color: defaults.color,
  };
}

export function starterGarden(): Plant[] {
  return [
    makePlant("tree", 1, -0.6, -0.8),
    { ...makePlant("spire", 2, 2.25, -1), size: 3.35 },
    { ...makePlant("tree", 3, -2.7, 0.15), size: 2.5, angle: 35 },
    makePlant("fern", 4, -1.75, 1.6),
    makePlant("shrub", 5, 1.1, 1.4),
    { ...makePlant("fern", 6, 2.7, 1.4), size: 1.25, rotation: 18 },
    makePlant("rosette", 7, -0.1, 2.3),
    { ...makePlant("rosette", 8, -3, 1.8), size: 0.65 },
  ];
}

export function plantSpec(plant: Plant, dimension: Dimension): LSystemSpec {
  const spatial = dimension === "3d";
  let axiom = "FFA";
  let replacements: string[];
  switch (plant.species) {
    case "fern":
      axiom = spatial ? "[X]////[X]////[X]" : "X";
      replacements = ["F+[[!X]-!X]-F[-F!X]+!X"];
      break;
    case "spire":
      replacements = spatial ? ["F[&!>A]////[&!>A]////[&!>A]F!>A"] : ["F[++!>A][--!>A]F!>A"];
      break;
    default:
      replacements = spatial
        ? ["F[&!>A]////[&!>A]////[&!>A]", "F[&!>A]////[&& !>A]////[&!>A]"]
        : ["F[+!>A][-!>A]!>A", "F[++!>A][-!>A]F!>A"];
  }
  return {
    ...DEFAULT_SPEC,
    axiom,
    rules: [
      ...replacements.map((replacement) => ({
        symbol: plant.species === "fern" ? "X" : "A",
        replacement,
      })),
      ...(plant.species === "fern" ? [{ symbol: "F", replacement: "F>F<" }] : []),
    ],
    dimension,
    angle: plant.angle,
    iterations: Math.max(2, Math.min(generationLimit(plant.species), plant.iterations)),
    lengthFactor: plant.ratio,
    widthFactor: 0.68,
    seed: plant.seed,
  };
}

export type Leaf = {
  x: number;
  y: number;
  z: number;
  size: number;
  turn: number;
  birth: number;
  flower: boolean;
};
export type BuiltPlant = {
  plant: Plant;
  geometry: Geometry;
  leaves: Leaf[];
  births: Float32Array;
  ends: Float32Array;
  height: number;
};

export function randomFromSeed(seed: number) {
  let value = seed >>> 0;
  return () => {
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

const pointKey = (x: number, y: number, z: number) =>
  `${Math.round(x * 10000)},${Math.round(y * 10000)},${Math.round(z * 10000)}`;

export function buildPlant(plant: Plant, dimension: Dimension): BuiltPlant {
  const spec = plantSpec(plant, dimension);
  const geometry = interpret(expand(spec, spec.iterations).sentence, spec);
  const births = new Float32Array(geometry.count);
  const ends = new Float32Array(geometry.count);
  const distances = new Map<string, number>();
  const starts = new Set<string>();
  const { positions, count } = geometry;
  let longest = 0;
  for (let i = 0; i < count; i++) {
    const o = i * 6;
    const key = pointKey(positions[o], positions[o + 1], positions[o + 2]);
    starts.add(key);
    const start = distances.get(key) ?? 0;
    const end =
      start +
      Math.hypot(
        positions[o + 3] - positions[o],
        positions[o + 4] - positions[o + 1],
        positions[o + 5] - positions[o + 2],
      );
    births[i] = start;
    ends[i] = end;
    distances.set(pointKey(positions[o + 3], positions[o + 4], positions[o + 5]), end);
    longest = Math.max(longest, end);
  }
  const random = randomFromSeed(plant.seed);
  const leaves: Leaf[] = [];
  const height = Math.max(geometry.max[1], 1);
  for (let i = 0; i < count; i++) {
    births[i] /= longest || 1;
    ends[i] /= longest || 1;
    const o = i * 6 + 3;
    if (starts.has(pointKey(positions[o], positions[o + 1], positions[o + 2]))) continue;
    const cluster = plant.species === "fern" ? 1 : 3;
    for (let j = 0; j < cluster; j++) {
      leaves.push({
        x: positions[o] + (random() - 0.5) * height * 0.045,
        y: positions[o + 1] + (random() - 0.5) * height * 0.035,
        z: positions[o + 2] + (dimension === "3d" ? (random() - 0.5) * height * 0.045 : 0),
        size: height * (plant.species === "fern" ? 0.026 : 0.019) * (0.6 + random() * 0.7),
        turn: random() * Math.PI,
        birth: ends[i],
        flower: plant.species === "shrub" && random() > 0.45,
      });
    }
  }
  if (plant.species === "rosette") {
    // Phyllotaxis is a companion plant form, rather than a fractal grammar.
    leaves.length = 0;
    const n = 40 + plant.iterations * 12;
    for (let i = 0; i < n; i++) {
      const a = (i * plant.angle * Math.PI) / 180;
      const r = Math.sqrt(i / n) * 0.65;
      leaves.push({
        x: Math.cos(a) * r,
        y: 0.12 + (1 - r) * 0.45,
        z: Math.sin(a) * r,
        size: 0.1,
        turn: a,
        birth: i / n,
        flower: false,
      });
    }
    return { plant, geometry: { ...geometry, count: 0 }, leaves, births, ends, height: 1 };
  }
  return { plant, geometry, leaves, births, ends, height };
}
