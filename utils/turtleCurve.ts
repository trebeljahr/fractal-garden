// Shared helpers for L-system curves that are traced with unit-length steps and
// then scaled to fit the canvas, so the turn angle can change without a
// hand-tuned divide factor (see pages/l-system/dragon-curve.tsx for the origin).
// No DOM access here: the drawing runs in the render worker.

import type { Context2D } from "./render/types";

export type Bounds = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
};

export type TracedCurve = {
  // Flat [x0, y0, x1, y1, ...] list, y pointing up.
  points: number[];
  bounds: Bounds;
};

export function expandLSystem(axiom: string, replace: Record<string, string>, iterations: number) {
  let sentence = axiom;

  for (let i = 0; i < iterations; i++) {
    let nextSentence = "";

    for (const char of sentence) {
      nextSentence += replace[char] ?? char;
    }

    sentence = nextSentence;
  }

  return sentence;
}

// "F"/"G" step forward by one unit. `turns` maps every turning symbol to its
// angle in degrees, positive = counterclockwise.
export function traceTurtle(
  sentence: string,
  turns: Record<string, number>,
  startAngleDeg = 0,
): TracedCurve {
  const turnRadians: Record<string, number> = {};
  for (const [symbol, degrees] of Object.entries(turns)) {
    turnRadians[symbol] = (degrees * Math.PI) / 180;
  }
  let angle = (startAngleDeg * Math.PI) / 180;
  let x = 0;
  let y = 0;

  const points = [x, y];
  const bounds: Bounds = { minX: 0, maxX: 0, minY: 0, maxY: 0 };

  for (const char of sentence) {
    if (char === "F" || char === "G") {
      x += Math.cos(angle);
      y += Math.sin(angle);
      points.push(x, y);
      if (x < bounds.minX) bounds.minX = x;
      if (x > bounds.maxX) bounds.maxX = x;
      if (y < bounds.minY) bounds.minY = y;
      if (y > bounds.maxY) bounds.maxY = y;
    } else if (char in turnRadians) {
      angle += turnRadians[char];
    }
  }

  return { points, bounds };
}

type DrawOptions = {
  width: number;
  height: number;
  background: string;
  color: string;
  lineWidth: number;
  padding?: number;
  closePath?: boolean;
};

// Returns the number of segments drawn.
export function drawFittedCurve(
  ctx: Context2D,
  { points, bounds }: TracedCurve,
  { width, height, background, color, lineWidth, padding = 0.08, closePath = false }: DrawOptions,
) {
  const curveWidth = Math.max(bounds.maxX - bounds.minX, 1e-9);
  const curveHeight = Math.max(bounds.maxY - bounds.minY, 1e-9);
  const scale = Math.min(
    (width * (1 - 2 * padding)) / curveWidth,
    (height * (1 - 2 * padding)) / curveHeight,
  );
  const offsetX = (width - curveWidth * scale) / 2 - bounds.minX * scale;
  const offsetY = (height - curveHeight * scale) / 2 + bounds.maxY * scale;

  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  ctx.beginPath();
  ctx.moveTo(offsetX + points[0] * scale, offsetY - points[1] * scale);

  for (let i = 2; i < points.length; i += 2) {
    ctx.lineTo(offsetX + points[i] * scale, offsetY - points[i + 1] * scale);
  }

  if (closePath) ctx.closePath();
  ctx.stroke();
  return points.length / 2 - 1;
}
