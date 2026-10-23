import { radians, rgb } from "../../ctxHelpers";
import { remapper } from "../../scaling";
import type { Context2D } from "../types";

export type FractalCanopyParams = {
  /** The canopy's depth, named for the iteration budget. */
  iterations: number;
  angle: number;
  branches: number;
  background: string;
  lengthFactor: number;
  widthFactor: number;
  rootWidth: number;
};

const remapR = remapper([0, 10], [100, 150]);
const remapG = remapper([0, 10], [100, 255]);

export function drawFractalCanopy(
  ctx: Context2D,
  width: number,
  height: number,
  config: FractalCanopyParams,
) {
  const maxIterations = config.iterations;
  const spread = radians(
    config.angle *
      (config.branches % 2 === 0
        ? Math.floor(config.branches / 2) - 0.5
        : Math.floor(config.branches / 2)),
  );
  const step = radians(-config.angle);

  // factor by which the tree grows to the max
  let lenFactor = 0;
  for (let i = 0; i < maxIterations; i++) lenFactor += config.lengthFactor ** (i + 1);

  // pad height and width separately
  const padding = 0.05;
  const paddedHeight = height * (1 - padding);
  const paddedWidth = width * (1 - 2 * padding);

  // max possible base size of the trunk in both directions
  const baseHigh = paddedHeight / (1 + lenFactor);
  const baseWide = paddedWidth / (2 * lenFactor);

  // determine which base fits assuming max growth
  const base = baseHigh * (2 * lenFactor) < paddedWidth ? baseHigh : baseWide;

  // Every branch of one depth shares its width and colour, so each depth is
  // one path and one stroke instead of a stroke per branch.
  const levels: {
    path: Path2D;
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    lineWidth: number;
  }[] = [];
  let segments = 0;

  const branch = (x: number, y: number, heading: number, len: number, depth: number) => {
    if (depth > maxIterations) return;

    const endX = x + Math.sin(heading) * len;
    const endY = y - Math.cos(heading) * len;
    levels[depth] ??= {
      path: new Path2D(),
      minX: Infinity,
      minY: Infinity,
      maxX: -Infinity,
      maxY: -Infinity,
      lineWidth: config.rootWidth * config.widthFactor ** depth,
    };
    const level = levels[depth];
    level.path.moveTo(x, y);
    level.path.lineTo(endX, endY);
    level.minX = Math.min(level.minX, x, endX);
    level.minY = Math.min(level.minY, y, endY);
    level.maxX = Math.max(level.maxX, x, endX);
    level.maxY = Math.max(level.maxY, y, endY);
    segments++;

    const childHeading = heading + spread;
    for (let i = 0; i < config.branches; i++) {
      branch(endX, endY, childHeading + step * i, len * config.lengthFactor, depth + 1);
    }
  };

  ctx.fillStyle = config.background;
  ctx.fillRect(0, 0, width, height);
  branch(0, 0, 0, base, 0);

  // Wide angles send branches below the root. Fit their full ink bounds,
  // including strokes, rather than anchoring the root at the canvas edge.
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const level of levels) {
    if (level.lineWidth <= 0) continue;
    const radius = level.lineWidth / 2;
    minX = Math.min(minX, level.minX - radius);
    minY = Math.min(minY, level.minY - radius);
    maxX = Math.max(maxX, level.maxX + radius);
    maxY = Math.max(maxY, level.maxY + radius);
  }
  const scale = Math.min(
    1,
    paddedWidth / (maxX - minX),
    (height * (1 - 2 * padding)) / (maxY - minY),
  );
  ctx.save();
  ctx.translate(width / 2 - ((minX + maxX) / 2) * scale, height / 2 - ((minY + maxY) / 2) * scale);
  ctx.scale(scale, scale);

  for (let depth = 0; depth < levels.length; depth++) {
    const level = levels[depth];
    if (level.lineWidth <= 0) continue;
    // The deepest level reuses the colour above it, as it always has.
    const colorLevel = Math.min(depth, maxIterations - 1);
    ctx.strokeStyle = rgb(remapR(colorLevel), remapG(colorLevel), 100);
    ctx.lineWidth = level.lineWidth;
    ctx.stroke(level.path);
  }
  ctx.restore();

  return segments;
}
