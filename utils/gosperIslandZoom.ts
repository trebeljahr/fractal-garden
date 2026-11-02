import { latticeTint, SEVEN_ISLANDS } from "./gosperIsland";
import { fixedFromNumber, fixedToNumber } from "./lsystem/bigfixed";
import type { GosperIslandParams } from "./render/drawings/turtleCurves";

type Camera = { x: bigint; y: bigint; bits: number; zoom: number; frame: number };
type ClipPolygon = (input: number[], width: number, height: number) => number[];

export type IslandGeometry = {
  // Clipped coastlines grouped by tint. Everything is in canvas pixels, y down.
  paths: Map<number, number[][]>;
  generation: number;
  visited: number;
};

const SQRT3 = Math.sqrt(3);
const GROWTH = Math.log(Math.sqrt(7));
// A coastline stays within this many chord lengths of its chord's middle.
const COAST_SPREAD = 0.55;
// An island stays within this distance of its center, in hexagon sides.
const ISLAND_REACH = 1.13;
const MIN_SEGMENT_PIXELS = 1.5;
const VIEW_MARGIN = 8;
const MAX_VISITED = 600000;
// Below this length, chords near the view fit comfortably in ordinary numbers.
const FIXED_POINT_FACTOR = 4;

const BIG_2 = BigInt(2);
const BIG_3 = BigInt(3);
const BIG_5 = BigInt(5);
const BIG_7 = BigInt(7);
const BIG_14 = BigInt(14);

function fixedSqrt3(bits: number) {
  const target = BIG_3 << BigInt(2 * bits);
  let root = fixedFromNumber(SQRT3, bits);
  for (let i = 0; i < 64; i++) {
    const next = (root + target / root) / BIG_2;
    if (next === root) break;
    root = next;
  }
  return root;
}

const sqrt3Cache = new Map<number, bigint>();
function cachedSqrt3(bits: number) {
  let value = sqrt3Cache.get(bits);
  if (value === undefined) {
    value = fixedSqrt3(bits);
    if (sqrt3Cache.size > 8) sqrt3Cache.clear();
    sqrt3Cache.set(bits, value);
  }
  return value;
}

function visibleTiles(
  view: GosperIslandParams["view"],
  centerX: number,
  centerY: number,
  halfWidth: number,
  halfHeight: number,
) {
  if (view === "one") return [[0, 0]];
  if (view === "seven") return SEVEN_ISLANDS;
  const tiles: number[][] = [];
  const middleA = Math.round(centerX / 1.5);
  const spanA = Math.ceil(halfWidth / 1.5) + 2;
  const spanB = Math.ceil(halfHeight / SQRT3) + 2;
  for (let a = middleA - spanA; a <= middleA + spanA; a++) {
    const middleB = Math.round(-centerY / SQRT3 - a / 2);
    for (let b = middleB - spanB; b <= middleB + spanB; b++) tiles.push([a, b]);
  }
  return tiles;
}

/**
 * Coastlines refined only where they can be seen. A stretch of coast whose whole
 * bend lies off screen stays one straight chord, which keeps fills correct and
 * the work bounded at any depth. Each zoom factor of √7 adds one more round.
 */
export function buildIslandGeometry(
  config: GosperIslandParams,
  camera: Camera,
  width: number,
  height: number,
  clipPolygon: ClipPolygon,
): IslandGeometry {
  const { bits } = camera;
  const scale = camera.frame * Math.min(width, height) * camera.zoom;
  const generation =
    camera.zoom > 1
      ? Math.max(config.iterations, Math.ceil(Math.log(scale / MIN_SEGMENT_PIXELS) / GROWTH))
      : config.iterations;
  const result: IslandGeometry = { paths: new Map(), generation, visited: 0 };
  const shift = BigInt(bits);
  const one = BigInt(1) << shift;
  const sqrt3 = cachedSqrt3(bits);
  const middleX = width / 2;
  const middleY = height / 2;
  const toPixels = (value: bigint) => fixedToNumber(value, bits) * scale;
  const fixedLimit = Math.max(width, height) * FIXED_POINT_FACTOR;

  const offView = (x: number, y: number, radius: number) =>
    x + radius < -VIEW_MARGIN ||
    x - radius > width + VIEW_MARGIN ||
    y + radius < -VIEW_MARGIN ||
    y - radius > height + VIEW_MARGIN;

  // Pixel positions keep every digit that matters once a chord fits on screen.
  const refinePixels = (
    ax: number,
    ay: number,
    bx: number,
    by: number,
    depth: number,
    out: number[],
  ) => {
    const dx = bx - ax;
    const dy = by - ay;
    const length = Math.hypot(dx, dy);
    if (
      depth >= generation ||
      length < MIN_SEGMENT_PIXELS ||
      ++result.visited > MAX_VISITED ||
      offView((ax + bx) / 2, (ay + by) / 2, length * COAST_SPREAD)
    ) {
      out.push(bx, by);
      return;
    }
    // With y down, the first line is the chord times (5 - i√3) / 14, the second
    // the chord times (2 + i√3) / 7, and the third repeats the first.
    const firstX = ax + (5 * dx + SQRT3 * dy) / 14;
    const firstY = ay + (5 * dy - SQRT3 * dx) / 14;
    const secondX = firstX + (2 * dx - SQRT3 * dy) / 7;
    const secondY = firstY + (2 * dy + SQRT3 * dx) / 7;
    refinePixels(ax, ay, firstX, firstY, depth + 1, out);
    refinePixels(firstX, firstY, secondX, secondY, depth + 1, out);
    refinePixels(secondX, secondY, bx, by, depth + 1, out);
  };

  // Coordinates are measured from the camera, so deep views lose no digits.
  const refine = (ax: bigint, ay: bigint, bx: bigint, by: bigint, depth: number, out: number[]) => {
    const dx = bx - ax;
    const dy = by - ay;
    const pixelDx = toPixels(dx);
    const pixelDy = toPixels(dy);
    const length = Math.hypot(pixelDx, pixelDy);
    if (length <= fixedLimit) {
      refinePixels(
        toPixels(ax) + middleX,
        toPixels(ay) + middleY,
        toPixels(bx) + middleX,
        toPixels(by) + middleY,
        depth,
        out,
      );
      return;
    }
    if (
      depth >= generation ||
      ++result.visited > MAX_VISITED ||
      offView(
        toPixels((ax + bx) / BIG_2) + middleX,
        toPixels((ay + by) / BIG_2) + middleY,
        length * COAST_SPREAD,
      )
    ) {
      out.push(toPixels(bx) + middleX, toPixels(by) + middleY);
      return;
    }
    const rootDx = (sqrt3 * dx) >> shift;
    const rootDy = (sqrt3 * dy) >> shift;
    const firstX = ax + (BIG_5 * dx + rootDy) / BIG_14;
    const firstY = ay + (BIG_5 * dy - rootDx) / BIG_14;
    const secondX = firstX + (BIG_2 * dx - rootDy) / BIG_7;
    const secondY = firstY + (BIG_2 * dy + rootDx) / BIG_7;
    refine(ax, ay, firstX, firstY, depth + 1, out);
    refine(firstX, firstY, secondX, secondY, depth + 1, out);
    refine(secondX, secondY, bx, by, depth + 1, out);
  };

  const half = one / BIG_2;
  const rootHalf = sqrt3 / BIG_2;
  const corners: [bigint, bigint][] = [
    [one, BigInt(0)],
    [half, -rootHalf],
    [-half, -rootHalf],
    [-one, BigInt(0)],
    [-half, rootHalf],
    [half, rootHalf],
  ];
  const tiles = visibleTiles(
    config.view,
    fixedToNumber(camera.x, bits),
    fixedToNumber(camera.y, bits),
    (width / 2 + VIEW_MARGIN) / scale,
    (height / 2 + VIEW_MARGIN) / scale,
  );
  for (const [a, b] of tiles) {
    const centerX = (BIG_3 * BigInt(a) * one) / BIG_2 - camera.x;
    const centerY = -(sqrt3 * BigInt(2 * b + a)) / BIG_2 - camera.y;
    if (offView(toPixels(centerX) + middleX, toPixels(centerY) + middleY, ISLAND_REACH * scale))
      continue;
    const outline: number[] = [
      toPixels(centerX + corners[0][0]) + middleX,
      toPixels(centerY + corners[0][1]) + middleY,
    ];
    corners.forEach(([x, y], index) => {
      const [nextX, nextY] = corners[(index + 1) % corners.length];
      refine(centerX + x, centerY + y, centerX + nextX, centerY + nextY, 0, outline);
    });
    // The last point repeats the first; the path closes itself.
    outline.length -= 2;
    const polygon = clipPolygon(outline, width, height);
    if (!polygon.length) continue;
    const tint = latticeTint(a, b);
    const group = result.paths.get(tint) ?? [];
    group.push(polygon);
    result.paths.set(tint, group);
  }
  return result;
}
