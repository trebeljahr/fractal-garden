import { createViewport, serializeViewport } from "../deepZoom/math";
import { MANDELBROT_COLORING } from "../escapeTimeColoring";
import { MANDELBROT_PLACES } from "../escapeTimePlaces";
import { encodeView } from "../explorerShare";
import type { Picture } from "./juliaMap";

// The ring uses the Julia map's grid, clockwise from the top left, and each arrow starts at
// the place's center. Rebuild the images after changing a place:
// node scripts/generate-mandelbrot-zoom-map.mjs
const RING = [
  { id: "deep-fork", alt: "A thin dark branch that forks again and again", row: 0, column: 0 },
  { id: "googol-spiral", alt: "A ringed spiral made of tiny curls", row: 0, column: 1 },
  { id: "deep-branches", alt: "Three branches meeting, lined with small stars", row: 0, column: 2 },
  { id: "deep-fronds", alt: "Fronds of tiny spirals on a dark ground", row: 0, column: 3 },
  { id: "deep-star", alt: "A star whose arms are lined with smaller stars", row: 1, column: 3 },
  { id: "pinwheel", alt: "Striped arms winding around one small bulb", row: 2, column: 3 },
  { id: "deep-curls", alt: "Curled clusters crowding around a spiral", row: 3, column: 3 },
  { id: "deep-coast", alt: "A jagged thread between pale gold and dark brown", row: 3, column: 2 },
  { id: "deep-sprays", alt: "Small sprays of branches on a pale ground", row: 3, column: 1 },
  { id: "deep-spokes", alt: "Long spokes leaving a small hub", row: 3, column: 0 },
  {
    id: "deep-miniature",
    alt: "A tiny copy of the whole set inside colored rings",
    row: 2,
    column: 0,
  },
  { id: "deep-crosses", alt: "Crossing branches along a straight line", row: 1, column: 0 },
];

const OPENING_ZOOM_SIZE = 1.5;

export type ZoomPicture = Picture & { href: string; label: string; exponent: number };

export const ZOOM_MAP_PICTURES: ZoomPicture[] = RING.map((cell) => {
  const place = MANDELBROT_PLACES.find(({ id }) => id === cell.id);
  if (!place) throw new Error(`No Mandelbrot place called ${cell.id}.`);
  const { colorDensity, colorOffset, interior } = MANDELBROT_COLORING;
  return {
    ...cell,
    c: { real: place.center[0], imaginary: place.center[1] },
    label: place.label,
    exponent: Math.round(Math.log10(OPENING_ZOOM_SIZE / place.zoomSize)),
    href:
      "/mandelbrot" +
      encodeView("/mandelbrot", {
        viewport: serializeViewport(
          createViewport(place.preciseCenter ?? place.center, place.zoomSize),
        ),
        config: { iterations: place.iterations, colorDensity, colorOffset, interior },
      }),
  };
});
