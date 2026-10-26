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
  /** Draw the displayed state without advancing it; apply queued params only to the export. */
  drawExport?(
    ctx: Context2D,
    width: number,
    height: number,
    pendingParams?: P,
  ): void | Promise<void>;
  /** Level and amount of geometry currently shown, for the iteration budget. */
  describe(): { level: number; work: number } | null;
  /** The parameters for another growth level; defaults to replacing `iterations`. */
  withLevel?(params: P, level: number): P;
  pick?(x: number, y: number, width: number, height: number): [number, number, number] | null;
  snapshotView?(): unknown;
  restoreView?(state: unknown): void;
}

export type HostEvent =
  | { type: "png"; id: number; blob?: Blob; error?: string }
  | { type: "picked"; id: number; point: [number, number, number] | null }
  | { type: "snapshot"; id: number; state: unknown }
  | { type: "rendered"; level: number }
  | { type: "cost"; report: CostReport }
  | { type: "calibrated"; reports: CostReport[] }
  | { type: "error"; message: string };

export type WorkerRequest =
  | { type: "export-png"; id: number; ratio: number }
  | { type: "pick"; id: number; x: number; y: number }
  | { type: "snapshot"; id: number }
  | { type: "restore-view"; state: unknown }
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
  | { type: "remeasure" }
  | { type: "calibrate"; request: CalibrationRequest<unknown> };

export type CalibrationRequest<P> = {
  params: P;
  min: number;
  max: number;
  width: number;
  height: number;
  ratio: number;
};
