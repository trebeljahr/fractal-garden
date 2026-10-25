import { type CanvasViewport, INITIAL_CANVAS_VIEW } from "../canvasViewport";
import type { FractalFrame } from "../fractalFrame";
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

const VIEWPORT = {
  minX: -2,
  maxX: 1,
  minY: -1.5,
  maxY: 1.5,
};

function getViewportForAspect(aspect: number) {
  const centerX = (VIEWPORT.minX + VIEWPORT.maxX) / 2;
  const centerY = (VIEWPORT.minY + VIEWPORT.maxY) / 2;
  const baseWidth = VIEWPORT.maxX - VIEWPORT.minX;
  const baseHeight = VIEWPORT.maxY - VIEWPORT.minY;

  let viewportWidth = baseWidth;
  let viewportHeight = baseHeight;

  if (aspect > baseWidth / baseHeight) {
    viewportWidth = viewportHeight * aspect;
  } else {
    viewportHeight = viewportWidth / aspect;
  }

  return {
    minX: centerX - viewportWidth / 2,
    maxX: centerX + viewportWidth / 2,
    minY: centerY - viewportHeight / 2,
    maxY: centerY + viewportHeight / 2,
  };
}

function getZoomedViewport(
  width: number,
  height: number,
  view: CanvasViewport,
  framing?: FractalFrame,
) {
  const top = framing?.top ?? 0,
    bottom = framing?.bottom ?? 0;
  const fitHeight = Math.max(1, height - top - bottom);
  const base = getViewportForAspect(width / fitHeight);
  const units = (base.maxY - base.minY) / fitHeight;
  base.maxY += top * units;
  base.minY -= bottom * units;
  const side = Math.min(base.maxX - base.minX, base.maxY - base.minY);
  const centerX = (base.minX + base.maxX) / 2 + view.x * side;
  const centerY = (base.minY + base.maxY) / 2 - view.y * side;
  const halfWidth = (base.maxX - base.minX) / (2 * view.zoom);
  const halfHeight = (base.maxY - base.minY) / (2 * view.zoom);
  return {
    minX: centerX - halfWidth,
    maxX: centerX + halfWidth,
    minY: centerY - halfHeight,
    maxY: centerY + halfHeight,
  };
}

function isInsideCardioidOrBulb(cx: number, cy: number) {
  const q = (cx - 0.25) * (cx - 0.25) + cy * cy;
  if (q * (q + (cx - 0.25)) <= 0.25 * cy * cy) return true;
  return (cx + 1) * (cx + 1) + cy * cy <= 0.0625;
}

function parseHexColor(hex: string) {
  const clean = hex.replace("#", "");

  return {
    r: Number.parseInt(clean.slice(0, 2), 16),
    g: Number.parseInt(clean.slice(2, 4), 16),
    b: Number.parseInt(clean.slice(4, 6), 16),
  };
}

type Accumulation = {
  key: string;
  width: number;
  height: number;
  viewport: ReturnType<typeof getViewportForAspect>;
  histogram: Float32Array;
  image: ImageData;
  maxVisits: number;
  samples: number;
  paintedSamples: number;
  frames: number;
  rng: number;
};

function orbitKey(params: BuddhabrotParams) {
  const view = params.viewport ?? INITIAL_CANVAS_VIEW;
  return `${params.maxIterations}:${params.minOrbitLength}:${view.x}:${view.y}:${view.zoom}:${params.framing?.top}:${params.framing?.bottom}`;
}

/**
 * Accumulates random escaping orbits into a histogram, a frame at a time.
 * Colour and exposure changes repaint the same histogram; only the orbit
 * settings or the canvas size start over.
 */
export class BuddhabrotRenderer implements Renderer<BuddhabrotParams> {
  private params: BuddhabrotParams | null = null;
  private state: Accumulation | null = null;
  private orbit = new Float64Array(0);

  update(params: BuddhabrotParams) {
    this.params = params;
    if (this.orbit.length < params.maxIterations * 2) {
      this.orbit = new Float64Array(params.maxIterations * 2);
    }
  }

  draw(ctx: Context2D, width: number, height: number) {
    const params = this.params;
    if (!params) return false;

    const renderWidth = Math.max(1, ctx.canvas.width);
    const renderHeight = Math.max(1, ctx.canvas.height);
    const view = params.viewport ?? INITIAL_CANVAS_VIEW;
    const key = `${orbitKey(params)}:${renderWidth}x${renderHeight}`;
    if (this.state?.key !== key) {
      this.state = {
        key,
        width: renderWidth,
        height: renderHeight,
        viewport: getZoomedViewport(width, height, view, params.framing),
        histogram: new Float32Array(renderWidth * renderHeight),
        image: ctx.createImageData(renderWidth, renderHeight),
        maxVisits: 1,
        samples: 0,
        paintedSamples: 0,
        frames: 0,
        rng: 42,
      };
    }

    const state = this.state;
    // Populate the opening still without starting the playback loop.
    const samples =
      state.frames === 0
        ? Math.max(12000, params.samplesPerFrame)
        : params.paused
          ? 0
          : params.samplesPerFrame;
    for (let i = 0; i < samples; i++) {
      this.sampleOrbit(state, params);
    }
    state.samples += samples;
    state.frames++;

    if (params.paused || state.frames % 2 === 0 || state.frames === 1) {
      this.paint(ctx, state, params, width, height);
    }
    return !params.paused;
  }

  drawExport(ctx: Context2D, width: number, height: number, pendingParams?: BuddhabrotParams) {
    const params = pendingParams ?? this.params;
    if (!params) return;
    const sameOrbit = this.params && orbitKey(params) === orbitKey(this.params);
    const samples = sameOrbit ? this.state?.paintedSamples : undefined;
    const renderer = new BuddhabrotRenderer();
    // Replay the same seeded samples at the new resolution without resetting the live histogram.
    renderer.update({
      ...params,
      paused: true,
      samplesPerFrame: samples || params.samplesPerFrame,
    });
    renderer.draw(ctx, width, height);
  }

  describe() {
    return null;
  }

  private sampleOrbit(state: Accumulation, params: BuddhabrotParams) {
    const viewport = getViewportForAspect(state.width / state.height);
    const random = () => {
      state.rng ^= state.rng << 13;
      state.rng ^= state.rng >>> 17;
      state.rng ^= state.rng << 5;
      return (state.rng >>> 0) / 4294967296;
    };
    const cx = viewport.minX + random() * (viewport.maxX - viewport.minX);
    const cy = random() * viewport.maxY;

    if (isInsideCardioidOrBulb(cx, cy)) return;

    const orbit = this.orbit;
    let zx = 0;
    let zy = 0;

    for (let i = 0; i < params.maxIterations; i++) {
      const nextX = zx * zx - zy * zy + cx;
      const nextY = 2 * zx * zy + cy;
      zx = nextX;
      zy = nextY;
      orbit[i * 2] = zx;
      orbit[i * 2 + 1] = zy;

      if (zx * zx + zy * zy > 4) {
        if (i + 1 >= params.minOrbitLength) this.addOrbit(state, i + 1);
        return;
      }
    }
  }

  private addOrbit(state: Accumulation, length: number) {
    const { viewport, histogram, width, height } = state;
    const orbit = this.orbit;
    const toPixelX = (width - 1) / (viewport.maxX - viewport.minX);
    const toPixelY = (height - 1) / (viewport.maxY - viewport.minY);

    for (let i = 0; i < length; i++) {
      const x = orbit[i * 2];
      const y = orbit[i * 2 + 1];

      if (x < viewport.minX || x > viewport.maxX) continue;
      const px = Math.min(width - 1, Math.floor((x - viewport.minX) * toPixelX));
      for (const sampleY of [y, -y]) {
        if (sampleY < viewport.minY || sampleY > viewport.maxY) continue;
        const py = Math.min(height - 1, Math.floor((viewport.maxY - sampleY) * toPixelY));
        const index = py * width + px;
        const next = histogram[index] + 1;
        histogram[index] = next;
        if (next > state.maxVisits) state.maxVisits = next;
      }
    }
  }

  private paint(
    ctx: Context2D,
    state: Accumulation,
    params: BuddhabrotParams,
    width: number,
    height: number,
  ) {
    state.paintedSamples = state.samples;
    const { histogram, image } = state;
    const { data } = image;
    const background = parseHexColor(params.background);
    const foreground = parseHexColor(params.color);
    const logMax = Math.log(1 + state.maxVisits * params.exposure);

    for (let i = 0; i < histogram.length; i++) {
      const count = histogram[i];
      const normalized =
        count === 0 || logMax === 0 ? 0 : Math.log(1 + count * params.exposure) / logMax;

      const idx = i * 4;
      data[idx] = Math.round(background.r + (foreground.r - background.r) * normalized);
      data[idx + 1] = Math.round(background.g + (foreground.g - background.g) * normalized);
      data[idx + 2] = Math.round(background.b + (foreground.b - background.b) * normalized);
      data[idx + 3] = 255;
    }

    ctx.putImageData(image, 0, 0);
    ctx.setTransform(state.width / width, 0, 0, state.height / height, 0, 0);
    ctx.font = "14px monospace";
    ctx.fillStyle = params.color;
    const label = `Samples: ${state.samples.toLocaleString()}`;
    const labelWidth = ctx.measureText(label).width;
    ctx.fillText(label, width - labelWidth - 18, 28);
  }
}
