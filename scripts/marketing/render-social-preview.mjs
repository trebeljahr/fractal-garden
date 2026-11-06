// Renders the four GitHub social preview options (1280x640 PNG, under 1 MB).
// Each is the site's link preview design (scripts/generate-og-images.mjs):
// fractal pictures in a grid under a vignette, the dark rounded panel and
// the title in the same type. SOCIAL_PREVIEW_CARDS there says which
// pictures each option shows. Run after capture-screenshots.mjs when the
// cards should show new captures:
//
//   pnpm marketing:social-preview
//   pnpm marketing:social-preview --review=/path/to/folder
//
// --review also copies the PNGs to that folder with a review-sheet.jpg of
// all four.
import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { composeCard, SOCIAL_PREVIEW_CARDS } from "../generate-og-images.mjs";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const DIR = join(ROOT, "docs", "marketing", "social-preview");
const MANIFEST = join(ROOT, "docs", "marketing", "manifest.json");
const MAX_BYTES = 1_000_000;
const REVIEW_DIR = process.argv.find((a) => a.startsWith("--review="))?.slice("--review=".length);

// Lossless first. If that is over GitHub's 1 MB limit, fall back to a
// 256-colour palette with dithering, which keeps gradients smooth.
async function encode(png) {
  const lossless = await sharp(png).png({ compressionLevel: 9 }).toBuffer();
  if (lossless.length <= MAX_BYTES) return { buffer: lossless, encoding: "PNG, lossless" };
  const palette = await sharp(png)
    .png({ palette: true, quality: 95, dither: 1, compressionLevel: 9 })
    .toBuffer();
  return { buffer: palette, encoding: "PNG, 256-colour palette" };
}

async function reviewSheet(files, out) {
  const W = 1280;
  const H = 640;
  const pad = 48;
  const labelH = 72;
  const cols = 2;
  const rows = Math.ceil(files.length / cols);
  const sheetW = pad + cols * (W + pad);
  const sheetH = pad + rows * (labelH + H + pad);
  const composites = [];
  for (const [i, card] of SOCIAL_PREVIEW_CARDS.entries()) {
    const x = pad + (i % cols) * (W + pad);
    const y = pad + Math.floor(i / cols) * (labelH + H + pad);
    const label = Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${labelH}">` +
        `<text x="0" y="48" font-family="Avenir Next, Helvetica" font-size="44" font-weight="700" fill="#ffffff">${card.id.toUpperCase()}</text>` +
        `<text x="56" y="48" font-family="Avenir Next, Helvetica" font-size="26" fill="#d0d0d0">${card.what}</text>` +
        "</svg>",
    );
    composites.push({ input: label, left: x, top: y });
    composites.push({ input: files[i], left: x, top: y + labelH });
  }
  const sheet = await sharp({
    create: { width: sheetW, height: sheetH, channels: 3, background: "#2a2a2a" },
  })
    .composite(composites)
    .png()
    .toBuffer();
  await sharp(sheet)
    .resize({ width: Math.round(sheetW / 2) })
    .jpeg({ quality: 85, mozjpeg: true })
    .toFile(out);
}

const manifest = JSON.parse(await readFile(MANIFEST, "utf8").catch(() => "{}"));
manifest.socialPreview = {};
await mkdir(DIR, { recursive: true });
const written = [];

for (const card of SOCIAL_PREVIEW_CARDS) {
  const png = await (await composeCard(card)).png().toBuffer();
  const { buffer, encoding } = await encode(png);
  if (buffer.length > MAX_BYTES) throw new Error(`Option ${card.id} is over 1 MB`);
  const name = `social-preview-${card.id}.png`;
  const file = join(DIR, name);
  await writeFile(file, buffer);
  written.push(file);
  manifest.socialPreview[card.id] = {
    file: `docs/marketing/social-preview/${name}`,
    purpose: card.what,
    width: card.width,
    height: card.height,
    bytes: buffer.length,
    sha256: createHash("sha256").update(buffer).digest("hex"),
    encoding,
    design: "scripts/generate-og-images.mjs (the public/assets/og/home.jpg link preview)",
    sources: card.tiles.map((tile) =>
      tile.includes("/") ? tile : `public/assets/fractal-images/${tile}.jpg`,
    ),
    rendered: new Date().toLocaleDateString("sv-SE"),
  };
  console.log(`Wrote ${name} (${buffer.length} bytes, ${encoding})`);
}
await writeFile(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);

if (REVIEW_DIR) {
  await mkdir(REVIEW_DIR, { recursive: true });
  for (const file of written) await copyFile(file, join(REVIEW_DIR, basename(file)));
  const sheet = join(REVIEW_DIR, "review-sheet.jpg");
  await reviewSheet(written, sheet);
  console.log(`Wrote ${sheet}`);
}
