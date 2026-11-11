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
//
// It also writes two og:image cards, 1200x630 PNG, downscaled with
// ImageMagick (`magick`):
//   og-wordmark.png  the top of the home page, title over the first row of
//     the gallery: screenshots/home-grid-top.webp (2400x1260, the press set's
//     home-grid crop of 2026-10-08) downscaled.
//   og-clean.png  the home page's gallery cards without the title, subtitle
//     or captions: eight thumbnails from public/assets/fractal-images as
//     square cards on the page's #091115 background, four by two, the
//     escape-time blues alternating with the grey-backed geometric ones.
//     Drawn at 2x and downscaled.
import { execFileSync } from "node:child_process";
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

const HOME_GRID_TOP = "docs/marketing/screenshots/home-grid-top.webp";
const OG_CLEAN_ROWS = [
  ["mandelbrot", "barnsley-fern", "julia-set", "menger-sponge"],
  ["pythagoras-tree", "burning-ship", "l-system-twindragon", "mandelbar-set"],
];

/** Downscale an image file or PNG buffer to exactly 1200x630 with ImageMagick. */
function toOgSize(input, out) {
  const fromFile = typeof input === "string";
  try {
    // No date chunks, so an unchanged card keeps its SHA-256.
    execFileSync(
      "magick",
      [
        fromFile ? input : "png:-",
        "-resize",
        "1200x630!",
        "-define",
        "png:exclude-chunks=date,time",
        out,
      ],
      fromFile ? {} : { input },
    );
  } catch (error) {
    if (error.code === "ENOENT")
      throw new Error("The og:image cards need ImageMagick: brew install imagemagick");
    throw error;
  }
}

/** The clean card: 256 px cards, 28 px gaps, 5 px corners, drawn at 2x. */
async function ogClean() {
  const S = 2;
  const W = 1200 * S;
  const H = 630 * S;
  const TILE = 256 * S;
  const GAP = 28 * S;
  const RADIUS = 5 * S;
  const cols = OG_CLEAN_ROWS[0].length;
  const x0 = Math.round((W - cols * TILE - (cols - 1) * GAP) / 2);
  const y0 = Math.round((H - OG_CLEAN_ROWS.length * TILE - (OG_CLEAN_ROWS.length - 1) * GAP) / 2);
  const mask = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${TILE}" height="${TILE}"><rect width="${TILE}" height="${TILE}" rx="${RADIUS}" ry="${RADIUS}"/></svg>`,
  );
  const composites = [];
  for (const [r, row] of OG_CLEAN_ROWS.entries()) {
    for (const [c, name] of row.entries()) {
      const input = await sharp(join(ROOT, "public", "assets", "fractal-images", `${name}.jpg`))
        .resize(TILE, TILE, { fit: "cover", position: "centre" })
        .composite([{ input: mask, blend: "dest-in" }])
        .png()
        .toBuffer();
      composites.push({ input, left: x0 + c * (TILE + GAP), top: y0 + r * (TILE + GAP) });
    }
  }
  return sharp({ create: { width: W, height: H, channels: 3, background: { r: 9, g: 17, b: 21 } } })
    .composite(composites)
    .png()
    .toBuffer();
}

const OG_CARDS = [
  {
    id: "og-wordmark",
    what: "og:image: the top of the home page, title over the first row of the gallery.",
    sources: [HOME_GRID_TOP],
    render: (out) => toOgSize(join(ROOT, HOME_GRID_TOP), out),
  },
  {
    id: "og-clean",
    what: "og:image without text: eight gallery thumbnails as the home page's cards, four by two.",
    sources: OG_CLEAN_ROWS.flat().map((tile) => `public/assets/fractal-images/${tile}.jpg`),
    render: async (out) => toOgSize(await ogClean(), out),
  },
];

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

for (const card of OG_CARDS) {
  const name = `${card.id}.png`;
  await card.render(join(DIR, name));
  const buffer = await readFile(join(DIR, name));
  manifest.socialPreview[card.id] = {
    file: `docs/marketing/social-preview/${name}`,
    purpose: card.what,
    width: 1200,
    height: 630,
    bytes: buffer.length,
    sha256: createHash("sha256").update(buffer).digest("hex"),
    encoding: "PNG, lossless",
    sources: card.sources,
    rendered: new Date().toLocaleDateString("sv-SE"),
  };
  console.log(`Wrote ${name} (${buffer.length} bytes)`);
}
await writeFile(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);

if (REVIEW_DIR) {
  await mkdir(REVIEW_DIR, { recursive: true });
  for (const file of written) await copyFile(file, join(REVIEW_DIR, basename(file)));
  const sheet = join(REVIEW_DIR, "review-sheet.jpg");
  await reviewSheet(written, sheet);
  console.log(`Wrote ${sheet}`);
}
