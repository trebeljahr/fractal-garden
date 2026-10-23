import board from "../../lsystem-presets/board.json";
import crystal from "../../lsystem-presets/crystal.json";
import fern_1 from "../../lsystem-presets/fern-1.json";
import fern_2 from "../../lsystem-presets/fern-2.json";
import fern_3 from "../../lsystem-presets/fern-3.json";
import fern_4 from "../../lsystem-presets/fern-4.json";
import gosper_curve from "../../lsystem-presets/gosper-curve.json";
import levy_curve from "../../lsystem-presets/levy-curve.json";
import quadratic_snowflake from "../../lsystem-presets/quadratic-snowflake.json";
import sierpinski_arrowhead from "../../lsystem-presets/sierpinski-arrowhead.json";
import sierpinski_curve from "../../lsystem-presets/sierpinski-curve.json";
import terdragon from "../../lsystem-presets/terdragon.json";
import { expand, interpret } from "../lsystem/engine";
import { DEFAULT_SPEC, normalizeSpec } from "../lsystem/spec";
import { generateHilbertCurve3D } from "../polyline3d";
import { expandLSystem, traceTurtle } from "../turtleCurve";
import type { PathLessonKind } from "./pathLessonInfo";

export { isPathLessonKind, PATH_LESSONS, type PathLessonKind } from "./pathLessonInfo";

const PRESETS = {
  board: board,
  crystal: crystal,
  "fern-1": fern_1,
  "fern-2": fern_2,
  "fern-3": fern_3,
  "fern-4": fern_4,
  "gosper-curve": gosper_curve,
  "levy-curve": levy_curve,
  "quadratic-snowflake": quadratic_snowflake,
  "sierpinski-arrowhead": sierpinski_arrowhead,
  "sierpinski-curve": sierpinski_curve,
  terdragon: terdragon,
};
export type Segment = { a: number[]; b: number[]; group: number };
function fromPoints(points: number[], dimension = 2, group = 0): Segment[] {
  const result: Segment[] = [];
  for (let i = dimension; i < points.length; i += dimension)
    result.push({ a: points.slice(i - dimension, i), b: points.slice(i, i + dimension), group });
  return result;
}
export function lessonSegments(kind: PathLessonKind, level: number, angle?: number): Segment[] {
  if (kind === "hilbert-curve-3d")
    return fromPoints(Array.from(generateHilbertCurve3D(Math.max(1, level)).points), 3);
  if (kind === "fibonacci-word-fractal") {
    const word = expandLSystem("0", { "0": "01", "1": "0" }, level);
    const points = [0, 0];
    let x = 0,
      y = 0,
      heading = 0;
    for (let i = 0; i < word.length; i++) {
      x += Math.cos(heading);
      y += Math.sin(heading);
      points.push(x, y);
      if (word[i] === "0")
        heading += (((i + 1) % 2 === 0 ? 1 : -1) * (angle ?? 90) * Math.PI) / 180;
    }
    return fromPoints(points);
  }
  if (kind === "twindragon") {
    const word = expandLSystem("F", { F: "F+G", G: "F-G" }, level);
    const { points } = traceTurtle(word, { "+": 90, "-": -90 }, -level * 45);
    const x = points[points.length - 2],
      y = points[points.length - 1];
    return [
      ...fromPoints(points),
      ...fromPoints(
        points.map((p, i) => (i % 2 ? y : x) - p),
        2,
        1,
      ),
    ];
  }
  if (
    [
      "cesaro-fractal",
      "koch-anti-snowflake",
      "quadratic-koch-island",
      "minkowski-sausage",
      "terdragon",
    ].includes(kind)
  ) {
    const settings: Record<string, [string, string, number, number]> = {
      "cesaro-fractal": ["FLFLFLF", "F+F--F+F", angle ?? 85, 0],
      "koch-anti-snowflake": ["F++F++F", "F+F--F+F", 60, 0],
      "quadratic-koch-island": ["F-F-F-F", "F+FF-FF-F-F+F+FF-F-F+F+FF+FF-F", 90, 0],
      "minkowski-sausage": ["F", "F+F-F-FF+F+F-F", 90, 0],
      terdragon: ["F", "F+F-F", 120, -level * 30],
    };
    const [axiom, rule, turn, start] = settings[kind];
    return fromPoints(
      traceTurtle(expandLSystem(axiom, { F: rule }, level), { "+": turn, "-": -turn, L: 90 }, start)
        .points,
    );
  }
  const spec =
    kind === "l-system-explorer"
      ? { ...DEFAULT_SPEC }
      : normalizeSpec(PRESETS[kind as keyof typeof PRESETS]).spec;
  if (angle !== undefined) spec.angle = angle;
  const geometry = interpret(expand(spec, level).sentence, spec);
  return Array.from({ length: geometry.count }, (_, i) => ({
    a: Array.from(geometry.positions.slice(i * 6, i * 6 + 3)),
    b: Array.from(geometry.positions.slice(i * 6 + 3, i * 6 + 6)),
    group: geometry.depths[i],
  }));
}
