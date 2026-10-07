import type { Context2D, Renderer } from "./types";

export type BuddhabrotParams = {
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
  frames: number;
};

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
    const key = `${params.maxIterations}:${params.minOrbitLength}:${renderWidth}x${renderHeight}`;
    if (this.state?.key !== key) {
      this.state = {
        key,
        width: renderWidth,
        height: renderHeight,
        viewport: getViewportForAspect(renderWidth / renderHeight),
        histogram: new Float32Array(renderWidth * renderHeight),
        image: ctx.createImageData(renderWidth, renderHeight),
        maxVisits: 1,
        samples: 0,
        frames: 0,
      };
    }

    const state = this.state;
    for (let i = 0; i < params.samplesPerFrame; i++) {
      this.sampleOrbit(state, params);
    }
    state.samples += params.samplesPerFrame;
    state.frames++;

    if (state.frames % 2 === 0 || state.frames === 1) {
      this.paint(ctx, state, params, width, height);
    }
    return true;
  }

  describe() {
    return null;
  }

  private sampleOrbit(state: Accumulation, params: BuddhabrotParams) {
    const { viewport } = state;
    const cx = viewport.minX + Math.random() * (viewport.maxX - viewport.minX);
    const cy = Math.random() * viewport.maxY;

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

      if (x < viewport.minX || x > viewport.maxX || y < viewport.minY || y > viewport.maxY) {
        continue;
      }

      const px = Math.floor((x - viewport.minX) * toPixelX);
      const index = Math.floor((viewport.maxY - y) * toPixelY) * width + px;
      const next = histogram[index] + 1;
      histogram[index] = next;
      if (next > state.maxVisits) state.maxVisits = next;

      const mirroredY = -y;
      if (mirroredY < viewport.minY || mirroredY > viewport.maxY) continue;

      const mirroredIndex = Math.floor((viewport.maxY - mirroredY) * toPixelY) * width + px;
      const mirroredNext = histogram[mirroredIndex] + 1;
      histogram[mirroredIndex] = mirroredNext;
      if (mirroredNext > state.maxVisits) state.maxVisits = mirroredNext;
    }
  }

  private paint(
    ctx: Context2D,
    state: Accumulation,
    params: BuddhabrotParams,
    width: number,
    height: number,
  ) {
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
