import { type DeepViewport, viewportDelta } from "./deepZoom/math";
import { createFernWalker, type FernMethod } from "./fernViewport";

const SETTLE_MS = 80;
const BLEND_MS = 140;
const FRAME_BUDGET_MS = 4;
const OVERSCAN = 1.3;

type Surface = HTMLCanvasElement | OffscreenCanvas;
type Context = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
type Frame = { canvas: Surface; view: DeepViewport; width: number; height: number };
type Work = {
  frame: Frame;
  ctx: Context;
  walker: ReturnType<typeof createFernWalker>;
  complete: boolean;
};
export type FernProgress = {
  samples: number;
  visited: number;
  resolution: number;
  complete: boolean;
};
type Options = {
  matrix: number[][];
  view: DeepViewport;
  width: number;
  height: number;
  ratio: number;
  method: FernMethod;
  background: string;
  color: string;
  paused: boolean;
  reducedMotion: boolean;
  onProgress: (progress: FernProgress) => void;
};

/** Reproject a retained image without turning a deep camera center into a float. */
export function fernFramePlacement(
  frame: Pick<Frame, "view" | "width" | "height">,
  view: DeepViewport,
  width: number,
  height: number,
) {
  const side = Math.min(width, height);
  const scale =
    (side / Math.min(frame.width, frame.height)) * 2 ** (frame.view.logZoom - view.logZoom);
  const delta = viewportDelta(view, frame.view);
  const pixels = ([mantissa, exponent]: [number, number]) =>
    mantissa === 0 ? 0 : (mantissa * 2 ** (exponent - view.logZoom) * side) / 2;
  return {
    x: (width - frame.width * scale) / 2 - pixels(delta.x),
    y: (height - frame.height * scale) / 2 + pixels(delta.y),
    width: frame.width * scale,
    height: frame.height * scale,
  };
}

/** Keep the last dots visible during gestures; build the next view out of sight. */
export class FernViewportRenderer {
  private view: DeepViewport;
  private current: Frame | null = null;
  private previous: Frame | null = null;
  private work: Work | null = null;
  private frameId: number | null = null;
  private movedAt = -Infinity;
  private blendAt = 0;
  private refine = true;
  private paused: boolean;
  private disposed = false;

  constructor(
    private ctx: CanvasRenderingContext2D,
    private options: Options,
  ) {
    this.view = { ...options.view };
    this.paused = options.paused;
    options.onProgress({ samples: 0, visited: 0, resolution: 0, complete: false });
    this.schedule();
  }

  setView(view: DeepViewport) {
    if (
      view.x === this.view.x &&
      view.y === this.view.y &&
      view.bits === this.view.bits &&
      view.logZoom === this.view.logZoom
    )
      return;
    this.view = { ...view };
    // Finish an in-flight refinement so continuous gestures cannot starve it.
    if (this.work?.complete && this.work.frame === this.current) this.work = null;
    this.refine = true;
    this.movedAt = performance.now();
    this.options.onProgress({ samples: 0, visited: 0, resolution: 0, complete: false });
    this.schedule();
  }

  setPaused(paused: boolean) {
    this.paused = paused;
    if (!paused) this.schedule();
  }

  dispose() {
    this.disposed = true;
    if (this.frameId !== null) cancelAnimationFrame(this.frameId);
    this.frameId = null;
    this.work = null;
    this.current = null;
    this.previous = null;
  }

  private schedule() {
    if (this.disposed || this.frameId !== null) return;
    this.frameId = requestAnimationFrame(this.draw);
  }

  private begin() {
    const { width, height, ratio, matrix, method, background } = this.options;
    const w = Math.ceil(width * OVERSCAN),
      h = Math.ceil(height * OVERSCAN);
    const canvas =
      typeof OffscreenCanvas === "undefined"
        ? Object.assign(document.createElement("canvas"), {
            width: Math.round(w * ratio),
            height: Math.round(h * ratio),
          })
        : new OffscreenCanvas(Math.round(w * ratio), Math.round(h * ratio));
    const ctx = canvas.getContext("2d") as Context;
    if (!ctx) throw new Error("Fern drawing context unavailable");
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = this.options.color;
    const view = {
      ...this.view,
      logZoom: this.view.logZoom + Math.log2(Math.min(w, h) / Math.min(width, height)),
    };
    this.work = {
      frame: { canvas, view, width: w, height: h },
      ctx,
      // A camera gesture must not choose a different random fern.
      walker: createFernWalker(matrix, view, w, h, method, 42),
      complete: false,
    };
    this.refine = false;
  }

  private paint(frame: Frame, alpha = 1) {
    const { width, height } = this.options;
    const p = fernFramePlacement(frame, this.view, width, height);
    if (![p.x, p.y, p.width, p.height].every(Number.isFinite) || p.width <= 0 || p.height <= 0)
      return;
    this.ctx.globalAlpha = alpha;
    this.ctx.drawImage(frame.canvas, p.x, p.y, p.width, p.height);
  }

  private needsDetail() {
    if (!this.current) return true;
    const { width, height } = this.options;
    const p = fernFramePlacement(this.current, this.view, width, height);
    const scale = p.width / this.current.width;
    return (
      !Number.isFinite(scale) ||
      scale > 1.5 ||
      scale < 2 / 3 ||
      p.x > -16 ||
      p.y > -16 ||
      p.x + p.width < width + 16 ||
      p.y + p.height < height + 16
    );
  }

  private draw = () => {
    this.frameId = null;
    if (this.disposed) return;
    const now = performance.now();
    if (this.refine && !this.work && (now - this.movedAt >= SETTLE_MS || this.needsDetail()))
      this.begin();
    const work = this.work;
    if (work && (!work.complete || !this.paused)) {
      const start = performance.now();
      do {
        const points = work.walker.step(128);
        for (let i = 0; i < points.length; i += 2)
          work.ctx.fillRect(points[i], points[i + 1], 1, 1);
        work.complete =
          !work.walker.pending &&
          (this.options.method === "deterministic" ||
            work.walker.samples >= 300000 ||
            work.walker.tiles === 0);
      } while (
        (!work.complete || (!this.paused && work.walker.tiles > 0)) &&
        performance.now() - start < FRAME_BUDGET_MS
      );
      // Show the opening picture progressively. Later views replace it only
      // when their traversal is finished, never partway down the fern.
      if (!this.current) this.current = work.frame;
    }
    if (work?.complete && this.current !== work.frame && !this.previous) {
      this.previous = this.options.reducedMotion ? null : this.current;
      this.current = work.frame;
      this.blendAt = performance.now();
    }
    if (work?.complete && this.current === work.frame && this.refine) this.work = null;
    const { width, height, ratio, background } = this.options;
    this.ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    this.ctx.globalAlpha = 1;
    this.ctx.fillStyle = background;
    this.ctx.fillRect(0, 0, width, height);
    if (this.previous) {
      const t = Math.min(1, (performance.now() - this.blendAt) / BLEND_MS);
      this.paint(this.previous);
      if (this.current) this.paint(this.current, t * t * (3 - 2 * t));
      if (t === 1) this.previous = null;
    } else if (this.current) this.paint(this.current);
    this.ctx.globalAlpha = 1;
    if (work)
      this.options.onProgress({
        samples: work.walker.samples,
        visited: work.walker.visited,
        resolution: work.walker.resolution,
        complete: work.complete && !this.refine && !this.previous && this.current === work.frame,
      });
    if (
      this.refine ||
      this.previous ||
      (this.work?.complete && this.current !== this.work.frame) ||
      (this.work && (!this.work.complete || (!this.paused && this.work.walker.tiles > 0)))
    )
      this.schedule();
  };
}
