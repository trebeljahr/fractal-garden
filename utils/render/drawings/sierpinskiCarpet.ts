import type { Context2D } from "../types";

export type SierpinskiCarpetParams = {
  iterations: number;
  color: string;
  holeColor: string;
  background: string;
};

export function drawSierpinskiCarpet(
  ctx: Context2D,
  width: number,
  height: number,
  config: SierpinskiCarpetParams,
) {
  const length = Math.min(width, height) * 0.8;

  ctx.fillStyle = config.background;
  ctx.fillRect(0, 0, width, height);
  ctx.translate((width - length) / 2, (height - length) / 2);

  if (config.iterations < 1) return 0;

  // Sub-squares only repaint the carpet color over itself and holes are never
  // drawn over, so one carpet square plus one path of all holes is the same picture.
  const holes = new Path2D();
  let squares = 1;

  const carve = (len: number, x: number, y: number, iterations: number) => {
    if (iterations >= config.iterations) return;
    const third = len / 3;
    for (let i = 0; i <= 2; i++) {
      for (let j = 0; j <= 2; j++) {
        if (i === 1 && j === 1) {
          holes.rect(x + third, y + third, third, third);
          squares++;
        } else {
          carve(third, x + i * third, y + j * third, iterations + 1);
        }
      }
    }
  };

  carve(length, 0, 0, 0);

  ctx.fillStyle = config.color;
  ctx.fillRect(0, 0, length, length);
  ctx.fillStyle = config.holeColor;
  ctx.fill(holes);

  return squares;
}
