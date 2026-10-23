import { type DeepViewport, fixedOffset } from "./deepZoom/math";
import { fixedFromNumber, fixedToNumber } from "./lsystem/bigfixed";

export type FernMethod = "chaos" | "deterministic";
export type FernBounds = { x: number; y: number; rx: number; ry: number };
type Affine<T> = { a: T; b: T; c: T; d: T; x: T; y: T };
const ZERO = BigInt(0);
const DENOMINATOR = BigInt(1000);
const abs = (v: bigint) => (v < ZERO ? -v : v);

/** Conservative invariant enclosure, rather than bounds from a finite dot sample. */
export function fernBounds(matrix: number[][]): FernBounds {
  const contraction = Math.max(
    ...matrix.flatMap(([a, b, c, d]) => [Math.abs(a) + Math.abs(b), Math.abs(c) + Math.abs(d)]),
  );
  if (contraction >= 1) throw new Error("Fern maps require a contracting coordinate bound.");
  const radius =
    Math.max(...matrix.flatMap((m) => [Math.abs(m[4]), Math.abs(m[5])])) / (1 - contraction) + 1;
  let box = { x: 0, y: 0, rx: radius, ry: radius };
  for (let k = 0; k < 512; k++) {
    let left = Infinity,
      right = -Infinity,
      bottom = Infinity,
      top = -Infinity;
    for (const [a, b, c, d, e, f] of matrix) {
      const x = a * box.x + b * box.y + e;
      const y = c * box.x + d * box.y + f;
      const rx = Math.abs(a) * box.rx + Math.abs(b) * box.ry;
      const ry = Math.abs(c) * box.rx + Math.abs(d) * box.ry;
      left = Math.min(left, x - rx);
      right = Math.max(right, x + rx);
      bottom = Math.min(bottom, y - ry);
      top = Math.max(top, y + ry);
    }
    box = {
      x: (left + right) / 2,
      y: (bottom + top) / 2,
      rx: (right - left) / 2,
      ry: (top - bottom) / 2,
    };
  }
  return { ...box, rx: box.rx + 1e-8, ry: box.ry + 1e-8 };
}

export function fernOpeningSpan(bounds: FernBounds, width: number, height: number) {
  const side = Math.min(width, height);
  return Math.max((bounds.rx * side) / width, (bounds.ry * side) / height) / 0.95;
}

/** Exact finite deterministic levels for the article's construction demo. */
export function fernGeneration(matrix: number[][], level: number) {
  let points = [{ x: 0, y: 0 }];
  for (let k = 0; k < level; k++) {
    points = matrix.flatMap(([a, b, c, d, e, f]) =>
      points.map(({ x, y }) => ({ x: a * x + b * y + e, y: c * x + d * y + f })),
    );
  }
  return points;
}

/**
 * Traverse composed maps outside-in. Only visible subtrees survive. Large
 * prefixes use fixed point; small ones switch to viewport-relative pixels.
 * Coefficients are exact thousandths in every supplied preset. Never invert
 * the stem map: it is singular, and its descendants still belong to the fern.
 */
export function createFernWalker(
  matrix: number[][],
  view: DeepViewport,
  width: number,
  height: number,
  method: FernMethod,
  seed = 42,
  coverage?: Uint8Array,
) {
  const bounds = fernBounds(matrix);
  const { bits } = view;
  const one = BigInt(1) << BigInt(bits);
  const halfSpan = fixedOffset(1, view.logZoom, bits);
  const side = Math.min(width, height);
  const halfW = fixedOffset((width + 4) / side, view.logZoom, bits);
  const halfH = fixedOffset((height + 4) / side, view.logZoom, bits);
  const bx = fixedFromNumber(bounds.x, bits),
    by = fixedFromNumber(bounds.y, bits);
  const brx = fixedFromNumber(bounds.rx, bits),
    bry = fixedFromNumber(bounds.ry, bits);
  const rules = matrix.map((m) => m.slice(0, 6).map((v) => BigInt(Math.round(v * 1000))));
  const large: Affine<bigint>[] = [{ a: one, b: ZERO, c: ZERO, d: one, x: -view.x, y: -view.y }];
  const small: Affine<number>[] = [];
  const tiles: Affine<number>[] = [];
  let cursor = 0;
  let randomState = seed || 42;
  let px = 0,
    py = 0;
  let samples = 0;
  let visited = 0;
  let passVisits = 0;
  let resolution = method === "chaos" ? 24 : 0.7;
  const restartCoarser = () => {
    resolution *= 2;
    small.length = 0;
    large.length = 0;
    large.push({ a: one, b: ZERO, c: ZERO, d: one, x: -view.x, y: -view.y });
    tiles.length = 0;

    cursor = 0;
    passVisits = 0;
    samples = 0;
  };
  const occupied = coverage ?? new Uint8Array(Math.ceil(width) * Math.ceil(height));
  const stride = Math.ceil(width);
  // Once every pixel in a subtree's clipped enclosure is drawn, further
  // addresses cannot add pixels. This also collapses overlapping stem images.
  const covered = (left: number, bottom: number, right: number, top: number) => {
    const x0 = Math.max(0, Math.floor(width / 2 + left));
    const x1 = Math.min(Math.ceil(width) - 1, Math.floor(width / 2 + right));
    const y0 = Math.max(0, Math.floor(height / 2 - top));
    const y1 = Math.min(Math.ceil(height) - 1, Math.floor(height / 2 - bottom));
    if ((x1 - x0 + 1) * (y1 - y0 + 1) > 4096) return false;
    for (let y = y0; y <= y1; y++)
      for (let x = x0; x <= x1; x++) if (!occupied[y * stride + x]) return false;
    return true;
  };
  // Bounds and precision are relative to the camera even beyond float range.
  const pixel = (v: bigint) => (fixedToNumber((v * one) / halfSpan, bits) * side) / 2;
  const randomPoint = () => {
    randomState ^= randomState << 13;
    randomState ^= randomState >>> 17;
    randomState ^= randomState << 5;
    let r = (randomState >>> 0) / 4294967296;
    let rule = matrix[matrix.length - 1];
    for (const candidate of matrix) {
      r -= candidate[6];
      if (r <= 0) {
        rule = candidate;
        break;
      }
    }
    const [a, b, c, d, e, f] = rule;
    const x = a * px + b * py + e;
    py = c * px + d * py + f;
    px = x;
  };
  // Burn-in removes the initial point's transient, including slow presets.
  for (let k = 0; k < 1024; k++) randomPoint();
  // A fixed point of the first map gives deterministic leaves an attractor point.
  const [a, b, c, d, e, f] = matrix[0];
  const determinant = (1 - a) * (1 - d) - b * c;
  const anchorX = ((1 - d) * e + b * f) / determinant;
  const anchorY = (c * e + (1 - a) * f) / determinant;
  const plot = (t: Affine<number>, x: number, y: number, out: number[]) => {
    const sx = width / 2 + t.x + t.a * x + t.b * y;
    const sy = height / 2 - t.y - t.c * x - t.d * y;
    if (sx >= 0 && sx < width && sy >= 0 && sy < height) {
      const index = Math.floor(sy) * stride + Math.floor(sx);
      if (!occupied[index]) out.push(sx, sy);
      occupied[index] = 1;
    }
    samples++;
  };
  return {
    get visited() {
      return visited;
    },
    get resolution() {
      return resolution;
    },
    get samples() {
      return samples;
    },
    get pending() {
      return large.length + small.length;
    },
    get tiles() {
      return tiles.length;
    },
    step(operations = 4000) {
      const points: number[] = [];
      for (let k = 0; k < operations; k++) {
        // Retry the complete viewport more coarsely instead of omitting late
        // branches when heavily overlapping addresses exceed the work budget.
        // Previously plotted points remain valid attractor samples.
        if (passVisits > 250000 || tiles.length > 6000) restartCoarser();
        if (small.length) {
          const t = small.pop()!;
          visited++;
          passVisits++;
          const cx = t.x + t.a * bounds.x + t.b * bounds.y;
          const cy = t.y + t.c * bounds.x + t.d * bounds.y;
          const rx = Math.abs(t.a) * bounds.rx + Math.abs(t.b) * bounds.ry;
          const ry = Math.abs(t.c) * bounds.rx + Math.abs(t.d) * bounds.ry;
          if (
            cx - rx > width / 2 + 1 ||
            cx + rx < -width / 2 - 1 ||
            cy - ry > height / 2 + 1 ||
            cy + ry < -height / 2 - 1
          )
            continue;
          if (covered(cx - rx, cy - ry, cx + rx, cy + ry)) continue;
          if (Math.max(rx, ry) * 2 <= resolution) {
            if (method === "chaos") {
              tiles.push(t);
              for (let j = 0; j < 24; j++) {
                randomPoint();
                plot(t, px, py, points);
              }
            } else plot(t, anchorX, anchorY, points);
            continue;
          }
          for (const [ra, rb, rc, rd, re, rf] of matrix) {
            small.push({
              a: t.a * ra + t.b * rc,
              b: t.a * rb + t.b * rd,
              c: t.c * ra + t.d * rc,
              d: t.c * rb + t.d * rd,
              x: t.x + t.a * re + t.b * rf,
              y: t.y + t.c * re + t.d * rf,
            });
          }
        } else if (large.length) {
          const t = large.pop()!;
          visited++;
          const cx = t.x + (t.a * bx + t.b * by) / one;
          const cy = t.y + (t.c * bx + t.d * by) / one;
          const rx = (abs(t.a) * brx + abs(t.b) * bry) / one;
          const ry = (abs(t.c) * brx + abs(t.d) * bry) / one;
          if (cx - rx > halfW || cx + rx < -halfW || cy - ry > halfH || cy + ry < -halfH) continue;
          // Query only clipped screen coordinates: enormous endpoints need
          // no float conversion and can still describe a fully covered line.
          const clipX = (v: bigint) => pixel(v < -halfW ? -halfW : v > halfW ? halfW : v);
          const clipY = (v: bigint) => pixel(v < -halfH ? -halfH : v > halfH ? halfH : v);
          if (covered(clipX(cx - rx), clipY(cy - ry), clipX(cx + rx), clipY(cy + ry))) continue;
          if (rx + ry <= halfSpan * BigInt(128)) {
            small.push({
              a: pixel(t.a),
              b: pixel(t.b),
              c: pixel(t.c),
              d: pixel(t.d),
              x: pixel(t.x),
              y: pixel(t.y),
            });
            continue;
          }
          for (const [ra, rb, rc, rd, re, rf] of rules) {
            large.push({
              a: (t.a * ra + t.b * rc) / DENOMINATOR,
              b: (t.a * rb + t.b * rd) / DENOMINATOR,
              c: (t.c * ra + t.d * rc) / DENOMINATOR,
              d: (t.c * rb + t.d * rd) / DENOMINATOR,
              x: t.x + (t.a * re + t.b * rf) / DENOMINATOR,
              y: t.y + (t.c * re + t.d * rf) / DENOMINATOR,
            });
          }
        } else if (method === "chaos" && tiles.length) {
          const t = tiles[cursor++ % tiles.length];
          randomPoint();
          plot(t, px, py, points);
        } else break;
      }
      return points;
    },
  };
}
