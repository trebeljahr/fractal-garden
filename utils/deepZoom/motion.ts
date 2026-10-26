import { createShaderProgram } from "../shaders/compileShader";
import { type DeepViewport, viewportDelta } from "./math";
import type { ReferenceOrbit } from "./orbit";
import type { RenderState } from "./renderer";

export type MotionSnapshot = {
  state: RenderState;
  orbit: ReferenceOrbit | null;
  orbitView: DeepViewport | null;
  version: number;
  iterations: number;
  /** Native display dimensions, independent of the offscreen sampling density. */
  width: number;
  height: number;
};
type Tile = { x: number; y: number; width: number; height: number };
type Rect = { x0: number; x1: number; y0: number; y1: number };
type Source = Pick<MotionSnapshot, "state" | "width" | "height">;
type Surface = {
  texture: WebGLTexture;
  framebuffer: WebGLFramebuffer;
  source: Source | null;
  origin: Source | null;
  snapshot: MotionSnapshot | null;
  width: number;
  height: number;
  pixelRatio: number;
  native: boolean;
  tiles: Tile[];
  cursor: number;
  receivedAt: number;
  submittedPixels: number;
};
type Timer = {
  TIME_ELAPSED_EXT: number;
  GPU_DISJOINT_EXT: number;
  QUERY_RESULT_AVAILABLE_EXT: number;
  QUERY_RESULT_EXT: number;
  createQueryEXT(): object | null;
  beginQueryEXT(target: number, query: object): void;
  endQueryEXT(target: number): void;
  getQueryObjectEXT(query: object, parameter: number): number | boolean;
  deleteQueryEXT(query: object): void;
};

const vertex = `attribute vec2 a_position;
void main() { gl_Position = vec4(a_position, 0.0, 1.0); }`;
const fragment = `precision highp float;
uniform sampler2D u_history;
uniform sampler2D u_work;
uniform vec2 u_resolution;
uniform vec2 u_historySize;
uniform vec2 u_workSize;
uniform vec3 u_historyTransform;
uniform vec3 u_workTransform;
uniform float u_historyValid;
uniform float u_workValid;
vec4 sampleSource(sampler2D image, vec2 size, vec3 transform, float valid, vec2 uv) {
  if (valid < 0.5) return vec4(0.0);
  vec2 p = 0.5 + 0.5 * (transform.xy + uv * transform.z) * min(size.x,size.y) / size;
  if (any(lessThan(p, vec2(0.0))) || any(greaterThan(p, vec2(1.0)))) return vec4(0.0);
  return texture2D(image, p);
}
void main() {
  vec2 uv = (2.0 * gl_FragCoord.xy - u_resolution) / min(u_resolution.x,u_resolution.y);
  vec4 history = sampleSource(u_history,u_historySize,u_historyTransform,u_historyValid,uv);
  vec4 work = sampleSource(u_work,u_workSize,u_workTransform,u_workValid,uv);
  vec3 color = history.a > 0.999 ? history.rgb : vec3(0.02,0.025,0.03);
  if (work.a > 0.999) color = work.rgb;
  gl_FragColor = vec4(color,1.0);
}`;

function capture<T extends Source>(source: T): T {
  return {
    ...source,
    state: {
      ...source.state,
      view: { ...source.state.view },
      c: [...source.state.c],
      config: { ...source.state.config },
    },
  };
}
function compatible(a: Source, b: Source) {
  return (
    a.width === b.width &&
    a.height === b.height &&
    a.state.c[0] === b.state.c[0] &&
    a.state.c[1] === b.state.c[1] &&
    JSON.stringify(a.state.config) === JSON.stringify(b.state.config)
  );
}
function transform(view: DeepViewport, source: DeepViewport): [number, number, number] {
  const delta = viewportDelta(view, source);
  const component = ([m, e]: [number, number]) => (m === 0 ? 0 : m * 2 ** (e - source.logZoom));
  return [component(delta.x), component(delta.y), 2 ** (view.logZoom - source.logZoom)];
}
function sameCamera(a: Source, b: Source) {
  const [x, y, ratio] = transform(a.state.view, b.state.view);
  return x === 0 && y === 0 && ratio === 1;
}

/** Merge only adjoining rectangles, after the center-priority budget is selected. */
function coalesce(tiles: Tile[]): Tile[] {
  const rows: Tile[] = [];
  for (const tile of tiles.sort((a, b) => a.y - b.y || a.height - b.height || a.x - b.x)) {
    const last = rows[rows.length - 1];
    if (last && last.y === tile.y && last.height === tile.height && last.x + last.width === tile.x)
      last.width += tile.width;
    else rows.push({ ...tile });
  }
  const rectangles: Tile[] = [];
  for (const tile of rows.sort((a, b) => a.x - b.x || a.width - b.width || a.y - b.y)) {
    const last = rectangles[rectangles.length - 1];
    if (last && last.x === tile.x && last.width === tile.width && last.y + last.height === tile.y)
      last.height += tile.height;
    else rectangles.push({ ...tile });
  }
  return rectangles;
}

/** Keep original sampled cameras in two surfaces; never feed warped display pixels back. */
export function createMandelbrotMotion(
  gl: WebGLRenderingContext,
  options: {
    paint: (
      snapshot: MotionSnapshot,
      target: { width: number; height: number; tile: Tile; pixelRatio: number },
    ) => void;
    complete: (version: number) => void;
    error?: (error: unknown) => void;
    initialFrame?: Source;
  },
) {
  const release: (() => void)[] = [];
  let frame = 0;
  let destroyed = false;
  let latest: MotionSnapshot | null = null;
  let moving = false;
  let paintAllowed = true;
  let completedVersion = -1;
  let query: { handle: object; pixels: number; moving: boolean } | null = null;
  let sampleScale = 0.8;
  let batchPixels = 32768;
  let fallbackPixels = 16384;
  let fallbackFastFrames = 0;
  let fallbackLastFrame: number | null = null;
  let receivedAt = performance.now();
  let presentations = 0;
  let completedSources = 0;
  let discardedSources = 0;
  let submittedPixels = 0;
  let submittedBatches = 0;
  let paintCalls = 0;
  let prioritizedVersion = -1;
  let prioritizedHistory: Source | null = null;
  let prioritizedWork: MotionSnapshot | null = null;
  try {
    const shader = createShaderProgram(gl, vertex, fragment);
    if (!shader) throw new Error("Could not create progressive Mandelbrot display.");
    release.push(() => {
      gl.deleteProgram(shader.program);
      gl.deleteShader(shader.vert);
      gl.deleteShader(shader.frag);
    });
    const buffer = gl.createBuffer();
    if (!buffer) throw new Error("Could not allocate progressive Mandelbrot display.");
    release.push(() => gl.deleteBuffer(buffer));
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(shader.program, "a_position");
    const uniforms = Object.fromEntries(
      [
        "history",
        "work",
        "resolution",
        "historySize",
        "workSize",
        "historyTransform",
        "workTransform",
        "historyValid",
        "workValid",
      ].map((name) => [name, gl.getUniformLocation(shader.program, `u_${name}`)]),
    );
    const extension = gl.getExtension("EXT_disjoint_timer_query") as Timer | null;
    const timer = typeof extension?.createQueryEXT === "function" ? extension : null;
    if (!timer) batchPixels = 16384;
    const surface = (): Surface => {
      const texture = gl.createTexture();
      const framebuffer = gl.createFramebuffer();
      if (texture) release.push(() => gl.deleteTexture(texture));
      if (framebuffer) release.push(() => gl.deleteFramebuffer(framebuffer));
      if (!texture || !framebuffer)
        throw new Error("Could not allocate progressive Mandelbrot surfaces.");
      gl.activeTexture(gl.TEXTURE3);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
      return {
        texture,
        framebuffer,
        source: null,
        origin: null,
        snapshot: null,
        width: 1,
        height: 1,
        pixelRatio: 1,
        native: false,
        tiles: [],
        cursor: 0,
        receivedAt: 0,
        submittedPixels: 0,
      };
    };
    let history = surface();
    let work = surface();
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    if (options.initialFrame) {
      history.source = capture(options.initialFrame);
      history.origin = history.source;
      history.width = options.initialFrame.width;
      history.height = options.initialFrame.height;
      history.native = true;
      history.receivedAt = performance.now();
      history.submittedPixels = history.width * history.height;
      gl.bindTexture(gl.TEXTURE_2D, history.texture);
      gl.copyTexImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 0, 0, history.width, history.height, 0);
    }
    gl.activeTexture(gl.TEXTURE0);

    const schedule = () => {
      if (!destroyed && !frame) frame = requestAnimationFrame(tick);
    };
    const present = () => {
      if (!latest) return;
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, latest.width, latest.height);
      gl.disable(gl.SCISSOR_TEST);
      gl.disable(gl.BLEND);
      // biome-ignore lint/correctness/useHookAtTopLevel: WebGL API, not a React hook
      gl.useProgram(shader.program);
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.enableVertexAttribArray(position);
      gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
      gl.uniform2f(uniforms.resolution, latest.width, latest.height);
      for (const [image, name, unit] of [
        [history, "history", 3],
        [work, "work", 4],
      ] as const) {
        gl.activeTexture(gl.TEXTURE0 + unit);
        gl.bindTexture(gl.TEXTURE_2D, image.texture);
        gl.uniform1i(uniforms[name], unit);
        gl.uniform2f(uniforms[`${name}Size`], image.width, image.height);
        const t = image.source ? transform(latest.state.view, image.source.state.view) : [0, 0, 1];
        const valid = image.source && compatible(latest, image.source) && t.every(Number.isFinite);
        gl.uniform1f(uniforms[`${name}Valid`], valid ? 1 : 0);
        gl.uniform3f(uniforms[`${name}Transform`], t[0], t[1], t[2]);
      }
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      presentations++;
      gl.activeTexture(gl.TEXTURE0);
    };
    const begin = () => {
      if (!latest) return;
      const original = capture(latest);
      const padding = moving ? 1.18 : 1;
      const previousWidth = work.width;
      const previousHeight = work.height;
      work.width = Math.max(1, Math.round(latest.width * (moving ? sampleScale : 1) * padding));
      work.height = Math.max(1, Math.round(latest.height * (moving ? sampleScale : 1) * padding));
      // Preserve the center and enlarge the camera together with its border pixels.
      const view = {
        ...original.state.view,
        logZoom: original.state.view.logZoom + Math.log2(padding),
      };
      work.source = { ...original, state: { ...original.state, view } };
      work.origin = original;
      work.snapshot = {
        ...original,
        state: {
          ...original.state,
          view,
          config: {
            ...original.state.config,
            iterations: original.iterations,
          },
        },
      };
      work.pixelRatio =
        Math.min(work.width, work.height) / Math.min(latest.width, latest.height) / padding;
      work.native = !moving;
      work.cursor = 0;
      work.receivedAt = receivedAt;
      work.submittedPixels = 0;
      work.tiles = [];
      for (let y = 0; y < work.height; y += 64)
        for (let x = 0; x < work.width; x += 64)
          work.tiles.push({
            x,
            y,
            width: Math.min(64, work.width - x),
            height: Math.min(64, work.height - y),
          });
      const distance = (tile: Tile) =>
        (tile.x + tile.width / 2 - work.width / 2) ** 2 +
        (tile.y + tile.height / 2 - work.height / 2) ** 2;
      work.tiles.sort((a, b) => distance(a) - distance(b));
      gl.activeTexture(gl.TEXTURE3);
      gl.bindTexture(gl.TEXTURE_2D, work.texture);
      if (work.width !== previousWidth || work.height !== previousHeight)
        gl.texImage2D(
          gl.TEXTURE_2D,
          0,
          gl.RGBA,
          work.width,
          work.height,
          0,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          null,
        );
      gl.bindFramebuffer(gl.FRAMEBUFFER, work.framebuffer);
      if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE)
        throw new Error("Progressive Mandelbrot surface is incomplete.");
      gl.disable(gl.SCISSOR_TEST);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.activeTexture(gl.TEXTURE0);
    };
    const discardWork = () => {
      work.source = null;
      work.origin = null;
      work.snapshot = null;
      work.tiles = [];
      work.cursor = 0;
      work.submittedPixels = 0;
    };
    const historyCoversViewport = () => {
      if (!latest || !history.source || !compatible(latest, history.source)) return false;
      const [x, y, ratio] = transform(latest.state.view, history.source.state.view);
      const nativeSize = Math.min(latest.width, latest.height);
      const sourceSize = Math.min(history.width, history.height);
      return (
        Number.isFinite(x + y + ratio) &&
        Math.abs(x) + (ratio * latest.width) / nativeSize <= history.width / sourceSize &&
        Math.abs(y) + (ratio * latest.height) / nativeSize <= history.height / sourceSize
      );
    };
    const prioritizeVisibleWork = () => {
      if (!latest || !work.source || !work.snapshot) return;
      if (
        prioritizedVersion === latest.version &&
        prioritizedHistory === history.source &&
        prioritizedWork === work.snapshot
      )
        return;
      prioritizedVersion = latest.version;
      prioritizedHistory = history.source;
      prioritizedWork = work.snapshot;
      const inWorkPixels = (source: Source, width: number, height: number): Rect | null => {
        const [x, y, ratio] = transform(source.state.view, work.source!.state.view);
        const scale = Math.min(work.width, work.height);
        const aspect = Math.min(width, height);
        const rect = {
          x0: (work.width + scale * (x - (ratio * width) / aspect)) / 2,
          x1: (work.width + scale * (x + (ratio * width) / aspect)) / 2,
          y0: (work.height + scale * (y - (ratio * height) / aspect)) / 2,
          y1: (work.height + scale * (y + (ratio * height) / aspect)) / 2,
        };
        return Object.values(rect).every(Number.isFinite) ? rect : null;
      };
      const viewport = inWorkPixels(latest, latest.width, latest.height);
      if (!viewport) return;
      const covered =
        history.source && compatible(latest, history.source)
          ? inWorkPixels(history.source, history.width, history.height)
          : null;
      const intersect = (a: Rect, b: Rect): Rect => ({
        x0: Math.max(a.x0, b.x0),
        x1: Math.min(a.x1, b.x1),
        y0: Math.max(a.y0, b.y0),
        y1: Math.min(a.y1, b.y1),
      });
      const area = (rect: Rect) => Math.max(0, rect.x1 - rect.x0) * Math.max(0, rect.y1 - rect.y0);
      const centerX = (viewport.x0 + viewport.x1) / 2;
      const centerY = (viewport.y0 + viewport.y1) / 2;
      const remaining = work.tiles.slice(work.cursor).map((tile) => {
        const visible = intersect(viewport, {
          x0: tile.x,
          x1: tile.x + tile.width,
          y0: tile.y,
          y1: tile.y + tile.height,
        });
        const visibleArea = area(visible);
        const uncovered = visibleArea - (covered ? area(intersect(visible, covered)) : 0);
        return {
          tile,
          priority: uncovered > 0 ? 0 : visibleArea > 0 ? 1 : 2,
          distance:
            (tile.x + tile.width / 2 - centerX) ** 2 + (tile.y + tile.height / 2 - centerY) ** 2,
        };
      });
      remaining.sort((a, b) => a.priority - b.priority || a.distance - b.distance);
      // Submitted tiles stay in place, including while their GPU query is pending.
      for (let i = 0; i < remaining.length; i++) work.tiles[work.cursor + i] = remaining[i].tile;
    };
    const staleWork = () => {
      if (!latest || !work.origin || !compatible(latest, work.origin)) return true;
      const [x, y, ratio] = transform(latest.state.view, work.origin.state.view);
      const size = Math.min(work.origin.width, work.origin.height);
      return (
        !Number.isFinite(x + y + ratio) ||
        ratio < 0.5 ||
        ratio > 2 ||
        Math.abs(x) > (2 * work.origin.width) / size ||
        Math.abs(y) > (2 * work.origin.height) / size
      );
    };
    const poll = () => {
      if (!query || !timer) return true;
      if (gl.getParameter(timer.GPU_DISJOINT_EXT)) {
        timer.deleteQueryEXT(query.handle);
        query = null;
        batchPixels = 16384;
        return true;
      }
      if (!timer.getQueryObjectEXT(query.handle, timer.QUERY_RESULT_AVAILABLE_EXT)) return false;
      if (!gl.getParameter(timer.GPU_DISJOINT_EXT)) {
        const ms = Number(timer.getQueryObjectEXT(query.handle, timer.QUERY_RESULT_EXT)) / 1e6;
        if (ms > 0 && Number.isFinite(ms)) {
          batchPixels = Math.round(
            Math.max(
              16384,
              // Resting passes favor throughput; motion keeps a short input budget.
              Math.min(1048576, query.pixels * Math.max(0.25, Math.min(4, (moving ? 6 : 48) / ms))),
            ),
          );
          if (moving && !query.moving) batchPixels = Math.min(batchPixels, 32768);
          if (query.moving && ms > 12) sampleScale = 0.75;
        }
      }
      timer.deleteQueryEXT(query.handle);
      query = null;
      return true;
    };
    const renderFrame = (timestamp: number) => {
      frame = 0;
      if (destroyed || !latest) return;
      // Without GPU queries, use observed animation-frame pacing, never CPU
      // submission time. Conservative caps bound work the browser may queue.
      if (!timer && fallbackLastFrame !== null && timestamp > fallbackLastFrame) {
        const interval = timestamp - fallbackLastFrame;
        if (interval > 24) {
          fallbackPixels = Math.max(16384, Math.floor(fallbackPixels / 2));
          fallbackFastFrames = 0;
        } else if (interval <= 20) {
          if (++fallbackFastFrames >= 3) {
            fallbackPixels = Math.min(moving ? 65536 : 262144, fallbackPixels * 2);
            fallbackFastFrames = 0;
          }
        } else fallbackFastFrames = 0;
      }
      fallbackLastFrame = null;
      // Only a later animation frame polls; no synchronous waits or GPU readback.
      if (!poll()) {
        present();
        schedule();
        return;
      }
      if (!paintAllowed) {
        present();
        return;
      }
      // A finished source remains useful for reprojection even if the next camera
      // has crossed the threshold for starting a fresh source.
      if (
        work.snapshot &&
        work.cursor === work.tiles.length &&
        work.origin &&
        compatible(latest, work.origin)
      ) {
        completedSources++;
        const swap = history;
        history = work;
        work = swap;
        discardWork();
      }
      // A native pass can outlive a short pause and a resumed gesture. Once
      // stopped, refine the final camera directly instead of finishing an old
      // native view and then restarting another visible sweep.
      if (
        work.snapshot &&
        (staleWork() ||
          (!moving &&
            work.cursor < work.tiles.length &&
            (!work.native || !work.origin || !sameCamera(latest, work.origin))))
      ) {
        discardedSources++;
        discardWork();
      }
      const exactHistory =
        history.origin && compatible(latest, history.origin) && sameCamera(latest, history.origin);
      if (!work.snapshot && !(exactHistory && (moving || history.native))) begin();
      if (work.snapshot) {
        prioritizeVisibleWork();
        gl.bindFramebuffer(gl.FRAMEBUFFER, work.framebuffer);
        const handle = timer?.createQueryEXT() ?? null;
        if (handle && timer) {
          query = { handle, pixels: 0, moving };
          timer.beginQueryEXT(timer.TIME_ELAPSED_EXT, handle);
        }
        const budget = handle ? batchPixels : timer ? 16384 : fallbackPixels;
        let pixels = 0;
        const selected: Tile[] = [];
        try {
          while (work.cursor < work.tiles.length) {
            const tile = work.tiles[work.cursor];
            const area = tile.width * tile.height;
            if (pixels && pixels + area > budget) break;
            if (!pixels && area > budget && (tile.width > 32 || tile.height > 32)) {
              const children: Tile[] = [];
              const halfWidth = Math.ceil(tile.width / 2);
              const halfHeight = Math.ceil(tile.height / 2);
              for (let y = 0; y < tile.height; y += halfHeight)
                for (let x = 0; x < tile.width; x += halfWidth)
                  children.push({
                    x: tile.x + x,
                    y: tile.y + y,
                    width: Math.min(halfWidth, tile.width - x),
                    height: Math.min(halfHeight, tile.height - y),
                  });
              children.sort(
                (a, b) =>
                  Math.hypot(
                    a.x + a.width / 2 - work.width / 2,
                    a.y + a.height / 2 - work.height / 2,
                  ) -
                  Math.hypot(
                    b.x + b.width / 2 - work.width / 2,
                    b.y + b.height / 2 - work.height / 2,
                  ),
              );
              work.tiles.splice(work.cursor, 1, ...children);
              continue;
            }
            work.cursor++;
            selected.push(tile);
            pixels += area;
            if (pixels >= budget) break;
          }
          for (const tile of coalesce(selected)) {
            options.paint(work.snapshot, {
              width: work.width,
              height: work.height,
              tile,
              pixelRatio: work.pixelRatio,
            });
            paintCalls++;
          }
          work.submittedPixels += pixels;
          submittedPixels += pixels;
          submittedBatches++;
          if (!timer) fallbackLastFrame = timestamp;
        } finally {
          if (handle && timer) {
            timer.endQueryEXT(timer.TIME_ELAPSED_EXT);
            query = { handle, pixels, moving };
          }
          gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        }
      }
      present();
      if (
        !moving &&
        !work.snapshot &&
        exactHistory &&
        history.native &&
        completedVersion !== latest.version
      ) {
        completedVersion = latest.version;
        options.complete(latest.version);
      }
      if (query || work.snapshot) schedule();
    };
    const destroy = () => {
      if (destroyed) return;
      destroyed = true;
      cancelAnimationFrame(frame);
      if (query && timer) timer.deleteQueryEXT(query.handle);
      query = null;
      for (const dispose of release.reverse()) dispose();
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.activeTexture(gl.TEXTURE0);
    };
    const tick = (timestamp: number) => {
      try {
        renderFrame(timestamp);
      } catch (error) {
        destroy();
        if (options.error) options.error(error);
        else throw error;
      }
    };
    return {
      update(snapshot: MotionSnapshot, isMoving: boolean, canPaint = true) {
        if (destroyed) return;
        if (isMoving && !moving) {
          batchPixels = Math.min(batchPixels, 32768);
          fallbackPixels = Math.min(fallbackPixels, 32768);
          fallbackFastFrames = 0;
        }
        if (!latest || latest.version !== snapshot.version) receivedAt = performance.now();
        latest = {
          ...capture(snapshot),
          orbitView: snapshot.orbitView ? { ...snapshot.orbitView } : null,
        };
        moving = isMoving;
        paintAllowed = canPaint;
        schedule();
      },
      getStats() {
        const now = performance.now();
        const density = (surface: Surface) =>
          latest && surface.source
            ? (Math.min(surface.width, surface.height) / Math.min(latest.width, latest.height)) *
              2 ** (latest.state.view.logZoom - surface.source.state.view.logZoom)
            : null;
        return {
          presentations,
          completedSources,
          discardedSources,
          submittedPixels,
          submittedBatches,
          paintCalls,
          latestVersion: latest?.version ?? null,
          historyVersion: history.snapshot?.version ?? null,
          workVersion: work.snapshot?.version ?? null,
          historyAgeMs: history.source ? now - history.receivedAt : null,
          workAgeMs: work.source ? now - work.receivedAt : null,
          historyEffectiveDensity: density(history),
          workEffectiveDensity: density(work),
          historyCoversViewport: historyCoversViewport(),
          workSubmittedFraction: work.source
            ? work.submittedPixels / (work.width * work.height)
            : 0,
          nativeCompleted: latest !== null && completedVersion === latest.version,
          queryPending: query !== null,
          batchPixels,
          fallbackPixels,
          sampleScale,
        };
      },
      destroy,
    };
  } catch (error) {
    for (const dispose of release.reverse()) dispose();
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.activeTexture(gl.TEXTURE0);
    throw error;
  }
}
