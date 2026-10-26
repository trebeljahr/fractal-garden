import {
  type EscapeTimeColoring,
  getColoringLocations,
  setColoringUniforms,
} from "../escapeTimeColoring";
import { createShaderProgram } from "../shaders/compileShader";
import deepShader from "../shaders/deep-zoom.frag";
import escapeShader from "../shaders/escape-time.frag";
import vertexShader from "../shaders/mandelbrot.vert";
import pixelSummaryShader from "../shaders/pixel-summary.frag";
import {
  type DeepViewport,
  moveViewport,
  precisionForZoom,
  rescaleFixed,
  viewportDelta,
} from "./math";
import type { EscapeFormula, ReferenceOrbit } from "./orbit";
import type { PixelRepair } from "./pixelSummary";

export const MAX_RENDER_ITERATIONS = 8192;
export type RenderState = {
  view: DeepViewport;
  c: [number, number];
  config: EscapeTimeColoring;
  width: number;
  height: number;
};
export type ZoomStatus = { logZoom: number; iterations: number; message: string; error?: boolean };
type Tile = { x: number; y: number; width: number; height: number; mask?: Uint8Array };
type Job = {
  id: number;
  version: number;
  view: DeepViewport;
  iterations: number;
  c: [number, number];
  logDeltaC?: number;
  tiles?: { tile: Tile; view: DeepViewport }[];
  pixelRepairs?: PixelRepair[];
  frameWidth?: number;
  frameHeight?: number;
};

export function iterationBudget(view: DeepViewport, requested: number) {
  return Math.min(
    MAX_RENDER_ITERATIONS,
    Math.max(Math.round(requested), Math.ceil(200 + Math.max(0, -view.logZoom) * 12)),
  );
}

/** Worker orbit calculation, GPU perturbation, and progressively repaired tiles. */
export function createDeepZoomRenderer(
  gl: WebGLRenderingContext,
  formula: EscapeFormula,
  getState: () => RenderState,
  onStatus: (status: ZoomStatus) => void,
  options: { pixelRatio?: number } = {},
) {
  const release: (() => void)[] = [];
  const sharpMotion = formula === "mandelbrot";
  try {
    const compile = (fragment: string) => {
      const output = createShaderProgram(gl, vertexShader, fragment);
      if (output)
        release.push(() => {
          gl.deleteProgram(output.program);
          gl.deleteShader(output.vert);
          gl.deleteShader(output.frag);
        });
      return output;
    };
    if (!gl.getExtension("OES_texture_float"))
      throw new Error("Deep zoom needs floating-point textures. Try a browser with WebGL support.");
    const define = `#define FORMULA_${formula.replace("-", "_").toUpperCase()}\n`;
    const shared = escapeShader.slice(0, escapeShader.indexOf("void main()"));
    const deep = compile(define + shared + deepShader);
    const shallow = compile(define + escapeShader);
    const pixelSummary =
      formula === "burning-ship" ? compile(define + shared + pixelSummaryShader) : null;
    const preview = compile(
      `
    precision highp float;
    uniform sampler2D u_frame;
    uniform vec2 u_resolution;
    uniform vec2 u_previousResolution;
    uniform vec2 u_pan;
    uniform float u_ratio;
    void main() {
      vec2 uv = (2.0*gl_FragCoord.xy-u_resolution)/min(u_resolution.x,u_resolution.y);
      vec2 old = u_pan+uv*u_ratio;
      vec2 sampleAt = 0.5+0.5*old*min(u_previousResolution.x,u_previousResolution.y)/u_previousResolution;
      if (any(lessThan(sampleAt,vec2(0.0))) || any(greaterThan(sampleAt,vec2(1.0)))) {
        gl_FragColor=vec4(0.02,0.025,0.03,1.0);
      } else gl_FragColor=texture2D(u_frame,sampleAt);
    }
  `,
    );
    if (!deep || !shallow || !preview) throw new Error("Could not create the fractal renderer.");
    const buffer = gl.createBuffer();
    const texture = gl.createTexture();
    const frameTexture = gl.createTexture();
    const approximationTexture = gl.createTexture();
    if (approximationTexture) release.push(() => gl.deleteTexture(approximationTexture));
    if (buffer) release.push(() => gl.deleteBuffer(buffer));
    if (texture) release.push(() => gl.deleteTexture(texture));
    if (frameTexture) release.push(() => gl.deleteTexture(frameTexture));
    if (!buffer || !texture || !frameTexture || !approximationTexture)
      throw new Error("Could not allocate the fractal renderer.");
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, approximationTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.FLOAT, new Float32Array(4));
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, frameTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.activeTexture(gl.TEXTURE0);
    const previewPosition = gl.getAttribLocation(preview.program, "aPosition");
    const previewUniforms = Object.fromEntries(
      ["frame", "resolution", "previousResolution", "pan", "ratio"].map((name) => [
        name,
        gl.getUniformLocation(preview.program, `u_${name}`),
      ]),
    );
    let frameView: DeepViewport | null = null;
    let frameWidth = 0;
    let frameHeight = 0;
    const programs = [shallow, deep, ...(pixelSummary ? [pixelSummary] : [])].map(
      ({ program }) => ({
        program,
        coloring: getColoringLocations(gl, program),
        position: gl.getAttribLocation(program, "aPosition"),
        uniforms: Object.fromEntries(
          [
            "resolution",
            "center",
            "zoomSize",
            "c",
            "reference",
            "referenceSize",
            "referenceLength",
            "criticalStart",
            "criticalLength",
            "exactPixel",
            "deltaCenter",
            "scale",
            "pixelOffset",
            "pixelSummary",
            "tileOrigin",
            "tileSize",
            "approximation",
            "approximationSize",
            "approximationLogDeltaC",
            "approximationMaxLogRadius",
            "hasApproximation",
            "nativeReferenceStart",
            "hasNativeReference",
          ].map((name) => [name, gl.getUniformLocation(program, `u_${name}`)]),
        ),
      }),
    );
    const worker = new Worker(new URL("../../workers/deepZoom.worker.ts", import.meta.url));
    release.push(() => worker.terminate());
    let destroyed = false;
    let frame = 0;
    let version = 0;
    let nextId = 0;
    let pending: Job | null = null;
    let reference: ReferenceOrbit | null = null;
    let referenceView: DeepViewport | null = null;
    let uploaded: ReferenceOrbit | null = null;
    let textureWidth = 0;
    let textureHeight = 0;
    let repairQueue: Tile[] = [];
    let nativeReferenceStart = 0;
    let hasNativeReference = false;
    let approximationMaxLogRadius = -1000000;
    let approximationWidth = 1;
    let approximationHeight = 1;
    let referenceDomain = Number.NEGATIVE_INFINITY;
    let renderedVersion = -1;
    let inspectedVersion = -1;

    const report = (message: string, error = false) => {
      if (destroyed) return;
      const state = getState();
      onStatus({
        logZoom: state.view.logZoom,
        iterations: iterationBudget(state.view, state.config.iterations),
        message,
        error,
      });
    };
    const sameParameters = (c: [number, number]) =>
      c[0] === getState().c[0] && c[1] === getState().c[1];
    const upload = (orbit: ReferenceOrbit) => {
      if (uploaded === orbit) return;
      textureWidth = Math.min(1024, gl.getParameter(gl.MAX_TEXTURE_SIZE));
      nativeReferenceStart = orbit.length + (orbit.critical?.length ?? 0);
      hasNativeReference = sharpMotion;
      // A second, ordinary-float copy avoids repeated exponent conversion in the
      // range where every nonzero reference component is representable normally.
      if (hasNativeReference) {
        for (let i = 0; i < orbit.orbit.length; i += 2) {
          if (orbit.orbit[i] !== 0 && (orbit.orbit[i + 1] < -90 || orbit.orbit[i + 1] > 100)) {
            hasNativeReference = false;
            break;
          }
        }
      }
      textureHeight = Math.ceil(
        (nativeReferenceStart + (hasNativeReference ? orbit.length : 0)) / textureWidth,
      );
      const data = new Float32Array(textureWidth * textureHeight * 4);
      data.set(orbit.orbit);
      if (orbit.critical) data.set(orbit.critical.orbit, orbit.length * 4);
      if (hasNativeReference) {
        for (let i = 0; i < orbit.length; i++) {
          data[(nativeReferenceStart + i) * 4] = orbit.orbit[i * 4] * 2 ** orbit.orbit[i * 4 + 1];
          data[(nativeReferenceStart + i) * 4 + 1] =
            orbit.orbit[i * 4 + 2] * 2 ** orbit.orbit[i * 4 + 3];
        }
      }
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        textureWidth,
        textureHeight,
        0,
        gl.RGBA,
        gl.FLOAT,
        data,
      );
      approximationMaxLogRadius = -1000000;
      if (orbit.approximation?.maxSkip) {
        for (let i = 0; i < orbit.approximation.data.length; i += 20) {
          for (const header of [0, 2]) {
            if (orbit.approximation.data[i + header + 1] > 0)
              approximationMaxLogRadius = Math.max(
                approximationMaxLogRadius,
                orbit.approximation.data[i + header],
              );
          }
        }
        approximationWidth = textureWidth;
        approximationHeight = Math.ceil((orbit.approximation.length * 5) / approximationWidth);
        const maps = new Float32Array(approximationWidth * approximationHeight * 4);
        maps.set(orbit.approximation.data);
        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, approximationTexture);
        gl.texImage2D(
          gl.TEXTURE_2D,
          0,
          gl.RGBA,
          approximationWidth,
          approximationHeight,
          0,
          gl.RGBA,
          gl.FLOAT,
          maps,
        );
        gl.activeTexture(gl.TEXTURE0);
      }
      uploaded = orbit;
    };
    const maxViewport = gl.getParameter(gl.MAX_VIEWPORT_DIMS) as Int32Array;
    const maxSide = Math.min(
      gl.getParameter(gl.MAX_TEXTURE_SIZE),
      gl.getParameter(gl.MAX_RENDERBUFFER_SIZE),
    );
    const frameSize = () => {
      const { width, height } = getState();
      // Each display pixel gets its own sample, at every zoom and during gestures.
      // Hardware limits are the only reason to reduce the drawing buffer.
      const ratio = Math.min(
        options.pixelRatio ?? (window.devicePixelRatio || 1),
        Math.min(maxSide, maxViewport[0]) / Math.max(1, width),
        Math.min(maxSide, maxViewport[1]) / Math.max(1, height),
      );
      const w = Math.max(1, Math.round(width * ratio));
      const h = Math.max(1, Math.round(height * ratio));
      return { w, h };
    };
    const resize = () => {
      const { w, h } = frameSize();
      if (gl.canvas.width !== w || gl.canvas.height !== h) {
        gl.canvas.width = w;
        gl.canvas.height = h;
        renderedVersion = -1;
        inspectedVersion = -1;
      }
      return { w, h };
    };
    const canSummarizePixels = () =>
      pixelSummary &&
      getState().view.logZoom >= -64 &&
      ["smooth", "log", "banded"].includes(getState().config.colorMode);
    const rememberFrame = () => {
      if (sharpMotion) return;
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, frameTexture);
      gl.copyTexImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 0, 0, gl.canvas.width, gl.canvas.height, 0);
      gl.activeTexture(gl.TEXTURE0);
      frameView = { ...getState().view };
      frameWidth = gl.canvas.width;
      frameHeight = gl.canvas.height;
    };
    const previewFrame = () => {
      if (!frameView) return false;
      const view = getState().view;
      const ratio = 2 ** (view.logZoom - frameView.logZoom);
      const offset = viewportDelta(view, frameView);
      const x = offset.x[0] === 0 ? 0 : offset.x[0] * 2 ** (offset.x[1] - frameView.logZoom);
      const y =
        (offset.y[0] === 0 ? 0 : offset.y[0] * 2 ** (offset.y[1] - frameView.logZoom)) *
        (formula === "burning-ship" ? -1 : 1);
      if (!Number.isFinite(x + y + ratio) || Math.max(Math.abs(x), Math.abs(y), ratio) > 10000)
        return false;
      const { w, h } = resize();
      // biome-ignore lint/correctness/useHookAtTopLevel: WebGL API
      gl.useProgram(preview.program);
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.enableVertexAttribArray(previewPosition);
      gl.vertexAttribPointer(previewPosition, 2, gl.FLOAT, false, 0, 0);
      gl.viewport(0, 0, w, h);
      gl.disable(gl.SCISSOR_TEST);
      gl.uniform1i(previewUniforms.frame, 1);
      gl.uniform2f(previewUniforms.resolution, w, h);
      gl.uniform2f(previewUniforms.previousResolution, frameWidth, frameHeight);
      gl.uniform2f(previewUniforms.pan, x, y);
      gl.uniform1f(previewUniforms.ratio, ratio);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      return true;
    };
    const draw = (orbit: ReferenceOrbit | null, orbitView: DeepViewport | null, tile?: Tile) => {
      const state = getState();
      const isDeep = state.view.logZoom < -7;
      if (isDeep && (!orbit || !orbitView)) return false;
      const { w, h } = resize();
      const { program, coloring, position, uniforms: u } = programs[isDeep ? 1 : 0];
      // biome-ignore lint/correctness/useHookAtTopLevel: WebGL API, not a React hook
      gl.useProgram(program);
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.enableVertexAttribArray(position);
      gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
      gl.viewport(0, 0, w, h);
      gl.disable(gl.BLEND);
      if (tile) {
        gl.enable(gl.SCISSOR_TEST);
        gl.scissor(tile.x, tile.y, tile.width, tile.height);
      } else gl.disable(gl.SCISSOR_TEST);
      gl.uniform2f(u.resolution, w, h);
      gl.uniform2f(u.c, ...state.c);
      setColoringUniforms(gl, coloring, {
        ...state.config,
        iterations:
          state.view.logZoom < -7
            ? iterationBudget(state.view, state.config.iterations)
            : Math.min(MAX_RENDER_ITERATIONS, state.config.iterations),
      });
      if (isDeep && orbit && orbitView) {
        upload(orbit);
        const delta = viewportDelta(state.view, orbitView);
        gl.uniform1i(u.reference, 0);
        gl.uniform2f(u.referenceSize, textureWidth, textureHeight);
        gl.uniform1f(u.referenceLength, orbit.length);
        gl.uniform1f(u.criticalStart, orbit.length);
        gl.uniform1f(u.criticalLength, orbit.critical?.length ?? 0);
        gl.uniform1i(u.exactPixel, tile?.width === 1 && tile.height === 1 ? 1 : 0);
        // A repair's reference is already at its tile center. Subtract that
        // center in pixel coordinates instead of cancelling two large scaled
        // offsets in the shader; otherwise tiny tiles retain full-frame error.
        if (tile) gl.uniform4f(u.deltaCenter, 0, 0, 0, 0);
        else gl.uniform4f(u.deltaCenter, ...delta.x, ...delta.y);
        gl.uniform2f(
          u.pixelOffset,
          tile ? tile.x + tile.width / 2 - w / 2 : 0,
          tile ? tile.y + tile.height / 2 - h / 2 : 0,
        );
        gl.uniform2f(u.scale, ...delta.scale);
        gl.uniform1i(u.approximation, 2);
        gl.uniform2f(u.approximationSize, approximationWidth, approximationHeight);
        gl.uniform1f(u.approximationMaxLogRadius, approximationMaxLogRadius);
        gl.uniform1f(u.approximationLogDeltaC, orbit.approximation?.logDeltaC ?? -1000000);
        gl.uniform1i(u.hasApproximation, orbit.approximation?.maxSkip ? 1 : 0);
        gl.uniform1f(u.nativeReferenceStart, nativeReferenceStart);
        gl.uniform1i(u.hasNativeReference, hasNativeReference ? 1 : 0);
      } else {
        const zero: DeepViewport = {
          x: BigInt(0),
          y: BigInt(0),
          bits: state.view.bits,
          logZoom: 0,
        };
        const delta = viewportDelta(state.view, zero);
        gl.uniform2f(u.center, delta.x[0] * 2 ** delta.x[1], delta.y[0] * 2 ** delta.y[1]);
        gl.uniform1f(u.zoomSize, 2 ** state.view.logZoom);
      }
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.disable(gl.SCISSOR_TEST);
      if (!tile) {
        rememberFrame();
        renderedVersion = version;
        inspectedVersion = -1;
      }
      return true;
    };
    const drawPixelSummary = (tile: Tile, summary: Float32Array) => {
      const { program, coloring, position, uniforms: u } = programs[2];
      const state = getState();
      // biome-ignore lint/correctness/useHookAtTopLevel: WebGL API
      gl.useProgram(program);
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.enableVertexAttribArray(position);
      gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
      gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
      gl.disable(gl.BLEND);
      gl.enable(gl.SCISSOR_TEST);
      gl.scissor(tile.x, tile.y, tile.width, tile.height);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        tile.width,
        tile.height,
        0,
        gl.RGBA,
        gl.FLOAT,
        summary,
      );
      uploaded = null;
      gl.uniform1i(u.pixelSummary, 0);
      gl.uniform2f(u.tileOrigin, tile.x, tile.y);
      gl.uniform2f(u.tileSize, tile.width, tile.height);
      setColoringUniforms(gl, coloring, {
        ...state.config,
        iterations: iterationBudget(state.view, state.config.iterations),
      });
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.disable(gl.SCISSOR_TEST);
    };
    const request = (tiles?: Tile[], summarize = false) => {
      if (destroyed || pending) return;
      const state = getState();
      const bits = precisionForZoom(state.view.logZoom);
      const view = {
        ...state.view,
        bits,
        x: rescaleFixed(state.view.x, state.view.bits, bits),
        y: rescaleFixed(state.view.y, state.view.bits, bits),
      };
      const repairs = summarize
        ? undefined
        : tiles?.map((tile) => {
            const size = Math.min(gl.canvas.width, gl.canvas.height);
            const x = (2 * (tile.x + tile.width / 2) - gl.canvas.width) / size;
            const y =
              ((2 * (tile.y + tile.height / 2) - gl.canvas.height) / size) *
              (formula === "burning-ship" ? -1 : 1);
            let tileView = moveViewport(view, x, y);
            if (tile.width === 1 && tile.height === 1) {
              // Tangencies can depend on squared offsets. An exact-pixel orbit
              // gets twice the depth precision and bypasses GPU coordinate rounding.
              const exactBits = Math.max(bits, 2 * Math.ceil(Math.max(0, -view.logZoom)) + 128);
              tileView = {
                ...tileView,
                x: rescaleFixed(tileView.x, bits, exactBits),
                y: rescaleFixed(tileView.y, bits, exactBits),
                bits: exactBits,
              };
            }
            return { tile, view: tileView };
          });
      pending = {
        id: ++nextId,
        version,
        view,
        c: [...state.c],
        iterations:
          sharpMotion && !tiles
            ? Math.min(
                MAX_RENDER_ITERATIONS,
                (Math.ceil(iterationBudget(view, state.config.iterations) / 256) + 1) * 256,
              )
            : iterationBudget(view, state.config.iterations),
        logDeltaC:
          sharpMotion && !tiles
            ? view.logZoom +
              Math.log2(
                Math.hypot(state.width, state.height) /
                  Math.max(1, Math.min(state.width, state.height)),
              ) +
              2
            : undefined,
        tiles: repairs,
        pixelRepairs: summarize
          ? tiles?.map((tile) => {
              if (tile.mask) return { ...tile, mask: tile.mask };
              const rgba = new Uint8Array(tile.width * tile.height * 4);
              gl.readPixels(
                tile.x,
                tile.y,
                tile.width,
                tile.height,
                gl.RGBA,
                gl.UNSIGNED_BYTE,
                rgba,
              );
              const mask = new Uint8Array(tile.width * tile.height);
              for (let pixel = 0; pixel < mask.length; pixel++)
                mask[pixel] = rgba[pixel * 4 + 3] === 0 ? 1 : 0;
              return { ...tile, mask };
            })
          : undefined,
        frameWidth: summarize ? gl.canvas.width : undefined,
        frameHeight: summarize ? gl.canvas.height : undefined,
      };
      worker.postMessage({ ...pending, formula });
    };
    const inspect = (tile: Tile) => {
      const data = new Uint8Array(tile.width * tile.height * 4);
      gl.readPixels(tile.x, tile.y, tile.width, tile.height, gl.RGBA, gl.UNSIGNED_BYTE, data);
      const summaries = canSummarizePixels();
      const stepX = summaries ? 32 : Math.max(1, Math.ceil(tile.width / 4));
      const stepY = summaries ? 32 : Math.max(1, Math.ceil(tile.height / 4));
      // Summary tiles retain their sparse masks. Ordinary reference repairs
      // subdivide into at most sixteen cells, stopping at each first invalid pixel.
      for (let cy = 0; cy < tile.height; cy += stepY) {
        for (let cx = 0; cx < tile.width; cx += stepX) {
          const width = Math.min(stepX, tile.width - cx);
          const height = Math.min(stepY, tile.height - cy);
          if (summaries) {
            const mask = new Uint8Array(width * height);
            let invalid = false;
            for (let y = 0; y < height; y++) {
              for (let x = 0; x < width; x++) {
                if (data[((cy + y) * tile.width + cx + x) * 4 + 3] !== 0) continue;
                mask[y * width + x] = 1;
                invalid = true;
              }
            }
            if (invalid) repairQueue.push({ x: tile.x + cx, y: tile.y + cy, width, height, mask });
            continue;
          }
          cell: for (let y = cy; y < cy + height; y++) {
            for (let x = cx; x < cx + width; x++) {
              if (data[(y * tile.width + x) * 4 + 3] !== 0) continue;
              repairQueue.push({ x: tile.x + cx, y: tile.y + cy, width, height });
              break cell;
            }
          }
        }
      }
    };
    const repairNext = () => {
      if (destroyed || pending) return;
      if (repairQueue.length) {
        const state = getState();
        // Bound worker occupancy as precision and iteration counts grow. Ordinary
        // repairs share a packet; expensive deep references still run one at a time.
        const work =
          precisionForZoom(state.view.logZoom) *
          iterationBudget(state.view, state.config.iterations);
        const count = Math.max(1, Math.min(8, Math.floor(1_000_000 / work)));
        report("Refining detail…");
        request(repairQueue.splice(0, count), Boolean(canSummarizePixels()));
      } else {
        rememberFrame();
        report("Detail ready");
      }
    };
    const referenceCoordinateMargin = () => {
      if (!referenceView) return Number.NEGATIVE_INFINITY;
      const state = getState();
      const delta = viewportDelta(state.view, referenceView);
      const exponent = Math.max(
        delta.x[0] === 0 ? Number.NEGATIVE_INFINITY : delta.x[1],
        delta.y[0] === 0 ? Number.NEGATIVE_INFINITY : delta.y[1],
      );
      const { w, h } = frameSize();
      const pixels = Math.min(w, h);
      // Adding the pixel offset to deltaCenter uses float32's 24-bit significand.
      // Compare its ULP with the pixel step, 2 * halfSpan / shorterDimension.
      // A distant reference can lose pixel distinctions even with enough orbit bits.
      return state.view.logZoom + 24 - Math.log2(pixels) - exponent;
    };
    const validReference = () =>
      reference &&
      referenceView &&
      sameParameters(reference.c) &&
      reference.iterations >= iterationBudget(getState().view, getState().config.iterations) &&
      reference.bits >= Math.ceil(-getState().view.logZoom) + 64 &&
      (!sharpMotion || referenceCoordinateMargin() >= 4);
    const needsReference = () => {
      if (!validReference() || !referenceView || !reference) return true;
      const state = getState();
      if (
        referenceCoordinateMargin() < 8 ||
        reference.bits < Math.ceil(-state.view.logZoom) + 96 ||
        (reference.iterations < MAX_RENDER_ITERATIONS &&
          reference.iterations - iterationBudget(state.view, state.config.iterations) < 128)
      )
        return true;
      const delta = viewportDelta(state.view, referenceView);
      // Work in reference-relative units so a 10^-1000 view never underflows.
      const scale = 2 ** (state.view.logZoom - referenceView.logZoom);
      const component = ([m, e]: [number, number]) =>
        m === 0 ? 0 : Math.abs(m) * 2 ** (e - referenceView!.logZoom);
      const size = Math.max(1, Math.min(state.width, state.height));
      const radius = Math.hypot(
        component(delta.x) + (state.width / size) * scale,
        component(delta.y) + (state.height / size) * scale,
      );
      return referenceView.logZoom + Math.log2(radius) > referenceDomain - 0.5;
    };
    const schedule = () => {
      if (!destroyed && !frame) frame = requestAnimationFrame(render);
    };
    const render = () => {
      frame = 0;
      if (destroyed) return;
      const state = getState();
      if (state.view.logZoom >= -7) {
        draw(null, null);
        report("Ready");
        return;
      }
      if (sharpMotion) {
        resize();
        if (validReference() && renderedVersion !== version) draw(reference, referenceView);
        if (!pending && needsReference()) request();
        if (renderedVersion === version) {
          if (inspectedVersion !== version) {
            repairQueue = [];
            inspectedVersion = version;
            inspect({ x: 0, y: 0, width: gl.canvas.width, height: gl.canvas.height });
          }
          repairNext();
        }
        return;
      }
      if (validReference()) draw(reference, referenceView);
      else previewFrame();
      report("Refining detail…");
      if (!pending) {
        const exact =
          validReference() &&
          referenceView &&
          referenceView.x === rescaleFixed(state.view.x, state.view.bits, referenceView.bits) &&
          referenceView.y === rescaleFixed(state.view.y, state.view.bits, referenceView.bits);
        if (exact) {
          repairQueue = [];
          inspect({ x: 0, y: 0, width: gl.canvas.width, height: gl.canvas.height });
          repairNext();
        } else request();
      }
    };
    worker.onmessage = (event) => {
      if (destroyed || !pending || event.data.id !== pending.id) return;
      const job = pending;
      pending = null;
      if (event.data.error) {
        report(event.data.error, true);
        return;
      }
      if (
        !sameParameters(job.c) ||
        ((job.tiles || job.pixelRepairs) && job.version !== version) ||
        job.view.bits < Math.ceil(-getState().view.logZoom) + 64
      ) {
        // Never let an old tile or parameter edit overwrite the current view.
        if (getState().view.logZoom < -7) {
          if (sharpMotion) schedule();
          else request();
        }
        return;
      }
      if (getState().view.logZoom >= -7) return;
      if (job.pixelRepairs) {
        for (let i = 0; i < job.pixelRepairs.length; i++)
          drawPixelSummary(job.pixelRepairs[i], event.data.summaries[i]);
        // Every marked pixel was calculated directly, so no further GPU
        // uncertainty test or recursive per-pixel reference draw is needed.
        repairNext();
      } else if (job.tiles) {
        // Queue every disjoint draw before reading masks, so one GPU wait covers
        // the batch instead of serializing each reference upload, draw and read.
        for (let i = 0; i < job.tiles.length; i++) {
          const { tile, view } = job.tiles[i];
          draw(event.data.references[i], view, tile);
        }
        for (const { tile } of job.tiles) {
          inspect(tile);
          if (
            tile.width === 1 &&
            tile.height === 1 &&
            repairQueue.some((t) => t.x === tile.x && t.y === tile.y)
          ) {
            repairQueue = [];
            report("This point needs more precision. Try a nearby view.", true);
            return;
          }
        }
        // Worker replies already yield to the event loop between batches.
        repairNext();
      } else {
        if (
          sharpMotion &&
          event.data.references[0].iterations <
            iterationBudget(getState().view, getState().config.iterations)
        ) {
          schedule();
          return;
        }
        reference = event.data.references[0];
        referenceView = job.view;
        referenceDomain = job.logDeltaC ?? Number.NEGATIVE_INFINITY;
        if (sharpMotion) {
          schedule();
          return;
        }
        draw(reference, referenceView);
        if (job.version !== version) {
          request();
          return;
        }
        repairQueue = [];
        inspect({ x: 0, y: 0, width: gl.canvas.width, height: gl.canvas.height });
        repairNext();
      }
    };
    worker.onerror = () => {
      pending = null;
      report("Could not calculate this view. Reload to restart the renderer.", true);
    };
    const update = () => {
      version++;
      repairQueue = [];
      schedule();
    };
    const redraw = () => {
      // Export hooks are synchronous. Preserve the repaired framebuffer if ready.
      // preserveDrawingBuffer retains completed repairs and makes exports synchronous.
    };
    return {
      update,
      redraw,
      destroy() {
        destroyed = true;
        cancelAnimationFrame(frame);
        for (const dispose of release.splice(0).reverse()) dispose();
      },
    };
  } catch (error) {
    for (const dispose of release.splice(0).reverse()) dispose();
    throw error;
  }
}
