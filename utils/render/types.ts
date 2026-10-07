import type { CostReport } from "../perf/iterationBudget";

export type Context2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

/**
 * A renderer owns everything needed to draw one kind of fractal. It is plain
 * data in, pixels out, so the same code runs in a worker or, where
 * OffscreenCanvas is missing, on the main thread.
 */
export interface Renderer<P> {
  /** Takes new parameters, rebuilding geometry if they require it. */
  update(params: P): void;
  /** Draws one frame. Returns true to be called again on the next frame. */
  draw(ctx: Context2D, width: number, height: number): boolean;
  /** Level and amount of geometry currently shown, for the iteration budget. */
  describe(): { level: number; work: number } | null;
}

export type HostEvent =
  | { type: "rendered"; level: number }
  | { type: "cost"; report: CostReport }
  | { type: "error"; message: string };

export type WorkerRequest =
  | {
      type: "init";
      kind: string;
      canvas: OffscreenCanvas;
      width: number;
      height: number;
      ratio: number;
    }
  | { type: "resize"; width: number; height: number; ratio: number }
  | { type: "params"; params: unknown }
  | { type: "remeasure" };
