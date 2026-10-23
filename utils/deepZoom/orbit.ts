import {
  type DeepViewport,
  type FloatExp,
  fixedFromNumber,
  fixedOffset,
  fixedToFloatExp,
  type SerializedViewport,
  serializeViewport,
} from "./math";

export type EscapeFormula = "mandelbrot" | "julia" | "burning-ship";
export const MAX_REFERENCE_ITERATIONS = 8192;
export const ESCAPE_RADIUS = 256;

export type ReferenceOrbit = {
  /** RGBA texels: real mantissa, real exponent, imaginary mantissa, imaginary exponent. */
  orbit: Float32Array<ArrayBuffer>;
  length: number;
  iterations: number;
  formula: EscapeFormula;
  c: [number, number];
  escaped: boolean;
  bits: number;
  viewport: SerializedViewport;
  critical?: { orbit: Float32Array<ArrayBuffer>; length: number };
};

const ZERO = BigInt(0);
const TWO = BigInt(2);

function validate(formula: EscapeFormula, c: [number, number], iterations: number) {
  if (
    !["mandelbrot", "julia", "burning-ship"].includes(formula) ||
    !Number.isInteger(iterations) ||
    iterations < 1 ||
    iterations > MAX_REFERENCE_ITERATIONS ||
    c.length !== 2 ||
    !c.every((n) => Number.isFinite(n) && Math.abs(n) <= 1_000_000)
  ) {
    throw new Error("Invalid reference orbit parameters.");
  }
}

function orbitState(
  view: DeepViewport,
  formula: EscapeFormula,
  c: [number, number],
  dx = 0,
  dy = 0,
) {
  const x = view.x + fixedOffset(dx, view.logZoom, view.bits);
  const y = view.y + fixedOffset(dy, view.logZoom, view.bits);
  const julia = formula === "julia";
  return {
    x: julia ? x : ZERO,
    y: julia ? y : ZERO,
    cx: julia ? fixedFromNumber(c[0], view.bits) : x,
    cy: julia ? fixedFromNumber(c[1], view.bits) : y,
  };
}

/** One serial high-precision orbit; run in a worker, never in the render loop. */
function buildOrbit(
  view: DeepViewport,
  formula: EscapeFormula,
  c: [number, number],
  iterations: number,
): ReferenceOrbit {
  validate(formula, c, iterations);
  const state = orbitState(view, formula, c);
  const shift = BigInt(view.bits);
  const bailoutSquared = BigInt(ESCAPE_RADIUS * ESCAPE_RADIUS) << BigInt(2 * view.bits);
  const output = new Float32Array((iterations + 1) * 4);
  let length = 0;
  let escaped = false;
  const store = () => {
    const [xm, xe] = fixedToFloatExp(state.x, view.bits);
    const [ym, ye] = fixedToFloatExp(state.y, view.bits);
    const offset = length * 4;
    output[offset] = xm;
    output[offset + 1] = xe;
    output[offset + 2] = ym;
    output[offset + 3] = ye;
    length += 1;
  };
  store();
  // Reuse the bailout squares in the next recurrence instead of multiplying twice.
  let xx = state.x * state.x;
  let yy = state.y * state.y;
  let anchorX = state.x;
  let anchorY = state.y;
  let power = 1;
  let period = 0;
  for (let i = 0; i < iterations; i++) {
    let xy = TWO * state.x * state.y;
    if (formula === "burning-ship" && xy < ZERO) xy = -xy;
    state.x = ((xx - yy) >> shift) + state.cx;
    state.y = (xy >> shift) + state.cy;
    store();
    xx = state.x * state.x;
    yy = state.y * state.y;
    if (xx + yy > bailoutSquared) {
      escaped = true;
      break;
    }
    // Brent's cycle detection compares complete fixed-point states, never an
    // approximation. Repeating states produce byte-identical future samples.
    period++;
    if (state.x === anchorX && state.y === anchorY) {
      const cycleStart = length - period;
      while (length < iterations + 1) {
        const count = Math.min(length - cycleStart, iterations + 1 - length);
        output.copyWithin(length * 4, cycleStart * 4, (cycleStart + count) * 4);
        length += count;
      }
      break;
    }
    if (period === power) {
      anchorX = state.x;
      anchorY = state.y;
      power *= 2;
      period = 0;
    }
  }
  return {
    orbit: length === iterations + 1 ? output : output.slice(0, length * 4),
    length,
    iterations,
    formula,
    c: [...c],
    escaped,
    bits: view.bits,
    viewport: serializeViewport(view),
  };
}

/** Julia's camera-seeded orbit and critical orbit have different origins. */
export function buildReference(
  view: DeepViewport,
  formula: EscapeFormula,
  c: [number, number],
  iterations: number,
): ReferenceOrbit {
  const reference = buildOrbit(view, formula, c, iterations);
  if (formula === "julia") {
    const critical = buildOrbit({ ...view, x: ZERO, y: ZERO }, formula, c, iterations);
    reference.critical = { orbit: critical.orbit, length: critical.length };
  }
  return reference;
}

/** Independent fixed-point pixel oracle, also suitable for a sparse glitch repair. */
export function sampleEscape(
  view: DeepViewport,
  formula: EscapeFormula,
  c: [number, number],
  iterations: number,
  dx = 0,
  dy = 0,
): {
  iteration: number;
  escaped: boolean;
  z: [FloatExp, FloatExp];
} {
  validate(formula, c, iterations);
  const state = orbitState(view, formula, c, dx, dy);
  const shift = BigInt(view.bits);
  const bailoutSquared = BigInt(ESCAPE_RADIUS * ESCAPE_RADIUS) << BigInt(2 * view.bits);
  let escaped = false;
  let iteration = 0;
  for (; iteration < iterations; iteration++) {
    const oldX = state.x;
    const oldY = state.y;
    const realSquare = oldX * oldX - oldY * oldY;
    const product = oldX * oldY;
    state.x = (realSquare >> shift) + state.cx;
    state.y =
      ((TWO * (formula === "burning-ship" && product < ZERO ? -product : product)) >> shift) +
      state.cy;
    if (state.x * state.x + state.y * state.y > bailoutSquared) {
      escaped = true;
      break;
    }
  }
  // Iteration follows the existing shader: the first escaped iterate has index 0.
  return {
    iteration,
    escaped,
    z: [fixedToFloatExp(state.x, view.bits), fixedToFloatExp(state.y, view.bits)],
  };
}
