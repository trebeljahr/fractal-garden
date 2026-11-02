// Rebuild the Mandelbrot map and its Julia pictures: node scripts/generate-julia-map.mjs
// Uses the escape-time shader's recurrence, smooth coloring and the explorer's colors.
// A page can't hold this many live WebGL pictures, so the figure shows saved ones.
import { mkdir } from "node:fs/promises";
import sharp from "sharp";
import { JULIA_COLORING, MANDELBROT_COLORING } from "../utils/escapeTimeColoring.ts";
import {
  JULIA_MAP_HALF_SPAN,
  JULIA_MAP_PICTURES,
  MANDELBROT_BOUNDS,
} from "../utils/lessons/juliaMap.ts";

sharp.concurrency(1);
const bailout = 65536;
const smoothing = 2;
const output = new URL("../public/assets/julia-map/", import.meta.url);
await mkdir(output, { recursive: true });

function render({ bounds, size, c, coloring }) {
  const [left, right, bottom, top] = bounds;
  const { iterations, colorDensity, colorOffset, interior } = coloring;
  const inside = [1, 3, 5].map((at) => Number.parseInt(interior.slice(at, at + 2), 16));
  const samples = size * smoothing;
  const pixels = Buffer.alloc(samples * samples * 3);
  for (let row = 0; row < samples; row++) {
    for (let column = 0; column < samples; column++) {
      const x = left + ((column + 0.5) / samples) * (right - left);
      const y = top - ((row + 0.5) / samples) * (top - bottom);
      const cr = c ? c.real : x;
      const ci = c ? c.imaginary : y;
      let zr = c ? x : 0;
      let zi = c ? y : 0;
      let iteration = 0;
      let escaped = false;
      for (; iteration < iterations; iteration++) {
        const next = zr * zr - zi * zi + cr;
        zi = 2 * zr * zi + ci;
        zr = next;
        if (zr * zr + zi * zi > bailout) {
          escaped = true;
          break;
        }
      }
      const logSize = Math.log(zr * zr + zi * zi) / 2;
      const smooth = Math.max(iteration + 1 - Math.log2(Math.max(logSize, 1e-6)), 0);
      const t = (smooth / 40) * colorDensity + colorOffset;
      for (let channel = 0; channel < 3; channel++) {
        pixels[(row * samples + column) * 3 + channel] = escaped
          ? Math.round(255 * (0.5 + 0.5 * Math.cos(6.28318 * (t + channel * 0.1))))
          : inside[channel];
      }
    }
  }
  return sharp(pixels, { raw: { width: samples, height: samples, channels: 3 } }).resize(
    size,
    size,
  );
}

await render({ bounds: MANDELBROT_BOUNDS, size: 800, coloring: MANDELBROT_COLORING })
  .webp({ quality: 82 })
  .toFile(new URL("mandelbrot.webp", output).pathname);

const span = JULIA_MAP_HALF_SPAN;
for (const { id, c } of JULIA_MAP_PICTURES) {
  await render({ bounds: [-span, span, -span, span], size: 400, c, coloring: JULIA_COLORING })
    .webp({ quality: 82 })
    .toFile(new URL(`julia-${id}.webp`, output).pathname);
}
console.log(`julia map: ${JULIA_MAP_PICTURES.length} pictures`);
