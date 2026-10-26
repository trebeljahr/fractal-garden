export type ComplexPoint = { real: number; imaginary: number };
export type OrbitKind = "mandelbrot" | "julia" | "burning-ship";
export const TEACHING_LIMIT = 16;
export const ESCAPE_RADIUS = 4;
export type OrbitStep = { iteration: number; point: ComplexPoint; folded?: ComplexPoint };

export function squarePoint(point: ComplexPoint): ComplexPoint {
  return {
    real: point.real ** 2 - point.imaginary ** 2,
    imaginary: 2 * point.real * point.imaginary,
  };
}

export function traceTeachingOrbit(
  c: ComplexPoint,
  start: ComplexPoint,
  fold = false,
  limit = TEACHING_LIMIT,
): OrbitStep[] {
  const orbit: OrbitStep[] = [{ iteration: 0, point: start }];
  let z = start;
  for (let i = 0; i < limit; i++) {
    if (Math.hypot(z.real, z.imaginary) > ESCAPE_RADIUS) break;
    const input = fold ? { real: Math.abs(z.real), imaginary: Math.abs(z.imaginary) } : z;
    const squared = squarePoint(input);
    z = { real: squared.real + c.real, imaginary: squared.imaginary + c.imaginary };
    orbit.push({ iteration: i + 1, point: z, folded: fold ? input : undefined });
  }
  return orbit;
}

export type OrbitOperation = "start" | "fold" | "square" | "add";
export type OrbitFrame = {
  iteration: number;
  operation: OrbitOperation;
  before: ComplexPoint;
  point: ComplexPoint;
};

// Escape is tested only after a complete calculation, never at an intermediate square.
export function teachingFrames(orbit: OrbitStep[]): OrbitFrame[] {
  const start = orbit[0].point;
  const frames: OrbitFrame[] = [{ iteration: 0, operation: "start", before: start, point: start }];
  for (let i = 1; i < orbit.length; i++) {
    const { iteration, point, folded } = orbit[i];
    const before = orbit[i - 1].point;
    if (folded) frames.push({ iteration, operation: "fold", before, point: folded });
    const input = folded ?? before;
    const squared = squarePoint(input);
    frames.push({ iteration, operation: "square", before: input, point: squared });
    frames.push({ iteration, operation: "add", before: squared, point });
  }
  return frames;
}

export function teachingPixelEscape(kind: OrbitKind, pixel: ComplexPoint, juliaC: ComplexPoint) {
  const c = kind === "julia" ? juliaC : pixel;
  let z = kind === "julia" ? pixel : { real: 0, imaginary: 0 };
  for (let iteration = 0; iteration <= TEACHING_LIMIT; iteration++) {
    if (Math.hypot(z.real, z.imaginary) > ESCAPE_RADIUS) return iteration;
    if (iteration === TEACHING_LIMIT) break;
    const input =
      kind === "burning-ship" ? { real: Math.abs(z.real), imaginary: Math.abs(z.imaginary) } : z;
    const squared = squarePoint(input);
    z = { real: squared.real + c.real, imaginary: squared.imaginary + c.imaginary };
  }
  return null;
}
