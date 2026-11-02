import {
  type DeepViewport,
  fixedOffset,
  fixedToFloatExp,
  rescaleFixed,
  viewportDelta,
  zoomViewport,
} from "./deepZoom/math";

export const FERN_TILE_SIZE = 64;
/** Most dots per screen pixel a tile keeps once it is finer than the screen. */
const FERN_DENSITY = 2;
/** WebGL caps attribute stride at 255 bytes, which is 16 points as a power of two. */
const FERN_MAX_STRIDE = 16;
/** Camera offsets stay subpixel in fernPointTransform's float32 mantissa within this reach. */
const FERN_FRAME_REACH = 2 ** 14;
export type FernPointView = { view: DeepViewport; width: number; height: number };
type FernFrame = FernPointView & { epoch: number };
export type FernPointTile = FernPointView & {
  id: number;
  epoch: number;
  x: number;
  y: number;
  count: number;
  points: Float64Array;
  fixed?: { x: bigint[]; y: bigint[] };
  occupied?: Uint8Array;
};
export type FernPointAppend = Omit<FernPointTile, "points" | "fixed" | "occupied"> & {
  start: number;
  points: Float64Array;
};

/** Pixel coordinates of the camera center in a batch's original sampling frame. */
export function fernPointTransform(
  source: FernPointView & { x: number; y: number },
  target: FernPointView,
) {
  const delta = viewportDelta(target.view, source.view);
  const sourceSide = Math.min(source.width, source.height);
  const pixels = ([m, e]: [number, number]) =>
    m === 0 ? 0 : (m * 2 ** (e - source.view.logZoom) * sourceSide) / 2;
  return {
    centerX: source.width / 2 + pixels(delta.x) - source.x,
    centerY: source.height / 2 - pixels(delta.y) - source.y,
    scale:
      (Math.min(target.width, target.height) / sourceSide) *
      2 ** (source.view.logZoom - target.view.logZoom),
  };
}

/**
 * A tile that shrank on screen draws a nested subset of its points. Dots per
 * pixel fall with its size, so a densely sampled old view fades into the sparser
 * dots around it instead of staying a bright rectangle. A tile at its own zoom
 * level stays above half size, so even a full one keeps every point.
 */
export function fernTileLod(count: number, scale: number) {
  const density = Math.min(FERN_DENSITY, 2 * FERN_DENSITY * scale);
  const wanted = Math.max(1, density * (FERN_TILE_SIZE * scale) ** 2);
  const stride = Math.min(FERN_MAX_STRIDE, 2 ** Math.max(0, Math.floor(Math.log2(count / wanted))));
  return {
    stride,
    count: Math.ceil(stride < FERN_MAX_STRIDE ? count / stride : Math.min(count / stride, wanted)),
  };
}

export function fernTileIntersects(tile: FernPointTile, target: FernPointView) {
  const bits = Math.max(tile.view.bits, target.view.bits);
  const side = Math.min(tile.width, tile.height),
    targetSide = Math.min(target.width, target.height);
  const cx =
    rescaleFixed(tile.view.x, tile.view.bits, bits) -
    rescaleFixed(target.view.x, target.view.bits, bits);
  const cy =
    rescaleFixed(tile.view.y, tile.view.bits, bits) -
    rescaleFixed(target.view.y, target.view.bits, bits);
  const hw = fixedOffset(target.width / targetSide, target.view.logZoom, bits);
  const hh = fixedOffset(target.height / targetSide, target.view.logZoom, bits);
  const left = cx + fixedOffset((2 * tile.x - tile.width) / side, tile.view.logZoom, bits);
  const right =
    cx + fixedOffset((2 * (tile.x + FERN_TILE_SIZE) - tile.width) / side, tile.view.logZoom, bits);
  const top = cy + fixedOffset((tile.height - 2 * tile.y) / side, tile.view.logZoom, bits);
  const bottom =
    cy + fixedOffset((tile.height - 2 * (tile.y + FERN_TILE_SIZE)) / side, tile.view.logZoom, bits);
  return right >= -hw && left <= hw && top >= -hh && bottom <= hh;
}

/** Exact rebasing is only needed when an old tile is too magnified for float32. */
export function projectFernTile(tile: FernPointTile, target: FernPointView) {
  const transform = fernPointTransform(tile, target);
  const precise = !Number.isFinite(transform.scale) || transform.scale > 512;
  if (precise && !tile.fixed) {
    const x: bigint[] = [],
      y: bigint[] = [],
      side = Math.min(tile.width, tile.height);
    for (let i = 0; i < tile.count; i++) {
      x.push(
        tile.view.x +
          fixedOffset(
            (2 * (tile.x + tile.points[i * 2]) - tile.width) / side,
            tile.view.logZoom,
            tile.view.bits,
          ),
      );
      y.push(
        tile.view.y +
          fixedOffset(
            (tile.height - 2 * (tile.y + tile.points[i * 2 + 1])) / side,
            tile.view.logZoom,
            tile.view.bits,
          ),
      );
    }
    tile.fixed = { x, y };
  }
  // Tiles can receive another append after their first exact projection.
  if (precise && tile.fixed && tile.fixed.x.length < tile.count) {
    tile.fixed = undefined;
    return projectFernTile(tile, target);
  }
  const bits = Math.max(tile.view.bits, target.view.bits);
  const targetX = rescaleFixed(target.view.x, target.view.bits, bits),
    targetY = rescaleFixed(target.view.y, target.view.bits, bits);
  const pixels = (n: bigint) => {
    const [m, e] = fixedToFloatExp(n, bits);
    return m === 0
      ? 0
      : (m * 2 ** (e - target.view.logZoom) * Math.min(target.width, target.height)) / 2;
  };
  const points: number[] = [];
  const lod = fernTileLod(tile.count, transform.scale);
  for (let n = 0, i = 0; n < lod.count; n++, i += lod.stride) {
    const x = precise
      ? target.width / 2 + pixels(rescaleFixed(tile.fixed!.x[i], tile.view.bits, bits) - targetX)
      : target.width / 2 + (tile.points[i * 2] - transform.centerX) * transform.scale;
    const y = precise
      ? target.height / 2 - pixels(rescaleFixed(tile.fixed!.y[i], tile.view.bits, bits) - targetY)
      : target.height / 2 + (tile.points[i * 2 + 1] - transform.centerY) * transform.scale;
    if (x >= 0 && x < target.width && y >= 0 && y < target.height) points.push(x, y);
  }
  return new Float32Array(points);
}

/**
 * Append-only spatial batches: a viewport change never resamples existing points.
 * Each octave shares one coordinate frame, so every view at that scale extends
 * the same tiles and keeps at most one point per frame pixel.
 */
export class FernPointCloud {
  readonly tiles = new Map<number, FernPointTile>();
  private cells = new Map<string, FernPointTile>();
  private frames = new Map<string, FernFrame>();
  private sequence = 0;
  private epochs = 0;
  private openingEpoch: number | null = null;
  count = 0;

  private frame(source: FernPointView) {
    const logZoom = Math.floor(source.view.logZoom);
    const key = `${logZoom}:${Math.min(source.width, source.height)}`;
    const known = this.frames.get(key);
    if (known) {
      const { centerX, centerY } = fernPointTransform({ ...known, x: 0, y: 0 }, source);
      const reach = Math.max(
        Math.abs(centerX - known.width / 2),
        Math.abs(centerY - known.height / 2),
      );
      if (reach < FERN_FRAME_REACH) return known;
    }
    const frame = {
      view: zoomViewport(source.view, logZoom),
      width: source.width,
      height: source.height,
      epoch: ++this.epochs,
    };
    this.frames.set(key, frame);
    return frame;
  }

  append(source: FernPointView, points: number[]): FernPointAppend[] {
    if (!points.length) return [];
    const changed = new Map<FernPointTile, number>();
    const frame = this.frame(source);
    const { centerX, centerY, scale } = fernPointTransform({ ...frame, x: 0, y: 0 }, source);
    this.openingEpoch ??= frame.epoch;
    for (let i = 0; i < points.length; i += 2) {
      if (points[i] < 0 || points[i] >= source.width) continue;
      if (points[i + 1] < 0 || points[i + 1] >= source.height) continue;
      const x = centerX + (points[i] - source.width / 2) / scale,
        y = centerY + (points[i + 1] - source.height / 2) / scale;
      const tx = Math.floor(x / FERN_TILE_SIZE) * FERN_TILE_SIZE,
        ty = Math.floor(y / FERN_TILE_SIZE) * FERN_TILE_SIZE;
      const key = `${frame.epoch}:${tx}:${ty}`;
      let tile = this.cells.get(key);
      if (!tile) {
        tile = {
          ...frame,
          x: tx,
          y: ty,
          id: ++this.sequence,
          count: 0,
          points: new Float64Array(FERN_TILE_SIZE ** 2 * 2),
          occupied: new Uint8Array(FERN_TILE_SIZE ** 2),
        };
        this.cells.set(key, tile);
        this.tiles.set(tile.id, tile);
      }
      const cell = Math.floor(y - ty) * FERN_TILE_SIZE + Math.floor(x - tx);
      if (tile.occupied![cell]) continue;
      tile.occupied![cell] = 1;
      if (!changed.has(tile)) changed.set(tile, tile.count);
      tile.points[tile.count * 2] = x - tx;
      tile.points[tile.count * 2 + 1] = y - ty;
      tile.count++;
      this.count++;
    }
    return Array.from(changed, ([tile, start]) => ({
      id: tile.id,
      epoch: tile.epoch,
      view: tile.view,
      width: tile.width,
      height: tile.height,
      x: tile.x,
      y: tile.y,
      start,
      count: tile.count,
      points: tile.points.slice(start * 2, tile.count * 2),
    }));
  }

  coverage(target: FernPointView) {
    const occupied = new Uint8Array(Math.ceil(target.width) * Math.ceil(target.height));
    const projections: { id: number; points: Float32Array }[] = [];
    for (const tile of Array.from(this.tiles.values())) {
      if (!fernTileIntersects(tile, target)) continue;
      const points = projectFernTile(tile, target);
      for (let i = 0; i < points.length; i += 2)
        occupied[Math.floor(points[i + 1]) * Math.ceil(target.width) + Math.floor(points[i])] = 1;
      if (fernPointTransform(tile, target).scale > 512) projections.push({ id: tile.id, points });
    }
    return { occupied, projections };
  }

  /**
   * Under pressure evict offscreen detail, then detail far finer than the
   * screen: the sampler refills any pixels it covered. Always keep the opening cloud.
   */
  prune(target: FernPointView, maxTiles = 2048) {
    const removed: number[] = [];
    const evict = (tiles: [string, FernPointTile][]) => {
      for (const [key, tile] of tiles) {
        if (this.tiles.size <= maxTiles) break;
        this.cells.delete(key);
        this.tiles.delete(tile.id);
        this.count -= tile.count;
        removed.push(tile.id);
      }
    };
    if (this.tiles.size <= maxTiles) return removed;
    const entries = Array.from(this.cells).filter(([, tile]) => tile.epoch !== this.openingEpoch);
    evict(entries.filter(([, tile]) => !fernTileIntersects(tile, target)));
    evict(
      entries
        .filter(([key, tile]) => this.cells.has(key) && tile.view.logZoom < target.view.logZoom - 2)
        .sort(([, a], [, b]) => a.view.logZoom - b.view.logZoom),
    );
    return removed;
  }
}
