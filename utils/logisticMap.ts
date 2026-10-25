import type { FractalFrame } from "./fractalFrame";

export type LogisticView = { rMin: number; rMax: number; xMin: number; xMax: number };
export type LogisticStyle = {
  settleIterations: number;
  plotIterations: number;
  columns: number;
  pointAlpha: number;
  pointSize: number;
  background: string;
  color: string;
};
export type LogisticRender = {
  width: number;
  height: number;
  ratio: number;
  view: LogisticView;
  config: LogisticStyle;
};

export const MIN_LOGISTIC_RANGE = 0.000001;
export const FULL_LOGISTIC_VIEW: LogisticView = { rMin: 2.5, rMax: 4, xMin: 0, xMax: 1 };

export function fitLogisticView(view: LogisticView, frame: FractalFrame): LogisticView {
  const fitHeight = frame.height - frame.top - frame.bottom;
  const unitsPerPixel = (view.xMax - view.xMin) / fitHeight;
  return {
    ...view,
    xMax: view.xMax + frame.top * unitsPerPixel,
    xMin: view.xMin - frame.bottom * unitsPerPixel,
  };
}

export function logisticPoint(view: LogisticView, x: number, y: number) {
  return { r: view.rMin + x * (view.rMax - view.rMin), x: view.xMax - y * (view.xMax - view.xMin) };
}

// One scale factor preserves the diagram's proportions and the point under the gesture.
export function zoomLogisticView(
  view: LogisticView,
  x: number,
  y: number,
  factor: number,
  maxView = FULL_LOGISTIC_VIEW,
) {
  const rRange = view.rMax - view.rMin;
  const xRange = view.xMax - view.xMin;
  const minFactor = Math.max(MIN_LOGISTIC_RANGE / rRange, MIN_LOGISTIC_RANGE / xRange);
  const maxFactor = Math.min(
    (maxView.rMax - maxView.rMin) / rRange,
    (maxView.xMax - maxView.xMin) / xRange,
  );
  const scale = Math.max(minFactor, Math.min(maxFactor, factor));
  const anchor = logisticPoint(view, x, y);
  const rMin = anchor.r - x * rRange * scale;
  const xMax = anchor.x + y * xRange * scale;
  return { rMin, rMax: rMin + rRange * scale, xMin: xMax - xRange * scale, xMax };
}

export function panLogisticView(view: LogisticView, dx: number, dy: number): LogisticView {
  const dr = dx * (view.rMax - view.rMin);
  const deltaX = dy * (view.xMax - view.xMin);
  return {
    rMin: view.rMin - dr,
    rMax: view.rMax - dr,
    xMin: view.xMin + deltaX,
    xMax: view.xMax + deltaX,
  };
}

// Accumulate on integer device pixels, then composite once. No Canvas antialiasing or per-dot draw calls.
export function renderLogistic({ width, height, ratio, view, config }: LogisticRender) {
  const hits = new Uint16Array(width * height);
  const data = new Uint8ClampedArray(width * height * 4);
  const pixels = new Uint32Array(data.buffer);
  const columns = Math.max(width, Math.round(config.columns * ratio));
  const size = Math.max(1, Math.round(config.pointSize * ratio));
  const rRange = view.rMax - view.rMin;
  const xRange = view.xMax - view.xMin;
  const maxHits = 1024;
  for (let column = 0; column < columns; column++) {
    const t = (column + 0.5) / columns;
    const r = view.rMin + t * rRange;
    // The bounded logistic map is defined here for r in [0, 4]. Leave panned-out regions empty.
    if (r < 0 || r > 4) continue;
    const px = Math.floor(t * width);
    let x = 0.5;
    for (let i = 0; i < config.settleIterations; i++) x = r * x * (1 - x);
    for (let i = 0; i < config.plotIterations; i++) {
      x = r * x * (1 - x);
      if (x < view.xMin || x > view.xMax) continue;
      const py = Math.min(height - 1, Math.floor(((view.xMax - x) / xRange) * height));
      const left = Math.max(0, px - Math.floor(size / 2));
      const top = Math.max(0, py - Math.floor(size / 2));
      const right = Math.min(width, left + size);
      const bottom = Math.min(height, top + size);
      for (let row = top; row < bottom; row++) {
        for (let col = left; col < right; col++) {
          const index = row * width + col;
          if (hits[index] < maxHits) hits[index]++;
        }
      }
    }
  }
  const rgb = (hex: string) =>
    [1, 3, 5].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16));
  const background = rgb(config.background);
  const foreground = rgb(config.color);
  const paletteBytes = new Uint8ClampedArray((maxHits + 1) * 4);
  const palette = new Uint32Array(paletteBytes.buffer);
  for (let count = 0; count <= maxHits; count++) {
    const alpha = 1 - (1 - config.pointAlpha) ** count;
    for (let channel = 0; channel < 3; channel++) {
      paletteBytes[count * 4 + channel] =
        background[channel] + (foreground[channel] - background[channel]) * alpha;
    }
    paletteBytes[count * 4 + 3] = 255;
  }
  for (let i = 0; i < pixels.length; i++) pixels[i] = palette[hits[i]];
  return data;
}
