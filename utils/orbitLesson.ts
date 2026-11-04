export type ComplexPoint = { real: number; imaginary: number };
export type OrbitKind =
  | "mandelbrot"
  | "julia"
  | "burning-ship"
  | "mandelbar"
  | "cactus"
  | "barnsley-tree";
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

// As many jumps as the orbit lesson follows. Declared here because it runs before that limit.
const MIRROR_JUMPS = 32;

export function mirrorPixel(pixel: ComplexPoint): ComplexPoint {
  return { real: pixel.real, imaginary: -pixel.imaginary };
}

/** The routes of a pixel and of its mirror image across the horizontal axis. */
export function mirrorRoutes(
  pixel: ComplexPoint,
  fold: boolean,
  limit = MIRROR_JUMPS,
): [OrbitStep[], OrbitStep[]] {
  const start = { real: 0, imaginary: 0 };
  return [
    traceTeachingOrbit(pixel, start, fold, limit),
    traceTeachingOrbit(mirrorPixel(pixel), start, fold, limit),
  ];
}

export type OrbitLoop = { from: number; period: number };
// The most jumps the orbit lesson follows when a point neither leaves nor repeats.
export const ORBIT_LESSON_LIMIT = 32;
// Landings this close sit on the same spot on screen.
const LOOP_TOLERANCE = 0.001;
// The jump list prints this many decimals. A loop's two matching rows must print the same.
const LISTED_DIGITS = 3;
// Closer than this is the same place, not a point still closing in on it.
const EXACT_LANDING = 1e-9;
// A point lingering near a repelling cycle or creeping along drifts off within these jumps.
const LOOP_CONFIRMATION = 8;
// Landings of one loop are separate places. Closer ones are a point spiraling in to fewer places.
const LOOP_SEPARATION = 0.01;

function listedSame(a: number, b: number) {
  return Number(a.toFixed(LISTED_DIGITS)) === Number(b.toFixed(LISTED_DIGITS));
}

function repeatsFrom(orbit: OrbitStep[], from: number, end: number) {
  const first = orbit[from].point;
  const last = orbit[end].point;
  if (!listedSame(first.real, last.real) || !listedSame(first.imaginary, last.imaginary))
    return false;
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

// Most loops are a point closing in on a place it never quite reaches. This tells the two apart.
export function landsExactly(orbit: OrbitStep[], loop: OrbitLoop) {
  const first = orbit[loop.from].point;
  const last = orbit[loop.from + loop.period].point;
  return Math.hypot(last.real - first.real, last.imaginary - first.imaginary) < EXACT_LANDING;
}

// Ends the orbit at the first jump that lands back on an earlier point, or closes in on it.
export function untilLoop(
  trace: (jumps: number) => OrbitStep[],
  limit = ORBIT_LESSON_LIMIT,
): { orbit: OrbitStep[]; loop: OrbitLoop | null } {
  const orbit = trace(limit + LOOP_CONFIRMATION);
  const last = Math.min(limit, orbit.length - 1);
  for (let end = 1; end <= last; end++) {
    for (let from = end - 1; from >= 0; from--) {
      if (repeatsFrom(orbit, from, end))
        return { orbit: orbit.slice(0, end + 1), loop: { from, period: end - from } };
    }
  }
  return { orbit: orbit.slice(0, last + 1), loop: null };
}

export function traceUntilLoop(
  c: ComplexPoint,
  start: ComplexPoint,
  fold = false,
  limit = ORBIT_LESSON_LIMIT,
  radius = ESCAPE_RADIUS,
) {
  return untilLoop((jumps) => traceTeachingOrbit(c, start, fold, jumps, radius), limit);
}

type OrbitJump = { via?: ComplexPoint; next: ComplexPoint };

function followOrbit(
  start: ComplexPoint,
  jump: (z: ComplexPoint) => OrbitJump,
  limit: number,
  radius: number,
): OrbitStep[] {
  const orbit: OrbitStep[] = [{ iteration: 0, point: start }];
  let z = start;
  for (let i = 0; i < limit; i++) {
    if (isOutside(z, radius)) break;
    const { via, next } = jump(z);
    z = next;
    orbit.push({ iteration: i + 1, point: z, folded: via });
  }
  return orbit;
}

function multiply(a: ComplexPoint, b: ComplexPoint): ComplexPoint {
  return {
    real: a.real * b.real - a.imaginary * b.imaginary,
    imaginary: a.real * b.imaginary + a.imaginary * b.real,
  };
}

/** Square the mirror image of z, then add c. The dotted line shows the mirror. */
export function traceMandelbarOrbit(c: ComplexPoint, limit = TEACHING_LIMIT) {
  return followOrbit(
    { real: 0, imaginary: 0 },
    (z) => {
      const via = { real: z.real, imaginary: -z.imaginary };
      const square = squarePoint(via);
      return {
        via,
        next: { real: square.real + c.real, imaginary: square.imaginary + c.imaginary },
      };
    },
    limit,
    ESCAPE_RADIUS,
  );
}

// With any starting pixel inside it, a point past this circle only moves farther away.
export const CACTUS_RADIUS = 2.5;

/** Start at the pixel c. Each jump goes to z^3 + (c - 1) z - c. */
export function traceCactusOrbit(c: ComplexPoint, limit = TEACHING_LIMIT) {
  return followOrbit(
    c,
    (z) => {
      const square = squarePoint(z);
      const factor = { real: square.real + c.real - 1, imaginary: square.imaginary + c.imaginary };
      const product = multiply(factor, z);
      return { next: { real: product.real - c.real, imaginary: product.imaginary - c.imaginary } };
    },
    limit,
    CACTUS_RADIUS,
  );
}

/** Move one unit toward the vertical axis, then multiply by c. */
export function traceBarnsleyTreeOrbit(
  c: ComplexPoint,
  start: ComplexPoint,
  limit = TEACHING_LIMIT,
  radius = ESCAPE_RADIUS,
) {
  return followOrbit(
    start,
    (z) => {
      const via = { real: z.real - Math.sign(z.real), imaginary: z.imaginary };
      return { via, next: multiply(c, via) };
    },
    limit,
    radius,
  );
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
