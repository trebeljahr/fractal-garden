import type { DeepViewport } from "./deepZoom/math";
import {
  FERN_TILE_SIZE,
  type FernPointAppend,
  type FernPointTile,
  type FernPointView,
  fernPointTransform,
  fernTileIntersects,
  fernTileLod,
  projectFernTile,
} from "./fernPoints";
import { createFernSampling, type FernPointMessage, type FernPointRequest } from "./fernSampling";
import type { FernMethod } from "./fernViewport";
import { registerPngExporter, renderCanvasPng } from "./pngExport";
import { webglPixelRatio } from "./renderResolution";
import { createShaderProgram } from "./shaders/compileShader";

export type FernProgress = {
  samples: number;
  visited: number;
  resolution: number;
  complete: boolean;
  count: number;
};
type Options = FernPointView & {
  matrix: number[][];
  method: FernMethod;
  background: string;
  color: string;
  paused: boolean;
  onProgress: (progress: FernProgress) => void;
};
type GpuTile = FernPointTile & {
  buffer: WebGLBuffer | null;
  projection?: { source: FernPointView; points: Float32Array; buffer: WebGLBuffer | null };
};
const vertex = `
attribute vec2 a_point;
uniform vec2 u_resolution;
uniform vec2 u_center;
uniform float u_scale;
uniform float u_dotSize;
void main() {
  vec2 pixel = (a_point - u_center) * u_scale + u_resolution * 0.5;
  gl_Position = vec4(pixel.x / u_resolution.x * 2.0 - 1.0, 1.0 - pixel.y / u_resolution.y * 2.0, 0.0, 1.0);
  gl_PointSize = u_dotSize;
}`;
const fragment = `
precision mediump float;
uniform vec3 u_color;
void main() {
  float a = 1.0 - smoothstep(0.4, 0.5, length(gl_PointCoord - vec2(0.5)));
  gl_FragColor = vec4(u_color, a);
}`;
const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);

/** Retains point buffers; camera gestures change uniforms and append only missing samples. */
export class FernViewportRenderer {
  private view: DeepViewport;
  private tiles = new Map<number, GpuTile>();
  private gl: WebGLRenderingContext | null;
  private ctx: CanvasRenderingContext2D | null;
  private shader: ReturnType<typeof createShaderProgram>;
  private uniforms: Record<string, WebGLUniformLocation | null> = {};
  private attribute = 0;
  private channel: { send: (message: FernPointRequest) => void; dispose: () => void };
  private frameId: number | null = null;
  private query = true;
  private sequence = 0;
  private progress: FernProgress = {
    samples: 0,
    visited: 0,
    resolution: 0,
    count: 0,
    complete: false,
  };
  private disposed = false;

  constructor(
    private canvas: HTMLCanvasElement,
    private options: Options,
  ) {
    this.view = { ...options.view };
    this.gl = canvas.getContext("webgl", { alpha: false, antialias: false });
    this.ctx = this.gl ? null : canvas.getContext("2d");
    if (this.gl) {
      const gl = this.gl;
      this.shader = createShaderProgram(gl, vertex, fragment);
      if (!this.shader) throw new Error("Fern point renderer unavailable");
      this.uniforms = Object.fromEntries(
        ["resolution", "center", "scale", "dotSize", "color"].map((key) => [
          key,
          gl.getUniformLocation(this.shader!.program, `u_${key}`),
        ]),
      );
      this.attribute = gl.getAttribLocation(this.shader.program, "a_point");
    }
    let worker: Worker | null = null;
    try {
      if (typeof Worker !== "undefined")
        worker = new Worker(new URL("../workers/fern.worker.ts", import.meta.url));
    } catch {
      /* Use the same sampler locally where workers are unavailable. */
    }
    if (worker) {
      worker.onmessage = ({ data }: MessageEvent<FernPointMessage>) => this.receive(data);
      const active = worker;
      this.channel = {
        send: (data) => active.postMessage(data),
        dispose: () => active.terminate(),
      };
    } else {
      const sampling = createFernSampling((message) => this.receive(message));
      this.channel = { send: (data) => sampling.receive(data), dispose: () => sampling.dispose() };
    }
    this.channel.send({
      type: "init",
      matrix: options.matrix,
      method: options.method,
      paused: options.paused,
    });
    this.resize(options.width, options.height);
    this.unregisterExport = registerPngExporter(canvas, (size) => {
      if (this.disposed || this.gl?.isContextLost()) throw new Error("Drawing not ready");
      const { width, height } = this.options;
      const ratio = this.gl ? webglPixelRatio(this.gl, width, height, size.ratio) : size.ratio;
      return renderCanvasPng(
        canvas,
        { ratio, width: Math.round(width * ratio), height: Math.round(height * ratio) },
        this.paint,
      );
    });
    canvas.addEventListener("garden:redraw", this.paint);
    window.addEventListener("garden:before-export", this.paint);
    this.schedule();
  }

  setView(view: DeepViewport) {
    if (
      view.x === this.view.x &&
      view.y === this.view.y &&
      view.bits === this.view.bits &&
      view.logZoom === this.view.logZoom
    )
      return;
    this.view = { ...view };
    this.query = true;
    this.progress.complete = false;
    this.options.onProgress(this.progress);
    this.schedule();
  }

  resize(width: number, height: number) {
    this.options.width = width;
    this.options.height = height;
    const ratio = window.devicePixelRatio || 1;
    const w = Math.round(width * ratio),
      h = Math.round(height * ratio);
    if (this.canvas.width !== w) this.canvas.width = w;
    if (this.canvas.height !== h) this.canvas.height = h;
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    this.query = true;
    this.progress.complete = false;
    this.schedule();
  }

  setStyle(color: string, background: string) {
    this.options.color = color;
    this.options.background = background;
    this.schedule();
  }
  setPaused(paused: boolean) {
    this.channel.send({ type: "pause", paused });
  }

  private receive(message: FernPointMessage) {
    if (this.disposed) return;
    if (message.type === "points") {
      for (const append of message.appends) this.append(append);
      if (message.id === this.sequence && !this.query)
        this.progress = {
          samples: message.samples,
          visited: message.visited,
          resolution: message.resolution,
          count: message.count,
          complete: message.complete,
        };
    } else if (message.type === "projection") {
      const tile = this.tiles.get(message.id);
      if (tile) this.project(tile, message.source, message.points);
    } else
      for (const id of message.ids) {
        const tile = this.tiles.get(id);
        if (tile) {
          this.gl?.deleteBuffer(tile.buffer);
          if (tile.projection) this.gl?.deleteBuffer(tile.projection.buffer);
          this.tiles.delete(id);
        }
      }
    this.schedule();
  }

  private append(data: FernPointAppend) {
    let tile = this.tiles.get(data.id);
    if (!tile) {
      const buffer = this.gl?.createBuffer() ?? null;
      tile = { ...data, points: new Float64Array(FERN_TILE_SIZE ** 2 * 2), buffer };
      this.tiles.set(tile.id, tile);
      if (this.gl) {
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, FERN_TILE_SIZE ** 2 * 8, this.gl.DYNAMIC_DRAW);
      }
    }
    tile.points.set(data.points, data.start * 2);
    tile.count = data.count;
    tile.fixed = undefined;
    if (tile.projection) {
      this.gl?.deleteBuffer(tile.projection.buffer);
      tile.projection = undefined;
    }
    if (this.gl) {
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, tile.buffer);
      this.gl.bufferSubData(this.gl.ARRAY_BUFFER, data.start * 8, new Float32Array(data.points));
    }
  }

  private project(tile: GpuTile, source: FernPointView, points: Float32Array) {
    if (tile.projection) this.gl?.deleteBuffer(tile.projection.buffer);
    const buffer = this.gl?.createBuffer() ?? null;
    if (this.gl) {
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
      this.gl.bufferData(this.gl.ARRAY_BUFFER, points, this.gl.STATIC_DRAW);
    }
    tile.projection = { source, points, buffer };
  }

  private schedule() {
    if (!this.disposed && this.frameId === null) this.frameId = requestAnimationFrame(this.draw);
  }
  private draw = () => {
    this.frameId = null;
    if (this.disposed) return;
    if (this.query) {
      this.query = false;
      this.channel.send({
        type: "view",
        id: ++this.sequence,
        view: this.view,
        width: this.options.width,
        height: this.options.height,
      });
    }
    this.paint();
    this.options.onProgress(this.progress);
  };

  private unregisterExport = () => {};

  private paint = () => {
    if (this.disposed) return;
    const target = { view: this.view, width: this.options.width, height: this.options.height };
    const { width, height } = target;
    const gl = this.gl;
    if (gl && this.shader) {
      const color = rgb(this.options.color),
        background = rgb(this.options.background);
      gl.viewport(0, 0, this.canvas.width, this.canvas.height);
      gl.clearColor(background[0], background[1], background[2], 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
      // biome-ignore lint/correctness/useHookAtTopLevel: WebGL method, not a React hook
      gl.useProgram(this.shader.program);
      gl.disable(gl.DEPTH_TEST);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.uniform2f(this.uniforms.resolution, width, height);
      gl.uniform3f(this.uniforms.color, color[0], color[1], color[2]);
      // A dot remains one CSS pixel at every magnification; it never becomes a scaled bitmap block.
      gl.uniform1f(this.uniforms.dotSize, this.canvas.width / width);
      gl.enableVertexAttribArray(this.attribute);
      // Tiles in a frame share one camera offset, so the exact math runs once per frame.
      const frames = new Map<number, ReturnType<typeof fernPointTransform>>();
      for (const tile of Array.from(this.tiles.values())) {
        let frame = frames.get(tile.epoch);
        if (!frame) {
          frame = fernPointTransform({ ...tile, x: 0, y: 0 }, target);
          frames.set(tile.epoch, frame);
        }
        let transform = {
            ...frame,
            centerX: frame.centerX - tile.x,
            centerY: frame.centerY - tile.y,
          },
          buffer = tile.buffer,
          count = tile.count;
        if (transform.scale > 1024 || !Number.isFinite(transform.scale)) {
          if (!fernTileIntersects(tile, target)) continue;
          const previous = tile.projection?.source;
          if (
            !previous ||
            previous.width !== width ||
            previous.height !== height ||
            previous.view.x !== this.view.x ||
            previous.view.y !== this.view.y ||
            previous.view.bits !== this.view.bits ||
            previous.view.logZoom !== this.view.logZoom
          )
            this.project(tile, target, projectFernTile(tile, target));
          const projection = tile.projection!;
          transform = fernPointTransform({ ...projection.source, x: 0, y: 0 }, target);
          buffer = projection.buffer;
          count = projection.points.length / 2;
        }
        if (
          !count ||
          ![transform.centerX, transform.centerY, transform.scale].every(Number.isFinite) ||
          transform.scale <= 0
        )
          continue;
        const span =
          tile.projection && buffer === tile.projection.buffer
            ? Math.max(tile.projection.source.width, tile.projection.source.height)
            : FERN_TILE_SIZE;
        const left = width / 2 - transform.centerX * transform.scale,
          top = height / 2 - transform.centerY * transform.scale;
        if (
          left > width ||
          top > height ||
          left + span * transform.scale < 0 ||
          top + span * transform.scale < 0
        )
          continue;
        const lod = fernTileLod(count, transform.scale);
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.vertexAttribPointer(this.attribute, 2, gl.FLOAT, false, lod.stride * 8, 0);
        gl.uniform2f(this.uniforms.center, transform.centerX, transform.centerY);
        gl.uniform1f(this.uniforms.scale, transform.scale);
        gl.drawArrays(gl.POINTS, 0, lod.count);
      }
      gl.disableVertexAttribArray(this.attribute);
    } else if (this.ctx) {
      const ctx = this.ctx,
        ratio = this.canvas.width / width;
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.fillStyle = this.options.background;
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = this.options.color;
      for (const tile of Array.from(this.tiles.values())) {
        const points = projectFernTile(tile, target);
        for (let i = 0; i < points.length; i += 2) ctx.fillRect(points[i], points[i + 1], 1, 1);
      }
    }
  };

  dispose() {
    this.disposed = true;
    this.unregisterExport();
    if (this.frameId !== null) cancelAnimationFrame(this.frameId);
    this.channel.dispose();
    this.canvas.removeEventListener("garden:redraw", this.paint);
    window.removeEventListener("garden:before-export", this.paint);
    for (const tile of Array.from(this.tiles.values())) {
      this.gl?.deleteBuffer(tile.buffer);
      if (tile.projection) this.gl?.deleteBuffer(tile.projection.buffer);
    }
    this.tiles.clear();
    if (this.gl && this.shader) {
      this.gl.deleteProgram(this.shader.program);
      this.gl.deleteShader(this.shader.vert);
      this.gl.deleteShader(this.shader.frag);
    }
  }
}
