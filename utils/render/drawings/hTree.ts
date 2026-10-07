import type { Context2D } from "../types";

export type HTreeParams = {
  iterations: number;
  ratio: number;
  rootWidth: number;
  widthFactor: number;
  background: string;
  rootColor: string;
  tipColor: string;
};

export const H_TREE_MAX_ITERATIONS = 14;
const PADDING = 0.08;

function hexToRgb(hex: string): [number, number, number] {
  const value = Number.parseInt(hex.replace("#", ""), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function mixColors(from: string, to: string, t: number) {
  const a = hexToRgb(from);
  const b = hexToRgb(to);
  const [r, g, bl] = a.map((channel, i) => Math.round(channel + (b[i] - channel) * t));
  return `rgb(${r}, ${g}, ${bl})`;
}

export function drawHTree(ctx: Context2D, width: number, height: number, config: HTreeParams) {
  // Fit the limit shape, not the current iteration, so the tree grows in place
  // while animating. Horizontal segments sit at even depths, vertical at odd.
  const r2 = config.ratio * config.ratio;
  const halfWidth = 0.5 / (1 - r2);
  const halfHeight = (0.5 * config.ratio) / (1 - r2);
  const rootLength = Math.min(
    (width * (1 - 2 * PADDING)) / (2 * halfWidth),
    (height * (1 - 2 * PADDING)) / (2 * halfHeight),
  );

  // One path per depth keeps the number of stroke calls tiny.
  const paths = [...new Array(config.iterations + 1)].map(() => new Path2D());
  let segments = 0;

  const grow = (x: number, y: number, length: number, horizontal: boolean, depth: number) => {
    const half = length / 2;
    const [x0, y0, x1, y1] = horizontal ? [x - half, y, x + half, y] : [x, y - half, x, y + half];

    const path = paths[depth];
    path.moveTo(x0, y0);
    path.lineTo(x1, y1);
    segments++;

    if (depth >= config.iterations) return;

    grow(x0, y0, length * config.ratio, !horizontal, depth + 1);
    grow(x1, y1, length * config.ratio, !horizontal, depth + 1);
  };

  grow(width / 2, height / 2, rootLength, true, 0);

  ctx.fillStyle = config.background;
  ctx.fillRect(0, 0, width, height);

  ctx.lineCap = "round";

  paths.forEach((path, depth) => {
    const t = depth / H_TREE_MAX_ITERATIONS;
    ctx.strokeStyle = mixColors(config.rootColor, config.tipColor, t);
    ctx.lineWidth = Math.max(0.4, config.rootWidth * config.widthFactor ** depth);
    ctx.stroke(path);
  });

  return segments;
}
