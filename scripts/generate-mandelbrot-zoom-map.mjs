// Rebuild the deep pictures in the Mandelbrot article's ring:
// node scripts/generate-mandelbrot-zoom-map.mjs
// Uses the escape-time shader's recurrence, smooth coloring and the Mandelbrot explorer's colors.
// The ring's middle reuses the Julia map's Mandelbrot picture.
import { mkdir } from "node:fs/promises";
import sharp from "sharp";
import { MANDELBROT_COLORING } from "../utils/escapeTimeColoring.ts";
import { MANDELBROT_PLACES } from "../utils/escapeTimePlaces.ts";
import { iteratePerturbed, referenceOrbit } from "./deep-mandelbrot.mjs";

sharp.concurrency(1);
const size = 400;
const smoothing = 2;
const output = new URL("../public/assets/mandelbrot-zoom-map/", import.meta.url);
await mkdir(output, { recursive: true });

const { colorDensity, colorOffset, interior } = MANDELBROT_COLORING;
const inside = [1, 3, 5].map((at) => Number.parseInt(interior.slice(at, at + 2), 16));

// The ring shows every place in the Places menu's Deep zoom group.
for (const view of MANDELBROT_PLACES.filter((place) => place.group === "Deep zoom")) {
  const { id } = view;
  const orbit = referenceOrbit(view);
  const side = size * smoothing;
  const pixels = Buffer.alloc(side * side * 3);
  for (let y = 0; y < side; y++) {
    for (let x = 0; x < side; x++) {
      const dx = ((2 * (x + 0.5) - side) / side) * view.zoomSize;
      const dy = ((side - 2 * (y + 0.5)) / side) * view.zoomSize;
      const { iteration, zr, zi, escaped } = iteratePerturbed(view, orbit, dx, dy);
      const logSize = Math.log(zr * zr + zi * zi) / 2;
      const smooth = Math.max(iteration + 1 - Math.log2(Math.max(logSize, 1e-6)), 0);
      const t = (smooth / 40) * colorDensity + colorOffset;
      for (let channel = 0; channel < 3; channel++) {
        pixels[(y * side + x) * 3 + channel] = escaped
          ? Math.round(255 * (0.5 + 0.5 * Math.cos(6.28318 * (t + channel * 0.1))))
          : inside[channel];
      }
    }
  }
  await sharp(pixels, { raw: { width: side, height: side, channels: 3 } })
    .resize(size, size)
    .webp({ quality: 82 })
    .toFile(new URL(`${id}.webp`, output).pathname);
  console.log(id);
}
