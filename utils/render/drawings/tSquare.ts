import type { Context2D } from "../types";

export type TSquareParams = {
  iterations: number;
  ratio: number;
  background: string;
  color: string;
  fillSquares: boolean;
  strokeSquares: boolean;
  lineWidth: number;
};

const PADDING = 0.08;

type Bounds = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
};

function measureTSquareBounds(iterations: number, ratio: number): Bounds {
  const bounds: Bounds = {
    minX: Number.POSITIVE_INFINITY,
    maxX: Number.NEGATIVE_INFINITY,
    minY: Number.POSITIVE_INFINITY,
    maxY: Number.NEGATIVE_INFINITY,
  };

  const measure = (centerX: number, centerY: number, size: number, depth: number) => {
    const half = size / 2;
    bounds.minX = Math.min(bounds.minX, centerX - half);
    bounds.maxX = Math.max(bounds.maxX, centerX + half);
    bounds.minY = Math.min(bounds.minY, centerY - half);
    bounds.maxY = Math.max(bounds.maxY, centerY + half);

    if (depth >= iterations) return;

    const nextSize = size * ratio;
    const offset = size / 2;

    measure(centerX - offset, centerY - offset, nextSize, depth + 1);
    measure(centerX + offset, centerY - offset, nextSize, depth + 1);
    measure(centerX - offset, centerY + offset, nextSize, depth + 1);
    measure(centerX + offset, centerY + offset, nextSize, depth + 1);
  };

  measure(0, 0, 1, 0);

  return bounds;
}

export function drawTSquare(ctx: Context2D, width: number, height: number, config: TSquareParams) {
  const bounds = measureTSquareBounds(config.iterations, config.ratio);
  const drawWidth = bounds.maxX - bounds.minX;
  const drawHeight = bounds.maxY - bounds.minY;
  const scale = Math.min(
    (width * (1 - 2 * PADDING)) / drawWidth,
    (height * (1 - 2 * PADDING)) / drawHeight,
  );
  const xOffset = (width - drawWidth * scale) / 2 - bounds.minX * scale;
  const yOffset = (height - drawHeight * scale) / 2 - bounds.minY * scale;
  let squares = 0;

  // One path per depth: a fill or stroke call per square is what made deep
  // levels slow, and squares of a depth never overlap each other.
  const paths: Path2D[] = [];
  const addSquare = (centerX: number, centerY: number, size: number, depth: number) => {
    const scaledSize = size * scale;
    const half = scaledSize / 2;
    paths[depth] ??= new Path2D();
    paths[depth].rect(
      xOffset + centerX * scale - half,
      yOffset + centerY * scale - half,
      scaledSize,
      scaledSize,
    );
    squares++;

    if (depth >= config.iterations) return;

    const nextSize = size * config.ratio;
    const offset = size / 2;

    addSquare(centerX - offset, centerY - offset, nextSize, depth + 1);
    addSquare(centerX + offset, centerY - offset, nextSize, depth + 1);
    addSquare(centerX - offset, centerY + offset, nextSize, depth + 1);
    addSquare(centerX + offset, centerY + offset, nextSize, depth + 1);
  };

  ctx.fillStyle = config.background;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = config.color;
  ctx.strokeStyle = config.color;
  ctx.lineWidth = config.lineWidth;
  ctx.lineJoin = "miter";
  ctx.lineCap = "square";

  addSquare(0, 0, 1, 0);

  for (const path of paths) {
    if (config.fillSquares) ctx.fill(path);
    if (config.strokeSquares) ctx.stroke(path);
  }

  return squares;
}
