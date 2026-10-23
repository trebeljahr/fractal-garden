import {
  type EscapeTimeColoring,
  getColoringLocations,
  setColoringUniforms,
} from "../escapeTimeColoring";
import { createShaderProgram } from "../shaders/compileShader";
import deepShader from "../shaders/deep-zoom.frag";
import escapeShader from "../shaders/escape-time.frag";
import vertexShader from "../shaders/mandelbrot.vert";
import {
  type DeepViewport,
  moveViewport,
  precisionForZoom,
  rescaleFixed,
  viewportDelta,
} from "./math";
import type { EscapeFormula, ReferenceOrbit } from "./orbit";

export const MAX_RENDER_ITERATIONS = 8192;
export type RenderState = {
  view: DeepViewport;
  c: [number, number];
  config: EscapeTimeColoring;
  width: number;
  height: number;
};
export type ZoomStatus = { logZoom: number; iterations: number; message: string; error?: boolean };
type Tile = { x: number; y: number; width: number; height: number };
type Job = {
  id: number;
  version: number;
  view: DeepViewport;
  iterations: number;
  c: [number, number];
  tile?: Tile;
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
) {
  const release: (() => void)[] = [];
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
    if (buffer) release.push(() => gl.deleteBuffer(buffer));
    if (texture) release.push(() => gl.deleteTexture(texture));
    if (frameTexture) release.push(() => gl.deleteTexture(frameTexture));
    if (!buffer || !texture || !frameTexture)
      throw new Error("Could not allocate the fractal renderer.");
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
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
    const programs = [shallow, deep].map(({ program }) => ({
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
        ].map((name) => [name, gl.getUniformLocation(program, `u_${name}`)]),
      ),
    }));
    const worker = new Worker(new URL("../../workers/deepZoom.worker.ts", import.meta.url));
    release.push(() => worker.terminate());
    let destroyed = false;
    let frame = 0;
    let settle: ReturnType<typeof setTimeout> | undefined;
    let repairTimer: ReturnType<typeof setTimeout> | undefined;
    let version = 0;
    let nextId = 0;
    let pending: Job | null = null;
    let reference: ReferenceOrbit | null = null;
    let referenceView: DeepViewport | null = null;
    let uploaded: ReferenceOrbit | null = null;
    let textureWidth = 0;
    let textureHeight = 0;
    let moving = false;
    let repairQueue: Tile[] = [];

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
      textureHeight = Math.ceil((orbit.length + (orbit.critical?.length ?? 0)) / textureWidth);
      const data = new Float32Array(textureWidth * textureHeight * 4);
      data.set(orbit.orbit);
      if (orbit.critical) data.set(orbit.critical.orbit, orbit.length * 4);
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
      uploaded = orbit;
    };
    const resize = () => {
      const { width, height } = getState();
      // Ordinary zooms stay sharp. Deep perturbation keeps its responsive
      // preview budget and restores detail after the gesture.
      const iterations = iterationBudget(getState().view, getState().config.iterations);
      const maxPixels =
        getState().view.logZoom >= -7
          ? Number.POSITIVE_INFINITY
          : moving
            ? 110_000 * Math.min(1, 800 / iterations)
            : 750_000 * Math.min(1, 2400 / iterations);
      const ratio = Math.min(
        window.devicePixelRatio || 1,
        Math.sqrt(maxPixels / Math.max(1, width * height)),
      );
      const w = Math.max(1, Math.round(width * ratio));
      const h = Math.max(1, Math.round(height * ratio));
      if (gl.canvas.width !== w || gl.canvas.height !== h) {
        gl.canvas.width = w;
        gl.canvas.height = h;
      }
      return { w, h };
    };
    const rememberFrame = () => {
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
        iterations: isDeep
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
        gl.uniform4f(u.deltaCenter, ...delta.x, ...delta.y);
        gl.uniform2f(u.scale, ...delta.scale);
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
      if (!tile) rememberFrame();
      return true;
    };
    const request = (tile?: Tile) => {
      if (destroyed || pending) return;
      const state = getState();
      const bits = precisionForZoom(state.view.logZoom);
      let view = {
        ...state.view,
        bits,
        x: rescaleFixed(state.view.x, state.view.bits, bits),
        y: rescaleFixed(state.view.y, state.view.bits, bits),
      };
      if (tile) {
        const size = Math.min(gl.canvas.width, gl.canvas.height);
        const x = (2 * (tile.x + tile.width / 2) - gl.canvas.width) / size;
        const y =
          ((2 * (tile.y + tile.height / 2) - gl.canvas.height) / size) *
          (formula === "burning-ship" ? -1 : 1);
        view = moveViewport(view, x, y);
      }
      if (tile?.width === 1 && tile.height === 1) {
        // Tangencies can depend on squared offsets. A final exact-pixel orbit
        // gets twice the depth precision and bypasses GPU coordinate rounding.
        const exactBits = Math.max(view.bits, 2 * Math.ceil(Math.max(0, -view.logZoom)) + 128);
        view = {
          ...view,
          x: rescaleFixed(view.x, view.bits, exactBits),
          y: rescaleFixed(view.y, view.bits, exactBits),
          bits: exactBits,
        };
      }
      pending = {
        id: ++nextId,
        version,
        view,
        c: [...state.c],
        iterations: iterationBudget(view, state.config.iterations),
        tile,
      };
      worker.postMessage({ ...pending, formula });
    };
    const inspect = (tile: Tile) => {
      const data = new Uint8Array(tile.width * tile.height * 4);
      gl.readPixels(tile.x, tile.y, tile.width, tile.height, gl.RGBA, gl.UNSIGNED_BYTE, data);
      const cells = new Map<string, Tile>();
      const stepX = Math.max(1, Math.ceil(tile.width / 4));
      const stepY = Math.max(1, Math.ceil(tile.height / 4));
      for (let y = 0; y < tile.height; y++)
        for (let x = 0; x < tile.width; x++) {
          if (data[(y * tile.width + x) * 4 + 3] !== 0) continue;
          const cx = Math.floor(x / stepX) * stepX;
          const cy = Math.floor(y / stepY) * stepY;
          cells.set(`${cx},${cy}`, {
            x: tile.x + cx,
            y: tile.y + cy,
            width: Math.min(stepX, tile.width - cx),
            height: Math.min(stepY, tile.height - cy),
          });
        }
      repairQueue.push(...Array.from(cells.values()));
    };
    const repairNext = () => {
      if (destroyed || moving || pending) return;
      const tile = repairQueue.shift();
      if (tile) {
        report("Refining detail…");
        request(tile);
      } else {
        rememberFrame();
        report("Detail ready");
      }
    };
    const validReference = () =>
      reference &&
      referenceView &&
      sameParameters(reference.c) &&
      reference.iterations >= iterationBudget(getState().view, getState().config.iterations) &&
      reference.bits >= Math.ceil(-getState().view.logZoom) + 64;
    const render = () => {
      frame = 0;
      if (destroyed) return;
      const state = getState();
      if (state.view.logZoom >= -7) {
        draw(null, null);
        report("Ready");
        return;
      }
      if (!moving || !previewFrame()) {
        if (validReference()) draw(reference, referenceView);
      }
      report("Refining detail…");
      if (!pending) {
        const exact =
          validReference() &&
          referenceView &&
          referenceView.x === rescaleFixed(state.view.x, state.view.bits, referenceView.bits) &&
          referenceView.y === rescaleFixed(state.view.y, state.view.bits, referenceView.bits);
        if (exact) {
          if (moving) return;
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
        (job.tile && job.version !== version) ||
        job.view.bits < Math.ceil(-getState().view.logZoom) + 64
      ) {
        // Never let an old tile or parameter edit overwrite the current view.
        if (getState().view.logZoom < -7) request();
        return;
      }
      if (getState().view.logZoom >= -7) return;
      if (job.tile) {
        draw(event.data.reference, job.view, job.tile);
        inspect(job.tile);
        // If even the exact pixel reference fails, stop and expose the failure.
        if (
          job.tile.width === 1 &&
          job.tile.height === 1 &&
          repairQueue.some((t) => t.x === job.tile?.x && t.y === job.tile?.y)
        ) {
          repairQueue = [];
          report("This point needs more precision. Try a nearby view.", true);
          return;
        }
        repairTimer = setTimeout(repairNext, 0);
      } else {
        reference = event.data.reference;
        referenceView = job.view;
        draw(reference, referenceView);
        if (job.version !== version) {
          request();
          return;
        }
        if (!moving) {
          repairQueue = [];
          inspect({ x: 0, y: 0, width: gl.canvas.width, height: gl.canvas.height });
          repairNext();
        }
      }
    };
    worker.onerror = () => {
      pending = null;
      report("Could not calculate this view. Reload to restart the renderer.", true);
    };
    const update = () => {
      version++;
      moving = true;
      repairQueue = [];
      clearTimeout(repairTimer);
      clearTimeout(settle);
      if (!frame) frame = requestAnimationFrame(render);
      settle = setTimeout(() => {
        moving = false;
        if (frame) cancelAnimationFrame(frame);
        render();
      }, 160);
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
        clearTimeout(settle);
        clearTimeout(repairTimer);
        for (const dispose of release.splice(0).reverse()) dispose();
      },
    };
  } catch (error) {
    for (const dispose of release.splice(0).reverse()) dispose();
    throw error;
  }
}
