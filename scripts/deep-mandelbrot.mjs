// Deep Mandelbrot pictures: one exact orbit at the center, then small offsets from it.
import { fixedFromDecimal, precisionForZoom } from "../utils/deepZoom/math.ts";

const bailout = 65536;

/** The center's Mandelbrot orbit, calculated in fixed point and stored as ordinary numbers. */
export function referenceOrbit(view) {
  const bits = 2 * precisionForZoom(Math.log2(view.zoomSize));
  const shift = BigInt(bits);
  const cr = fixedFromDecimal(view.preciseCenter[0], bits);
  const ci = fixedFromDecimal(view.preciseCenter[1], bits);
  const toNumber = (value) => {
    const drop = Math.max(0, value.toString(2).length - 64);
    return Number(value >> BigInt(drop)) * 2 ** (drop - bits);
  };
  const real = [0];
  const imaginary = [0];
  let zr = BigInt(0);
  let zi = BigInt(0);
  while (real.length <= view.iterations) {
    const next = ((zr * zr - zi * zi) >> shift) + cr;
    zi = ((BigInt(2) * zr * zi) >> shift) + ci;
    zr = next;
    real.push(toNumber(zr));
    imaginary.push(toNumber(zi));
    if (real.at(-1) ** 2 + imaginary.at(-1) ** 2 > bailout) break;
  }
  return { real, imaginary };
}

/**
 * Follows a pixel's small offset from the reference orbit. The offset restarts
 * from zero when the orbit passes closer to zero than the offset is, so a single
 * reference serves the whole image.
 */
export function iteratePerturbed(view, { real, imaginary }, deltaCr, deltaCi) {
  const last = real.length - 1;
  let reference = 0;
  let dr = 0;
  let di = 0;
  let zr = 0;
  let zi = 0;
  let iteration = 0;
  for (; iteration < view.iterations; iteration++) {
    const next =
      2 * (real[reference] * dr - imaginary[reference] * di) + dr * dr - di * di + deltaCr;
    di = 2 * (real[reference] * di + imaginary[reference] * dr + dr * di) + deltaCi;
    dr = next;
    reference++;
    zr = real[reference] + dr;
    zi = imaginary[reference] + di;
    const size = zr * zr + zi * zi;
    if (size > bailout) return { iteration, zr, zi, escaped: true };
    if (size < dr * dr + di * di || reference === last) {
      dr = zr;
      di = zi;
      reference = 0;
    }
  }
  return { iteration, zr, zi, escaped: false };
}
