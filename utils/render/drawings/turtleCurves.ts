import { drawFittedCurve, expandLSystem, traceTurtle } from "../../turtleCurve";
import {
  type Bounds,
  extendBounds,
  fitBounds,
  prepareCanvas,
  rewriteSentence,
  toCanvasPath,
  traceTurtle as traceTurtleVec,
  type Vec2D,
} from "../../turtleCurves";
import type { Context2D } from "../types";

// Bespoke turtle-curve pages. Each traces its curve once per geometry change, so
// colour and line width edits only restroke the cached points.

type CurveStyle = {
  iterations: number;
  background: string;
  color: string;
  lineWidth: number;
};

function cacheLast<A extends unknown[], V>(compute: (...args: A) => V) {
  let lastKey: string | null = null;
  let lastValue: V;
  return (...args: A): V => {
    const key = JSON.stringify(args);
    if (key !== lastKey) {
      lastValue = compute(...args);
      lastKey = key;
    }
    return lastValue;
  };
}

const FITTED_PADDING = 0.08;

function strokeFitted(
  ctx: Context2D,
  width: number,
  height: number,
  { points, bounds }: { points: Vec2D[]; bounds: Bounds },
  style: CurveStyle,
) {
  prepareCanvas(ctx, width, height, style.background, style.lineWidth);
  ctx.strokeStyle = style.color;
  ctx.stroke(toCanvasPath(points, fitBounds(bounds, width, height, FITTED_PADDING)));
  return points.length - 1;
}

// --- Closed Koch-style islands (utils/turtleCurve.ts) ---

const traceLSystem = cacheLast(
  (axiom: string, rules: Record<string, string>, turns: Record<string, number>, n: number) =>
    traceTurtle(expandLSystem(axiom, rules, n), turns, 0),
);

export type CesaroParams = CurveStyle & { angle: number };

export function drawCesaroFractal(ctx: Context2D, width: number, height: number, p: CesaroParams) {
  // Four Cesàro curves on the sides of a square, spikes pointing inward.
  // "L" is the fixed 90° corner of the square; "+"/"-" use the adjustable angle.
  const curve = traceLSystem(
    "FLFLFLF",
    { F: "F+F--F+F" },
    { "+": p.angle, "-": -p.angle, L: 90 },
    p.iterations,
  );
  return drawFittedCurve(ctx, curve, { width, height, ...p, closePath: true });
}

export type KochAntiSnowflakeParams = CurveStyle;

export function drawKochAntiSnowflake(
  ctx: Context2D,
  width: number,
  height: number,
  p: KochAntiSnowflakeParams,
) {
  // Counterclockwise triangle whose Koch spikes turn left, into the triangle.
  const curve = traceLSystem("F++F++F", { F: "F+F--F+F" }, { "+": 60, "-": -60 }, p.iterations);
  return drawFittedCurve(ctx, curve, { width, height, ...p, closePath: true });
}

export type QuadraticKochIslandParams = CurveStyle;

export function drawQuadraticKochIsland(
  ctx: Context2D,
  width: number,
  height: number,
  p: QuadraticKochIslandParams,
) {
  // Quadratic Koch island: 18 segments, each 1/6 of the replaced one.
  const curve = traceLSystem(
    "F-F-F-F",
    { F: "F+FF-FF-F-F+F+FF-F-F+F+FF+FF-F" },
    { "+": 90, "-": -90 },
    p.iterations,
  );
  return drawFittedCurve(ctx, curve, { width, height, ...p, closePath: true });
}

export type MinkowskiParams = CurveStyle & { island: boolean };

export function drawMinkowskiSausage(
  ctx: Context2D,
  width: number,
  height: number,
  p: MinkowskiParams,
) {
  // Quadratic type 2 Koch curve. The island puts four curves on a square.
  const curve = traceLSystem(
    p.island ? "F+F+F+F" : "F",
    { F: "F+F-F-FF+F+F-F" },
    { "+": 90, "-": -90 },
    p.iterations,
  );
  return drawFittedCurve(ctx, curve, { width, height, ...p, closePath: p.island });
}

// --- Open curves (utils/turtleCurves.ts) ---

const traceDragon = cacheLast((iterations: number) =>
  traceTurtleVec(rewriteSentence("F", { F: "F+G", G: "F-G" }, iterations), {
    turnAngle: Math.PI / 2,
    startAngle: Math.PI / 4,
    drawChars: "FG",
  }),
);

export type DragonCurveParams = CurveStyle;

export function drawDragonCurve(
  ctx: Context2D,
  width: number,
  height: number,
  p: DragonCurveParams,
) {
  return strokeFitted(ctx, width, height, traceDragon(p.iterations), p);
}

const traceTerdragon = cacheLast((iterations: number) =>
  // Each iteration turns the chord by 30°, so counter-rotate to keep it level.
  traceTurtleVec(rewriteSentence("F", { F: "F+F-F" }, iterations), {
    turnAngle: (2 * Math.PI) / 3,
    startAngle: (-iterations * Math.PI) / 6,
  }),
);

export type TerdragonParams = CurveStyle;

export function drawTerdragon(ctx: Context2D, width: number, height: number, p: TerdragonParams) {
  return strokeFitted(ctx, width, height, traceTerdragon(p.iterations), p);
}

const traceGosper = cacheLast((iterations: number) =>
  traceTurtleVec(
    rewriteSentence("XF", { X: "X+YF++YF-FX--FXFX-YF+", Y: "-FX+YFYF++YF+FX--FX-Y" }, iterations),
    { turnAngle: Math.PI / 3 },
  ),
);

export type GosperCurveParams = CurveStyle;

export function drawGosperCurve(
  ctx: Context2D,
  width: number,
  height: number,
  p: GosperCurveParams,
) {
  return strokeFitted(ctx, width, height, traceGosper(p.iterations), p);
}

const traceFibonacciWord = cacheLast((iterations: number, angle: number) => {
  const word = rewriteSentence("0", { "0": "01", "1": "0" }, iterations);
  const turn = (angle * Math.PI) / 180;
  let x = 0;
  let y = 0;
  let heading = 0;
  const points: Vec2D[] = [[x, y]];

  // Step for every digit; after a "0" turn left at even positions, right at odd.
  for (let i = 0; i < word.length; i++) {
    x += Math.cos(heading);
    y += Math.sin(heading);
    points.push([x, y]);
    if (word[i] !== "0") continue;
    heading += (i + 1) % 2 === 0 ? turn : -turn;
  }

  const bounds = extendBounds({ minX: 0, maxX: 0, minY: 0, maxY: 0 }, points);
  return { points, bounds };
});

export type FibonacciWordParams = CurveStyle & { angle: number };

export function drawFibonacciWordFractal(
  ctx: Context2D,
  width: number,
  height: number,
  p: FibonacciWordParams,
) {
  return strokeFitted(ctx, width, height, traceFibonacciWord(p.iterations, p.angle), p);
}

// --- Twindragon ---

const TWIN_PADDING = 0.08;
const TILING_PADDING = 0.25;
const TILING_ALPHA = 0.35;
const MAX_TILE_RANGE = 8;

// Two Heighway dragons back to back: the second one is the first one turned
// 180° around the midpoint of its chord, so it runs from the end back to the start.
const traceTwindragon = cacheLast((iterations: number) => {
  // Each iteration turns the chord by 45°, so counter-rotate to keep it level.
  const { points, bounds } = traceTurtleVec(
    rewriteSentence("F", { F: "F+G", G: "F-G" }, iterations),
    { turnAngle: Math.PI / 2, startAngle: (-iterations * Math.PI) / 4, drawChars: "FG" },
  );

  const [endX, endY] = points[points.length - 1];
  const mirrored = points.map(([x, y]): Vec2D => [endX - x, endY - y]);
  extendBounds(bounds, mirrored);

  return { first: points, second: mirrored, chord: [endX, endY] as Vec2D, bounds };
});

export type TwindragonParams = {
  iterations: number;
  showTiling: boolean;
  background: string;
  firstDragon: string;
  secondDragon: string;
  lineWidth: number;
};

export function drawTwindragon(ctx: Context2D, width: number, height: number, p: TwindragonParams) {
  const { first, second, chord, bounds } = traceTwindragon(p.iterations);
  const padding = p.showTiling ? TILING_PADDING : TWIN_PADDING;
  const transform = fitBounds(bounds, width, height, padding);
  const firstPath = toCanvasPath(first, transform);
  const secondPath = toCanvasPath(second, transform);
  const tileSegments = first.length - 1 + second.length - 1;
  let tiles = 0;

  prepareCanvas(ctx, width, height, p.background, p.lineWidth);

  const drawTile = (dx: number, dy: number) => {
    ctx.save();
    ctx.translate(dx, dy);
    ctx.strokeStyle = p.firstDragon;
    ctx.stroke(firstPath);
    ctx.strokeStyle = p.secondDragon;
    ctx.stroke(secondPath);
    ctx.restore();
    tiles++;
  };

  if (p.showTiling) {
    // Twindragons tile the plane by translation along the chord c and i·c.
    const { scale } = transform;
    const u: Vec2D = [chord[0] * scale, -chord[1] * scale];
    const v: Vec2D = [chord[1] * scale, chord[0] * scale];
    const tileLeft = transform.offsetX + bounds.minX * scale;
    const tileRight = transform.offsetX + bounds.maxX * scale;
    const tileTop = transform.offsetY - bounds.maxY * scale;
    const tileBottom = transform.offsetY - bounds.minY * scale;
    const latticeStep = Math.hypot(u[0], u[1]);
    const range = Math.min(Math.ceil(Math.max(width, height) / latticeStep) + 1, MAX_TILE_RANGE);

    ctx.globalAlpha = TILING_ALPHA;
    for (let a = -range; a <= range; a++) {
      for (let b = -range; b <= range; b++) {
        if (a === 0 && b === 0) continue;

        const dx = a * u[0] + b * v[0];
        const dy = a * u[1] + b * v[1];
        const visible =
          tileRight + dx > 0 &&
          tileLeft + dx < width &&
          tileBottom + dy > 0 &&
          tileTop + dy < height;
        if (visible) drawTile(dx, dy);
      }
    }
    ctx.globalAlpha = 1;
  }

  drawTile(0, 0);
  return tiles * tileSegments;
}
