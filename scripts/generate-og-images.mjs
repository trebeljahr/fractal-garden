// Composes the 1200x630 Open Graph share cards in public/assets/og/ from the
// fractal thumbnails. Re-run after changing a thumbnail or a card below:
//   node scripts/generate-og-images.mjs
//
// The GitHub social preview cards (SOCIAL_PREVIEW_CARDS) are the same design
// at 1280x640. scripts/marketing/render-social-preview.mjs renders them into
// docs/marketing/social-preview/; this script does not.
import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const THUMBNAILS_DIR = join(ROOT, "public", "assets", "fractal-images");
const OUTPUT_DIR = join(ROOT, "public", "assets", "og");

const OG_WIDTH = 1200;
const OG_HEIGHT = 630;

const FONT_STACK = "Montserrat, 'Avenir Next', 'Helvetica Neue', Helvetica, Arial, sans-serif";
const GAP = 4;
const BACKGROUND = "#141414";

// One entry per card. `tiles` are thumbnail basenames, or paths from the
// repository root for other images, laid out in a grid of `columns`; a
// per-route card can use a single tile with columns: 1.
const CARDS = [
  {
    output: "home.jpg",
    columns: 3,
    tiles: [
      "mandelbrot",
      "barnsley-fern",
      "menger-sponge",
      "penrose-tiling",
      "julia-set",
      "pythagoras-tree",
    ],
    title: "Fractal Garden",
    subtitle: "fractal.garden",
  },
];

// GitHub's social preview card is 1280x640. Same tiles, panel and type as
// the home card; only the canvas and the pictures under the panel change.
export const SOCIAL_PREVIEW_CARDS = [
  {
    id: "a",
    what: "The home link preview at 2:1: the same six thumbnails, panel and title.",
    columns: 3,
    tiles: CARDS[0].tiles,
  },
  {
    id: "b",
    what: "The same design over eight other fractal thumbnails, four by two.",
    columns: 4,
    tiles: [
      "burning-ship",
      "barnsley-tree",
      "jerusalem-cube",
      "l-system-twindragon",
      "romanesco",
      "mandelbar-set",
      "quadratic-koch-3d",
      "l-system-dragon-curve",
    ],
  },
  {
    id: "c",
    what: "The same panel over one render: Mandelbrot set, Seahorse Valley, full bleed.",
    columns: 1,
    tiles: ["docs/marketing/screenshots/gallery-mandelbrot-seahorse-valley.webp"],
  },
  {
    id: "d",
    what: "The home card's three by two grid with the six gallery renders in place of the thumbnails.",
    columns: 3,
    tiles: [
      "docs/marketing/screenshots/gallery-mandelbrot-seahorse-valley.webp",
      "docs/marketing/screenshots/gallery-julia-sea-spiral.webp",
      "docs/marketing/screenshots/gallery-burning-ship-little-ship.webp",
      "docs/marketing/screenshots/gallery-mandelbulb.webp",
      "docs/marketing/screenshots/gallery-dragon-curve.webp",
      "docs/marketing/screenshots/gallery-barnsley-fern.webp",
    ],
  },
].map((card) => ({
  ...card,
  width: 1280,
  height: 640,
  title: CARDS[0].title,
  subtitle: CARDS[0].subtitle,
}));

function escapeXml(text) {
  return text.replace(/[<>&'"]/g, (char) => `&#${char.charCodeAt(0)};`);
}

function tilePath(tile) {
  return tile.includes("/") ? join(ROOT, tile) : join(THUMBNAILS_DIR, `${tile}.jpg`);
}

async function renderTiles({ tiles, columns, width: W = OG_WIDTH, height: H = OG_HEIGHT }) {
  const rows = Math.ceil(tiles.length / columns);
  const tileWidth = Math.floor((W - GAP * (columns - 1)) / columns);
  const tileHeight = Math.floor((H - GAP * (rows - 1)) / rows);

  return Promise.all(
    tiles.map(async (name, index) => {
      const column = index % columns;
      const row = Math.floor(index / columns);
      // The last tile in a row/column absorbs rounding so the grid fills the card.
      const width = column === columns - 1 ? W - column * (tileWidth + GAP) : tileWidth;
      const height = row === rows - 1 ? H - row * (tileHeight + GAP) : tileHeight;
      const input = await sharp(tilePath(name))
        .resize(width, height, { fit: "cover", position: "attention" })
        .toBuffer();

      return { input, left: column * (tileWidth + GAP), top: row * (tileHeight + GAP) };
    }),
  );
}

function renderOverlay({ title, subtitle, width: W = OG_WIDTH, height: H = OG_HEIGHT }) {
  const panelWidth = 760;
  const panelHeight = 230;
  const panelX = (W - panelWidth) / 2;
  const panelY = (H - panelHeight) / 2;
  const centerX = W / 2;

  const svg = `
    <svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="vignette" cx="50%" cy="50%" r="70%">
          <stop offset="0%" stop-color="#000" stop-opacity="0.45" />
          <stop offset="100%" stop-color="#000" stop-opacity="0.1" />
        </radialGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#vignette)" />
      <rect x="${panelX}" y="${panelY}" width="${panelWidth}" height="${panelHeight}"
        rx="24" fill="#0d0d0d" fill-opacity="0.82" stroke="#ffffff" stroke-opacity="0.18" stroke-width="2" />
      <text x="${centerX}" y="${panelY + 128}" text-anchor="middle"
        font-family="${FONT_STACK}" font-size="92" font-weight="700" fill="#ffffff"
        letter-spacing="1">${escapeXml(title)}</text>
      <text x="${centerX}" y="${panelY + 188}" text-anchor="middle"
        font-family="${FONT_STACK}" font-size="38" font-weight="500" fill="#9be89b"
        letter-spacing="3">${escapeXml(subtitle)}</text>
    </svg>`;

  return Buffer.from(svg);
}

/** The card as a sharp pipeline; the caller picks the output format. */
export async function composeCard(card) {
  const width = card.width ?? OG_WIDTH;
  const height = card.height ?? OG_HEIGHT;
  const tiles = await renderTiles(card);
  return sharp({
    create: { width, height, channels: 3, background: BACKGROUND },
  }).composite([...tiles, { input: renderOverlay(card), left: 0, top: 0 }]);
}

async function renderCard(card) {
  const output = join(OUTPUT_DIR, card.output);
  await mkdir(dirname(output), { recursive: true });

  const composed = await composeCard(card);
  await composed.jpeg({ quality: 86, mozjpeg: true }).toFile(output);

  return output;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  for (const card of CARDS) {
    const output = await renderCard(card);
    console.log(`Wrote ${output.replace(ROOT, "")}`);
  }
}
