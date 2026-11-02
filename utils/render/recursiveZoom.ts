import { buildCanopyGeometry } from "../canopyZoom";
import { rgb } from "../ctxHelpers";
import { buildIslandGeometry } from "../gosperIslandZoom";
import { hexColor } from "../miraMap";
import {
  buildPatternGeometry,
  carpetDetailOpacity,
  clipPolygon,
  type PatternCamera,
  type PatternModel,
  patternModel,
  type RecursivePattern,
} from "../recursiveZoom";
import type { Context2D, Renderer } from "./types";

export type RecursiveZoomParams = { pattern: RecursivePattern; camera: PatternCamera };

function mixColors(from: string, to: string, t: number) {
  const [r0, g0, b0] = hexColor(from);
  const [r1, g1, b1] = hexColor(to);
  return `rgb(${r0 + (r1 - r0) * t},${g0 + (g1 - g0) * t},${b0 + (b1 - b0) * t})`;
}

export class RecursiveZoomRenderer implements Renderer<RecursiveZoomParams> {
  private params: RecursiveZoomParams | null = null;
  private model: PatternModel | null = null;
  private key = "";
  private work = 0;

  update(params: RecursiveZoomParams) {
    const { iterations: _, ...shape } = params.pattern.config;
    const key = JSON.stringify([params.pattern.kind, shape, params.camera.bits]);
    if (params.pattern.kind === "canopy" || params.pattern.kind === "island") {
      this.params = params;
      return;
    }
    if (this.key !== key) {
      this.model = patternModel(params.pattern, params.camera.bits);
      this.key = key;
    }
    this.params = params;
  }

  draw(ctx: Context2D, width: number, height: number) {
    if (!this.params) return false;
    if (this.params.pattern.kind === "canopy") {
      const { config } = this.params.pattern;
      const geometry = buildCanopyGeometry(config, this.params.camera, width, height);
      ctx.fillStyle = config.background;
      ctx.fillRect(0, 0, width, height);
      ctx.lineCap = "butt";
      for (const [depth, level] of Array.from(geometry.levels)) {
        const path = new Path2D();
        for (const [x, y, endX, endY] of level.lines) {
          path.moveTo(x, y);
          path.lineTo(endX, endY);
        }
        const colorLevel = Math.min(depth, config.iterations - 1);
        ctx.strokeStyle = rgb(100 + colorLevel * 5, 100 + colorLevel * 15.5, 100);
        ctx.lineWidth = level.width;
        ctx.stroke(path);
      }
      this.work = geometry.visited;
      return false;
    }
    if (this.params.pattern.kind === "island") {
      const { config } = this.params.pattern;
      const geometry = buildIslandGeometry(config, this.params.camera, width, height, clipPolygon);
      ctx.fillStyle = config.background;
      ctx.fillRect(0, 0, width, height);
      ctx.lineJoin = "round";
      ctx.lineWidth = config.lineWidth;
      ctx.strokeStyle = config.outline;
      const coast = new Path2D();
      for (const [tint, polygons] of Array.from(geometry.paths)) {
        const region = new Path2D();
        for (const points of polygons) {
          for (const path of [region, coast]) {
            path.moveTo(points[0], points[1]);
            for (let i = 2; i < points.length; i += 2) path.lineTo(points[i], points[i + 1]);
            path.closePath();
          }
        }
        if (config.fillIslands) {
          ctx.fillStyle = mixColors(config.color, config.colorEnd, tint / 6);
          ctx.fill(region);
        }
      }
      ctx.stroke(coast);
      this.work = geometry.visited;
      return false;
    }
    if (!this.model) return false;
    const { pattern, camera } = this.params;
    const { config } = pattern;
    const geometry = buildPatternGeometry(pattern, camera, width, height, this.model);
    ctx.fillStyle = config.background;
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = config.color;
    ctx.lineJoin = "round";
    ctx.lineWidth = "lineWidth" in config ? config.lineWidth : 1;
    // Depth order matters for T-square overlaps. Carpet holes use one fill.
    const groups = Array.from(geometry.paths).sort(([a], [b]) => a - b);
    const opacity = ctx.globalAlpha;
    for (const [depth, polygons] of groups) {
      ctx.globalAlpha =
        opacity *
        (pattern.kind === "carpet"
          ? carpetDetailOpacity(config.iterations, camera, width, height, depth)
          : 1);
      if (!ctx.globalAlpha) continue;
      if (pattern.kind === "star") {
        // Zooming in by one copy's size moves the colors along by one level.
        const levels = Math.max(1, config.iterations);
        const shown = depth - Math.log(camera.zoom) / Math.log(1 / pattern.config.ratio);
        ctx.strokeStyle = mixColors(
          pattern.config.color,
          pattern.config.colorEnd,
          Math.max(0, Math.min(1, shown / levels)),
        );
      }
      const path = new Path2D();
      for (const points of polygons) {
        if (pattern.kind === "carpet") {
          path.rect(points[0], points[1], points[2] - points[0], points[5] - points[1]);
          continue;
        }
        path.moveTo(points[0], points[1]);
        for (let i = 2; i < points.length; i += 2) path.lineTo(points[i], points[i + 1]);
        path.closePath();
      }
      ctx.fillStyle =
        pattern.kind === "star"
          ? ctx.strokeStyle
          : pattern.kind === "carpet" && depth !== -1
            ? pattern.config.holeColor
            : config.color;
      const fill =
        pattern.kind === "carpet" ||
        (pattern.kind === "star" && pattern.config.fillStars) ||
        ("fillSquares" in config
          ? config.fillSquares
          : "fillPolygons" in config && config.fillPolygons);
      const stroke =
        pattern.kind === "star" ||
        ("strokeSquares" in config
          ? config.strokeSquares
          : "strokePolygons" in config && config.strokePolygons);
      if (fill) ctx.fill(path);
      if (stroke) ctx.stroke(path);
    }
    ctx.globalAlpha = opacity;
    this.work = geometry.visited;
    return false;
  }

  describe() {
    return this.params ? { level: this.params.pattern.config.iterations, work: this.work } : null;
  }
}
