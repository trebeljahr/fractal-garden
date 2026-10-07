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

export class StaticRenderer<P extends { iterations: number }> implements Renderer<P> {
  private params: P | null = null;
  private work = 0;

  constructor(private readonly drawing: StaticDrawing<P>) {}

  update(params: P) {
    this.params = params;
  }

  draw(ctx: Context2D, width: number, height: number) {
    if (!this.params) return false;
    ctx.save();
    this.work = this.drawing(ctx, width, height, this.params);
    ctx.restore();
    return false;
  }

  describe() {
    if (!this.params) return null;
    return { level: this.params.iterations, work: this.work };
  }
}
