import type { ComplexPoint } from "../orbitLesson";

type Picture = { id: string; c: ComplexPoint; alt: string; row: number; column: number };

// A ring of cells in a 4 by 4 grid, clockwise from the top left. The map fills the middle.
// Rebuild the images after changing a c: node scripts/generate-julia-map.mjs
export const JULIA_MAP_PICTURES: Picture[] = [
  {
    id: "bolts",
    c: { real: -1.1, imaginary: 0.5 },
    alt: "Separate jagged bolts with wide gaps between them",
    row: 0,
    column: 0,
  },
  {
    id: "spiral",
    c: { real: -0.8, imaginary: 0.156 },
    alt: "Paired curls along a twisting thread",
    row: 0,
    column: 1,
  },
  {
    id: "rabbit",
    c: { real: -0.12256, imaginary: 0.74486 },
    alt: "Black lobes, three at every joint",
    row: 0,
    column: 2,
  },
  {
    id: "circle",
    c: { real: 0, imaginary: 0 },
    alt: "A solid black circle",
    row: 0,
    column: 3,
  },
  {
    id: "islands",
    c: { real: 0.45, imaginary: 0.35 },
    alt: "Thin golden branches forking at both ends",
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
    id: "dendrite",
    c: { real: 0.285, imaginary: 0.01 },
    alt: "Pale golden lobes full of small spirals",
    row: 3,
    column: 3,
  },
  {
    id: "branches",
    c: { real: 0, imaginary: -1 },
    alt: "Thin white branches with no black area",
    row: 3,
    column: 2,
  },
  {
    id: "jagged",
    c: { real: -0.4, imaginary: -0.45 },
    alt: "A solid black shape with a jagged edge",
    row: 3,
    column: 1,
  },
  {
    id: "stars",
    c: { real: -0.70176, imaginary: -0.3842 },
    alt: "Golden star-shaped clusters along a branching line",
    row: 3,
    column: 0,
  },
  {
    id: "basilica",
    c: { real: -1, imaginary: 0 },
    alt: "A chain of rounded black lobes",
    row: 2,
    column: 0,
  },
  {
    id: "airplane",
    c: { real: -1.75488, imaginary: 0 },
    alt: "A thin line of tiny black lobes, the largest in the middle",
    row: 1,
    column: 0,
  },
];

// The explorer opens with this half-height, so a picture matches the view its link opens.
export const JULIA_MAP_HALF_SPAN = 1.8;

// Layout units. The figure scales as one piece, so the arrows stay on their pictures.
const TILE = 100;
const GAP = 6;
// Every picture has one line of caption above it.
export const CAPTION = 14;
const CARD = CAPTION + TILE;
export const FIGURE_WIDTH = 4 * TILE + 3 * GAP;
export const FIGURE_HEIGHT = 4 * CARD + 3 * GAP;
export const MAP_BOX = {
  x: TILE + GAP,
  y: CARD + GAP,
  width: 2 * TILE + GAP,
  height: 2 * CARD + GAP,
};

// The map fills the hole in the ring, so the same gap surrounds it. It is taller than wide,
// so it shows more of the plane above and below the set.
const MAP_HALF_HEIGHT = (1.35 * MAP_BOX.height) / MAP_BOX.width;
export const MANDELBROT_BOUNDS = [-2.05, 0.65, -MAP_HALF_HEIGHT, MAP_HALF_HEIGHT] as const;

export function tileBox({ row, column }: Picture) {
  return { x: column * (TILE + GAP), y: row * (CARD + GAP) + CAPTION, width: TILE };
}

export function mapPosition({ real, imaginary }: ComplexPoint) {
  const [left, right, bottom, top] = MANDELBROT_BOUNDS;
  return {
    x: MAP_BOX.x + ((real - left) / (right - left)) * MAP_BOX.width,
    y: MAP_BOX.y + ((top - imaginary) / (top - bottom)) * MAP_BOX.height,
  };
}

/**
 * The arrow runs from c toward the picture's center and stops at the side facing the map.
 * That side is the caption's top edge in the bottom row. A corner picture can only be
 * reached through the gap at its inner corner, without crossing its neighbors.
 */
export function arrowTip(picture: Picture) {
  const from = mapPosition(picture.c);
  const { x, y } = tileBox(picture);
  const centerX = x + TILE / 2;
  const centerY = y + TILE / 2;
  const edgeX = picture.column === 0 ? x + TILE : x;
  const edgeY = picture.row === 0 ? y + TILE : y - CAPTION;
  const isTopOrBottom = picture.row === 0 || picture.row === 3;
  const isSide = picture.column === 0 || picture.column === 3;
  if (isTopOrBottom && isSide) return { x: edgeX, y: edgeY };
  if (isTopOrBottom) {
    const reach = (edgeY - from.y) / (centerY - from.y);
    return { x: from.x + (centerX - from.x) * reach, y: edgeY };
  }
  const reach = (edgeX - from.x) / (centerX - from.x);
  const atEdge = from.y + (centerY - from.y) * reach;
  // Stay beside the picture, not beside its caption.
  return { x: edgeX, y: Math.min(Math.max(atEdge, y + GAP), y + TILE - GAP) };
}
