import type { ComplexPoint } from "../orbitLesson";

type Side = "top" | "right" | "bottom" | "left";
type Picture = { id: string; c: ComplexPoint; alt: string; side: Side; slot: number };

// Rebuild the images after changing a c: node scripts/generate-julia-map.mjs
export const JULIA_MAP_PICTURES: Picture[] = [
  {
    id: "eleven",
    c: { real: -0.69784, imaginary: 0.2793 },
    alt: "Dark lobes, eleven at every joint",
    side: "top",
    slot: 0,
  },
  {
    id: "jagged",
    c: { real: -0.4, imaginary: 0.45 },
    alt: "A solid dark shape with a jagged edge",
    side: "top",
    slot: 1,
  },
  {
    id: "rabbit",
    c: { real: -0.12256, imaginary: 0.74486 },
    alt: "Dark lobes, three at every joint",
    side: "top",
    slot: 2,
  },
  {
    id: "four",
    c: { real: 0.28227, imaginary: 0.53006 },
    alt: "Dark lobes, four at every joint",
    side: "top",
    slot: 3,
  },
  {
    id: "dust",
    c: { real: 0.4, imaginary: 0.45 },
    alt: "Clusters of separate specks with gaps between them",
    side: "right",
    slot: 0,
  },
  {
    id: "circle",
    c: { real: 0, imaginary: 0 },
    alt: "A solid dark circle",
    side: "bottom",
    slot: 3,
  },
  {
    id: "branches",
    c: { real: 0, imaginary: -1 },
    alt: "Thin branches with no dark area",
    side: "bottom",
    slot: 2,
  },
  {
    id: "seven",
    c: { real: -0.62244, imaginary: -0.42488 },
    alt: "Dark lobes, seven at every joint",
    side: "bottom",
    slot: 1,
  },
  {
    id: "basilica",
    c: { real: -1, imaginary: 0 },
    alt: "A chain of rounded dark lobes",
    side: "bottom",
    slot: 0,
  },
  {
    id: "airplane",
    c: { real: -1.75488, imaginary: 0 },
    alt: "A thin line of small dark lobes",
    side: "left",
    slot: 0,
  },
];

// The explorer opens with this half-height, so a picture matches the view its link opens.
export const JULIA_MAP_HALF_SPAN = 1.8;
export const MANDELBROT_BOUNDS = [-2.05, 0.65, -1.35, 1.35] as const;

// Layout units. The figure scales as one piece, so the arrows stay on their pictures.
const TILE = 100;
const COLUMN_GAP = 6;
const ROW_GAP = 14;
// Enough for a caption on two lines at phone width.
const CAPTION = 28;
const MAP_SIZE = 2 * TILE + COLUMN_GAP;
export const FIGURE_WIDTH = 4 * TILE + 3 * COLUMN_GAP;
export const FIGURE_HEIGHT = 2 * (CAPTION + TILE + ROW_GAP) + MAP_SIZE;
export const MAP_BOX = {
  x: TILE + COLUMN_GAP,
  y: CAPTION + TILE + ROW_GAP,
  size: MAP_SIZE,
};

export function tileBox({ side, slot }: Picture) {
  const column = slot * (TILE + COLUMN_GAP);
  const centered = MAP_BOX.y + (MAP_SIZE - TILE) / 2;
  if (side === "top") return { x: column, y: CAPTION, size: TILE };
  if (side === "bottom") return { x: column, y: MAP_BOX.y + MAP_SIZE + ROW_GAP, size: TILE };
  return { x: side === "left" ? 0 : FIGURE_WIDTH - TILE, y: centered, size: TILE };
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
