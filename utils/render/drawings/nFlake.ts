import { radians } from "../../ctxHelpers";
import type { Context2D } from "../types";

export type NFlakeParams = {
  sides: number;
  iterations: number;
  includeCenter: boolean;
  rotation: number;
  background: string;
  color: string;
  fillPolygons: boolean;
  strokePolygons: boolean;
  lineWidth: number;
};

const PADDING = 0.08;
const MAX_POLYGONS = 22000;

function getScaleFactor(sides: number) {
  let sum = 0;

  for (let k = 1; k <= Math.floor(sides / 4); k++) {
    sum += Math.cos((2 * Math.PI * k) / sides);
  }

  return 1 / (2 * (1 + sum));
}

function canUseCenteredVariant(sides: number) {
  return sides === 4 || sides === 5 || sides === 6;
}

export function usesCenterPolygon(sides: number, includeCenter: boolean) {
  return includeCenter && canUseCenteredVariant(sides);
}

function getBranchFactor(sides: number, includeCenter: boolean) {
  return sides + (usesCenterPolygon(sides, includeCenter) ? 1 : 0);
}

export function getMaxIterations(sides: number, includeCenter: boolean) {
  const branchFactor = getBranchFactor(sides, includeCenter);
  let iterations = 7;

  while (iterations > 2 && branchFactor ** iterations > MAX_POLYGONS) {
    iterations -= 1;
  }

  return iterations;
}

function tracePolygon(
  path: Path2D,
  centerX: number,
  centerY: number,
  radius: number,
  sides: number,
  rotation: number,
) {
  for (let i = 0; i < sides; i++) {
    const angle = rotation - Math.PI / 2 + (2 * Math.PI * i) / sides;
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);

    if (i === 0) {
      path.moveTo(x, y);
      continue;
    }

    path.lineTo(x, y);
  }

  path.closePath();
}

export function drawNFlake(ctx: Context2D, width: number, height: number, config: NFlakeParams) {
  const scaleFactor = getScaleFactor(config.sides);
  const rootRadius = (Math.min(width, height) * (1 - 2 * PADDING)) / 2;
  const rotation = radians(config.rotation + (config.sides === 4 ? 45 : 0));
  const centeredVariant = usesCenterPolygon(config.sides, config.includeCenter);

  // All polygons share one color, so a single path filled and stroked once
  // looks the same as drawing them one by one.
  const path = new Path2D();
  let polygons = 0;

  const drawFlake = (centerX: number, centerY: number, radius: number, depth: number) => {
    if (depth >= config.iterations) {
      tracePolygon(path, centerX, centerY, radius, config.sides, rotation);
      polygons++;
      return;
    }

    const childRadius = radius * scaleFactor;
    const offset = radius - childRadius;

    for (let i = 0; i < config.sides; i++) {
      const angle = rotation - Math.PI / 2 + (2 * Math.PI * i) / config.sides;
      drawFlake(
        centerX + offset * Math.cos(angle),
        centerY + offset * Math.sin(angle),
        childRadius,
        depth + 1,
      );
    }

    if (centeredVariant) {
      drawFlake(centerX, centerY, childRadius, depth + 1);
    }
  };

  ctx.fillStyle = config.background;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = config.color;
  ctx.strokeStyle = config.color;
  ctx.lineWidth = config.lineWidth;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  drawFlake(width / 2, height / 2, rootRadius, 0);

  if (config.fillPolygons) ctx.fill(path);
  if (config.strokePolygons) ctx.stroke(path);

  return polygons;
}
