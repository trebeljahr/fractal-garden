import type { CanvasViewport } from "../../canvasViewport";
import { radians } from "../../ctxHelpers";
import { remapper } from "../../scaling";
import { type Matrix2D, type Vec2D, Vector } from "../../vectors";
import { seamWidth } from "../../voxelFractals";
import type { Context2D } from "../types";

export type PythagorasTreeParams = {
  viewport?: CanvasViewport;
  iterations: number;
  angle: number;
  background: string;
  fillTriangles: boolean;
  fillSquares: boolean;
};

export const PYTHAGORAS_MAX_ITERATIONS = 11;

function determineTriangleTip(angle: number): (p1: Vec2D, p2: Vec2D) => Vec2D {
  const angleRad = radians(angle);

  const cos = Math.cos(angleRad);
  const cos2 = cos * cos;

  const sin = Math.sin(angleRad);
  const sincos = sin * cos;

  const rot: Matrix2D = [
    [cos2, sincos],
    [-sincos, cos2],
  ];

  return (p1, p2) => {
    const vec = Vector.sub(p1, p2);

    const dir = Vector.mul(vec, rot);
    const p3 = Vector.add(p2, dir);

    return p3;
  };
}

const remapH = remapper([0, PYTHAGORAS_MAX_ITERATIONS], [23, 88]);
const hsvGradient = (iteration: number) => `hsl(${remapH(iteration)}, 96%, 30%)`;

export function drawPythagorasTree(
  ctx: Context2D,
  width: number,
  height: number,
  config: PythagorasTreeParams,
) {
  let polygons = 0;

  // The viewport scales strokes along with the shapes, which would fatten every
  // square as you zoom in. A filled shape only needs its seams sealed, and an
  // unfilled one keeps the same outline on screen.
  const seam = seamWidth(ctx);
  const outline = 1 / (config.viewport?.zoom ?? 1);
  ctx.lineJoin = "round";

  // Branches overlap each other in depth-first order with different colors,
  // so every polygon is still drawn on its own.
  const drawPoly = (points: Vec2D[], color: string, fill = true) => {
    const [start, ...remaining] = points;

    ctx.beginPath();
    ctx.moveTo(...start);
    for (const point of remaining) ctx.lineTo(...point);
    ctx.closePath();

    ctx.fillStyle = color;
    if (fill) ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = fill ? seam : outline;
    ctx.stroke();
    polygons++;
  };

  const thirdPoint = determineTriangleTip(config.angle);

  const drawBranch = (p1: Vec2D, p2: Vec2D, depth = 0) => {
    const [x1, y1] = p1;
    const [x2, y2] = p2;

    const d: Vec2D = [y1 - y2, x2 - x1];

    const p3 = Vector.sub(p2, d);
    const p4 = Vector.sub(p1, d);

    const color = hsvGradient(depth);
    drawPoly([p1, p2, p3, p4], color, config.fillSquares);

    if (depth === config.iterations) return;

    const p5 = thirdPoint(p3, p4);
    drawPoly([p3, p4, p5], color, config.fillTriangles);

    drawBranch(p4, p5, depth + 1);
    drawBranch(p5, p3, depth + 1);
  };

  ctx.fillStyle = config.background;
  ctx.fillRect(0, 0, width, height);

  const size = Math.min(width / 9, height / 5);
  const half = size / 2;
  // A tilted tree curls below its first square: by a third of a square at 30 or 60 degrees.
  ctx.translate(width / 2, height - (size * Math.abs(config.angle - 45)) / 45);
  drawBranch([-half, 0], [half, 0]);

  return polygons;
}
