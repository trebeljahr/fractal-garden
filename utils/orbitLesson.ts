export type ComplexPoint = { real: number; imaginary: number };
export type OrbitKind = "mandelbrot" | "julia" | "burning-ship";
export const TEACHING_LIMIT = 16;
// Starting at zero, or with |c| <= 2, a point past this circle only moves farther away.
export const ESCAPE_RADIUS = 2;
export type OrbitStep = { iteration: number; point: ComplexPoint; folded?: ComplexPoint };
export type Pixel = { x: number; y: number };

export function isOutside(point: ComplexPoint, radius = ESCAPE_RADIUS) {
  return point.real * point.real + point.imaginary * point.imaginary > radius * radius;
}

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
  radius = ESCAPE_RADIUS,
): OrbitStep[] {
  const orbit: OrbitStep[] = [{ iteration: 0, point: start }];
  let z = start;
  for (let i = 0; i < limit; i++) {
    if (isOutside(z, radius)) break;
    const input = fold ? { real: Math.abs(z.real), imaginary: Math.abs(z.imaginary) } : z;
    const squared = squarePoint(input);
    z = { real: squared.real + c.real, imaginary: squared.imaginary + c.imaginary };
    orbit.push({ iteration: i + 1, point: z, folded: fold ? input : undefined });
  }
  return orbit;
}

// Runs once per canvas pixel, so it avoids allocating a point per iteration.
export function teachingPixelEscape(kind: OrbitKind, pixel: ComplexPoint, juliaC: ComplexPoint) {
  const c = kind === "julia" ? juliaC : pixel;
  const fold = kind === "burning-ship";
  const limit = ESCAPE_RADIUS * ESCAPE_RADIUS;
  let x = kind === "julia" ? pixel.real : 0;
  let y = kind === "julia" ? pixel.imaginary : 0;
  for (let iteration = 0; iteration <= TEACHING_LIMIT; iteration++) {
    if (x * x + y * y > limit) return iteration;
    if (iteration === TEACHING_LIMIT) break;
    if (fold) {
      x = Math.abs(x);
      y = Math.abs(y);
    }
    const next = x * x - y * y + c.real;
    y = 2 * x * y + c.imaginary;
    x = next;
  }
  return null;
}

// A jump curves to its left, so A to B and B to A draw as a visible loop, not one line.
export function jumpControl(from: Pixel, to: Pixel): Pixel {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const bend = Math.min(0.34, 72 / (Math.hypot(dx, dy) || 1));
  return { x: (from.x + to.x) / 2 - dy * bend, y: (from.y + to.y) / 2 + dx * bend };
}

export function jumpPoint(from: Pixel, control: Pixel, to: Pixel, t: number): Pixel {
  const u = 1 - t;
  return {
    x: u * u * from.x + 2 * u * t * control.x + t * t * to.x,
    y: u * u * from.y + 2 * u * t * control.y + t * t * to.y,
  };
}

// Where a jump leaves the picture, for the marker that replaces an off-screen point.
export function jumpExit(from: Pixel, to: Pixel, width: number, height: number) {
  const inside = (p: Pixel) => p.x >= 0 && p.x <= width && p.y >= 0 && p.y <= height;
  if (inside(to)) return null;
  const control = jumpControl(from, to);
  let previous = from;
  for (let i = 1; i <= 64; i++) {
    const p = jumpPoint(from, control, to, i / 64);
    if (!inside(p))
      return {
        x: Math.max(0, Math.min(width, p.x)),
        y: Math.max(0, Math.min(height, p.y)),
        angle: Math.atan2(p.y - previous.y, p.x - previous.x),
      };
    previous = p;
  }
  return null;
}
