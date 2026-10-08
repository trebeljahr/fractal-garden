// Composes the 1200x630 Open Graph share cards in public/assets/og/ from the
// fractal thumbnails. Re-run after changing a thumbnail or a card below:
//   node scripts/generate-og-images.mjs
import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import sharp from "sharp";

const ROOT = process.cwd();
const THUMBNAILS_DIR = join(ROOT, "public", "assets", "fractal-images");
const OUTPUT_DIR = join(ROOT, "public", "assets", "og");

const OG_WIDTH = 1200;
const OG_HEIGHT = 630;

const FONT_STACK = "Montserrat, 'Avenir Next', 'Helvetica Neue', Helvetica, Arial, sans-serif";
const GAP = 4;
const BACKGROUND = "#141414";

// One entry per card. `tiles` are thumbnail basenames laid out in a grid of
// `columns`; a per-route card can use a single tile with columns: 1.
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

function escapeXml(text) {
  return text.replace(/[<>&'"]/g, (char) => `&#${char.charCodeAt(0)};`);
}

async function renderTiles({ tiles, columns }) {
  const rows = Math.ceil(tiles.length / columns);
  const tileWidth = Math.floor((OG_WIDTH - GAP * (columns - 1)) / columns);
  const tileHeight = Math.floor((OG_HEIGHT - GAP * (rows - 1)) / rows);

  return Promise.all(
    tiles.map(async (name, index) => {
      const column = index % columns;
      const row = Math.floor(index / columns);
      // The last tile in a row/column absorbs rounding so the grid fills the card.
      const width = column === columns - 1 ? OG_WIDTH - column * (tileWidth + GAP) : tileWidth;
      const height = row === rows - 1 ? OG_HEIGHT - row * (tileHeight + GAP) : tileHeight;
      const input = await sharp(join(THUMBNAILS_DIR, `${name}.jpg`))
        .resize(width, height, { fit: "cover", position: "attention" })
        .toBuffer();

      return { input, left: column * (tileWidth + GAP), top: row * (tileHeight + GAP) };
    }),
  );
}

function renderOverlay({ title, subtitle }) {
  const panelWidth = 760;
  const panelHeight = 230;
  const panelX = (OG_WIDTH - panelWidth) / 2;
  const panelY = (OG_HEIGHT - panelHeight) / 2;
  const centerX = OG_WIDTH / 2;

  const svg = `
    <svg width="${OG_WIDTH}" height="${OG_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
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

async function renderCard(card) {
  const output = join(OUTPUT_DIR, card.output);
  await mkdir(dirname(output), { recursive: true });

  const tiles = await renderTiles(card);
  await sharp({
    create: { width: OG_WIDTH, height: OG_HEIGHT, channels: 3, background: BACKGROUND },
  })
    .composite([...tiles, { input: renderOverlay(card), left: 0, top: 0 }])
    .jpeg({ quality: 86, mozjpeg: true })
    .toFile(output);

  return output;
}

for (const card of CARDS) {
  const output = await renderCard(card);
  console.log(`Wrote ${output.replace(`${ROOT}/`, "")}`);
}
