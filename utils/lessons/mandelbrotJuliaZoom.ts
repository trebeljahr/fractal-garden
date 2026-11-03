import { MANDELBROT_COLORING } from "../escapeTimeColoring";
import type { ComplexPoint } from "../orbitLesson";

export type ZoomPlace = {
  name: string;
  c: ComplexPoint;
  /** Starting at zero, the point lands on its repeat after this many jumps. */
  landsAfter: number;
  /** How many places the repeat has. */
  repeatLength: number;
  /** Half the width of the Mandelbrot picture before zooming in. It shows the whole set. */
  widest: number;
};

// Each c comes from Newton's method at high precision. tests/mandelbrot-julia-zoom.test.mjs
// checks that zero lands exactly on the repeat, which double precision can't show.
export const ZOOM_PLACES: ZoomPlace[] = [
  { name: "Fork", c: { real: 0, imaginary: 1 }, landsAfter: 2, repeatLength: 2, widest: 2.2 },
  {
    name: "Star",
    c: { real: -0.5622026215230372, imaginary: 0.6428171490727752 },
    landsAfter: 6,
    repeatLength: 1,
    widest: 2,
  },
  {
    name: "Spiral",
    c: { real: -0.7756837680090538, imaginary: 0.13646736829469014 },
    landsAfter: 24,
    repeatLength: 1,
    widest: 1.5,
  },
];

export const ZOOM_STOPS = 100;
// The shader's 32-bit floats stay clean down to this half width at phone and desktop sizes.
const NARROWEST = 0.0004;
// Enough for the slowest point here, which grows only about 4% per jump near its repeat.
const ITERATIONS = 1000;

export const MANDELBROT_ZOOM_COLORING = { ...MANDELBROT_COLORING, iterations: ITERATIONS };
// The Mandelbrot count includes the first jump, from zero to c. The Julia count starts at c,
// so it is one short. escape-time.frag divides the count by 40 to choose a color.
export const JULIA_ZOOM_COLORING = {
  ...MANDELBROT_ZOOM_COLORING,
  colorOffset: MANDELBROT_COLORING.colorOffset + MANDELBROT_COLORING.colorDensity / 40,
};

export function halfWidthAt(place: ZoomPlace, stop: number) {
  return place.widest * (NARROWEST / place.widest) ** (stop / ZOOM_STOPS);
}

/** How many times wider the first picture is than this stop's picture. */
export function zoomAt(place: ZoomPlace, stop: number) {
  return place.widest / halfWidthAt(place, stop);
}

/**
 * A pixel d away from c in the Mandelbrot picture matches the pixel w * d away from c in the
 * Julia picture. w is the limit of (change in the point per change in c) divided by
 * (change in the point per change in its start), following zero's orbit from c onward.
 */
export function matchingFactor(c: ComplexPoint): ComplexPoint {
  let x = c.real;
  let y = c.imaginary;
  let perCReal = 1;
  let perCImaginary = 0;
  let perStartReal = 1;
  let perStartImaginary = 0;
  // Later jumps change w by about 1 / |perStart|. Rounding errors grow by |perStart| and stay
  // far too small here to move the point off its repeat.
  while (perStartReal ** 2 + perStartImaginary ** 2 < 1e24) {
    [perCReal, perCImaginary] = [
      2 * (x * perCReal - y * perCImaginary) + 1,
      2 * (x * perCImaginary + y * perCReal),
    ];
    [perStartReal, perStartImaginary] = [
      2 * (x * perStartReal - y * perStartImaginary),
      2 * (x * perStartImaginary + y * perStartReal),
    ];
    [x, y] = [x * x - y * y + c.real, 2 * x * y + c.imaginary];
  }
  const size = perStartReal ** 2 + perStartImaginary ** 2;
  return {
    real: (perCReal * perStartReal + perCImaginary * perStartImaginary) / size,
    imaginary: (perCImaginary * perStartReal - perCReal * perStartImaginary) / size,
  };
}

/** Bounds of the square centered on c. */
function around(c: ComplexPoint, half: number) {
  return [c.real - half, c.real + half, c.imaginary - half, c.imaginary + half] as const;
}

export function mandelbrotBounds(place: ZoomPlace, stop: number) {
  return around(place.c, halfWidthAt(place, stop));
}

/**
 * What the page does with the Julia canvas so that it lines up with the Mandelbrot picture.
 * A clockwise CSS turn by arg(w) puts w * d under the screen position of d.
 * `cover` is how much wider than its frame a canvas must be to fill the frame once turned.
 */
export function juliaFit(c: ComplexPoint) {
  const w = matchingFactor(c);
  const radians = Math.atan2(w.imaginary, w.real);
  return {
    scale: Math.hypot(w.real, w.imaginary),
    degrees: (radians * 180) / Math.PI,
    cover: Math.abs(Math.cos(radians)) + Math.abs(Math.sin(radians)),
  };
}

export function juliaBounds(place: ZoomPlace, stop: number) {
  const { scale, cover } = juliaFit(place.c);
  return around(place.c, halfWidthAt(place, stop) * scale * cover);
}
