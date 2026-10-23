import { CONSTRUCTION_MOTION_MS } from "../constructionMotion";
import type { Context2D, Renderer } from "./types";

export type ConstructionParams = {
  kind: string;
  params: unknown;
  level: number;
  animate: boolean;
};

function canvasLike(ctx: Context2D) {
  const canvas =
    typeof OffscreenCanvas !== "undefined"
      ? new OffscreenCanvas(ctx.canvas.width, ctx.canvas.height)
      : Object.assign(document.createElement("canvas"), {
          width: ctx.canvas.width,
          height: ctx.canvas.height,
        });
  return canvas;
}

/** A construction owns its transition and buffers; the explorer renderer is untouched. */
export class ConstructionRenderer implements Renderer<ConstructionParams> {
  private source: Renderer<unknown> | null = null;
  private params: ConstructionParams | null = null;
  private previous: HTMLCanvasElement | OffscreenCanvas | null = null;
  private current: HTMLCanvasElement | OffscreenCanvas | null = null;
  private pending = false;
  private sourceRunning = false;
  private started = 0;
  private blend = false;

  constructor(private readonly create: (kind: string) => Renderer<unknown>) {}

  update(next: ConstructionParams) {
    const previous = this.params;
    const sameKind = previous?.kind === next.kind;
    if (!sameKind) {
      if (next.kind === "construction") throw new Error("A construction cannot contain itself");
      this.source = this.create(next.kind);
      this.current = null;
      this.sourceRunning = false;
    }
    this.blend =
      next.animate &&
      sameKind &&
      previous !== null &&
      next.level === previous.level + 1 &&
      next.kind !== "scene3d";
    this.previous = this.blend ? this.current : null;
    this.current = null;
    this.started = 0;
    this.pending = true;
    this.params = next;
    this.source?.update(
      next.kind === "scene3d"
        ? { ...(next.params as object), constructionMotion: next.animate }
        : next.params,
    );
  }

  draw(ctx: Context2D, width: number, height: number) {
    if (!this.source || !this.params) return false;
    if (this.params.kind === "scene3d") return this.source.draw(ctx, width, height);
    const refresh =
      this.pending ||
      !this.current ||
      this.current.width !== ctx.canvas.width ||
      this.current.height !== ctx.canvas.height;
    if (refresh || this.sourceRunning) {
      this.sourceRunning = this.source.draw(ctx, width, height);
      if (refresh || !this.current) this.current = canvasLike(ctx);
      this.current.getContext("2d")!.drawImage(ctx.canvas, 0, 0);
      this.pending = false;
      if (refresh) this.started = performance.now();
    }
    if (!this.current || !this.previous || !this.blend) return this.sourceRunning;
    const t = Math.min(1, (performance.now() - this.started) / CONSTRUCTION_MOTION_MS);
    const progress = t * t * (3 - 2 * t);
    ctx.drawImage(this.previous, 0, 0, width, height);
    ctx.globalAlpha = progress;
    ctx.drawImage(this.current, 0, 0, width, height);
    ctx.globalAlpha = 1;
    if (t === 1) this.previous = null;
    return this.sourceRunning || t < 1;
  }

  snapshotView() {
    return this.source?.snapshotView?.();
  }

  restoreView(state: unknown) {
    this.source?.restoreView?.(state);
    this.previous = null;
    this.current = null;
    this.blend = false;
    this.pending = true;
  }

  describe() {
    return this.source?.describe() ?? null;
  }
}
