import { fixedCosSinOf, fixedFromNumber, fixedPi, fixedToNumber } from "./lsystem/bigfixed";
import type { PatternCamera } from "./recursiveZoom";
import type { FractalCanopyParams } from "./render/drawings/fractalCanopy";

// Headings are integer multiples of half the branch angle. Memoizing them
// finds exact finite bounds without enumerating the exponentially many twigs.
export function canopyFrame(config: FractalCanopyParams, width: number, height: number) {
  const n = config.iterations;
  const r = config.lengthFactor;
  let growth = 0;
  for (let i = 1; i <= n; i++) growth += r ** i;
  const base = Math.min(
    (height * 0.95) / (1 + growth),
    growth ? (width * 0.9) / (2 * growth) : Infinity,
  );
  const memo = new Map<string, number[]>();
  const bounds = (depth: number, heading: number): number[] => {
    const key = `${depth}:${heading}`;
    const cached = memo.get(key);
    if (cached) return cached;
    const angle = (heading * config.angle * Math.PI) / 360;
    const x = Math.sin(angle) * r ** depth;
    const y = -Math.cos(angle) * r ** depth;
    const radius = (config.rootWidth * config.widthFactor ** depth) / base / 2;
    const box =
      radius > 0
        ? [
            Math.min(0, x) - radius,
            Math.min(0, y) - radius,
            Math.max(0, x) + radius,
            Math.max(0, y) + radius,
          ]
        : [Infinity, Infinity, -Infinity, -Infinity];
    if (depth < n && r > 0) {
      for (let i = 0; i < config.branches; i++) {
        const child = bounds(depth + 1, heading + config.branches - 1 - 2 * i);
        box[0] = Math.min(box[0], x + child[0]);
        box[1] = Math.min(box[1], y + child[1]);
        box[2] = Math.max(box[2], x + child[2]);
        box[3] = Math.max(box[3], y + child[3]);
      }
    }
    memo.set(key, box);
    return box;
  };
  const [minX, minY, maxX, maxY] = bounds(0, 0);
  const scale = Math.min(base, (width * 0.9) / (maxX - minX), (height * 0.9) / (maxY - minY));
  const bits = 96;
  return {
    base,
    camera: {
      x: fixedFromNumber((minX + maxX) / 2, bits),
      y: fixedFromNumber((minY + maxY) / 2, bits),
      bits,
      zoom: 1,
      frame: scale / Math.min(width, height),
    } satisfies PatternCamera,
  };
}

export type CanopyGeometry = {
  levels: Map<number, { width: number; lines: number[][] }>;
  generation: number;
  visited: number;
  limited: boolean;
};

// Traverse only subtrees whose entire remaining reach intersects the view.
// All branch endpoints and camera subtraction stay fixed-point at deep zoom.
export function buildCanopyGeometry(
  config: FractalCanopyParams,
  camera: PatternCamera,
  width: number,
  height: number,
  generationLimit = Infinity,
): CanopyGeometry {
  const bits = camera.bits;
  const one = BigInt(1) << BigInt(bits);
  const mul = (a: bigint, b: bigint) => (a * b) / one;
  const r = config.lengthFactor;
  const ratio = fixedFromNumber(r, bits);
  const scale = camera.frame * Math.min(width, height) * camera.zoom;
  const pixel = (x: bigint) => fixedToNumber(x, bits) * scale;
  const generation = Math.min(
    generationLimit,
    camera.zoom > 1 && r > 0 && r < 1
      ? Math.max(config.iterations, Math.min(2048, Math.ceil(Math.log(scale / 2) / -Math.log(r))))
      : config.iterations,
  );
  const result: CanopyGeometry = { levels: new Map(), generation, visited: 0, limited: false };
  const halfW = fixedFromNumber(width / 2 / scale, bits);
  const halfH = fixedFromNumber(height / 2 / scale, bits);
  const pi = fixedPi(bits);
  const angle = mul(fixedFromNumber(config.angle / 360, bits), pi);
  const directions = new Map<number, [bigint, bigint]>();
  const opening = canopyFrame(config, width, height);
  const added = r > 0 && r < 1 ? Math.log(camera.zoom) / -Math.log(r) : 0;
  const strokeScale = (opening.camera.frame * Math.min(width, height)) / opening.base;
  const strokeWidth = (depth: number) =>
    Math.min(
      4 * Math.max(width, height),
      config.rootWidth * strokeScale * config.widthFactor ** Math.max(0, depth - added),
    );
  const direction = (heading: number) => {
    let pair = directions.get(heading);
    if (!pair) {
      let a = (angle * BigInt(heading)) % (pi * BigInt(2));
      if (a > pi) a -= pi * BigInt(2);
      if (a < -pi) a += pi * BigInt(2);
      const [cos, sin] = fixedCosSinOf(a, bits);
      pair = [sin, -cos];
      directions.set(heading, pair);
    }
    return pair;
  };
  const walk = (x: bigint, y: bigint, len: bigint, heading: number, depth: number) => {
    if (result.limited) return;
    if (++result.visited > 60000) {
      result.limited = true;
      return;
    }
    // Keep ink legible as new generations appear, like the curve explorers.
    // Stroke width is a screen style, separate from the branch geometry.
    const screenWidth = strokeWidth(depth);
    const lineWidth = screenWidth / scale;
    // Include descendant stroke width even when strokes grow toward the tips.
    const radius = fixedFromNumber(Math.max(lineWidth, strokeWidth(generation) / scale) / 2, bits);
    const reach =
      (r < 1
        ? mul(len, fixedFromNumber(1 / (1 - r), bits))
        : len * BigInt(generation - depth + 1)) + radius;
    if (x - reach > halfW || x + reach < -halfW || y - reach > halfH || y + reach < -halfH) return;
    const [dx, dy] = direction(heading);
    const endX = x + mul(dx, len);
    const endY = y + mul(dy, len);
    const tail = reach - len;
    const left = x < endX - tail ? x : endX - tail;
    const right = x > endX + tail ? x : endX + tail;
    const top = y < endY - tail ? y : endY - tail;
    const bottom = y > endY + tail ? y : endY + tail;
    if (
      left - radius > halfW ||
      right + radius < -halfW ||
      top - radius > halfH ||
      bottom + radius < -halfH
    )
      return;
    if (lineWidth > 0) {
      // Clip in fixed point, before converting to screen coordinates. This
      // avoids catastrophic cancellation on branches spanning huge distances.
      let low = BigInt(0),
        high = one;
      const padX = halfW + fixedFromNumber(lineWidth / 2, bits);
      const padY = halfH + fixedFromNumber(lineWidth / 2, bits);
      for (const [a, b, edge] of [
        [x, endX, padX],
        [y, endY, padY],
      ]) {
        const delta = b - a;
        if (delta === BigInt(0)) {
          if (a < -edge || a > edge) high = -one;
        } else {
          let t0 = ((-edge - a) * one) / delta;
          let t1 = ((edge - a) * one) / delta;
          if (t0 > t1) [t0, t1] = [t1, t0];
          low = low > t0 ? low : t0;
          high = high < t1 ? high : t1;
        }
      }
      if (low <= high) {
        const level = result.levels.get(depth) ?? { width: screenWidth, lines: [] };
        level.lines.push([
          width / 2 + pixel(x + mul(endX - x, low)),
          height / 2 + pixel(y + mul(endY - y, low)),
          width / 2 + pixel(x + mul(endX - x, high)),
          height / 2 + pixel(y + mul(endY - y, high)),
        ]);
        result.levels.set(depth, level);
      }
    }
    if (depth >= generation || pixel(len) < 1 || r === 0) return;
    const headings = new Set<number>();
    for (let i = 0; i < config.branches; i++) {
      const childHeading = config.angle === 0 ? 0 : heading + config.branches - 1 - 2 * i;
      if (camera.zoom > 1 && headings.has(childHeading)) continue;
      headings.add(childHeading);
      walk(endX, endY, mul(len, ratio), childHeading, depth + 1);
    }
  };
  walk(-camera.x, -camera.y, one, 0, 0);
  if (result.limited && generation > 0) {
    // Retry a complete coarser tree, never leave half the branches missing.
    const coarser = buildCanopyGeometry(config, camera, width, height, Math.max(0, generation - 1));
    coarser.limited = true;
    return coarser;
  }
  return result;
}
