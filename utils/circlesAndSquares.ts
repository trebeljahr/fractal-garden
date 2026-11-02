// The circles-and-squares pattern. Each dot on a grid gets z1 = x^2 + y^2 (mod m).
// More squarings repeat z -> z^2 (mod m). Pure functions, shared with the lesson.

export type CirclesSettings = {
  step: number;
  modulus: number;
  squarings: number;
  centerX: number;
  centerY: number;
};

/** A dot's position in the cycle from 0 up to, but not including, 1. */
export function circleValue(x: number, y: number, modulus: number, squarings: number) {
  let z = (x * x + y * y) % modulus;
  for (let i = 1; i < squarings; i++) z = (z * z) % modulus;
  return z / modulus;
}

/** How many dots lie between neighboring ghost centers along one row. */
export function ghostSpacing(step: number, modulus: number) {
  const turn = (step * step) / modulus;
  const wrapped = Math.abs(turn - Math.round(turn));
  return wrapped > 0 ? 1 / (2 * wrapped) : Number.POSITIVE_INFINITY;
}

export type CirclesPaint = {
  background: string;
  color: string;
  bands: "two" | "gradient";
};

function packed(hex: string) {
  const value = Number.parseInt(hex.slice(1), 16);
  // Little-endian ABGR, as ImageData's buffer reads on every browser we target.
  return (255 << 24) | ((value & 255) << 16) | (value & 0xff00) | ((value >> 16) & 255);
}

const GRADIENT_STEPS = 256;

function gradient(background: string, color: string) {
  const parse = (hex: string) => {
    const value = Number.parseInt(hex.slice(1), 16);
    return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
  };
  const [r0, g0, b0] = parse(background);
  const [r1, g1, b1] = parse(color);
  return Uint32Array.from({ length: GRADIENT_STEPS }, (_, i) => {
    const t = 1 - Math.abs((2 * i) / (GRADIENT_STEPS - 1) - 1);
    return (
      (255 << 24) |
      (Math.round(b0 + (b1 - b0) * t) << 16) |
      (Math.round(g0 + (g1 - g0) * t) << 8) |
      Math.round(r0 + (r1 - r0) * t)
    );
  });
}

/** Fills an ABGR pixel buffer. `dot` is the size of one grid dot in pixels. */
export function paintCircles(
  pixels: Uint32Array,
  width: number,
  height: number,
  dot: number,
  settings: CirclesSettings,
  paint: CirclesPaint,
) {
  const { step, modulus, squarings, centerX, centerY } = settings;
  const size = Math.max(1, Math.round(dot));
  const columns = Math.ceil(width / size);
  const rows = Math.ceil(height / size);
  const squaresX = new Float64Array(columns);
  for (let i = 0; i < columns; i++) {
    const x = (i - Math.floor(columns / 2)) * step + centerX;
    squaresX[i] = x * x;
  }
  const on = packed(paint.color);
  const off = packed(paint.background);
  const ramp = paint.bands === "gradient" ? gradient(paint.background, paint.color) : null;
  for (let row = 0; row < rows; row++) {
    const y = (row - Math.floor(rows / 2)) * step + centerY;
    const squareY = y * y;
    const top = row * size;
    const bottom = Math.min(top + size, height);
    for (let column = 0; column < columns; column++) {
      let z = (squaresX[column] + squareY) % modulus;
      for (let i = 1; i < squarings; i++) z = (z * z) % modulus;
      const v = z / modulus;
      const value = ramp
        ? ramp[Math.min(GRADIENT_STEPS - 1, Math.floor(v * GRADIENT_STEPS))]
        : v < 0.5
          ? on
          : off;
      const left = column * size;
      const right = Math.min(left + size, width);
      for (let py = top; py < bottom; py++)
        pixels.fill(value, py * width + left, py * width + right);
    }
  }
}

export type CirclesPlace = {
  label: string;
  detail: string;
  group: string;
  step: number;
  modulus: number;
  squarings: number;
};

export const CIRCLES_PLACES: CirclesPlace[] = [
  {
    label: "Circles and squares",
    detail: "A ghost center every 64 dots.",
    group: "Ghost centers",
    step: Math.sqrt(2 / 128),
    modulus: 2,
    squarings: 1,
  },
  {
    label: "One set of rings",
    detail: "Dots close enough to follow every ring near the center.",
    group: "Ghost centers",
    step: 0.03,
    modulus: 2,
    squarings: 1,
  },
  {
    label: "Dense grid",
    detail: "A ghost center every 24 dots.",
    group: "Ghost centers",
    step: Math.sqrt(2 / 48),
    modulus: 2,
    squarings: 1,
  },
  {
    label: "Rings in a checkerboard",
    detail: "Each dot sits just past half a band from its neighbor.",
    group: "Rings over a weave",
    step: Math.sqrt(2 * (0.5 + 1 / 4000)),
    modulus: 2,
    squarings: 1,
  },
  {
    label: "Rings in a weave",
    detail: "Each dot moves about a quarter of a band.",
    group: "Rings over a weave",
    step: Math.sqrt(2 * (0.25 + 1 / 4000)),
    modulus: 2,
    squarings: 1,
  },
  {
    label: "Rings in lace",
    detail: "Each dot moves about a third of a band.",
    group: "Rings over a weave",
    step: Math.sqrt(2 * (1 / 3 + 1 / 6000)),
    modulus: 2,
    squarings: 1,
  },
  {
    label: "Squared again",
    detail: "Squaring twice folds every ring in two.",
    group: "More squarings",
    step: Math.sqrt(2 / 48),
    modulus: 2,
    squarings: 2,
  },
];
