// Fixed-point numbers on BigInt: a value v is stored as round(v * 2^bits).
// Endless zoom needs them for the view's position and for the few huge parts
// of a drawing around it, where 64-bit floats run out of digits.

const BIG_0 = BigInt(0);
const BIG_1 = BigInt(1);
const BIG_32 = BigInt(32);
const BIG_52 = BigInt(52);

const view = new DataView(new ArrayBuffer(8));

// The exact value of a float, as fixed point.
export function fixedFromNumber(value: number, bits: number): bigint {
  if (value === 0 || !Number.isFinite(value)) return BIG_0;
  view.setFloat64(0, value);
  const high = view.getUint32(0);
  const low = view.getUint32(4);
  const exponent = (high >>> 20) & 0x7ff;
  let mantissa = (BigInt(high & 0xfffff) << BIG_32) | BigInt(low);
  let power: number;
  if (exponent === 0) {
    power = -1074;
  } else {
    mantissa |= BIG_1 << BIG_52;
    power = exponent - 1075;
  }
  const shift = bits + power;
  const magnitude = shift >= 0 ? mantissa << BigInt(shift) : mantissa >> BigInt(-shift);
  return high >>> 31 ? -magnitude : magnitude;
}

function bitLength(value: bigint) {
  return (value < BIG_0 ? -value : value).toString(16).length * 4;
}

// The nearest float. Works for values far beyond 2^1024 in fixed point as
// long as the value itself fits a float.
export function fixedToNumber(value: bigint, bits: number): number {
  const length = bitLength(value);
  const drop = Math.max(0, length - 64);
  const top = Number(drop > 0 ? value >> BigInt(drop) : value);
  return top * 2 ** (drop - bits);
}

export function rescale(value: bigint, from: number, to: number) {
  return to >= from ? value << BigInt(to - from) : value >> BigInt(from - to);
}

// cos and sin of an angle in fixed point with `bits` bits, by the Taylor
// series. The angle should already be within about [-π, π].
export function fixedCosSinOf(x: bigint, bits: number): [bigint, bigint] {
  const guard = BigInt(24);
  const shift = BigInt(bits) + guard;
  const scaled = x << guard;
  let cos = BIG_0;
  let sin = BIG_0;
  // term = x^n / n!
  let term = BIG_1 << shift;
  for (let n = 0; term !== BIG_0; n++) {
    if (n % 2 === 0) cos += n % 4 === 0 ? term : -term;
    else sin += n % 4 === 1 ? term : -term;
    term = ((term * scaled) >> shift) / BigInt(n + 1);
  }
  return [cos >> guard, sin >> guard];
}

// cos and sin of an angle given as a float.
export function fixedCosSin(angle: number, bits: number): [bigint, bigint] {
  const turned = angle - 2 * Math.PI * Math.round(angle / (2 * Math.PI));
  return fixedCosSinOf(fixedFromNumber(turned, bits), bits);
}

// atan(1/n) by its series, for Machin's formula.
function arctanInverse(n: number, bits: number) {
  const one = BIG_1 << BigInt(bits);
  const square = BigInt(n * n);
  let power = one / BigInt(n);
  let sum = BIG_0;
  for (let k = 0; power !== BIG_0; k++) {
    const term = power / BigInt(2 * k + 1);
    sum += k % 2 === 0 ? term : -term;
    power /= square;
  }
  return sum;
}

// π in fixed point: 16 atan(1/5) - 4 atan(1/239).
export function fixedPi(bits: number) {
  const guard = 16;
  return (
    (BigInt(16) * arctanInverse(5, bits + guard) - BigInt(4) * arctanInverse(239, bits + guard)) >>
    BigInt(guard)
  );
}
