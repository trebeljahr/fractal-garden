import {
  type CostReport,
  type LevelSamples,
  loadFromReport,
  predictLoad,
} from "../perf/iterationBudget";
import type { Context2D, Renderer } from "./types";

// A single level slower than this ends the sweep regardless of the budget.
const MAX_STEP_MS = 2000;
// Redraws timed per level for scenes that animate every frame.
const CONTINUOUS_SAMPLES = 3;

type Options<P> = {
  createRenderer: () => Renderer<P>;
  template: P;
  min: number;
  max: number;
  width: number;
  height: number;
  ratio: number;
  offThread: boolean;
};

function createScratchCanvas(width: number, height: number) {
  if (typeof OffscreenCanvas !== "undefined") return new OffscreenCanvas(width, height);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function withLevel<P>(renderer: Renderer<P>, params: P, level: number): P {
  return renderer.withLevel ? renderer.withLevel(params, level) : { ...params, iterations: level };
}

/**
 * Finds how deep this machine can go before the page shows anything: renders
 * each level from `min` up on a hidden canvas, timing build and draw, and
 * stops as soon as a level, or the predicted next one, is over budget.
 * Reading a pixel back forces the browser to finish rasterising, so the
 * timings include the real drawing cost.
 */
export function calibrate<P>({
  createRenderer,
  template,
  min,
  max,
  width,
  height,
  ratio,
  offThread,
}: Options<P>): CostReport[] {
  const canvas = createScratchCanvas(Math.round(width * ratio), Math.round(height * ratio));
  const ctx = canvas.getContext("2d") as Context2D | null;
  if (!ctx) return [];

  const renderer = createRenderer();
  const reports: CostReport[] = [];
  const samples: LevelSamples = {};

  for (let level = min; level <= max; level++) {
    const buildStart = performance.now();
    renderer.update(withLevel(renderer, template, level));
    const buildMs = performance.now() - buildStart;

    const frames: number[] = [];
    const drawFrame = () => {
      const drawStart = performance.now();
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      const again = renderer.draw(ctx, width, height);
      ctx.getImageData(0, 0, 1, 1);
      frames.push(performance.now() - drawStart);
      return again;
    };
    const continuous = drawFrame();
    while (continuous && frames.length < CONTINUOUS_SAMPLES) drawFrame();
    frames.sort((a, b) => a - b);

    const report: CostReport = {
      level,
      work: renderer.describe()?.work ?? 1,
      buildMs,
      frameMs: frames[Math.floor(frames.length / 2)],
      continuous,
      offThread,
    };
    reports.push(report);

    const load = loadFromReport(report);
    samples[level] = { load, work: Math.max(1, report.work) };
    if (load > 1 || buildMs + frames[0] > MAX_STEP_MS) break;

    const next = predictLoad(samples, level + 1);
    if (next !== null && next > 1) break;
  }

  return reports;
}
