export type NewtonPoint = { real: number; imaginary: number };
export type NewtonStop = "active" | "root" | "slope" | "unstable" | "limit";
export type NewtonState = { point: NewtonPoint; reason: NewtonStop; root: number };
export type NewtonTraceState = NewtonState & { iteration: number };

export const NEWTON_ROOTS: readonly NewtonPoint[] = [
  { real: 1, imaginary: 0 },
  { real: -0.5, imaginary: Math.sqrt(3) / 2 },
  { real: -0.5, imaginary: -Math.sqrt(3) / 2 },
];
// Match the full image's stopping thresholds, with a shorter teaching trace.
export const NEWTON_ROOT_TOLERANCE = 0.0008;
export const NEWTON_SLOPE_SQUARED_TOLERANCE = 0.0001;
export const NEWTON_MAX_COMPONENT = 1_000_000;

export function newtonFunction(z: NewtonPoint): NewtonPoint {
  return {
    real: z.real ** 3 - 3 * z.real * z.imaginary ** 2 - 1,
    imaginary: 3 * z.real ** 2 * z.imaginary - z.imaginary ** 3,
  };
}

function derivative(z: NewtonPoint): NewtonPoint {
  return { real: 3 * (z.real ** 2 - z.imaginary ** 2), imaginary: 6 * z.real * z.imaginary };
}

export function nearestNewtonRoot(point: NewtonPoint) {
  let root = 0;
  let distance = Number.POSITIVE_INFINITY;
  for (let index = 0; index < NEWTON_ROOTS.length; index++) {
    const candidate = NEWTON_ROOTS[index];
    const next = Math.hypot(point.real - candidate.real, point.imaginary - candidate.imaginary);
    if (next < distance) {
      root = index;
      distance = next;
    }
  }
  return { root, distance };
}

function classify(point: NewtonPoint): NewtonState {
  const { root, distance } = nearestNewtonRoot(point);
  if (
    !Number.isFinite(point.real) ||
    !Number.isFinite(point.imaginary) ||
    Math.abs(point.real) > NEWTON_MAX_COMPONENT ||
    Math.abs(point.imaginary) > NEWTON_MAX_COMPONENT
  )
    return { point, reason: "unstable", root };
  if (distance < NEWTON_ROOT_TOLERANCE) return { point, reason: "root", root };
  const slope = derivative(point);
  if (slope.real ** 2 + slope.imaginary ** 2 < NEWTON_SLOPE_SQUARED_TOLERANCE)
    return { point, reason: "slope", root };
  return { point, reason: "active", root };
}

export function newtonStep(point: NewtonPoint): NewtonState {
  const current = classify(point);
  if (current.reason !== "active") return current;
  const f = newtonFunction(point);
  const slope = derivative(point);
  const denominator = slope.real ** 2 + slope.imaginary ** 2;
  const next = {
    real: point.real - (f.real * slope.real + f.imaginary * slope.imaginary) / denominator,
    imaginary:
      point.imaginary - (f.imaginary * slope.real - f.real * slope.imaginary) / denominator,
  };
  const result = classify(next);
  // Keep the last stable point visible if a numerical update becomes invalid.
  return result.reason === "unstable" ? { ...current, reason: "unstable" } : result;
}

export function traceNewton(start: NewtonPoint, limit = 12): NewtonTraceState[] {
  const trace = [{ ...classify({ ...start }), iteration: 0 }];
  while (trace.length <= limit && trace.at(-1)?.reason === "active") {
    trace.push({ ...newtonStep(trace[trace.length - 1].point), iteration: trace.length });
  }
  const last = trace[trace.length - 1];
  if (last.reason === "active") last.reason = "limit";
  return trace;
}

export function realNewtonTangent(x: number) {
  const value = x ** 3 - 1;
  const slope = 3 * x ** 2;
  return { value, slope, intercept: slope === 0 ? null : x - value / slope };
}
