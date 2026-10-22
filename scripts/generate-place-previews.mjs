// Rebuild the small, static destination previews: node scripts/generate-place-previews.mjs
// Uses the escape-time shader's recurrence, smooth coloring and Classic palette.
// These are computed fractals, not downloaded or generated artwork.
import { mkdir } from "node:fs/promises";
import sharp from "sharp";
import { BURNING_SHIP_PLACES, JULIA_PLACES, MANDELBROT_PLACES } from "../utils/escapeTimePlaces.ts";

sharp.concurrency(1);
const width = 240;
const height = 150;
const output = new URL("../public/assets/place-previews/", import.meta.url);
await mkdir(output, { recursive: true });

for (const [formula, views, density, offset, interior] of [
  ["julia", JULIA_PLACES, 0.45, 0.45, 36],
  ["mandelbrot", MANDELBROT_PLACES, 1, 0.5, 0],
  ["burning-ship", BURNING_SHIP_PLACES, 0.5, 0.55, 0],
]) {
  for (const view of views) {
    // This binary64 preview renderer cannot resolve the deep destinations.
    if (view.preciseCenter) continue;
    const pixels = Buffer.alloc(width * height * 3);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const px = view.center[0] + ((2 * (x + 0.5) - width) / height) * view.zoomSize;
        const py =
          view.center[1] +
          ((height - 2 * (y + 0.5)) / height) *
            view.zoomSize *
            (formula === "burning-ship" ? -1 : 1);
        const cr = view.parameters?.cReal ?? px;
        const ci = view.parameters?.cImag ?? py;
        let zr = formula === "julia" ? px : 0;
        let zi = formula === "julia" ? py : 0;
        let iteration = 0;
        let escaped = false;
        for (; iteration < view.iterations; iteration++) {
          if (formula === "burning-ship") {
            zr = Math.abs(zr);
            zi = Math.abs(zi);
          }
          const next = zr * zr - zi * zi + cr;
          zi = 2 * zr * zi + ci;
          zr = next;
          if (zr * zr + zi * zi > 65536) {
            escaped = true;
            break;
          }
        }
        const smooth = Math.max(
          iteration + 1 - Math.log2(Math.max(Math.log(zr * zr + zi * zi) / 2, 1e-6)),
          0,
        );
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
