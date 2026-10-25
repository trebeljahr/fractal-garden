import type { FloatExp } from "./math";
import type { ReferenceOrbit } from "./orbit";

/** Five RGBA texels per reference index: header, long A/B, short A/B. */
export const APPROXIMATION_TEXELS = 5;
export const DEFAULT_APPROXIMATION_BLOCK_LENGTH = 128;
export const DEFAULT_APPROXIMATION_SHORT_BLOCK_LENGTH = 8;
export const DEFAULT_APPROXIMATION_ERROR = 2 ** -24;

export type ApproximationTable = {
  /** Header: long log2(radius), long skip, short log2(radius), short skip. */
  data: Float32Array<ArrayBuffer>;
  length: number;
  stride: 5;
  /** The table is valid only while every pixel has |delta c| <= 2^logDeltaC. */
  logDeltaC: number;
  maxSkip: number;
};

export type ApproximationOptions = {
  logDeltaC: number;
  maxBlockLength?: number;
  shortMaxBlockLength?: number;
  relativeError?: number;
};

type Complex = [FloatExp, FloatExp];
type Block = {
  a: Complex;
  b: Complex;
  logRadius: number;
  // Nonlinear magnitude envelope: |delta out| <= P |delta in| + Q |delta c|.
  logP: number;
  logQ: number;
  skip: number;
};

const NEGATIVE_INFINITY = Number.NEGATIVE_INFINITY;
const LOG_TWO = Math.LN2;
const ZERO: FloatExp = [0, 0];

function scalar(m: number, e: number): FloatExp {
  if (m === 0) return ZERO;
  const shift = Math.floor(Math.log2(Math.abs(m)));
  return [m * 2 ** -shift, e + shift];
}

function add(a: FloatExp, b: FloatExp): FloatExp {
  if (a[0] === 0) return b;
  if (b[0] === 0) return a;
  const exponent = Math.max(a[1], b[1]);
  return scalar(
    a[0] * 2 ** Math.max(-1074, a[1] - exponent) + b[0] * 2 ** Math.max(-1074, b[1] - exponent),
    exponent,
  );
}

function multiply(a: FloatExp, b: FloatExp): FloatExp {
  return scalar(a[0] * b[0], a[1] + b[1]);
}

function complexAdd(a: Complex, b: Complex): Complex {
  return [add(a[0], b[0]), add(a[1], b[1])];
}

function complexMultiply(a: Complex, b: Complex): Complex {
  const negative = multiply(a[1], b[1]);
  return [
    add(multiply(a[0], b[0]), [-negative[0], negative[1]]),
    add(multiply(a[0], b[1]), multiply(a[1], b[0])),
  ];
}

function logMagnitude(z: Complex) {
  const real = z[0][0] === 0 ? NEGATIVE_INFINITY : z[0][1] + Math.log2(Math.abs(z[0][0]));
  const imaginary = z[1][0] === 0 ? NEGATIVE_INFINITY : z[1][1] + Math.log2(Math.abs(z[1][0]));
  const top = Math.max(real, imaginary);
  if (top === NEGATIVE_INFINITY) return top;
  return top + Math.log2(Math.hypot(2 ** (real - top), 2 ** (imaginary - top)));
}

function logAdd(a: number, b: number) {
  const top = Math.max(a, b);
  if (top === NEGATIVE_INFINITY) return top;
  return top + Math.log1p(2 ** -Math.abs(a - b)) / LOG_TWO;
}

function logSubtract(a: number, b: number) {
  if (b >= a) return NEGATIVE_INFINITY;
  return a + Math.log1p(-(2 ** (b - a))) / LOG_TWO;
}

function referenceAt(reference: ReferenceOrbit, index: number): Complex {
  const offset = index * 4;
  return [
    [reference.orbit[offset], reference.orbit[offset + 1]],
    [reference.orbit[offset + 2], reference.orbit[offset + 3]],
  ];
}

function merge(first: Block, second: Block, logDeltaC: number): Block | null {
  // The exact nonlinear left block, not its affine approximation, must land
  // inside the right block's validity domain.
  const nextRadius = logSubtract(second.logRadius, first.logQ + logDeltaC) - first.logP;
  const logRadius = Math.min(first.logRadius, nextRadius);
  if (!Number.isFinite(logRadius)) return null;
  return {
    a: complexMultiply(second.a, first.a),
    b: complexAdd(complexMultiply(second.a, first.b), second.b),
    logRadius,
    logP: second.logP + first.logP,
    logQ: logAdd(second.logP + first.logQ, second.logQ),
    skip: first.skip + second.skip,
  };
}

function store(table: Float32Array, index: number, block: Block) {
  const offset = index * 20;
  // Leave headroom for float32 logarithms/comparisons on the GPU. At the
  // deepest supported zooms, rounding the log itself is larger than 1e-4.
  table[offset] = block.logRadius - Math.max(1e-4, Math.abs(block.logRadius) * 2 ** -21);
  table[offset + 1] = block.skip;
  table.set([...block.a[0], ...block.a[1], ...block.b[0], ...block.b[1]], offset + 4);
}

/**
 * Build Mandelbrot maps delta_out = A delta_in + B delta_c in a worker.
 *
 * Each leaf permits |delta| <= epsilon |2Z|, distributing the requested
 * linearization budget over the longest block. Its quadratic remainder is
 * consequently bounded by epsilon times |2Z delta|. Composition propagates
 * nonlinear magnitude envelopes, including that remainder, to ensure every
 * intermediate state stays in its leaf's domain. All skipped reference states
 * are below 128 and their nonlinear deltas below 1, safely short of bailout 256.
 *
 * These conservative truncation domains are not interval certificates for
 * reference rounding, GPU arithmetic, cancellation, or final image error.
 * Coefficients keep separate exponents for both components, including when
 * coordinates underflow binary64 or one component is much smaller than the other.
 * See https://mathr.co.uk/web/deep-zoom.html for BLA and its composition rule.
 *
 * Two candidates share one header: the longest admissible block, and the
 * longest distinct block no longer than shortMaxBlockLength. When a long
 * block's tighter domain fails, the short block can still skip late-orbit work.
 * Failed checks cost one header lookup; they never scan a tree on the GPU.
 * Orbit traps and stripe averages must use their existing unskipped paths.
 */
export function buildApproximation(
  reference: ReferenceOrbit,
  options: ApproximationOptions,
): ApproximationTable {
  const { logDeltaC } = options;
  const maxBlockLength = options.maxBlockLength ?? DEFAULT_APPROXIMATION_BLOCK_LENGTH;
  const shortMaxBlockLength =
    options.shortMaxBlockLength ?? DEFAULT_APPROXIMATION_SHORT_BLOCK_LENGTH;
  const relativeError = options.relativeError ?? DEFAULT_APPROXIMATION_ERROR;
  if (
    (!Number.isFinite(logDeltaC) && logDeltaC !== NEGATIVE_INFINITY) ||
    !Number.isInteger(maxBlockLength) ||
    maxBlockLength < 2 ||
    maxBlockLength > 8192 ||
    !Number.isInteger(shortMaxBlockLength) ||
    shortMaxBlockLength < 2 ||
    shortMaxBlockLength > 8192 ||
    !Number.isFinite(relativeError) ||
    relativeError <= 0 ||
    relativeError > 2 ** -16
  )
    throw new Error("Invalid approximation parameters.");

  const result: ApproximationTable = {
    data: new Float32Array(reference.length * APPROXIMATION_TEXELS * 4),
    length: reference.length,
    stride: APPROXIMATION_TEXELS,
    logDeltaC,
    maxSkip: 0,
  };
  if (reference.formula !== "mandelbrot" || reference.length < 4 || logDeltaC >= 0) return result;

  const logEpsilon = Math.log2(relativeError / maxBlockLength);
  const logRemaining = logSubtract(0, logDeltaC);
  let level: (Block | null)[] = Array.from({ length: reference.length }, () => null);
  // Index zero is the critical point: its first step must remain nonlinear.
  for (let index = 1; index < reference.length - 1; index++) {
    const z = referenceAt(reference, index);
    const next = referenceAt(reference, index + 1);
    const logZ = logMagnitude(z);
    if (!Number.isFinite(logZ) || logZ >= 7 || logMagnitude(next) >= 7) continue;
    const logLinear = logZ + 1;
    const logRadius = Math.min(logLinear + logEpsilon, logRemaining - logAdd(logLinear, 0), -1);
    if (!Number.isFinite(logRadius)) continue;
    level[index] = {
      a: [multiply(z[0], [1, 1]), multiply(z[1], [1, 1])],
      b: [[1, 0], ZERO],
      logRadius,
      logP: logAdd(logLinear, logRadius),
      logQ: 0,
      skip: 1,
    };
  }

  // A sliding hierarchy supplies a map at every reference index in O(N log L).
  // Pick the longest candidate whose input domain is at least as wide as the
  // parameter domain; smaller positive radii rarely help a newly started orbit.
  for (let step = 1; step * 2 <= maxBlockLength; step *= 2) {
    const next: (Block | null)[] = Array.from({ length: reference.length }, () => null);
    for (let index = 1; index + step * 2 < reference.length; index++) {
      const first = level[index];
      const second = level[index + step];
      if (!first || !second) continue;
      const block = merge(first, second, logDeltaC);
      if (!block) continue;
      next[index] = block;
      if (block.logRadius > logDeltaC) {
        const offset = index * 20;
        const previousSkip = result.data[offset + 1];
        if (previousSkip > 1 && previousSkip <= shortMaxBlockLength) {
          result.data[offset + 2] = result.data[offset];
          result.data[offset + 3] = previousSkip;
          result.data.copyWithin(offset + 12, offset + 4, offset + 12);
        }
        store(result.data, index, block);
        result.maxSkip = Math.max(result.maxSkip, block.skip);
      }
    }
    level = next;
  }
  return result;
}
