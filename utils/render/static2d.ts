import { applyCanvasViewport, type CanvasViewport } from "../canvasViewport";
import type { FractalFrame } from "../fractalFrame";
import type { Context2D, Renderer } from "./types";

/**
 * A fractal that is drawn once per parameter change. `draw` returns how much
 * geometry it drew (segments, squares, …), which feeds the iteration budget.
 * Keep these modules free of React and DOM access so they load in a worker.
 */
export type StaticDrawing<P extends { iterations: number }> = (
  ctx: Context2D,
  width: number,
  height: number,
  params: P,
) => number;

export class StaticRenderer<
  P extends {
    iterations: number;
    viewport?: CanvasViewport;
    background?: string;
    framing?: FractalFrame;
  },
> implements Renderer<P>
{
  private params: P | null = null;
  private work = 0;

  constructor(private readonly drawing: StaticDrawing<P>) {}

  update(params: P) {
    this.params = params;
  }

  draw(ctx: Context2D, width: number, height: number) {
    if (!this.params) return false;
    // Clear the entire surface before moving the geometry into its opening frame.
    ctx.fillStyle = this.params.background ?? "#252424";
    ctx.fillRect(0, 0, width, height);
    ctx.save();
    applyCanvasViewport(ctx, width, height, this.params.viewport);
    const top = this.params.framing?.top ?? 0;
    const bottom = this.params.framing?.bottom ?? 0;
    ctx.translate(0, top);
    this.work = this.drawing(ctx, width, Math.max(1, height - top - bottom), this.params);
    ctx.restore();
    return false;
  }

  describe() {
    if (!this.params) return null;
    return { level: this.params.iterations, work: this.work };
  }
}
