import type { EscapeTimeColoring } from "../escapeTimeColoring";
import type { ComplexPoint } from "../orbitLesson";

export type StepLimitFormula = "mandelbrot" | "julia";
export type StepLimitView = {
  name: string;
  bounds: readonly [left: number, right: number, bottom: number, top: number];
  stops: number[];
  start: number;
  c?: ComplexPoint;
};

// Smooth coloring divides the count by this in escape-time.frag.
const COUNTS_PER_ROUND = 40;
// A pixel that escapes at step n gets a smooth count about 3 below n, because of radius 256.
const SMOOTH_COUNT_LAG = 3;
const KEY_COLORS = 32;

// Every escaped pixel gets one gray, whatever its step. The shader takes the fractional part,
// so an offset of 1 would wrap around to black.
export const BLACK_AND_WHITE = {
  palette: "grayscale",
  colorDensity: 0,
  colorOffset: 0.999,
  interior: "#000000",
};

export function colorRepeatSteps(coloring: EscapeTimeColoring) {
  return COUNTS_PER_ROUND / coloring.colorDensity;
}

/** The Classic palette color of a pixel that escapes at this step, as escape-time.frag draws it. */
export function escapeStepColor(step: number, coloring: EscapeTimeColoring) {
  const t =
    ((step - SMOOTH_COUNT_LAG) / COUNTS_PER_ROUND) * coloring.colorDensity + coloring.colorOffset;
  return [0, 0.1, 0.2].map((phase) =>
    Math.round(255 * (0.5 + 0.5 * Math.cos(6.28318 * (t + phase)))),
  );
}

/** One round of the palette, from step 0 to the step where the colors repeat. */
export function colorKeyGradient(coloring: EscapeTimeColoring) {
  const repeat = colorRepeatSteps(coloring);
  const colors = Array.from({ length: KEY_COLORS + 1 }, (_, index) => {
    const [red, green, blue] = escapeStepColor((index / KEY_COLORS) * repeat, coloring);
    return `rgb(${red}, ${green}, ${blue})`;
  });
  return `linear-gradient(to right, ${colors.join(", ")})`;
}

/** About 4% apart and rounded to two digits, so the slider reads 310 rather than 307. */
export function stepStops(min: number, max: number, keep: number[] = []) {
  const stops = new Set([min, max, ...keep]);
  for (let step = min; step < max; step *= 1.04) {
    stops.add(Number(Math.round(step).toPrecision(2)));
  }
  return Array.from(stops)
    .filter((step) => step >= min && step <= max)
    .sort((a, b) => a - b);
}

// These pictures have almost no pixels that never escape, so high limits stay cheap to draw.
export const STEP_LIMIT_VIEWS: Record<StepLimitFormula, StepLimitView[]> = {
  mandelbrot: [
    {
      name: "Whole set",
      bounds: [-2.75, 1.75, -1.5, 1.5],
      stops: stepStops(5, 300),
      start: 5,
    },
    {
      name: "Spiral",
      bounds: [-0.7466, -0.7406, 0.1298, 0.1338],
      stops: stepStops(30, 5000, [50, 500]),
      start: 50,
    },
  ],
  julia: [
    {
      name: "Julia set for c = 0.2501",
      bounds: [-1.65, 1.65, -1.1, 1.1],
      // Most of the dark shape clears between 310 and 330, so slow the slider down there.
      stops: stepStops(50, 2000, [650, ...Array.from({ length: 21 }, (_, i) => 300 + 2 * i)]),
      start: 200,
      c: { real: 0.2501, imaginary: 0 },
    },
  ],
};
