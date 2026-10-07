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
  const paths: Path2D[] = [];
  let segments = 0;

  const branch = (x: number, y: number, heading: number, len: number, depth: number) => {
    if (depth > maxIterations) return;

    const endX = x + Math.sin(heading) * len;
    const endY = y - Math.cos(heading) * len;
    paths[depth] ??= new Path2D();
    paths[depth].moveTo(x, y);
    paths[depth].lineTo(endX, endY);
    segments++;

    const childHeading = heading + spread;
    for (let i = 0; i < config.branches; i++) {
      branch(endX, endY, childHeading + step * i, len * config.lengthFactor, depth + 1);
    }
  };

  ctx.fillStyle = config.background;
  ctx.fillRect(0, 0, width, height);
  branch(width / 2, height, 0, base, 0);

  for (let depth = 0; depth < paths.length; depth++) {
    // The deepest level reuses the colour above it, as it always has.
    const colorLevel = Math.min(depth, maxIterations - 1);
    ctx.strokeStyle = rgb(remapR(colorLevel), remapG(colorLevel), 100);
    ctx.lineWidth = config.rootWidth * config.widthFactor ** depth;
    ctx.stroke(paths[depth]);
  }

  return segments;
}
