import type { ComplexPoint } from "../orbitLesson";

const point = (real: number, imaginary: number): ComplexPoint => ({ real, imaginary });
const jump = (z: ComplexPoint, c: ComplexPoint) =>
  point(
    z.real * z.real - z.imaginary * z.imaginary + c.real,
    2 * z.real * z.imaginary + c.imaginary,
  );

function squareRoot(real: number, imaginary: number): ComplexPoint {
  const size = Math.hypot(real, imaginary);
  const root = Math.sqrt(Math.max(0, (size + real) / 2));
  const other = Math.sqrt(Math.max(0, (size - real) / 2));
  return point(root, imaginary < 0 ? -other : other);
}

/** The two solutions of z² + c = z. */
export function fixedPoints(c: ComplexPoint): [ComplexPoint, ComplexPoint] {
  const root = squareRoot(1 - 4 * c.real, -4 * c.imaginary);
  return [
    point((1 + root.real) / 2, root.imaginary / 2),
    point((1 - root.real) / 2, -root.imaginary / 2),
  ];
}

/** The two places of the repeat of length two: the solutions of z² + z + c + 1 = 0. */
export function twoRepeat(c: ComplexPoint): [ComplexPoint, ComplexPoint] {
  const root = squareRoot(-3 - 4 * c.real, -4 * c.imaginary);
  return [
    point((-1 + root.real) / 2, root.imaginary / 2),
    point((-1 - root.real) / 2, -root.imaginary / 2),
  ];
}

/** How much one jump stretches a tiny patch around z. */
export const oneJumpStretch = (z: ComplexPoint) => 2 * Math.hypot(z.real, z.imaginary);
/** How much two jumps stretch a tiny patch around either place of the repeat: |4(c + 1)|. */
export const twoJumpStretch = (c: ComplexPoint) => 4 * Math.hypot(c.real + 1, c.imaginary);

/** Where the fixed point's stretch is exactly 1: 2z = w on the unit circle and c = z − z². */
export function heartOutline(samples = 240) {
  return Array.from({ length: samples + 1 }, (_, index) => {
    const angle = (2 * Math.PI * index) / samples;
    const z = point(Math.cos(angle) / 2, Math.sin(angle) / 2);
    return point(
      z.real - z.real * z.real + z.imaginary * z.imaginary,
      z.imaginary - 2 * z.real * z.imaginary,
    );
  });
}

/** Where the two-jump stretch is exactly 1: |c + 1| = 1/4. */
export function bulbOutline(samples = 120) {
  return Array.from({ length: samples + 1 }, (_, index) => {
    const angle = (2 * Math.PI * index) / samples;
    return point(-1 + Math.cos(angle) / 4, Math.sin(angle) / 4);
  });
}

/** The real outline of a small round patch around z, after some jumps. */
export function patchAfter(z: ComplexPoint, c: ComplexPoint, radius: number, jumps: number) {
  return Array.from({ length: 40 }, (_, index) => {
    const angle = (2 * Math.PI * index) / 40;
    let at = point(z.real + radius * Math.cos(angle), z.imaginary + radius * Math.sin(angle));
    for (let done = 0; done < jumps; done++) at = jump(at, c);
    return at;
  });
}

export const MOST_REPEAT_JUMPS = 12;
const WALK_STEPS = 24;
const SWEEPS_PER_STEP = 2;
const FINAL_SWEEPS = 30;
// A bent path misses the places on the real line where two repeats collide.
const PATH_BEND = 0.05;

/**
 * Solutions of "n jumps return to the start". With c = 0 they are 0 and the (2ⁿ − 1)th roots of
 * unity, and solution k jumps to solution 2k. Undoing a jump pulls a point toward a repeat that
 * pushes points away, so walking c out from 0 and undoing jumps keeps each solution. The result
 * misses the fixed point that starts at 0 and any repeat that pulls points in, which undoing
 * jumps can't reach. `allRepeats` adds the fixed points.
 */
export function pushingRepeats(c: ComplexPoint, jumps: number) {
  const count = 2 ** jumps - 1;
  const xs = new Float64Array(count);
  const ys = new Float64Array(count);
  for (let k = 0; k < count; k++) {
    xs[k] = Math.cos((2 * Math.PI * k) / count);
    ys[k] = Math.sin((2 * Math.PI * k) / count);
  }
  const sweep = (a: number, b: number) => {
    for (let k = count - 1; k >= 0; k--) {
      const next = (2 * k) % count;
      const u = xs[next] - a;
      const v = ys[next] - b;
      const size = Math.hypot(u, v);
      let x = Math.sqrt(Math.max(0, (size + u) / 2));
      let y = Math.sqrt(Math.max(0, (size - u) / 2));
      if (v < 0) y = -y;
      if (x * xs[k] + y * ys[k] < 0) {
        x = -x;
        y = -y;
      }
      xs[k] = x;
      ys[k] = y;
    }
  };
  for (let step = 1; step <= WALK_STEPS; step++) {
    const t = step / WALK_STEPS;
    const bend = PATH_BEND * Math.sin(Math.PI * t);
    for (let pass = 0; pass < SWEEPS_PER_STEP; pass++) sweep(c.real * t, c.imaginary * t + bend);
  }
  for (let pass = 0; pass < FINAL_SWEEPS; pass++) sweep(c.real, c.imaginary);
  return { xs, ys };
}

export function allRepeats(c: ComplexPoint, jumps: number) {
  const { xs, ys } = pushingRepeats(c, jumps);
  const [first, second] = fixedPoints(c);
  const points = new Float64Array((xs.length + 2) * 2);
  for (let k = 0; k < xs.length; k++) {
    points[k * 2] = xs[k];
    points[k * 2 + 1] = ys[k];
  }
  points.set([first.real, first.imaginary, second.real, second.imaginary], xs.length * 2);
  return points;
}

// The patch demo: a tiny patch of starting points with c = −1, whose repeat is 0 and −1.
export const PATCH_C = point(-1, 0);
export const PATCH_RADIUS = 1e-6;
export const PATCH_DOTS = 2500;
const PATCH_JUMPS = 70;
const PATCH_ESCAPE = 4;
const ON_REPEAT = 1e-3;
export const PATCH_PLACES = [
  { name: "On the Julia set", at: point((1 + Math.sqrt(5)) / 2, 0) },
  { name: "Inside", at: point(0.5, 0) },
  { name: "Outside", at: point(1.7, 0) },
] as const;

export type PatchFrame = {
  positions: Float64Array;
  escaped: number;
  settled: number;
  /** The farthest apart any two dots that haven't escaped lie, by bounding box. */
  width: number;
};

/** Every dot's place after each jump, ending once each dot has escaped or joined the repeat. */
export function patchRun(center: ComplexPoint, count = PATCH_DOTS) {
  let positions = new Float64Array(count * 2);
  for (let dot = 0; dot < count; dot++) {
    const distance = PATCH_RADIUS * Math.sqrt((dot + 0.5) / count);
    const angle = dot * Math.PI * (3 - Math.sqrt(5));
    positions[dot * 2] = center.real + distance * Math.cos(angle);
    positions[dot * 2 + 1] = center.imaginary + distance * Math.sin(angle);
  }
  const measure = (at: Float64Array): PatchFrame => {
    let escaped = 0;
    let settled = 0;
    let left = Number.POSITIVE_INFINITY;
    let right = Number.NEGATIVE_INFINITY;
    let bottom = Number.POSITIVE_INFINITY;
    let top = Number.NEGATIVE_INFINITY;
    for (let dot = 0; dot < count; dot++) {
      const x = at[dot * 2];
      const y = at[dot * 2 + 1];
      if (Number.isNaN(x)) {
        escaped++;
        continue;
      }
      if (Math.hypot(x, y) < ON_REPEAT || Math.hypot(x + 1, y) < ON_REPEAT) settled++;
      left = Math.min(left, x);
      right = Math.max(right, x);
      bottom = Math.min(bottom, y);
      top = Math.max(top, y);
    }
    const width = escaped === count ? 0 : Math.hypot(right - left, top - bottom);
    return { positions: at, escaped, settled, width };
  };
  const frames = [measure(positions)];
  for (let step = 1; step <= PATCH_JUMPS; step++) {
    const next = new Float64Array(count * 2);
    for (let dot = 0; dot < count; dot++) {
      const x = positions[dot * 2];
      const y = positions[dot * 2 + 1];
      const nextX = x * x - y * y + PATCH_C.real;
      const nextY = 2 * x * y + PATCH_C.imaginary;
      const gone = Number.isNaN(x) || Math.hypot(nextX, nextY) > PATCH_ESCAPE;
      next[dot * 2] = gone ? Number.NaN : nextX;
      next[dot * 2 + 1] = gone ? Number.NaN : nextY;
    }
    positions = next;
    const frame = measure(next);
    frames.push(frame);
    if (frame.escaped + frame.settled === count) break;
  }
  return frames;
}

// The Newton demo: polynomials with roots −1, 1 and a third root, tested from the roots' average.
export const NEWTON_NO_ROOT = -1;
export const NEWTON_COPY_CENTER = point(-0.8265, 0.8403);
export const NEWTON_WHOLE_HALF = 4;
export const NEWTON_COPY_HALF = 0.05;
export const NEWTON_STOPS = 40;
const NEWTON_TOLERANCE = 1e-3;

/** Which root the guess at the average reaches: 0 for −1, 1 for 1, 2 for the third, or none. */
export function newtonAverageFate(real: number, imaginary: number, limit = 300) {
  let x = real / 3;
  let y = imaginary / 3;
  for (let jumps = 0; jumps < limit; jumps++) {
    if (Math.hypot(x + 1, y) < NEWTON_TOLERANCE) return { root: 0, jumps };
    if (Math.hypot(x - 1, y) < NEWTON_TOLERANCE) return { root: 1, jumps };
    if (Math.hypot(x - real, y - imaginary) < NEWTON_TOLERANCE) return { root: 2, jumps };
    const squareX = x * x - y * y;
    const squareY = 2 * x * y;
    // p(z) = (z² − 1)(z − t) and p′(z) = 3z² − 2tz − 1.
    const pX = (squareX - 1) * (x - real) - squareY * (y - imaginary);
    const pY = (squareX - 1) * (y - imaginary) + squareY * (x - real);
    const slopeX = 3 * squareX - 2 * (real * x - imaginary * y) - 1;
    const slopeY = 3 * squareY - 2 * (real * y + imaginary * x);
    const size = slopeX * slopeX + slopeY * slopeY;
    if (size < 1e-30) return { root: NEWTON_NO_ROOT, jumps };
    x -= (pX * slopeX + pY * slopeY) / size;
    y -= (pY * slopeX - pX * slopeY) / size;
  }
  return { root: NEWTON_NO_ROOT, jumps: limit };
}

/** A steady zoom from the whole plane to the copy, with the copy staying put on the way. */
export function newtonView(stop: number) {
  const half = NEWTON_WHOLE_HALF * (NEWTON_COPY_HALF / NEWTON_WHOLE_HALF) ** (stop / NEWTON_STOPS);
  const share = (NEWTON_WHOLE_HALF - half) / (NEWTON_WHOLE_HALF - NEWTON_COPY_HALF);
  return {
    half,
    zoom: NEWTON_WHOLE_HALF / half,
    center: point(NEWTON_COPY_CENTER.real * share, NEWTON_COPY_CENTER.imaginary * share),
  };
}
