import type { Context2D } from "../types";

export type VicsekVariant = "saltire" | "cross";

export type VicsekFractal2DParams = {
  iterations: number;
  variant: VicsekVariant;
  background: string;
  color: string;
  fillSquares: boolean;
  strokeSquares: boolean;
  lineWidth: number;
};

const PADDING = 0.08;
export const VICSEK_OFFSETS: Record<VicsekVariant, [number, number][]> = {
  saltire: [
    [0, 0],
    [2, 0],
    [1, 1],
    [0, 2],
    [2, 2],
  ],
  cross: [
    [1, 0],
    [0, 1],
    [1, 1],
    [2, 1],
    [1, 2],
  ],
};

export function drawVicsekFractal2D(
  ctx: Context2D,
  width: number,
  height: number,
  config: VicsekFractal2DParams,
) {
  const size = Math.min(width, height) * (1 - 2 * PADDING);
  const originX = (width - size) / 2;
  const originY = (height - size) / 2;
  const offsets = VICSEK_OFFSETS[config.variant];

  // Same color everywhere and squares only touch at corners, so one path
  // filled and stroked once matches drawing every square on its own.
  const path = new Path2D();
  let squares = 0;

  const drawVicsek = (x: number, y: number, len: number, depth: number) => {
    if (depth >= config.iterations) {
      path.rect(x, y, len, len);
      squares++;
      return;
    }

    const nextLength = len / 3;

    for (let i = 0; i < offsets.length; i++) {
      const [offsetX, offsetY] = offsets[i];
      drawVicsek(x + offsetX * nextLength, y + offsetY * nextLength, nextLength, depth + 1);
    }
  };

  ctx.fillStyle = config.background;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = config.color;
  ctx.strokeStyle = config.color;
  ctx.lineWidth = config.lineWidth;
  ctx.lineJoin = "round";

  drawVicsek(originX, originY, size, 0);

  if (config.fillSquares) ctx.fill(path);
  if (config.strokeSquares) ctx.stroke(path);

  return squares;
}
