import { finite, isRecord } from "./explorerShare";
import {
  fixedCosSinOf,
  fixedFromNumber,
  fixedPi,
  fixedToNumber,
  rescale,
} from "./lsystem/bigfixed";
import { MAX_ZOOM } from "./lsystem/zoom";
import type { NFlakeParams } from "./render/drawings/nFlake";
import { usesCenterPolygon } from "./render/drawings/nFlake";
import type { SierpinskiCarpetParams } from "./render/drawings/sierpinskiCarpet";
import type { TSquareParams } from "./render/drawings/tSquare";
import { VICSEK_OFFSETS, type VicsekFractal2DParams } from "./render/drawings/vicsekFractal2D";

export type RecursivePattern =
  | { kind: "carpet"; config: SierpinskiCarpetParams }
  | { kind: "vicsek"; config: VicsekFractal2DParams }
  | { kind: "flake"; config: NFlakeParams }
  | { kind: "tSquare"; config: TSquareParams };

export type PatternCamera = {
  x: bigint;
  y: bigint;
  bits: number;
  zoom: number;
  // Pixels per root unit, divided by the shorter viewport side. Frozen on
  // takeover so later generations never refit or pull the picture away.
  frame: number;
};

const ZERO = BigInt(0);
const ONE = BigInt(1);
const TWO = BigInt(2);
const THREE = BigInt(3);

export function initialPatternCamera(pattern: RecursivePattern): PatternCamera {
  let frame = pattern.kind === "carpet" ? 0.8 : pattern.kind === "flake" ? 0.42 : 0.84;
  if (pattern.kind === "tSquare") {
    const { ratio: r, iterations: n } = pattern.config;
    frame /= (1 - r ** n) / (1 - r) + r ** n;
  }
  return { x: ZERO, y: ZERO, bits: 96, zoom: 1, frame };
}

// Cursor anchoring and panning share the same fixed-point camera at every
// depth. Only the small, screen-sized motion is converted from a float.
export function movePatternCamera(
  camera: PatternCamera,
  width: number,
  height: number,
  factor: number,
  anchorX = 0,
  anchorY = 0,
  panX = 0,
  panY = 0,
): PatternCamera {
  const zoom = Math.min(MAX_ZOOM, Math.max(1, camera.zoom * factor));
  const oldScale = camera.frame * Math.min(width, height) * camera.zoom;
  const scale = camera.frame * Math.min(width, height) * zoom;
  const bits = Math.max(camera.bits, Math.ceil(Math.log2(scale)) + 96);
  return {
    ...camera,
    zoom,
    bits,
    x:
      rescale(camera.x, camera.bits, bits) +
      fixedFromNumber((anchorX - panX) / oldScale - anchorX / scale, bits),
    y:
      rescale(camera.y, camera.bits, bits) +
      fixedFromNumber((anchorY - panY) / oldScale - anchorY / scale, bits),
  };
}

export function restorePatternCamera(saved: unknown): PatternCamera {
  if (
    !isRecord(saved) ||
    !finite(saved.zoom, 1, MAX_ZOOM) ||
    !finite(saved.frame, 0.01, 1) ||
    !finite(saved.bits, 96, 2048) ||
    !Number.isInteger(saved.bits) ||
    saved.bits < Math.ceil(Math.log2(saved.zoom)) + 64 ||
    typeof saved.x !== "string" ||
    !/^-?\d{1,700}$/.test(saved.x) ||
    typeof saved.y !== "string" ||
    !/^-?\d{1,700}$/.test(saved.y)
  )
    throw new Error("Invalid pattern view");
  const x = BigInt(saved.x);
  const y = BigInt(saved.y);
  const limit = fixedFromNumber(1e6, saved.bits);
  if (x < -limit || x > limit || y < -limit || y > limit) throw new Error("Invalid pattern center");
  return { x, y, bits: saved.bits, zoom: saved.zoom, frame: saved.frame };
}

export type PatternModel = {
  bits: number;
  one: bigint;
  ratio: bigint;
  children: [bigint, bigint][];
  // Square corner or polygon vertex coordinates in root units.
  vertices: [bigint, bigint][];
  reach: bigint;
  mode: "holes" | "leaves" | "all";
};

export function patternModel(pattern: RecursivePattern, bits: number): PatternModel {
  const one = ONE << BigInt(bits);
  const half = one / TWO;
  const square: [bigint, bigint][] = [
    [-half, -half],
    [half, -half],
    [half, half],
    [-half, half],
  ];
  if (pattern.kind === "flake") {
    const { sides, rotation, includeCenter } = pattern.config;
    const pi = fixedPi(bits);
    let sum = one;
    for (let k = 1; k <= Math.floor(sides / 4); k++)
      sum += fixedCosSinOf((TWO * pi * BigInt(k)) / BigInt(sides), bits)[0];
    const ratio = (one * one) / (TWO * sum);
    const vertices: [bigint, bigint][] = [];
    for (let k = 0; k < sides; k++) {
      const angle =
        (fixedFromNumber(rotation + (sides === 4 ? 45 : 0), bits) * pi) / (BigInt(180) * one) -
        pi / TWO +
        (TWO * pi * BigInt(k)) / BigInt(sides);
      vertices.push(fixedCosSinOf(angle, bits));
    }
    const children: [bigint, bigint][] = vertices.map(([x, y]) => [
      (x * (one - ratio)) / one,
      (y * (one - ratio)) / one,
    ]);
    if (usesCenterPolygon(sides, includeCenter)) children.push([ZERO, ZERO]);
    return { bits, one, ratio, vertices, children, reach: one, mode: "leaves" };
  }
  if (pattern.kind === "tSquare") {
    const ratio = fixedFromNumber(pattern.config.ratio, bits);
    return {
      bits,
      one,
      ratio,
      vertices: square,
      children: square,
      reach: (half * one) / (one - ratio),
      mode: "all",
    };
  }
  const offsets =
    pattern.kind === "vicsek"
      ? VICSEK_OFFSETS[pattern.config.variant]
      : [
          [0, 0],
          [1, 0],
          [2, 0],
          [0, 1],
          [2, 1],
          [0, 2],
          [1, 2],
          [2, 2],
        ];
  const children: [bigint, bigint][] = offsets.map(([x, y]) => [
    (BigInt(x - 1) * one) / THREE,
    (BigInt(y - 1) * one) / THREE,
  ]);
  return {
    bits,
    one,
    ratio: one / THREE,
    vertices: square,
    children,
    reach: half,
    mode: pattern.kind === "carpet" ? "holes" : "leaves",
  };
}

export type PatternGeometry = {
  // Clipped polygons grouped by generation; carpet group -1 is its solid base.
  paths: Map<number, number[][]>;
  generation: number;
  visited: number;
  limited: boolean;
};

// A new carpet generation starts with two-pixel holes. Reveal them over one
// factor-of-three zoom interval, so crossing a depth boundary adds no contrast.
// The selected finite construction stays opaque; only automatic detail fades.
export function carpetDetailOpacity(
  iterations: number,
  camera: PatternCamera,
  width: number,
  height: number,
  depth: number,
): number {
  if (depth < iterations) return 1;
  const smooth = (value: number) => {
    const t = Math.max(0, Math.min(1, value));
    return t * t * (3 - 2 * t);
  };
  // Log space avoids overflow/underflow when the root is hundreds of orders
  // larger than a hole. Camera precision itself remains fixed point.
  const holePixels = Math.exp(
    Math.log(camera.frame * Math.min(width, height)) +
      Math.log(camera.zoom) -
      (depth + 1) * Math.log(3),
  );
  return smooth((holePixels - 2) / 4) * smooth((camera.zoom - 1) / 0.2);
}

// Clip after converting exact, view-relative vertices. Square edges stay
// axis-aligned even when their corners are hundreds of orders apart.
function clipPolygon(input: number[], width: number, height: number): number[] {
  let points = input;
  for (const [axis, edge, sign] of [
    [0, -4, 1],
    [0, width + 4, -1],
    [1, -4, 1],
    [1, height + 4, -1],
  ]) {
    const next: number[] = [];
    for (let i = 0; i < points.length; i += 2) {
      const j = (i + 2) % points.length;
      const a = [points[i], points[i + 1]];
      const b = [points[j], points[j + 1]];
      const insideA = sign * (a[axis] - edge) >= 0;
      const insideB = sign * (b[axis] - edge) >= 0;
      if (insideA) next.push(...a);
      if (insideA !== insideB) {
        const t = (edge - a[axis]) / (b[axis] - a[axis]);
        const p = [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])];
        p[axis] = edge;
        next.push(...p);
      }
    }
    points = next;
  }
  return points;
}

export function buildPatternGeometry(
  pattern: RecursivePattern,
  camera: PatternCamera,
  width: number,
  height: number,
  model = patternModel(pattern, camera.bits),
  generationLimit = Number.POSITIVE_INFINITY,
): PatternGeometry {
  const { one, ratio, children, reach, mode } = model;
  const scale = camera.frame * Math.min(width, height) * camera.zoom;
  const bits = camera.bits;
  const mul = (a: bigint, b: bigint) => (a * b) / one;
  const pixel = (n: bigint) => fixedToNumber(n, bits) * scale;
  const halfW = fixedFromNumber((width / 2 + 8) / scale, bits);
  const halfH = fixedFromNumber((height / 2 + 8) / scale, bits);
  const growth = Math.log(1 / fixedToNumber(ratio, bits));
  const generation = Math.min(
    generationLimit,
    camera.zoom > 1
      ? Math.max(pattern.config.iterations, Math.ceil(Math.log(scale / 6) / growth))
      : pattern.config.iterations,
  );
  const result: PatternGeometry = { paths: new Map(), generation, visited: 0, limited: false };
  const solidSquares: [bigint, bigint, bigint, bigint][] = [];
  const skipCovered =
    camera.zoom > 1 &&
    pattern.kind === "tSquare" &&
    pattern.config.fillSquares &&
    !pattern.config.strokeSquares;
  const add = (x: bigint, y: bigint, size: bigint, depth: number) => {
    let polygon: number[];
    if (pattern.kind !== "flake") {
      // Clip squares in fixed point first. Float clipping enormous rectangles
      // loses the opposite edge through cancellation at deep zoom.
      const half = size / TWO;
      const left = x - half < -halfW ? -halfW : x - half;
      const right = x + half > halfW ? halfW : x + half;
      const top = y - half < -halfH ? -halfH : y - half;
      const bottom = y + half > halfH ? halfH : y + half;
      if (right <= left || bottom <= top) return;
      polygon = [
        pixel(left) + width / 2,
        pixel(top) + height / 2,
        pixel(right) + width / 2,
        pixel(top) + height / 2,
        pixel(right) + width / 2,
        pixel(bottom) + height / 2,
        pixel(left) + width / 2,
        pixel(bottom) + height / 2,
      ];
    } else {
      polygon = clipPolygon(
        model.vertices.flatMap(([vx, vy]) => [
          pixel(x + mul(vx, size)) + width / 2,
          pixel(y + mul(vy, size)) + height / 2,
        ]),
        width,
        height,
      );
    }
    if (!polygon.length) return;
    const group = result.paths.get(depth) ?? [];
    group.push(polygon);
    result.paths.set(depth, group);
  };
  // Exact arithmetic is needed to locate a deep viewport, not to subdivide
  // screen-sized squares. Descend in fixed point until local coordinates fit
  // comfortably on screen, then carve the visible carpet using ordinary pixels.
  const carvePixels = (x: number, y: number, size: number, depth: number) => {
    if (result.limited) return;
    const half = size / 2;
    if (x - half > width + 8 || x + half < -8 || y - half > height + 8 || y + half < -8) return;
    if (++result.visited > 120000) {
      result.limited = true;
      return;
    }
    const square = (length: number, groupDepth: number) => {
      const h = length / 2;
      const left = Math.max(-8, x - h);
      const right = Math.min(width + 8, x + h);
      const top = Math.max(-8, y - h);
      const bottom = Math.min(height + 8, y + h);
      if (right <= left || bottom <= top) return;
      const group = result.paths.get(groupDepth) ?? [];
      group.push([left, top, right, top, right, bottom, left, bottom]);
      result.paths.set(groupDepth, group);
    };
    if (depth === 0) square(size, -1);
    if (depth >= generation || size < 2) return;
    const third = size / 3;
    square(third, depth);
    // Leaves contain no further holes. Avoid visiting all eight just to stop.
    if (depth + 1 >= generation || third < 2) return;
    for (let row = -1; row <= 1; row++)
      for (let column = -1; column <= 1; column++)
        if (row !== 0 || column !== 0)
          carvePixels(x + column * third, y + row * third, third, depth + 1);
  };
  const walk = (x: bigint, y: bigint, size: bigint, depth: number) => {
    if (result.limited) return;
    const radius = mul(size, reach);
    if (x - radius > halfW || x + radius < -halfW || y - radius > halfH || y + radius < -halfH)
      return;
    if (mode === "holes" && pixel(size) <= Math.max(width, height) * 4) {
      carvePixels(pixel(x) + width / 2, pixel(y) + height / 2, pixel(size), depth);
      return;
    }
    // T-square descendants overlap their parents. Filled subtrees hidden
    // inside an ancestor contribute no pixels, even millions of levels in.
    if (
      skipCovered &&
      solidSquares.some(
        ([l, t, r, b]) => x - radius >= l && x + radius <= r && y - radius >= t && y + radius <= b,
      )
    )
      return;
    if (++result.visited > 120000) {
      result.limited = true;
      return;
    }
    const leaf = depth >= generation || pixel(size) < 2;
    if (mode === "all" || (mode === "leaves" && leaf)) add(x, y, size, depth);
    if (mode === "holes") {
      if (depth === 0) add(x, y, size, -1);
      if (!leaf) add(x, y, size / THREE, depth);
    }
    if (leaf || result.limited) return;
    const half = size / TWO;
    if (
      skipCovered &&
      x - half <= -halfW &&
      x + half >= halfW &&
      y - half <= -halfH &&
      y + half >= halfH
    )
      return;
    if (skipCovered) solidSquares.push([x - half, y - half, x + half, y + half]);
    const childSize = mul(size, ratio);
    for (const [dx, dy] of children)
      walk(x + mul(dx, size), y + mul(dy, size), childSize, depth + 1);
    if (skipCovered) solidSquares.pop();
  };
  walk(-camera.x, -camera.y, one, 0);
  if (result.limited && generation > 0) {
    // Dense overlapping variants can exceed the budget even after culling.
    // Retry the whole view more coarsely so no branch disappears halfway
    // across the screen when the budget is reached.
    const coarser = buildPatternGeometry(
      pattern,
      camera,
      width,
      height,
      model,
      Math.max(0, generation - Math.max(1, Math.ceil(generation / 8))),
    );
    coarser.limited = true;
    return coarser;
  }
  return result;
}
