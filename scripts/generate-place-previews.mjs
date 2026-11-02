// Rebuild the small, static destination previews: node scripts/generate-place-previews.mjs
// Uses the escape-time shader's recurrence, smooth coloring and Classic palette.
// These are computed fractals, not downloaded or generated artwork.
import { mkdir } from "node:fs/promises";
import sharp from "sharp";
import { fixedFromDecimal, precisionForZoom } from "../utils/deepZoom/math.ts";
import {
  BARNSLEY_TREE_PLACES,
  BURNING_SHIP_PLACES,
  CACTUS_PLACES,
  JULIA_PLACES,
  MANDELBAR_PLACES,
  MANDELBROT_PLACES,
} from "../utils/escapeTimePlaces.ts";

sharp.concurrency(1);
const width = 240;
const height = 150;
const bailout = 65536;
const output = new URL("../public/assets/place-previews/", import.meta.url);
await mkdir(output, { recursive: true });

function iterateCactus(view, cr, ci) {
  let zr = cr;
  let zi = ci;
  let iteration = 0;
  for (; iteration < view.iterations; iteration++) {
    const fr = zr * zr - zi * zi + cr - 1;
    const fi = 2 * zr * zi + ci;
    const next = fr * zr - fi * zi - cr;
    zi = fr * zi + fi * zr - ci;
    zr = next;
    if (zr * zr + zi * zi > bailout) return { iteration, zr, zi, escaped: true };
  }
  return { iteration, zr, zi, escaped: false };
}

function iterateBarnsleyTree(view, px, py) {
  const { cReal, cImag, escapeRadius } = view.parameters;
  let zr = px;
  let zi = py;
  let iteration = 0;
  for (; iteration < view.iterations; iteration++) {
    const shifted = zr - Math.sign(zr);
    const next = cReal * shifted - cImag * zi;
    zi = cReal * zi + cImag * shifted;
    zr = next;
    if (zr * zr + zi * zi > escapeRadius * escapeRadius)
      return { iteration, zr, zi, escaped: true };
  }
  return { iteration, zr, zi, escaped: false };
}

function iterate(view, formula, px, py) {
  if (formula === "cactus") return iterateCactus(view, px, py);
  if (formula === "barnsley-tree") return iterateBarnsleyTree(view, px, py);
  const cr = view.parameters?.cReal ?? px;
  const ci = view.parameters?.cImag ?? py;
  let zr = formula === "julia" ? px : 0;
  let zi = formula === "julia" ? py : 0;
  let iteration = 0;
  for (; iteration < view.iterations; iteration++) {
    if (formula === "burning-ship") {
      zr = Math.abs(zr);
      zi = Math.abs(zi);
    }
    const next = zr * zr - zi * zi + cr;
    zi = (formula === "mandelbar" ? -2 : 2) * zr * zi + ci;
    zr = next;
    if (zr * zr + zi * zi > bailout) return { iteration, zr, zi, escaped: true };
  }
  return { iteration, zr, zi, escaped: false };
}

function smoothCount(view, formula, { iteration, zr, zi }) {
  const logSize = Math.log(zr * zr + zi * zi) / 2;
  if (formula === "barnsley-tree") {
    const { cReal, cImag, escapeRadius } = view.parameters;
    return iteration + 1 - (logSize - Math.log(escapeRadius)) / Math.log(Math.hypot(cReal, cImag));
  }
  const overshoot =
    formula === "cactus"
      ? Math.log(Math.max(logSize, 1e-6)) / Math.log(3)
      : Math.log2(Math.max(logSize, 1e-6));
  return Math.max(iteration + 1 - overshoot, 0);
}

/** The center's Mandelbrot orbit, calculated in fixed point and stored as ordinary numbers. */
function referenceOrbit(view) {
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
function iteratePerturbed(view, { real, imaginary }, deltaCr, deltaCi) {
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

// Name formulas to rebuild only those: node scripts/generate-place-previews.mjs cactus
const only = process.argv.slice(2);
for (const [formula, views, density, offset, interior] of [
  ["julia", JULIA_PLACES, 0.45, 0.45, 36],
  ["mandelbrot", MANDELBROT_PLACES, 1, 0.5, 0],
  ["burning-ship", BURNING_SHIP_PLACES, 0.5, 0.55, 0],
  ["mandelbar", MANDELBAR_PLACES, 1, 0.5, 0],
  ["cactus", CACTUS_PLACES, 1, 0.5, 0],
  ["barnsley-tree", BARNSLEY_TREE_PLACES, 3, 0.5, 0],
]) {
  if (only.length && !only.includes(formula)) continue;
  for (const view of views) {
    if (view.preciseCenter && formula !== "mandelbrot") {
      throw new Error(`Deep preview is not implemented for ${formula}.`);
    }
    const orbit = view.preciseCenter && referenceOrbit(view);
    const pixels = Buffer.alloc(width * height * 3);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const dx = ((2 * (x + 0.5) - width) / height) * view.zoomSize;
        const dy =
          ((height - 2 * (y + 0.5)) / height) *
          view.zoomSize *
          (formula === "burning-ship" ? -1 : 1);
        const result = orbit
          ? iteratePerturbed(view, orbit, dx, dy)
          : iterate(view, formula, view.center[0] + dx, view.center[1] + dy);
        const { escaped } = result;
        const smooth = smoothCount(view, formula, result);
        const t = (smooth / 40) * density + offset;
        for (let channel = 0; channel < 3; channel++) {
          pixels[(y * width + x) * 3 + channel] = escaped
            ? Math.round(255 * (0.5 + 0.5 * Math.cos(6.28318 * (t + channel * 0.1))))
            : interior;
        }
      }
    }
    await sharp(pixels, { raw: { width, height, channels: 3 } })
      .webp({ quality: 85 })
      .toFile(new URL(`${formula}-${view.id}.webp`, output).pathname);
  }
  console.log(`${formula}: ${views.length} previews`);
}
