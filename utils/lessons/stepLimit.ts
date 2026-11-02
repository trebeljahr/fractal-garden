import { type ComplexPoint, isOutside, traceTeachingOrbit } from "../orbitLesson";

export type StepLimitFormula = "mandelbrot" | "julia";
export type StepLimitView = {
  name: string;
  bounds: readonly [left: number, right: number, bottom: number, top: number];
  stops: number[];
  start: number;
  c?: ComplexPoint;
  ring?: ComplexPoint;
};

// The picture's shader tests this radius, so the readout agrees with the pixel under the ring.
const SHADER_ESCAPE_RADIUS = 256;

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
      ring: { real: -0.74523, imaginary: 0.13027 },
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
      ring: { real: 0, imaginary: 0 },
    },
  ],
};

/** The step at which the ring's point escapes, or null if it stays in within the view's stops. */
export function ringEscapeStep(formula: StepLimitFormula, view: StepLimitView) {
  if (!view.ring) return null;
  const c = formula === "julia" && view.c ? view.c : view.ring;
  const start = formula === "julia" ? view.ring : { real: 0, imaginary: 0 };
  const limit = view.stops[view.stops.length - 1];
  const orbit = traceTeachingOrbit(c, start, false, limit, SHADER_ESCAPE_RADIUS);
  const end = orbit[orbit.length - 1];
  return isOutside(end.point, SHADER_ESCAPE_RADIUS) ? end.iteration : null;
}
