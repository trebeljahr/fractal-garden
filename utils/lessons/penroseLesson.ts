import type { RobinsonTriangle } from "../penroseTiling";

export type PenroseLessonParent = "acute" | "obtuse";
export type PenroseLessonSplit = (triangle: RobinsonTriangle) => RobinsonTriangle[];

const INV_PHI = 2 / (1 + Math.sqrt(5));

export function getPenroseLessonParent(kind: PenroseLessonParent): RobinsonTriangle {
  const angle = ((kind === "acute" ? 36 : 108) * Math.PI) / 180;
  const length = kind === "acute" ? 1 : INV_PHI;
  return {
    type: kind === "acute" ? 0 : 1,
    a: [0, 0],
    b: [length, 0],
    c: [length * Math.cos(angle), length * Math.sin(angle)],
  };
}

// The caller supplies the production split. This module only frames the two
// starting triangles and bounds the number of generations in the lesson.
export function getPenroseLessonStages(
  kind: PenroseLessonParent,
  split: PenroseLessonSplit,
  max = 3,
) {
  const stages: RobinsonTriangle[][] = [[getPenroseLessonParent(kind)]];
  for (let step = 0; step < Math.min(3, max); step++) {
    stages.push(stages[step].flatMap(split));
  }
  return stages;
}

export function getPenroseLessonCut(parent: RobinsonTriangle): [number, number] {
  const [from, to] = parent.type === 0 ? [parent.a, parent.b] : [parent.b, parent.c];
  return [from[0] + (to[0] - from[0]) * INV_PHI, from[1] + (to[1] - from[1]) * INV_PHI];
}
