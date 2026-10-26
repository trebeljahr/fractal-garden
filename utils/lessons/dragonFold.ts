import { lessonWord } from "./lsystemLesson";

export type FoldPoint = [number, number];
export function dragonCreases(folds: number): (1 | -1)[] {
  return Array.from(lessonWord("dragon", folds)).flatMap((symbol) =>
    symbol === "+" ? [1 as const] : symbol === "-" ? [-1 as const] : [],
  );
}

// Opening 0 doubles the strip back at each crease; 90 gives the garden's turtle turns.
export function openedDragon(folds: number, opening: number): FoldPoint[] {
  const turns = dragonCreases(folds);
  const points: FoldPoint[] = [[0, 0]];
  let angle = Math.PI / 4;
  for (let segment = 0; segment <= turns.length; segment++) {
    if (segment > 0) angle += (turns[segment - 1] * (180 - opening) * Math.PI) / 180;
    const previous = points[points.length - 1];
    points.push([previous[0] + Math.cos(angle), previous[1] + Math.sin(angle)]);
  }
  return points;
}

// Fit once per fold count, across the whole opening range. Moving a crease never rescales it.
export function dragonOpeningBounds(folds: number) {
  const all = Array.from({ length: 91 }, (_, opening) => openedDragon(folds, opening)).flat();
  return {
    minX: Math.min(...all.map((p) => p[0])),
    maxX: Math.max(...all.map((p) => p[0])),
    minY: Math.min(...all.map((p) => p[1])),
    maxY: Math.max(...all.map((p) => p[1])),
  };
}
