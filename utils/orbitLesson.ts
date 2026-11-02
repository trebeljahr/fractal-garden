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

export type OrbitLoop = { from: number; period: number };
// The most jumps the orbit lesson follows when a point neither leaves nor repeats.
export const ORBIT_LESSON_LIMIT = 32;
// Landings this close read the same in the jump list and on screen.
const LOOP_TOLERANCE = 0.001;
// A point lingering near a repelling cycle or creeping along drifts off within these jumps.
const LOOP_CONFIRMATION = 8;
// Landings of one loop are separate places. Closer ones are a point spiraling in to fewer places.
const LOOP_SEPARATION = 0.01;

function repeatsFrom(orbit: OrbitStep[], from: number, end: number) {
  const first = orbit[from].point;
  for (let i = from + 1; i < end; i++) {
    const { real, imaginary } = orbit[i].point;
    if (Math.hypot(real - first.real, imaginary - first.imaginary) < LOOP_SEPARATION) return false;
  }
  for (let i = 0; i <= LOOP_CONFIRMATION; i++) {
    const later = orbit[end + i]?.point;
    if (!later) return false;
    // Compare with the first pass, so many small steps can't each look like a repeat.
    const earlier = orbit[from + (i % (end - from))].point;
    if (
      Math.abs(later.real - earlier.real) >= LOOP_TOLERANCE ||
      Math.abs(later.imaginary - earlier.imaginary) >= LOOP_TOLERANCE
    )
      return false;
  }
  return true;
}

// Ends the orbit at the first jump that lands back on an earlier point.
export function traceUntilLoop(
  c: ComplexPoint,
  start: ComplexPoint,
  fold = false,
  limit = ORBIT_LESSON_LIMIT,
): { orbit: OrbitStep[]; loop: OrbitLoop | null } {
  const orbit = traceTeachingOrbit(c, start, fold, limit + LOOP_CONFIRMATION);
  const last = Math.min(limit, orbit.length - 1);
  for (let end = 1; end <= last; end++) {
    for (let from = end - 1; from >= 0; from--) {
      if (repeatsFrom(orbit, from, end))
        return { orbit: orbit.slice(0, end + 1), loop: { from, period: end - from } };
    }
  }
  return { orbit: orbit.slice(0, last + 1), loop: null };
}

export type HandJump = { point: ComplexPoint; squared: ComplexPoint; next: ComplexPoint };
const HAND_LIMIT = 40;
const fiveDecimals = (value: number) => Number(value.toFixed(5));

// Carries five decimals, as a person would, so every written sum adds up exactly.
export function handJump(point: ComplexPoint, c: ComplexPoint): HandJump {
  const squared = {
    real: fiveDecimals(point.real ** 2 - point.imaginary ** 2),
    imaginary: fiveDecimals(2 * point.real * point.imaginary),
  };
  return {
    point,
    squared,
    next: {
      real: fiveDecimals(squared.real + c.real),
      imaginary: fiveDecimals(squared.imaginary + c.imaginary),
    },
  };
}

// `repeats` is the earlier jump whose landing the last jump lands on exactly.
export function traceHandJumps(c: ComplexPoint, start: ComplexPoint) {
  const place = ({ real, imaginary }: ComplexPoint) => `${real},${imaginary}`;
  const seen = new Map([[place(start), 0]]);
  const jumps: HandJump[] = [];
  let point = start;
  while (jumps.length < HAND_LIMIT) {
    const jump = handJump(point, c);
    jumps.push(jump);
    const repeats = seen.get(place(jump.next));
    if (repeats !== undefined) return { jumps, repeats };
    seen.set(place(jump.next), jumps.length);
    point = jump.next;
  }
  return { jumps, repeats: null };
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
