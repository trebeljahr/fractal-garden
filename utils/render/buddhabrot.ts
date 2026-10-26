import type { CanvasViewport } from "../canvasViewport";
import type { FractalFrame } from "../fractalFrame";
import {
  buddhabrotOrbitKey,
  getBuddhabrotViewport,
  isInsideCardioidOrBulb,
  normalizeBuddhabrotParams,
} from "./buddhabrotMath";
import type { Context2D, Renderer } from "./types";

export type BuddhabrotParams = {
  paused?: boolean;
  framing?: FractalFrame;
  viewport?: CanvasViewport;
  maxIterations: number;
  minOrbitLength: number;
  samplesPerFrame: number;
  exposure: number;
  background: string;
  color: string;
};

type Histogram = {
  key: string;
  width: number;
  height: number;
  viewport: ReturnType<typeof getBuddhabrotViewport>;
  counts: Int32Array;
  horizontal: Float32Array;
  density: Float32Array;
  image: ImageData;
};

const CACHE_SIZE = 262144;
const color = (hex: string) => [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16));

/** CPU fallback. Retain orbit seeds so a camera change never discards the drawing. */
export class BuddhabrotRenderer implements Renderer<BuddhabrotParams> {
  private params: BuddhabrotParams | null = null;
  private key = "";
  private state: Histogram | null = null;
  private seeds = new Float64Array(CACHE_SIZE * 3);
  private cached = 0;
  private cursor = 0;
  private samples = 0;
  private rng = 42;

  update(params: BuddhabrotParams) {
    this.params = normalizeBuddhabrotParams(params);
    const key = buddhabrotOrbitKey(this.params);
    if (key !== this.key) {
      this.key = key;
      this.cached = this.cursor = this.samples = 0;
      this.rng = 42;
      this.state = null;
    }
  }

  private histogram(
    ctx: Context2D,
    width: number,
    height: number,
    params: BuddhabrotParams,
  ): Histogram {
    const viewport = getBuddhabrotViewport(width, height, params.viewport, params.framing);
    const w = ctx.canvas.width,
      h = ctx.canvas.height;
    return {
      key: JSON.stringify([w, h, viewport]),
      width: w,
      height: h,
      viewport,
      counts: new Int32Array(w * h),
      horizontal: new Float32Array(w * h),
      density: new Float32Array(w * h),
      image: ctx.createImageData(w, h),
    };
  }

  draw(ctx: Context2D, width: number, height: number) {
    const params = this.params;
    if (!params) return false;
    const viewport = getBuddhabrotViewport(width, height, params.viewport, params.framing);
    const key = JSON.stringify([ctx.canvas.width, ctx.canvas.height, viewport]);
    if (this.state?.key !== key) {
      this.state = this.histogram(ctx, width, height, params);
      this.replay(this.state);
    }
    // Bound CPU work at high escape limits, independently of camera motion.
    const count =
      params.paused && this.samples > 0
        ? 0
        : Math.min(
            this.samples === 0 ? Math.max(12000, params.samplesPerFrame) : params.samplesPerFrame,
            Math.max(32, Math.floor(1000000 / params.maxIterations)),
          );
    for (let n = 0; n < count; n++) this.sample(this.state, params);
    this.samples += count;
    this.paint(ctx, this.state, params);
    return !params.paused;
  }

  drawExport(ctx: Context2D, width: number, height: number, pending?: BuddhabrotParams) {
    const params = pending ? normalizeBuddhabrotParams(pending) : this.params;
    if (!params) return;
    if (buddhabrotOrbitKey(params) !== this.key) {
      const fresh = new BuddhabrotRenderer();
      fresh.update({ ...params, paused: true });
      fresh.draw(ctx, width, height);
      return;
    }
    const state = this.histogram(ctx, width, height, params);
    this.replay(state);
    this.paint(ctx, state, params);
  }

  describe() {
    return this.params ? { level: this.params.maxIterations, work: this.cached } : null;
  }

  private random() {
    this.rng ^= this.rng << 13;
    this.rng ^= this.rng >>> 17;
    this.rng ^= this.rng << 5;
    return (this.rng >>> 0) / 4294967296;
  }

  private sample(state: Histogram, params: BuddhabrotParams) {
    const cx = -2 + 4 * this.random(),
      cy = 2 * this.random();
    if (isInsideCardioidOrBulb(cx, cy)) return;
    let zx = 0,
      zy = 0;
    for (let n = 1; n <= params.maxIterations; n++) {
      const x = zx * zx - zy * zy + cx;
      zy = 2 * zx * zy + cy;
      zx = x;
      if (zx * zx + zy * zy <= 4) continue;
      if (n < params.minOrbitLength) return;
      const offset = this.cursor * 3;
      if (this.cached === CACHE_SIZE)
        this.plot(state, this.seeds[offset], this.seeds[offset + 1], this.seeds[offset + 2], -1);
      else this.cached++;
      this.seeds.set([cx, cy, n], offset);
      this.plot(state, cx, cy, n, 1);
      this.cursor = (this.cursor + 1) % CACHE_SIZE;
      return;
    }
  }

  private replay(state: Histogram) {
    for (let i = 0; i < this.cached; i++)
      this.plot(state, this.seeds[i * 3], this.seeds[i * 3 + 1], this.seeds[i * 3 + 2], 1);
  }

  private plot(state: Histogram, cx: number, cy: number, length: number, delta: number) {
    const { minX, maxX, minY, maxY } = state.viewport;
    let zx = 0,
      zy = 0;
    // The first point outside the escape circle does not contribute a visit.
    for (let i = 0; i < length - 1; i++) {
      const next = zx * zx - zy * zy + cx;
      zy = 2 * zx * zy + cy;
      zx = next;
      const py = Math.floor(((maxY + zx) / (maxY - minY)) * state.height);
      if (py < 0 || py >= state.height) continue;
      for (const x of [zy, -zy]) {
        const px = Math.floor(((x - minX) / (maxX - minX)) * state.width);
        if (px >= 0 && px < state.width) state.counts[py * state.width + px] += delta;
      }
    }
  }

  private paint(ctx: Context2D, state: Histogram, params: BuddhabrotParams) {
    const bg = color(params.background),
      fg = color(params.color);
    const { counts, horizontal, density, width, height } = state;
    // Fixed one-pixel tent reconstruction at rest and in motion. No resized preview.
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = y * width + x;
        horizontal[i] =
          (counts[y * width + Math.max(0, x - 1)] +
            2 * counts[i] +
            counts[y * width + Math.min(width - 1, x + 1)]) /
          4;
      }
    }
    let maximum = 0;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = y * width + x;
        density[i] =
          (horizontal[Math.max(0, y - 1) * width + x] +
            2 * horizontal[i] +
            horizontal[Math.min(height - 1, y + 1) * width + x]) /
          4;
        maximum = Math.max(maximum, density[i]);
      }
    }
    for (let i = 0; i < state.counts.length; i++) {
      const level = maximum > 0 ? (Math.max(0, density[i]) / maximum) ** (1 / params.exposure) : 0;
      for (let c = 0; c < 3; c++)
        state.image.data[i * 4 + c] = Math.round(bg[c] + (fg[c] - bg[c]) * level);
      state.image.data[i * 4 + 3] = 255;
    }
    ctx.putImageData(state.image, 0, 0);
  }
}
