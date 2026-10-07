import type { Context2D } from "./render/types";

export type Vec2D = [number, number];

export type Bounds = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
};

export type CurveTransform = {
  scale: number;
  offsetX: number;
  offsetY: number;
};

export function rewriteSentence(
  axiom: string,
  replace: Record<string, string>,
  iterations: number,
) {
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

export function extendBounds(bounds: Bounds, points: Vec2D[]) {
  for (const [x, y] of points) {
    bounds.minX = Math.min(bounds.minX, x);
    bounds.maxX = Math.max(bounds.maxX, x);
    bounds.minY = Math.min(bounds.minY, y);
    bounds.maxY = Math.max(bounds.maxY, y);
  }

  return bounds;
}

// Walks a turtle through the sentence. Every char in `drawChars` steps forward
// one unit, "+" turns counter-clockwise and "-" turns clockwise by `turnAngle`.
export function traceTurtle(
  sentence: string,
  {
    turnAngle,
    startAngle = 0,
    drawChars = "F",
  }: {
    turnAngle: number;
    startAngle?: number;
    drawChars?: string;
  },
) {
  let x = 0;
  let y = 0;
  let angle = startAngle;

  const points: Vec2D[] = [[x, y]];
  const bounds: Bounds = {
    minX: x,
    maxX: x,
    minY: y,
    maxY: y,
  };

  for (const char of sentence) {
    if (drawChars.includes(char)) {
      x += Math.cos(angle);
      y += Math.sin(angle);
      points.push([x, y]);
      bounds.minX = Math.min(bounds.minX, x);
      bounds.maxX = Math.max(bounds.maxX, x);
      bounds.minY = Math.min(bounds.minY, y);
      bounds.maxY = Math.max(bounds.maxY, y);
      continue;
    }

    if (char === "+") {
      angle += turnAngle;
      continue;
    }

    if (char === "-") {
      angle -= turnAngle;
    }
  }

  return { points, bounds };
}

// Fits curve space (y up) into the canvas (y down), centred with padding.
export function fitBounds(
  bounds: Bounds,
  width: number,
  height: number,
  padding: number,
): CurveTransform {
  const curveWidth = Math.max(bounds.maxX - bounds.minX, 1);
  const curveHeight = Math.max(bounds.maxY - bounds.minY, 1);
  const scale = Math.min(
    (width * (1 - 2 * padding)) / curveWidth,
    (height * (1 - 2 * padding)) / curveHeight,
  );

  const top = (height - curveHeight * scale) / 2;
  const left = (width - curveWidth * scale) / 2;

  return {
    scale,
    offsetX: left - bounds.minX * scale,
    offsetY: top + bounds.maxY * scale,
  };
}

export function toCanvasPath(points: Vec2D[], { scale, offsetX, offsetY }: CurveTransform) {
  const path = new Path2D();
  const [startX, startY] = points[0];
  path.moveTo(offsetX + startX * scale, offsetY - startY * scale);

  for (let i = 1; i < points.length; i++) {
    const [x, y] = points[i];
    path.lineTo(offsetX + x * scale, offsetY - y * scale);
  }

  return path;
}

export function prepareCanvas(
  ctx: Context2D,
  width: number,
  height: number,
  background: string,
  lineWidth: number,
) {
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, height);

  ctx.lineWidth = lineWidth;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
}
