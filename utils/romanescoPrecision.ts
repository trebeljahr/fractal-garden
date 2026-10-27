import { fixedFromNumber } from "./deepZoom/math";

const ZERO = BigInt(0);
const ONE = BigInt(1);
const TWO = BigInt(2);

function bitLength(value: bigint) {
  return value.toString(2).length;
}

/** Exact floor of the square root of a nonnegative integer. */
function integerSquareRoot(value: bigint): bigint {
  if (value < ZERO) throw new RangeError("Cannot take the square root of a negative value.");
  if (value < TWO) return value;
  let result = ONE << BigInt(Math.ceil(bitLength(value) / 2));
  for (;;) {
    const next = (result + value / result) / TWO;
    if (next >= result) return result;
    result = next;
  }
}

export type RomanescoPrecision = {
  bits: number;
  one: bigint;
  /** Mathematical pi, evaluated at this precision. */
  readonly pi: bigint;
  readonly halfPi: bigint;
  readonly tau: bigint;
  readonly ln2: bigint;
  fromNumber(value: number): bigint;
  fromRatio(numerator: bigint, denominator: bigint): bigint;
  /** Convert only after subtracting the anchor; binaryScale applies 2^binaryScale. */
  toNumber(value: bigint, binaryScale?: number): number;
  mul(a: bigint, b: bigint): bigint;
  div(a: bigint, b: bigint): bigint;
  sqrt(value: bigint): bigint;
  /** Avoids losing tiny coordinates by squaring before fixed-point rescaling. */
  hypot(...values: bigint[]): bigint;
  log(value: bigint): bigint;
  atan2(y: bigint, x: bigint): bigint;
};

/**
 * Small fixed-point toolkit for CPU surface anchors. All values have `bits`
 * fractional bits. Use at least camera.bits + 64: products and convergent
 * series truncate integer remainders rather than promise correct rounding.
 * Model constants enter through fromNumber, preserving their binary64 values.
 */
export function createRomanescoPrecision(bits: number): RomanescoPrecision {
  if (!Number.isSafeInteger(bits) || bits < 32 || bits > 4096)
    throw new RangeError("Romanesco precision must be between 32 and 4096 bits.");

  const shift = BigInt(bits);
  const one = ONE << shift;
  const mul = (a: bigint, b: bigint) => (a * b) / one;
  const div = (a: bigint, b: bigint) => {
    if (b === ZERO) throw new RangeError("Cannot divide by zero.");
    return (a * one) / b;
  };
  const sqrt = (value: bigint) => integerSquareRoot(value << shift);
  let piCache: bigint | undefined;
  let ln2Cache: bigint | undefined;

  // Used only for |x| <= 1/5. Each successive power contracts by at least 25.
  const smallAtan = (x: bigint) => {
    const square = mul(x, x);
    let power = x;
    let result = ZERO;
    let subtract = false;
    for (let denominator = 1; denominator < bits * 2 + 64; denominator += 2) {
      const term = power / BigInt(denominator);
      if (term === ZERO) break;
      result += subtract ? -term : term;
      subtract = !subtract;
      power = mul(power, square);
    }
    return result;
  };
  const pi = () => {
    if (piCache === undefined)
      piCache = BigInt(16) * smallAtan(one / BigInt(5)) - BigInt(4) * smallAtan(one / BigInt(239));
    return piCache;
  };
  const halfPi = () => pi() / TWO;
  const positiveAtan = (value: bigint): bigint => {
    if (value > one) return halfPi() - positiveAtan(div(one, value));
    let reduced = value;
    let multiplier = ONE;
    while (reduced > one / BigInt(8)) {
      reduced = div(reduced, one + sqrt(one + mul(reduced, reduced)));
      multiplier *= TWO;
    }
    return multiplier * smallAtan(reduced);
  };
  const atan = (value: bigint) => (value < ZERO ? -positiveAtan(-value) : positiveAtan(value));

  // log(m) = 2 atanh((m-1)/(m+1)); range reduction keeps 1 <= m < 2.
  const logMantissa = (value: bigint) => {
    const z = div(value - one, value + one);
    const square = mul(z, z);
    let power = z;
    let result = ZERO;
    for (let denominator = 1; denominator < bits * 2 + 64; denominator += 2) {
      const term = power / BigInt(denominator);
      if (term === ZERO) break;
      result += term;
      power = mul(power, square);
    }
    return TWO * result;
  };
  const ln2 = () => {
    if (ln2Cache === undefined) ln2Cache = logMantissa(TWO * one);
    return ln2Cache;
  };

  return {
    bits,
    one,
    get pi() {
      return pi();
    },
    get halfPi() {
      return halfPi();
    },
    get tau() {
      return TWO * pi();
    },
    get ln2() {
      return ln2();
    },
    fromNumber: (value) => fixedFromNumber(value, bits),
    fromRatio: (numerator, denominator) => {
      if (denominator === ZERO) throw new RangeError("Cannot divide by zero.");
      return (numerator * one) / denominator;
    },
    toNumber: (value, binaryScale = 0) => {
      if (!Number.isFinite(binaryScale)) throw new RangeError("Binary scale must be finite.");
      if (value === ZERO) return 0;
      const magnitude = value < ZERO ? -value : value;
      const drop = Math.max(0, bitLength(magnitude) - 53);
      const result = Number(magnitude >> BigInt(drop)) * 2 ** (drop - bits + binaryScale);
      return value < ZERO ? -result : result;
    },
    mul,
    div,
    sqrt,
    hypot: (...values) =>
      integerSquareRoot(values.reduce((sum, value) => sum + value * value, ZERO)),
    log: (value) => {
      if (value <= ZERO) throw new RangeError("Logarithm requires a positive value.");
      const exponent = bitLength(value) - 1 - bits;
      const mantissa = exponent >= 0 ? value >> BigInt(exponent) : value << BigInt(-exponent);
      return BigInt(exponent) * ln2() + logMantissa(mantissa);
    },
    atan2: (y, x) => {
      if (x > ZERO) return atan(div(y, x));
      if (x < ZERO) return atan(div(y, x)) + (y < ZERO ? -pi() : pi());
      if (y > ZERO) return halfPi();
      if (y < ZERO) return -halfPi();
      return ZERO;
    },
  };
}
