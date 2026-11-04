import { createShaderProgram } from "../shaders/compileShader";
import {
  capture,
  compatible,
  type MotionSnapshot,
  type Source,
  sameCamera,
  type Tile,
  transform,
} from "./motion";

/** The screen splits into 64 phases. Each holds 1/64 of the pixels, evenly scattered. */
export const PHASES = 64;
/** Moving pixels are recalculated within this GPU time per frame, resting ones within this. */
const MAX_MOVING_TARGET_MS = 12;
const MIN_MOVING_TARGET_MS = 3;
const RESTING_TARGET_MS = 30;
/** A reused sample further than this from its pixel is refreshed sooner. */
const FAR_SAMPLE_PIXELS = 3;
/** Timer results take frames to arrive. Painting keeps going while this many are out. */
const MAX_PENDING_QUERIES = 4;
/** Such pixels may use this many times the frame's budget, so fast motion can't overload it. */
const LATE_SHARE = "3.0";
/** How far to look for a hole around a pixel before showing the soft image there. */
const HOLE_REACH = 4;
// The soft image spans 2 views at 1/8 sampling: 1/16 of the screen's pixels.
const BACKDROP_SPAN = 2;
const BACKDROP_SAMPLING = 1 / 8;
/** Replace the soft image once zooming out has used this share of its span... */
const MAX_BACKDROP_RATIO = 0.7;
/** ...or once zooming in has spread its pixels this far apart. */
const MIN_BACKDROP_RATIO = 1 / 4;

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
uniform float u_depth;
void main() { gl_Position = vec4(a_position, u_depth, 1.0); }`;

// Offsets say where a pixel's color was really calculated, relative to the pixel.
// They use 16 bits per axis, so slow motion accumulates instead of rounding away.
const offsetCode = `
vec4 encodeOffset(vec2 d) {
  vec2 n = floor(clamp(d * 1024.0 + 32768.0, 1.0, 65535.0) + 0.5);
  vec2 hi = floor(n / 256.0);
  return vec4(hi.x, n.x - hi.x * 256.0, hi.y, n.y - hi.y * 256.0) / 255.0;
}
// A stored x of zero marks a pixel with no sample.
bool decodeOffset(vec4 e, out vec2 d) {
  vec4 b = floor(e * 255.0 + 0.5);
  vec2 n = vec2(b.r * 256.0 + b.g, b.b * 256.0 + b.a);
  d = (n - 32768.0) / 1024.0;
  return n.x > 0.5;
}
vec2 previousPixel(vec2 pixel, vec2 resolution, vec3 t) {
  float size = min(resolution.x, resolution.y);
  vec2 uv = (2.0 * pixel - resolution) / size;
  return ((t.xy + uv * t.z) * size + resolution) * 0.5;
}`;

// Finds the stored sample nearest this pixel's new position. Its color moves
// unchanged, so repeating this each frame never blurs the image.
const reproject = `precision highp float;
uniform sampler2D u_color;
uniform sampler2D u_offset;
uniform vec2 u_resolution;
uniform vec3 u_transform;
uniform float u_writeOffset;
${offsetCode}
void main() {
  vec2 q = previousPixel(gl_FragCoord.xy, u_resolution, u_transform);
  vec2 base = floor(q) + 0.5;
  vec2 bestTexel = vec2(-1.0);
  vec2 bestSample = vec2(0.0);
  float best = 1e9;
  for (float y = -1.0; y < 1.5; y += 1.0) {
    for (float x = -1.0; x < 1.5; x += 1.0) {
      vec2 texel = base + vec2(x, y);
      if (any(lessThan(texel, vec2(0.0))) || any(greaterThan(texel, u_resolution))) continue;
      vec2 d;
      if (!decodeOffset(texture2D(u_offset, texel / u_resolution), d)) continue;
      vec2 at = texel + d;
      float distance = dot(at - q, at - q);
      if (distance < best) {
        best = distance;
        bestTexel = texel;
        bestSample = at;
      }
    }
  }
  vec2 moved = (bestSample - q) / u_transform.z;
  // Zooming in spreads samples apart, so a filled pixel accepts a distant one. A
  // hole does not, or one color would creep across it, a pixel per frame.
  vec2 unusedOffset;
  bool filled = decodeOffset(texture2D(u_offset, base / u_resolution), unusedOffset);
  bool found = bestTexel.x >= 0.0 && (filled || best < 1.0) && all(lessThan(abs(moved), vec2(31.0)));
  if (u_writeOffset > 0.5) gl_FragColor = found ? encodeOffset(moved) : vec4(0.0);
  else gl_FragColor = found ? vec4(texture2D(u_color, bestTexel / u_resolution).rgb, 1.0) : vec4(0.0);
}`;

// Fragments that survive here leave the far depth, so the fractal shader runs
// only on them. Blocks are 2 x 2 because GPUs shade pixels in those groups.
const mask = `precision highp float;
uniform sampler2D u_offset;
uniform vec2 u_resolution;
uniform vec3 u_transform;
uniform float u_cursor;
uniform float u_count;
uniform float u_farPixels;
${offsetCode}
float bayerBit(vec2 bits) { return 2.0 * abs(bits.x - bits.y) + bits.y; }
void main() {
  vec2 block = mod(floor(gl_FragCoord.xy / 2.0), 8.0);
  vec2 b0 = mod(block, 2.0);
  vec2 b1 = mod(floor(block / 2.0), 2.0);
  vec2 b2 = floor(block / 4.0);
  float phase = 16.0 * bayerBit(b0) + 4.0 * bayerBit(b1) + bayerBit(b2);
  if (mod(phase - u_cursor + ${PHASES}.0, ${PHASES}.0) < u_count) discard;
  vec2 q = previousPixel(gl_FragCoord.xy, u_resolution, u_transform);
  vec2 d;
  bool known = decodeOffset(texture2D(u_offset, (floor(q) + 0.5) / u_resolution), d);
  bool late = !known || dot(d, d) > u_farPixels * u_farPixels;
  if (late && mod(phase - u_cursor + ${PHASES}.0, ${PHASES}.0) < u_count * ${LATE_SHARE}) discard;
  gl_FragColor = vec4(0.0);
}`;

const solid = `precision highp float;
uniform vec4 u_value;
void main() { gl_FragColor = u_value; }`;

const display = `precision highp float;
uniform sampler2D u_color;
uniform sampler2D u_backdrop;
uniform vec2 u_resolution;
uniform vec2 u_backdropSize;
uniform vec3 u_backdropTransform;
uniform float u_backdropValid;
void main() {
  vec4 color = texture2D(u_color, gl_FragCoord.xy / u_resolution);
  // Scattered samples with holes around them read as dots, so only a filled
  // neighborhood shows its pixels. Anywhere else shows the whole soft image.
  float filled = color.a;
  filled = min(filled, texture2D(u_color, (gl_FragCoord.xy + vec2(${HOLE_REACH}.0, 0.0)) / u_resolution).a);
  filled = min(filled, texture2D(u_color, (gl_FragCoord.xy - vec2(${HOLE_REACH}.0, 0.0)) / u_resolution).a);
  filled = min(filled, texture2D(u_color, (gl_FragCoord.xy + vec2(0.0, ${HOLE_REACH}.0)) / u_resolution).a);
  filled = min(filled, texture2D(u_color, (gl_FragCoord.xy - vec2(0.0, ${HOLE_REACH}.0)) / u_resolution).a);
  if (filled > 0.5) {
    gl_FragColor = vec4(color.rgb, 1.0);
    return;
  }
  vec3 result = vec3(0.02, 0.025, 0.03);
  if (u_backdropValid > 0.5) {
    vec2 uv = (2.0 * gl_FragCoord.xy - u_resolution) / min(u_resolution.x, u_resolution.y);
    vec2 p = 0.5 + 0.5 * (u_backdropTransform.xy + uv * u_backdropTransform.z)
      * min(u_backdropSize.x, u_backdropSize.y) / u_backdropSize;
    if (all(greaterThanEqual(p, vec2(0.0))) && all(lessThanEqual(p, vec2(1.0))))
      result = texture2D(u_backdrop, p).rgb;
  }
  gl_FragColor = vec4(result, 1.0);
}`;

/** The offset value of a freshly calculated pixel: exactly on its pixel center. */
const ZERO_OFFSET = [128 / 255, 0, 128 / 255, 0] as const;
const IDENTITY: [number, number, number] = [0, 0, 1];

type Layer = {
  color: WebGLTexture;
  offset: WebGLTexture;
  colorTarget: WebGLFramebuffer;
  offsetTarget: WebGLFramebuffer;
};
type Backdrop = {
  texture: WebGLTexture;
  target: WebGLFramebuffer;
  source: Source | null;
  snapshot: MotionSnapshot | null;
  width: number;
  height: number;
  tiles: Tile[];
  cursor: number;
};

/**
 * Prototype: keep one image and move its pixels every frame, recalculating only a
 * scattered share. No pass is ever visible as a shape, since every frame is whole.
 */
export function createMandelbrotReuse(
  gl: WebGLRenderingContext,
  options: {
    paint: (
      snapshot: MotionSnapshot,
      target: { width: number; height: number; tile: Tile; pixelRatio: number },
    ) => void;
    complete: (version: number) => void;
    error?: (error: unknown) => void;
    initialFrame?: Source;
    backdrop?: boolean;
  },
) {
  const release: (() => void)[] = [];
  let frame = 0;
  let destroyed = false;
  let latest: MotionSnapshot | null = null;
  let moving = false;
  let paintAllowed = true;
  let completedVersion = -1;
  let queries: { handle: object; phases: number }[] = [];
  // Whole phases are spent; the fraction carries over, so slow views can skip frames.
  let phaseCredit = 0;
  // Moving pixels costs GPU time too, so the fractal's share comes from actual frame rate.
  let movingTarget = 6;
  let shortestFrame = Number.POSITIVE_INFINITY;
  // The camera and settings the stored pixels are currently arranged for.
  let arranged: Source | null = null;
  let cursor = 0;
  let phasesPerFrame = 1;
  let freshPhases = 0;
  let presentations = 0;
  let reprojections = 0;
  let paintCalls = 0;
  let paintedPhases = 0;
  let lastFrame: number | null = null;
  try {
    const program = (fragment: string, names: string[]) => {
      const shader = createShaderProgram(gl, vertex, fragment);
      if (!shader) throw new Error("Could not create the pixel reuse display.");
      release.push(() => {
        gl.deleteProgram(shader.program);
        gl.deleteShader(shader.vert);
        gl.deleteShader(shader.frag);
      });
      return {
        program: shader.program,
        position: gl.getAttribLocation(shader.program, "a_position"),
        u: Object.fromEntries(
          [...names, "depth"].map((name) => [
            name,
            gl.getUniformLocation(shader.program, `u_${name}`),
          ]),
        ),
      };
    };
    const reprojectProgram = program(reproject, [
      "color",
      "offset",
      "resolution",
      "transform",
      "writeOffset",
    ]);
    const maskProgram = program(mask, [
      "offset",
      "resolution",
      "transform",
      "cursor",
      "count",
      "farPixels",
    ]);
    const solidProgram = program(solid, ["value"]);
    const displayProgram = program(display, [
      "color",
      "backdrop",
      "resolution",
      "backdropSize",
      "backdropTransform",
      "backdropValid",
    ]);
    const buffer = gl.createBuffer();
    const depth = gl.createRenderbuffer();
    if (!buffer || !depth) throw new Error("Could not allocate the pixel reuse display.");
    release.push(() => gl.deleteBuffer(buffer));
    release.push(() => gl.deleteRenderbuffer(depth));
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const extension = gl.getExtension("EXT_disjoint_timer_query") as Timer | null;
    const timer = typeof extension?.createQueryEXT === "function" ? extension : null;

    const texture = (filter: number) => {
      const handle = gl.createTexture();
      if (!handle) throw new Error("Could not allocate the pixel reuse display.");
      release.push(() => gl.deleteTexture(handle));
      gl.activeTexture(gl.TEXTURE3);
      gl.bindTexture(gl.TEXTURE_2D, handle);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      return handle;
    };
    const framebuffer = (attached: WebGLTexture) => {
      const handle = gl.createFramebuffer();
      if (!handle) throw new Error("Could not allocate the pixel reuse display.");
      release.push(() => gl.deleteFramebuffer(handle));
      gl.bindFramebuffer(gl.FRAMEBUFFER, handle);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, attached, 0);
      return handle;
    };
    const layer = (): Layer => {
      const color = texture(gl.NEAREST);
      const offset = texture(gl.NEAREST);
      return {
        color,
        offset,
        colorTarget: framebuffer(color),
        offsetTarget: framebuffer(offset),
      };
    };
    const backdropSurface = (): Backdrop => {
      const handle = texture(gl.LINEAR);
      return {
        texture: handle,
        target: framebuffer(handle),
        source: null,
        snapshot: null,
        width: 1,
        height: 1,
        tiles: [],
        cursor: 0,
      };
    };
    let current = layer();
    let next = layer();
    let backdrop = backdropSurface();
    let backdropWork = backdropSurface();
    let allocated: [number, number] = [0, 0];
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.activeTexture(gl.TEXTURE0);

    const schedule = () => {
      if (!destroyed && !frame) frame = requestAnimationFrame(tick);
    };
    const use = ({ program: handle, position }: { program: WebGLProgram; position: number }) => {
      // biome-ignore lint/correctness/useHookAtTopLevel: WebGL API, not a React hook
      gl.useProgram(handle);
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.enableVertexAttribArray(position);
      gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    };
    const bind = (unit: number, handle: WebGLTexture, location: WebGLUniformLocation | null) => {
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, handle);
      gl.uniform1i(location, unit);
    };
    const allocate = (width: number, height: number) => {
      gl.bindRenderbuffer(gl.RENDERBUFFER, depth);
      gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, width, height);
      gl.activeTexture(gl.TEXTURE3);
      for (const image of [current, next]) {
        for (const [handle, target] of [
          [image.color, image.colorTarget],
          [image.offset, image.offsetTarget],
        ] as const) {
          gl.bindTexture(gl.TEXTURE_2D, handle);
          gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGBA,
            width,
            height,
            0,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            null,
          );
          gl.bindFramebuffer(gl.FRAMEBUFFER, target);
          gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depth);
          if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE)
            throw new Error("Pixel reuse surface is incomplete.");
        }
      }
      gl.activeTexture(gl.TEXTURE0);
      allocated = [width, height];
    };
    /** Forget every stored pixel, as after a resize or color change. */
    const forget = () => {
      gl.disable(gl.SCISSOR_TEST);
      gl.clearColor(0, 0, 0, 0);
      for (const target of [
        current.colorTarget,
        current.offsetTarget,
        next.colorTarget,
        next.offsetTarget,
      ]) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, target);
        gl.clear(gl.COLOR_BUFFER_BIT);
      }
      freshPhases = 0;
    };
    const fullscreen = (width: number, height: number) => {
      gl.viewport(0, 0, width, height);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    /** Move stored samples to the new camera, into the other layer. */
    const movePixels = (t: [number, number, number], width: number, height: number) => {
      use(reprojectProgram);
      const u = reprojectProgram.u;
      gl.uniform1f(u.depth, 0);
      gl.uniform2f(u.resolution, width, height);
      gl.uniform3f(u.transform, t[0], t[1], t[2]);
      bind(3, current.color, u.color);
      bind(4, current.offset, u.offset);
      gl.bindFramebuffer(gl.FRAMEBUFFER, next.colorTarget);
      gl.uniform1f(u.writeOffset, 0);
      fullscreen(width, height);
      gl.bindFramebuffer(gl.FRAMEBUFFER, next.offsetTarget);
      gl.uniform1f(u.writeOffset, 1);
      fullscreen(width, height);
      const swap = current;
      current = next;
      next = swap;
      gl.activeTexture(gl.TEXTURE0);
      reprojections++;
    };
    /** Recalculate this frame's scattered pixels and mark them exact. */
    const refresh = (snapshot: MotionSnapshot, count: number) => {
      const { width, height } = snapshot;
      gl.bindFramebuffer(gl.FRAMEBUFFER, current.colorTarget);
      gl.viewport(0, 0, width, height);
      gl.disable(gl.SCISSOR_TEST);
      gl.enable(gl.DEPTH_TEST);
      gl.depthMask(true);
      gl.clearDepth(1);
      gl.clear(gl.DEPTH_BUFFER_BIT);
      gl.depthFunc(gl.ALWAYS);
      gl.colorMask(false, false, false, false);
      use(maskProgram);
      const m = maskProgram.u;
      gl.uniform1f(m.depth, -1);
      gl.uniform2f(m.resolution, width, height);
      gl.uniform3f(m.transform, IDENTITY[0], IDENTITY[1], IDENTITY[2]);
      gl.uniform1f(m.cursor, cursor);
      gl.uniform1f(m.count, count);
      gl.uniform1f(m.farPixels, FAR_SAMPLE_PIXELS);
      bind(4, current.offset, m.offset);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.activeTexture(gl.TEXTURE0);
      gl.colorMask(true, true, true, true);
      gl.depthMask(false);
      gl.depthFunc(gl.LESS);
      options.paint(snapshot, {
        width,
        height,
        tile: { x: 0, y: 0, width, height },
        pixelRatio: 1,
      });
      paintCalls++;
      gl.bindFramebuffer(gl.FRAMEBUFFER, current.offsetTarget);
      use(solidProgram);
      gl.uniform1f(solidProgram.u.depth, 0);
      gl.uniform4f(solidProgram.u.value, ...ZERO_OFFSET);
      fullscreen(width, height);
      gl.disable(gl.DEPTH_TEST);
      gl.depthMask(true);
      cursor = (cursor + count) % PHASES;
      paintedPhases += count;
      freshPhases += count;
    };
    const present = () => {
      if (!latest) return;
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.disable(gl.SCISSOR_TEST);
      gl.disable(gl.BLEND);
      use(displayProgram);
      const u = displayProgram.u;
      gl.uniform1f(u.depth, 0);
      gl.uniform2f(u.resolution, latest.width, latest.height);
      bind(3, current.color, u.color);
      bind(5, backdrop.texture, u.backdrop);
      gl.uniform2f(u.backdropSize, backdrop.width, backdrop.height);
      const t = backdrop.source
        ? transform(latest.state.view, backdrop.source.state.view)
        : IDENTITY;
      const valid =
        backdrop.source && compatible(latest, backdrop.source) && t.every(Number.isFinite);
      gl.uniform1f(u.backdropValid, valid ? 1 : 0);
      gl.uniform3f(u.backdropTransform, t[0], t[1], t[2]);
      fullscreen(latest.width, latest.height);
      presentations++;
      gl.activeTexture(gl.TEXTURE0);
    };
    const pollTimers = () => {
      if (!timer || !queries.length) return;
      if (gl.getParameter(timer.GPU_DISJOINT_EXT)) {
        for (const { handle } of queries) timer.deleteQueryEXT(handle);
        queries = [];
        return;
      }
      while (queries.length) {
        const [{ handle, phases }] = queries;
        if (!timer.getQueryObjectEXT(handle, timer.QUERY_RESULT_AVAILABLE_EXT)) return;
        const ms = Number(timer.getQueryObjectEXT(handle, timer.QUERY_RESULT_EXT)) / 1e6;
        timer.deleteQueryEXT(handle);
        queries.shift();
        if (ms > 0 && Number.isFinite(ms) && phases > 0) {
          // Results are frames old, so aim from cost per phase instead of scaling.
          const target = moving ? movingTarget : RESTING_TARGET_MS;
          phasesPerFrame = 0.7 * phasesPerFrame + 0.3 * (target / (ms / phases));
        }
      }
    };
    const paceFromFrames = (timestamp: number) => {
      if (lastFrame === null || timestamp <= lastFrame) return;
      const interval = timestamp - lastFrame;
      shortestFrame = Math.min(shortestFrame, interval);
      if (!moving) return;
      if (interval > shortestFrame * 1.4) {
        movingTarget = Math.max(MIN_MOVING_TARGET_MS, movingTarget * 0.9);
      } else movingTarget = Math.min(MAX_MOVING_TARGET_MS, movingTarget * 1.02);
    };
    const beginBackdrop = () => {
      if (!latest) return;
      const original = capture(latest);
      const view = {
        ...original.state.view,
        logZoom: original.state.view.logZoom + Math.log2(BACKDROP_SPAN),
      };
      const image = backdropWork;
      image.width = Math.max(1, Math.round(latest.width * BACKDROP_SAMPLING * BACKDROP_SPAN));
      image.height = Math.max(1, Math.round(latest.height * BACKDROP_SAMPLING * BACKDROP_SPAN));
      image.source = { ...original, state: { ...original.state, view } };
      image.snapshot = {
        ...original,
        state: {
          ...original.state,
          view,
          config: { ...original.state.config, iterations: original.iterations },
        },
      };
      image.cursor = 0;
      image.tiles = [];
      for (let y = 0; y < image.height; y += 64)
        for (let x = 0; x < image.width; x += 64)
          image.tiles.push({
            x,
            y,
            width: Math.min(64, image.width - x),
            height: Math.min(64, image.height - y),
          });
      gl.activeTexture(gl.TEXTURE3);
      gl.bindTexture(gl.TEXTURE_2D, image.texture);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        image.width,
        image.height,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        null,
      );
      gl.activeTexture(gl.TEXTURE0);
    };
    const backdropDue = () => {
      if (!options.backdrop || !latest || backdropWork.snapshot) return false;
      if (!backdrop.source || !compatible(latest, backdrop.source)) return true;
      // Replace it once the camera has used up half of its wider view.
      const [x, y, ratio] = transform(latest.state.view, backdrop.source.state.view);
      const size = Math.min(latest.width, latest.height);
      const backdropSize = Math.min(backdrop.width, backdrop.height);
      // After zooming in, one backdrop texel covers many screen pixels and shows flat color.
      if (ratio < MIN_BACKDROP_RATIO || ratio > MAX_BACKDROP_RATIO) return true;
      return (
        !Number.isFinite(x + y + ratio) ||
        Math.abs(x) + (ratio * latest.width) / size > (0.5 * backdrop.width) / backdropSize ||
        Math.abs(y) + (ratio * latest.height) / size > (0.5 * backdrop.height) / backdropSize
      );
    };
    /** Spends up to this many pixels, returning how many it used. */
    const paintBackdrop = (budget: number) => {
      const image = backdropWork;
      if (!image.snapshot) return 0;
      gl.bindFramebuffer(gl.FRAMEBUFFER, image.target);
      let pixels = 0;
      while (image.cursor < image.tiles.length && pixels < budget) {
        const tile = image.tiles[image.cursor++];
        options.paint(image.snapshot, {
          width: image.width,
          height: image.height,
          tile,
          pixelRatio: BACKDROP_SAMPLING,
        });
        paintCalls++;
        pixels += tile.width * tile.height;
      }
      if (image.cursor === image.tiles.length) {
        backdropWork = backdrop;
        backdrop = image;
        backdropWork.snapshot = null;
        backdropWork.source = null;
      }
      return pixels;
    };
    const renderFrame = (timestamp: number) => {
      frame = 0;
      if (destroyed || !latest) return;
      paceFromFrames(timestamp);
      lastFrame = timestamp;
      const { width, height } = latest;
      const fresh = arranged === null || !compatible(latest, arranged);
      if (allocated[0] !== width || allocated[1] !== height) allocate(width, height);
      if (fresh) forget();
      else if (arranged && !sameCamera(latest, arranged)) {
        const t = transform(latest.state.view, arranged.state.view);
        if (t.every(Number.isFinite)) movePixels(t, width, height);
        else forget();
        freshPhases = 0;
      }
      arranged = capture(latest);
      pollTimers();
      if (paintAllowed && queries.length < MAX_PENDING_QUERIES) {
        phasesPerFrame = Math.max(1 / 8, Math.min(PHASES, phasesPerFrame));
        phaseCredit = Math.min(PHASES, phaseCredit + phasesPerFrame);
        const phasePixels = (width * height) / PHASES;
        const handle = timer?.createQueryEXT() ?? null;
        if (handle && timer) timer.beginQueryEXT(timer.TIME_ELAPSED_EXT, handle);
        let spent = 0;
        try {
          // The soft image comes first, since it is what keeps holes from showing.
          if (backdropDue()) beginBackdrop();
          spent = paintBackdrop(phaseCredit * phasePixels) / phasePixels;
          phaseCredit -= spent;
          const count = Math.min(PHASES - freshPhases, Math.floor(Math.max(0, phaseCredit)));
          if (count > 0) {
            phaseCredit -= count;
            spent += count;
            refresh(
              {
                ...latest,
                state: {
                  ...latest.state,
                  config: { ...latest.state.config, iterations: latest.iterations },
                },
              },
              count,
            );
          }
        } finally {
          if (handle && timer) {
            timer.endQueryEXT(timer.TIME_ELAPSED_EXT);
            queries.push({ handle, phases: spent });
          }
        }
      }
      present();
      const done = freshPhases >= PHASES;
      if (done && !moving && completedVersion !== latest.version) {
        completedVersion = latest.version;
        options.complete(latest.version);
      }
      if (queries.length || backdropWork.snapshot || (paintAllowed && !done)) schedule();
      else lastFrame = null;
    };
    const destroy = () => {
      if (destroyed) return;
      destroyed = true;
      cancelAnimationFrame(frame);
      if (timer) for (const { handle } of queries) timer.deleteQueryEXT(handle);
      queries = [];
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
          phasesPerFrame = Math.min(phasesPerFrame, 4);
          phaseCredit = 0;
        }
        latest = {
          ...capture(snapshot),
          orbitView: snapshot.orbitView ? { ...snapshot.orbitView } : null,
        };
        moving = isMoving;
        paintAllowed = canPaint;
        schedule();
      },
      getStats() {
        return {
          presentations,
          reprojections,
          paintCalls,
          paintedPhases,
          freshPhases,
          phasesPerFrame,
          movingTarget,
          latestVersion: latest?.version ?? null,
          nativeCompleted: latest !== null && completedVersion === latest.version,
          queryPending: queries.length > 0,
          backdropRatio:
            latest && backdrop.source
              ? transform(latest.state.view, backdrop.source.state.view)[2]
              : null,
          backdropPainting: backdropWork.snapshot !== null,
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
