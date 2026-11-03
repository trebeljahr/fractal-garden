import type { ComplexPoint } from "../orbitLesson";

type Picture = { id: string; c: ComplexPoint; alt: string; row: number; column: number };

// A ring of cells in a 4 by 4 grid, clockwise from the top left. The map fills the middle.
// Rebuild the images after changing a c: node scripts/generate-julia-map.mjs
export const JULIA_MAP_PICTURES: Picture[] = [
  {
    id: "spiral",
    c: { real: -0.8, imaginary: 0.156 },
    alt: "Paired curls along a twisting thread",
    row: 0,
    column: 0,
  },
  {
    id: "jagged",
    c: { real: -0.4, imaginary: 0.45 },
    alt: "A solid dark shape with a jagged edge",
    row: 0,
    column: 1,
  },
  {
    id: "rabbit",
    c: { real: -0.12256, imaginary: 0.74486 },
    alt: "Dark lobes, three at every joint",
    row: 0,
    column: 2,
  },
  {
    id: "four",
    c: { real: 0.28227, imaginary: 0.53006 },
    alt: "Dark lobes, four at every joint",
    row: 0,
    column: 3,
  },
  {
    id: "dust",
    c: { real: 0.4, imaginary: 0.45 },
    alt: "Clusters of separate specks with gaps between them",
    row: 1,
    column: 3,
  },
  {
    id: "rings",
    c: { real: 0.45, imaginary: 0.1 },
    alt: "Four rings of specks with gaps between them",
    row: 2,
    column: 3,
  },
  {
    id: "circle",
    c: { real: 0, imaginary: 0 },
    alt: "A solid dark circle",
    row: 3,
    column: 3,
  },
  {
    id: "branches",
    c: { real: 0, imaginary: -1 },
    alt: "Thin branches with no dark area",
    row: 3,
    column: 2,
  },
  {
    id: "stars",
    c: { real: -0.70176, imaginary: -0.3842 },
    alt: "Star-shaped clusters along a branching line",
    row: 3,
    column: 1,
  },
  {
    id: "basilica",
    c: { real: -1, imaginary: 0 },
    alt: "A chain of rounded dark lobes",
    row: 3,
    column: 0,
  },
  {
    id: "airplane",
    c: { real: -1.75488, imaginary: 0 },
    alt: "A thin line of small dark lobes",
    row: 2,
    column: 0,
  },
  {
    id: "broken-line",
    c: { real: -1.5, imaginary: 0.1 },
    alt: "A thin line of specks with a gap in the middle",
    row: 1,
    column: 0,
  },
];

// The explorer opens with this half-height, so a picture matches the view its link opens.
export const JULIA_MAP_HALF_SPAN = 1.8;
export const MANDELBROT_BOUNDS = [-2.05, 0.65, -1.35, 1.35] as const;

// Layout units. The figure scales as one piece, so the arrows stay on their pictures.
const TILE = 100;
const COLUMN_GAP = 6;
const ROW_GAP = 6;
// Enough for a caption on two lines at phone width.
const CAPTION = 28;
const MAP_SIZE = 2 * TILE + COLUMN_GAP;
// The upper two rows have captions above the pictures, the lower two below.
const MIDDLE_TOP = CAPTION + TILE + ROW_GAP + CAPTION;
const ROW_TOPS = [
  CAPTION,
  MIDDLE_TOP,
  MIDDLE_TOP + TILE + COLUMN_GAP,
  MIDDLE_TOP + MAP_SIZE + CAPTION + ROW_GAP,
];
export const FIGURE_WIDTH = 4 * TILE + 3 * COLUMN_GAP;
export const FIGURE_HEIGHT = ROW_TOPS[3] + TILE + CAPTION;
export const MAP_BOX = { x: TILE + COLUMN_GAP, y: MIDDLE_TOP, size: MAP_SIZE };

export function tileBox({ row, column }: Picture) {
  return { x: column * (TILE + COLUMN_GAP), y: ROW_TOPS[row], size: TILE };
}

export function mapPosition({ real, imaginary }: ComplexPoint) {
  const [left, right, bottom, top] = MANDELBROT_BOUNDS;
  return {
    x: MAP_BOX.x + ((real - left) / (right - left)) * MAP_SIZE,
    y: MAP_BOX.y + ((top - imaginary) / (top - bottom)) * MAP_SIZE,
  };
}

/** The arrow runs from c toward the picture's center and stops at the picture's edge. */
export function arrowTip(picture: Picture) {
  const from = mapPosition(picture.c);
  const box = tileBox(picture);
  const half = box.size / 2;
  const dx = box.x + half - from.x;
  const dy = box.y + half - from.y;
  const reach = 1 - half / Math.max(Math.abs(dx), Math.abs(dy));
  return { x: from.x + dx * reach, y: from.y + dy * reach };
}
