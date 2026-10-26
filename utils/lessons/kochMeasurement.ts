import preset from "../../lsystem-presets/koch-snowflake.json";
import { expandLSystem, traceTurtle } from "../turtleCurve";

export type KochPoint = [number, number];

// Use the shipped snowflake rule, rotated so its first original edge is horizontal.
export function measuredKoch(level: number, inward = false, whole = false): KochPoint[] {
  const replacement = inward ? "F+F--F+F" : preset.rules[0].replacement;
  const word = expandLSystem(whole ? preset.axiom : "F", { F: replacement }, level);
  const { points } = traceTurtle(word, { "+": -preset.angle, "-": preset.angle });
  const scale = 3 ** -level;
  return Array.from({ length: points.length / 2 }, (_, i) => [
    points[i * 2] * scale,
    points[i * 2 + 1] * scale,
  ]);
}

// Rotate each segment toward the ruler while preserving its length, then join them again.
export function straightenKoch(points: KochPoint[], amount: number): KochPoint[] {
  const result: KochPoint[] = [[0, 0]];
  for (let i = 1; i < points.length; i++) {
    const dx = points[i][0] - points[i - 1][0],
      dy = points[i][1] - points[i - 1][1];
    const length = Math.hypot(dx, dy);
    const angle = Math.atan2(dy, dx) * (1 - amount);
    const last = result[result.length - 1];
    result.push([last[0] + Math.cos(angle) * length, last[1] + Math.sin(angle) * length]);
  }
  return result;
}

export function polygonArea(points: KochPoint[]) {
  return (
    Math.abs(
      points.reduce((sum, p, i) => {
        const q = points[(i + 1) % points.length];
        return sum + p[0] * q[1] - q[0] * p[1];
      }, 0),
    ) / 2
  );
}

export function addedKochTriangles(level: number, inward = false): KochPoint[][] {
  if (level === 0) return [];
  const points = measuredKoch(level, inward, true);
  return Array.from({ length: (points.length - 1) / 4 }, (_, i) =>
    points.slice(i * 4 + 1, i * 4 + 4),
  );
}

export function kochMeasurements(level: number, inward = false) {
  const originalArea = Math.sqrt(3) / 4;
  const additions = Array.from(
    { length: level },
    (_, i) =>
      addedKochTriangles(i + 1, inward).reduce((sum, triangle) => sum + polygonArea(triangle), 0) /
      originalArea,
  );
  return {
    length: (4 / 3) ** level,
    area: polygonArea(measuredKoch(level, inward, true)) / originalArea,
    additions,
  };
}
