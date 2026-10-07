import type { Context2D, HostEvent, Renderer } from "./types";

type FrameCallback = (time: number) => void;

// Dedicated workers get requestAnimationFrame alongside OffscreenCanvas in
// current browsers; the timeout keeps older ones drawing.
function requestFrame(callback: FrameCallback) {
  if (typeof globalThis.requestAnimationFrame === "function") {
    return globalThis.requestAnimationFrame(callback);
  }
  return globalThis.setTimeout(() => callback(performance.now()), 16) as unknown as number;
}

function cancelFrame(id: number) {
  if (typeof globalThis.cancelAnimationFrame === "function") {
    globalThis.cancelAnimationFrame(id);
  } else {
    globalThis.clearTimeout(id);
  }
}

// Frames sampled before reporting the cost of a continuously redrawn level.
const CONTINUOUS_SAMPLES = 8;
// Waiting for the next vsync costs nothing. A gap longer than this between
// frames means rasterising really took that long.
const VSYNC_SLACK_MS = 20;

type Probe = {
  level: number;
  work: number;
  buildMs: number;
  drawMs: number;
  drawnAt: number;
  presented: boolean;
  continuous: boolean;
  lastFrameAt: number;
  frameMs: number[];
};

function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

/**
 * Runs a renderer against a canvas: coalesces parameter updates to one
 * rebuild per frame, keeps the frame loop going while the renderer asks for
 * it, and measures every new level so the page can budget iterations.
 */
export class RenderHost<P> {
  private readonly ctx: Context2D;
  private width = 0;
  private height = 0;
  private ratio = 1;
  private pending: { params: P } | null = null;
  private dirty = false;
  private frameId: number | null = null;
  private probe: Probe | null = null;
  private forceProbe = false;
  private disposed = false;

  constructor(
    private readonly canvas: HTMLCanvasElement | OffscreenCanvas,
    private readonly renderer: Renderer<P>,
    private readonly emit: (event: HostEvent) => void,
    private readonly offThread: boolean,
  ) {
    const ctx = canvas.getContext("2d") as Context2D | null;
    if (!ctx) throw new Error("2D canvas context unavailable");
    this.ctx = ctx;
  }

  resize(width: number, height: number, ratio: number) {
    this.width = width;
    this.height = height;
    this.ratio = ratio;
    this.canvas.width = Math.round(width * ratio);
    this.canvas.height = Math.round(height * ratio);
    this.dirty = true;
    this.schedule();
  }

  setParams(params: P) {
    this.pending = { params };
    this.schedule();
  }

  /** Measures the current level again, e.g. after timings taken in a hidden tab were dropped. */
  remeasure() {
    this.forceProbe = true;
    this.dirty = true;
    this.schedule();
  }

  dispose() {
    this.disposed = true;
    if (this.frameId !== null) cancelFrame(this.frameId);
    this.frameId = null;
  }

  private schedule() {
    if (this.frameId !== null || this.disposed) return;
    this.frameId = requestFrame(this.frame);
  }

  private frame = (time: number) => {
    this.frameId = null;
    if (this.disposed) return;

    try {
      this.observe(time);
      const startedAt = performance.now();

      if (this.pending || this.forceProbe) {
        const before = this.renderer.describe();
        if (this.pending) this.renderer.update(this.pending.params);
        this.pending = null;
        this.dirty = true;

        const after = this.renderer.describe();
        const changed = after?.level !== before?.level || after?.work !== before?.work;
        if (after && (changed || this.forceProbe)) {
          this.forceProbe = false;
          this.probe = {
            ...after,
            buildMs: performance.now() - startedAt,
            drawMs: 0,
            drawnAt: 0,
            presented: false,
            continuous: false,
            lastFrameAt: 0,
            frameMs: [],
          };
        }
      }

      if (!this.dirty || !this.width || !this.height) return;
      this.dirty = false;

      const drawStart = performance.now();
      this.ctx.setTransform(this.ratio, 0, 0, this.ratio, 0, 0);
      const again = this.renderer.draw(this.ctx, this.width, this.height);
      const drawMs = performance.now() - drawStart;
      const probe = this.probe;
      if (probe) {
        probe.continuous = again;
        if (probe.presented) {
          probe.frameMs.push(drawMs);
        } else {
          probe.drawMs = drawMs;
          probe.drawnAt = performance.now();
          // Some renderers only know how much they drew once they have drawn it.
          probe.work = this.renderer.describe()?.work ?? probe.work;
        }
      }

      if (again) this.dirty = true;
      // One more frame tells us when the drawing reached the screen.
      if (again || probe) this.schedule();
    } catch (error) {
      this.emit({ type: "error", message: error instanceof Error ? error.message : String(error) });
    }
  };

  /** Turns frame timestamps into cost reports for the level being probed. */
  private observe(time: number) {
    const probe = this.probe;
    if (!probe) return;

    if (!probe.presented) {
      probe.presented = true;
      probe.lastFrameAt = time;
      this.emit({ type: "rendered", level: probe.level });

      if (!probe.continuous) {
        // Rasterising happens after our draw calls return, so a long wait for
        // this frame is part of the cost.
        const presentMs = performance.now() - probe.drawnAt;
        this.report(probe, probe.drawMs + (presentMs > VSYNC_SLACK_MS ? presentMs : 0));
      }
      return;
    }

    // Script time misses rasterisation; the interval between frames catches
    // it, once it is longer than an ordinary vsync wait.
    const interval = time - probe.lastFrameAt;
    probe.lastFrameAt = time;
    const last = probe.frameMs.length - 1;
    if (last >= 0 && interval > VSYNC_SLACK_MS) {
      probe.frameMs[last] = Math.max(probe.frameMs[last], interval);
    }

    if (probe.frameMs.length >= CONTINUOUS_SAMPLES) {
      this.report(probe, median(probe.frameMs));
    }
  }

  private report(probe: Probe, frameMs: number) {
    this.probe = null;
    this.emit({
      type: "cost",
      report: {
        level: probe.level,
        work: probe.work,
        buildMs: probe.buildMs,
        frameMs,
        continuous: probe.continuous,
        offThread: this.offThread,
      },
    });
  }
}
