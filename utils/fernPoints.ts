import {
  type DeepViewport,
  fixedOffset,
  fixedToFloatExp,
  rescaleFixed,
  viewportDelta,
} from "./deepZoom/math";

export const FERN_TILE_SIZE = 64;
export type FernPointView = { view: DeepViewport; width: number; height: number };
export type FernPointTile = FernPointView & {
  id: number;
  epoch: number;
  x: number;
  y: number;
  count: number;
  points: Float64Array;
  fixed?: { x: bigint[]; y: bigint[] };
};
export type FernPointAppend = Omit<FernPointTile, "points" | "fixed"> & {
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
  for (let i = 0; i < tile.count; i++) {
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

/** Append-only spatial batches: a viewport change never resamples existing points. */
export class FernPointCloud {
  readonly tiles = new Map<number, FernPointTile>();
  private cells = new Map<string, FernPointTile>();
  private sequence = 0;
  private openingEpoch: number | null = null;
  count = 0;

  append(source: FernPointView, epoch: number, points: number[]): FernPointAppend[] {
    const changed = new Map<FernPointTile, number>();
    if (points.length && this.openingEpoch === null) this.openingEpoch = epoch;
    for (let i = 0; i < points.length; i += 2) {
      const x = points[i],
        y = points[i + 1];
      if (x < 0 || x >= source.width || y < 0 || y >= source.height) continue;
      const tx = Math.floor(x / FERN_TILE_SIZE) * FERN_TILE_SIZE,
        ty = Math.floor(y / FERN_TILE_SIZE) * FERN_TILE_SIZE;
      const key = `${epoch}:${tx}:${ty}`;
      let tile = this.cells.get(key);
      if (!tile) {
        tile = {
          ...source,
          view: { ...source.view },
          id: ++this.sequence,
          epoch,
          x: tx,
          y: ty,
          count: 0,
          points: new Float64Array(FERN_TILE_SIZE ** 2 * 2),
        };
        this.cells.set(key, tile);
        this.tiles.set(tile.id, tile);
      }
      if (tile.count >= FERN_TILE_SIZE ** 2) continue;
      if (!changed.has(tile)) changed.set(tile, tile.count);
      tile.points[tile.count * 2] = x - tx;
      tile.points[tile.count * 2 + 1] = y - ty;
      tile.count++;
      this.count++;
    }
    return Array.from(changed, ([tile, start]) => ({
      id: tile.id,
      epoch,
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

  /** Evict only offscreen detail under pressure; always keep the opening cloud. */
  prune(target: FernPointView, maxTiles = 2048) {
    const removed: number[] = [];
    for (const [key, tile] of Array.from(this.cells)) {
      if (this.tiles.size <= maxTiles) break;
      if (tile.epoch === this.openingEpoch || fernTileIntersects(tile, target)) continue;
      this.cells.delete(key);
      this.tiles.delete(tile.id);
      this.count -= tile.count;
      removed.push(tile.id);
    }
    return removed;
  }
}
