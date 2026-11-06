// Renders the three GitHub social preview options (1280x640 PNG, under 1 MB)
// from docs/marketing/social-preview/template.html. Run after
// capture-screenshots.mjs when the cards should show new captures:
//
//   pnpm marketing:social-preview
//
// Playwright loads the same way as in capture-screenshots.mjs.
import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import sharp from "sharp";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const DIR = join(ROOT, "docs", "marketing", "social-preview");
const MANIFEST = join(ROOT, "docs", "marketing", "manifest.json");
const MAX_BYTES = 1_000_000;

const VARIANTS = {
  a: "Screenshot-led: Seahorse Valley full bleed, title and one line on the left",
  b: "Brand-led: the home page heading over a row of six home-grid thumbnails",
  c: "Split: title and line on the left, a 2x2 mosaic of captures on the right",
};

async function loadPlaywright() {
  try {
    return await import("playwright");
  } catch {
    const globalRoot = execSync("npm root -g").toString().trim();
    return createRequire(`${globalRoot}/`)("playwright");
  }
}

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

const { chromium } = await loadPlaywright();
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const page = await browser.newPage({
  viewport: { width: 1280, height: 640 },
  deviceScaleFactor: 1,
});
const template = pathToFileURL(join(DIR, "template.html")).href;
const manifest = JSON.parse(await readFile(MANIFEST, "utf8").catch(() => "{}"));
manifest.socialPreview ??= {};

try {
  for (const [variant, purpose] of Object.entries(VARIANTS)) {
    await page.goto(`${template}?v=${variant}`, { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready);
    const { buffer, encoding } = await encode(await page.screenshot({ type: "png" }));
    if (buffer.length > MAX_BYTES) throw new Error(`Option ${variant} is over 1 MB`);
    const name = `social-preview-${variant}.png`;
    await writeFile(join(DIR, name), buffer);
    manifest.socialPreview[variant] = {
      file: `docs/marketing/social-preview/${name}`,
      purpose,
      width: 1280,
      height: 640,
      bytes: buffer.length,
      sha256: createHash("sha256").update(buffer).digest("hex"),
      encoding,
      rendered: new Date().toISOString().slice(0, 10),
    };
    console.log(`Wrote ${name} (${buffer.length} bytes, ${encoding})`);
  }
} finally {
  await browser.close();
}
await writeFile(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);
