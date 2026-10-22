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
  frame: Frame;
  view: DeepViewport;
  iterations: number;
  c: [number, number];
  tile?: Tile;
};

type Frame = {
  state: RenderState;
  key: string;
  width: number;
  height: number;
};

export function iterationBudget(view: DeepViewport, requested: number) {
  return Math.min(
    MAX_RENDER_ITERATIONS,
    Math.max(Math.round(requested), Math.ceil(200 + Math.max(0, -view.logZoom) * 12)),
  );
}

/** Full-resolution frames, repaired offscreen and presented at the renderer's pace. */
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
    const present = compile(`
      precision highp float;
      uniform sampler2D u_frame;
      uniform vec2 u_resolution;
      void main() {
        gl_FragColor = texture2D(u_frame, gl_FragCoord.xy / u_resolution);
      }
    `);
    if (!deep || !shallow || !present) throw new Error("Could not create the fractal renderer.");
    const buffer = gl.createBuffer();
    const texture = gl.createTexture();
    const frameTexture = gl.createTexture();
    const framebuffer = gl.createFramebuffer();
    if (buffer) release.push(() => gl.deleteBuffer(buffer));
    if (texture) release.push(() => gl.deleteTexture(texture));
    if (frameTexture) release.push(() => gl.deleteTexture(frameTexture));
    if (framebuffer) release.push(() => gl.deleteFramebuffer(framebuffer));
    if (!buffer || !texture || !frameTexture || !framebuffer)
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
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, frameTexture, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.activeTexture(gl.TEXTURE0);
    const presentPosition = gl.getAttribLocation(present.program, "aPosition");
    const presentFrame = gl.getUniformLocation(present.program, "u_frame");
    const presentResolution = gl.getUniformLocation(present.program, "u_resolution");
    const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE) as number;
    const maxViewport = gl.getParameter(gl.MAX_VIEWPORT_DIMS) as Int32Array;
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
    let repairTimer: ReturnType<typeof setTimeout> | undefined;
    let nextId = 0;
    let pending: Job | null = null;
    let active: Frame | null = null;
    let shown: Frame | null = null;
    let reference: ReferenceOrbit | null = null;
    let referenceView: DeepViewport | null = null;
    let uploaded: ReferenceOrbit | null = null;
    let textureWidth = 0;
    let textureHeight = 0;
    let renderWidth = 0;
    let renderHeight = 0;
    let repairQueue: Tile[] = [];

    // Navigation can keep changing its target. Work already in flight retains
    // one immutable camera, palette and pixel grid until the frame is complete.
    const snapshot = (): Frame => {
      const state = getState();
      const ratio = Math.min(
        window.devicePixelRatio || 1,
        maxTextureSize / Math.max(1, state.width),
        maxTextureSize / Math.max(1, state.height),
        maxViewport[0] / Math.max(1, state.width),
        maxViewport[1] / Math.max(1, state.height),
      );
      const width = Math.max(1, Math.floor(state.width * ratio));
      const height = Math.max(1, Math.floor(state.height * ratio));
      return {
        state: { ...state, view: { ...state.view }, config: { ...state.config }, c: [...state.c] },
        key: JSON.stringify([state.config, state.c, width, height]),
        width,
        height,
      };
    };
    const sameView = (a: DeepViewport, b: DeepViewport) => {
      const bits = Math.max(a.bits, b.bits);
      return (
        a.logZoom === b.logZoom &&
        rescaleFixed(a.x, a.bits, bits) === rescaleFixed(b.x, b.bits, bits) &&
        rescaleFixed(a.y, a.bits, bits) === rescaleFixed(b.y, b.bits, bits)
      );
    };
    const report = (message: string, error = false) => {
      if (destroyed) return;
      const state = (shown ?? active)?.state ?? getState();
      onStatus({
        logZoom: state.view.logZoom,
        iterations: iterationBudget(state.view, state.config.iterations),
        message,
        error,
      });
    };
    const schedule = () => {
      if (!destroyed && !frame) frame = requestAnimationFrame(render);
    };
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
    const prepare = (next: Frame) => {
      if (renderWidth !== next.width || renderHeight !== next.height) {
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, frameTexture);
        gl.texImage2D(
          gl.TEXTURE_2D,
          0,
          gl.RGBA,
          next.width,
          next.height,
          0,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          null,
        );
        gl.activeTexture(gl.TEXTURE0);
        renderWidth = next.width;
        renderHeight = next.height;
      }
      gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
      if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE)
        throw new Error("Could not allocate a full-resolution fractal frame.");
    };
    const finish = () => {
      if (!active) return;
      const completed = active;
      active = null;
      // Parameter edits and resizes invalidate old work. Navigation alone does
      // not: showing completed frames prevents starvation during a long gesture.
      if (completed.key !== snapshot().key) {
        schedule();
        return;
      }
      const { width, height } = completed;
      // Only resize the visible canvas when its replacement is ready.
      if (gl.canvas.width !== width) gl.canvas.width = width;
      if (gl.canvas.height !== height) gl.canvas.height = height;
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      // biome-ignore lint/correctness/useHookAtTopLevel: WebGL API
      gl.useProgram(present.program);
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.enableVertexAttribArray(presentPosition);
      gl.vertexAttribPointer(presentPosition, 2, gl.FLOAT, false, 0, 0);
      gl.viewport(0, 0, width, height);
      gl.disable(gl.SCISSOR_TEST);
      gl.disable(gl.BLEND);
      gl.uniform1i(presentFrame, 1);
      gl.uniform2f(presentResolution, width, height);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      shown = completed;
      report(completed.state.view.logZoom < -7 ? "Detail ready" : "Ready");
      // At most one frame is in flight. New input is coalesced into the latest
      // target, so rendering cost controls movement cadence instead of resolution.
      schedule();
    };
    const draw = (orbit: ReferenceOrbit | null, orbitView: DeepViewport | null, tile?: Tile) => {
      if (!active) return false;
      const state = active.state;
      const isDeep = state.view.logZoom < -7;
      if (isDeep && (!orbit || !orbitView)) return false;
      const { width: w, height: h } = active;
      gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
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
      return true;
    };
    const request = (tile?: Tile) => {
      if (destroyed || pending || !active) return;
      const state = active.state;
      const bits = precisionForZoom(state.view.logZoom);
      let view = {
        ...state.view,
        bits,
        x: rescaleFixed(state.view.x, state.view.bits, bits),
        y: rescaleFixed(state.view.y, state.view.bits, bits),
      };
      if (tile) {
        const size = Math.min(active.width, active.height);
        const x = (2 * (tile.x + tile.width / 2) - active.width) / size;
        const y =
          ((2 * (tile.y + tile.height / 2) - active.height) / size) *
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
        frame: active,
        view,
        c: [...state.c],
        iterations: iterationBudget(view, state.config.iterations),
        tile,
      };
      const { frame: _frame, ...job } = pending;
      worker.postMessage({ ...job, formula });
    };
    const inspect = (tile: Tile) => {
      gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
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
      if (destroyed || !active || pending) return;
      const tile = repairQueue.shift();
      if (tile) request(tile);
      else finish();
    };
    const inspectFrame = () => {
      if (!active) return;
      repairQueue = [];
      inspect({ x: 0, y: 0, width: active.width, height: active.height });
      repairNext();
    };
    const validReference = (state: RenderState) =>
      reference &&
      referenceView &&
      reference.c[0] === state.c[0] &&
      reference.c[1] === state.c[1] &&
      reference.iterations >= iterationBudget(state.view, state.config.iterations) &&
      reference.bits >= Math.ceil(-state.view.logZoom) + 64 &&
      referenceView.x === rescaleFixed(state.view.x, state.view.bits, referenceView.bits) &&
      referenceView.y === rescaleFixed(state.view.y, state.view.bits, referenceView.bits);
    const render = () => {
      frame = 0;
      if (destroyed || active || pending) return;
      const next = snapshot();
      if (shown && shown.key === next.key && sameView(shown.state.view, next.state.view)) return;
      active = next;
      try {
        prepare(next);
        if (next.state.view.logZoom >= -7) {
          draw(null, null);
          // Wait for this GPU frame before allowing another one to be queued.
          gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
          finish();
        } else {
          report("Refining detail…");
          if (validReference(next.state)) {
            draw(reference, referenceView);
            inspectFrame();
          } else request();
        }
      } catch (error) {
        active = null;
        report(error instanceof Error ? error.message : String(error), true);
      }
    };
    worker.onmessage = (event) => {
      if (destroyed || !pending || event.data.id !== pending.id) return;
      const job = pending;
      pending = null;
      if (job.frame !== active) {
        schedule();
        return;
      }
      if (event.data.error) {
        active = null;
        report(event.data.error, true);
        return;
      }
      if (job.tile) {
        draw(event.data.reference, job.view, job.tile);
        inspect(job.tile);
        // A failed exact-pixel repair must never become a visible frame.
        if (
          job.tile.width === 1 &&
          job.tile.height === 1 &&
          repairQueue.some((t) => t.x === job.tile?.x && t.y === job.tile?.y)
        ) {
          active = null;
          repairQueue = [];
          report("This point needs more precision. Try a nearby view.", true);
          return;
        }
        repairTimer = setTimeout(repairNext, 0);
      } else {
        reference = event.data.reference;
        referenceView = job.view;
        draw(reference, referenceView);
        inspectFrame();
      }
    };
    worker.onerror = () => {
      pending = null;
      active = null;
      report("Could not calculate this view. Reload to restart the renderer.", true);
    };
    const update = () => {
      if (destroyed) return;
      // Do not interrupt a frame for every wheel event: it must be allowed to
      // finish even under continuous input. Edits to its rendering inputs cancel it.
      if (active) {
        const current = active;
        const next = snapshot();
        const offset = viewportDelta(next.state.view, active.state.view);
        const distant =
          Math.abs(next.state.view.logZoom - active.state.view.logZoom) > 1 ||
          [offset.x, offset.y].some(
            ([mantissa, exponent]) =>
              Math.abs(mantissa) * 2 ** (exponent - current.state.view.logZoom) > 2,
          );
        // Let a new destination or a large pan escape a costly repair. Small
        // gestures still allow the current sharp frame to finish.
        if (active.key !== next.key || distant) {
          active = null;
          repairQueue = [];
          clearTimeout(repairTimer);
        }
      }
      schedule();
    };
    const redraw = () => {
      // Export hooks are synchronous. Preserve the repaired framebuffer if ready.
      // preserveDrawingBuffer retains completed repairs and makes exports synchronous.
    };
    return {
      update,
      redraw,
      getViewport: () => (shown ?? active)?.state.view ?? null,
      destroy() {
        destroyed = true;
        cancelAnimationFrame(frame);
        clearTimeout(repairTimer);
        for (const dispose of release.splice(0).reverse()) dispose();
      },
    };
  } catch (error) {
    for (const dispose of release.splice(0).reverse()) dispose();
    throw error;
  }
}
