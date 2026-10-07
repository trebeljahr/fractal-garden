import {
  type Bounds,
  getStartOutline,
  getVisibleTriangles,
  type PenroseStart,
  type PenroseVariant,
  PHI,
} from "../penroseTiling";
import type { Context2D, Renderer } from "./types";

export type PenroseParams = {
  variant: PenroseVariant;
  start: PenroseStart;
  iterations: number;
  /** Degrees. */
  rotation: number;
  background: string;
  /** Fill for type 0 and type 1 half-tiles. */
  colors: [string, string];
  showOutline: boolean;
  outlineColor: string;
  lineWidth: number;
  /** Frame the start patch and dim the tiling around it. */
  showStart: boolean;
  startColor: string;
  center: [number, number];
  zoomSize: number;
};

// Zoom out only until the tiles shrink to this budget of half-tiles on screen.
// A half-tile with edge e covers about e² / 4.
export const MAX_VISIBLE_TRIANGLES = 100000;

// Smallest tile edge in pixels that keeps the screen within the budget.
export function getMinTilePx(width: number, height: number) {
  return Math.sqrt((4 * width * height) / MAX_VISIBLE_TRIANGLES);
}

// Share of the background laid over the tiling outside the start patch.
const OUTSIDE_DIM = 0.6;
// The start patch is outlined this much wider than the tile edges.
const START_LINE_SCALE = 2.5;

// Tiles are cut for a view this much wider and taller than the screen, so a
// pan can reuse them until it leaves the margin.
const CACHE_MARGIN = 1.5;
// Cut again once the view covers less than this share of the cached area,
// so zooming in does not keep sifting through tiles far off screen.
const MIN_CACHE_SHARE = 1 / 9;

type TileCache = {
  key: string;
  bounds: Bounds;
  // Six coordinates (a, b, c) per half-tile, and its type.
  points: Float64Array;
  types: Uint8Array;
};

function contains(outer: Bounds, inner: Bounds) {
  return (
    inner.minX >= outer.minX &&
    inner.maxX <= outer.maxX &&
    inner.minY >= outer.minY &&
    inner.maxY <= outer.maxY
  );
}

function area(bounds: Bounds) {
  return (bounds.maxX - bounds.minX) * (bounds.maxY - bounds.minY);
}

function touches(points: Float64Array, offset: number, bounds: Bounds) {
  const ax = points[offset];
  const ay = points[offset + 1];
  const bx = points[offset + 2];
  const by = points[offset + 3];
  const cx = points[offset + 4];
  const cy = points[offset + 5];
  return (
    Math.max(ax, bx, cx) >= bounds.minX &&
    Math.min(ax, bx, cx) <= bounds.maxX &&
    Math.max(ay, by, cy) >= bounds.minY &&
    Math.min(ay, by, cy) <= bounds.maxY
  );
}

/**
 * The infinite Penrose tiling around the current view. Tiles are subdivided
 * for a margin around the screen and kept, so panning only redraws them.
 */
export class PenroseRenderer implements Renderer<PenroseParams> {
  private params: PenroseParams | null = null;
  private cache: TileCache | null = null;
  private geometryKey = "";
  private work = 0;
  private visible: number[] = [];

  update(params: PenroseParams) {
    const key = `${params.variant}|${params.start}|${params.iterations}`;
    // The amount drawn is only known after drawing; zero marks the new
    // picture as changed so it gets measured.
    if (key !== this.geometryKey) {
      this.geometryKey = key;
      this.work = 0;
    }
    this.params = params;
  }

  describe() {
    if (!this.params) return null;
    return { level: this.params.iterations, work: this.work };
  }

  draw(ctx: Context2D, width: number, height: number) {
    const config = this.params;
    if (!config) return false;

    const { center, zoomSize } = config;
    const pixelsPerUnit = Math.min(width, height) / (2 * zoomSize);
    // Normally the chosen iterations. Only when iterations grew while zoomed
    // out does this stay coarser, until zooming in makes room for the detail.
    const minTilePx = getMinTilePx(width, height);
    const level = Math.min(
      config.iterations,
      Math.floor(Math.log(pixelsPerUnit / minTilePx) / Math.log(PHI)),
    );

    // The view rectangle, rotated back into tiling coordinates.
    const angle = (config.rotation * Math.PI) / 180;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const halfWidth = (width / 2 + config.lineWidth) / pixelsPerUnit;
    const halfHeight = (height / 2 + config.lineWidth) / pixelsPerUnit;
    const extentX = Math.abs(cos) * halfWidth + Math.abs(sin) * halfHeight;
    const extentY = Math.abs(sin) * halfWidth + Math.abs(cos) * halfHeight;
    const centerX = cos * center[0] + sin * center[1];
    const centerY = -sin * center[0] + cos * center[1];
    const bounds: Bounds = {
      minX: centerX - extentX,
      maxX: centerX + extentX,
      minY: centerY - extentY,
      maxY: centerY + extentY,
    };

    const cache = this.tilesFor(config.variant, config.start, level, bounds, extentX, extentY);
    const { points, types } = cache;
    const visible = this.visible;
    visible.length = 0;
    for (let i = 0; i < types.length; i++) {
      if (touches(points, i * 6, bounds)) visible.push(i);
    }

    ctx.save();
    ctx.fillStyle = config.background;
    ctx.fillRect(0, 0, width, height);

    ctx.translate(width / 2, height / 2);
    ctx.scale(pixelsPerUnit, pixelsPerUnit);
    ctx.translate(-center[0], -center[1]);
    ctx.rotate(angle);

    // No closePath: fill closes each subpath anyway, and Chrome slows down
    // quadratically when closing tens of thousands of subpaths in one path.
    for (const type of [0, 1] as const) {
      ctx.beginPath();
      for (const i of visible) {
        if (types[i] !== type) continue;
        const o = i * 6;
        ctx.moveTo(points[o], points[o + 1]);
        ctx.lineTo(points[o + 2], points[o + 3]);
        ctx.lineTo(points[o + 4], points[o + 5]);
      }
      ctx.fillStyle = config.colors[type];
      ctx.fill();
    }

    if (config.showOutline && config.lineWidth > 0) {
      // Outline only the real tile edges, not the seam where two halves meet:
      // the leg AB in P2, the base BC in P3.
      const [first, middle, last] = config.variant === "p2" ? [0, 4, 2] : [2, 0, 4];
      ctx.beginPath();
      for (const i of visible) {
        const o = i * 6;
        ctx.moveTo(points[o + first], points[o + first + 1]);
        ctx.lineTo(points[o + middle], points[o + middle + 1]);
        ctx.lineTo(points[o + last], points[o + last + 1]);
      }
      ctx.strokeStyle = config.outlineColor;
      ctx.lineWidth = config.lineWidth / pixelsPerUnit;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.stroke();
    }

    if (config.showStart) this.drawStart(ctx, config, bounds, pixelsPerUnit);
    ctx.restore();

    if (this.work === 0) this.work = Math.max(1, visible.length);
    return false;
  }

  // Deflating the whole plane in place looks just like zooming out, because
  // the tiling is self-similar. Keeping the start patch fixed on top shows
  // what each iteration does: its tiles split into smaller ones.
  private drawStart(ctx: Context2D, config: PenroseParams, bounds: Bounds, pixelsPerUnit: number) {
    const { outline, edges } = getStartOutline(config.variant, config.start);

    ctx.beginPath();
    ctx.rect(bounds.minX, bounds.minY, bounds.maxX - bounds.minX, bounds.maxY - bounds.minY);
    const [[startX, startY], ...rest] = outline;
    ctx.moveTo(startX, startY);
    for (const [x, y] of rest) ctx.lineTo(x, y);
    ctx.closePath();
    ctx.globalAlpha = OUTSIDE_DIM;
    ctx.fillStyle = config.background;
    ctx.fill("evenodd");
    ctx.globalAlpha = 1;

    ctx.beginPath();
    for (const [[ax, ay], [bx, by]] of edges) {
      ctx.moveTo(ax, ay);
      ctx.lineTo(bx, by);
    }
    ctx.strokeStyle = config.startColor;
    ctx.lineWidth = (START_LINE_SCALE * Math.max(config.lineWidth, 1)) / pixelsPerUnit;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.stroke();
  }

  private tilesFor(
    variant: PenroseVariant,
    start: PenroseStart,
    level: number,
    bounds: Bounds,
    extentX: number,
    extentY: number,
  ) {
    const key = `${variant}|${start}|${level}`;
    const cached = this.cache;
    if (
      cached &&
      cached.key === key &&
      contains(cached.bounds, bounds) &&
      area(bounds) >= area(cached.bounds) * MIN_CACHE_SHARE
    ) {
      return cached;
    }

    const marginX = extentX * CACHE_MARGIN;
    const marginY = extentY * CACHE_MARGIN;
    const centerX = (bounds.minX + bounds.maxX) / 2;
    const centerY = (bounds.minY + bounds.maxY) / 2;
    const cacheBounds: Bounds = {
      minX: centerX - marginX,
      maxX: centerX + marginX,
      minY: centerY - marginY,
      maxY: centerY + marginY,
    };
    const triangles = getVisibleTriangles(variant, start, level, cacheBounds);
    const points = new Float64Array(triangles.length * 6);
    const types = new Uint8Array(triangles.length);
    triangles.forEach(({ type, a, b, c }, i) => {
      const o = i * 6;
      points[o] = a[0];
      points[o + 1] = a[1];
      points[o + 2] = b[0];
      points[o + 3] = b[1];
      points[o + 4] = c[0];
      points[o + 5] = c[1];
      types[i] = type;
    });

    this.cache = { key, bounds: cacheBounds, points, types };
    return this.cache;
  }
}
