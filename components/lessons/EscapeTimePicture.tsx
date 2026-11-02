import { useEffect, useRef } from "react";
import type { EscapeFormula } from "../../utils/deepZoom/orbit";
import { watchDisplayResolution } from "../../utils/displayResolution";
import {
  type EscapeTimeColoring,
  getColoringLocations,
  setColoringUniforms,
} from "../../utils/escapeTimeColoring";
import type { ComplexPoint } from "../../utils/orbitLesson";
import { createShaderProgram } from "../../utils/shaders/compileShader";
import escapeShader from "../../utils/shaders/escape-time.frag";
import vertexShader from "../../utils/shaders/mandelbrot.vert";

type Bounds = readonly [left: number, right: number, bottom: number, top: number];
type View = { bounds: Bounds; c: ComplexPoint; coloring: EscapeTimeColoring };

const ZERO = { real: 0, imaginary: 0 };

/** Draws with the explorer's shader. Returns a redraw and a cleanup. */
function startPicture(canvas: HTMLCanvasElement, formula: string, view: () => View) {
  const gl = canvas.getContext("webgl", { antialias: false });
  if (!gl) return { redraw: () => {}, stop: () => {} };
  const define = `#define FORMULA_${formula.replace("-", "_").toUpperCase()}\n`;
  const build = () => {
    const output = createShaderProgram(gl, vertexShader, define + escapeShader);
    const buffer = gl.createBuffer();
    if (!output || !buffer) throw new Error("Could not create the fractal picture.");
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const location = (name: string) => gl.getUniformLocation(output.program, name);
    return {
      ...output,
      buffer,
      position: gl.getAttribLocation(output.program, "aPosition"),
      coloring: getColoringLocations(gl, output.program),
      resolution: location("u_resolution"),
      logPixelScale: location("u_logPixelScale"),
      center: location("u_center"),
      zoomSize: location("u_zoomSize"),
      c: location("u_c"),
    };
  };
  let picture: ReturnType<typeof build> | null = null;
  let frame = 0;
  const draw = () => {
    cancelAnimationFrame(frame);
    frame = 0;
    if (!picture) return;
    const { bounds, c, coloring } = view();
    const [left, right, bottom, top] = bounds;
    const width = Math.max(1, Math.round(canvas.clientWidth * (window.devicePixelRatio || 1)));
    const height = Math.max(1, Math.round((width * (top - bottom)) / (right - left)));
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;
    // biome-ignore lint/correctness/useHookAtTopLevel: WebGL API, not a React hook
    gl.useProgram(picture.program);
    gl.bindBuffer(gl.ARRAY_BUFFER, picture.buffer);
    gl.enableVertexAttribArray(picture.position);
    gl.vertexAttribPointer(picture.position, 2, gl.FLOAT, false, 0, 0);
    gl.viewport(0, 0, width, height);
    gl.uniform2f(picture.resolution, width, height);
    gl.uniform1f(picture.logPixelScale, 0);
    gl.uniform2f(picture.center, (left + right) / 2, (bottom + top) / 2);
    gl.uniform1f(picture.zoomSize, Math.min(right - left, top - bottom) / 2);
    gl.uniform2f(picture.c, c.real, c.imaginary);
    setColoringUniforms(gl, picture.coloring, coloring);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };
  const setup = () => {
    try {
      picture = build();
      draw();
    } catch (error) {
      console.error(error);
    }
  };
  const lost = (event: Event) => {
    event.preventDefault();
    picture = null;
  };
  setup();
  canvas.addEventListener("webglcontextlost", lost);
  canvas.addEventListener("webglcontextrestored", setup);
  const resized = new ResizeObserver(draw);
  resized.observe(canvas);
  const stopWatchingResolution = watchDisplayResolution(draw);
  return {
    redraw: () => {
      if (!frame) frame = requestAnimationFrame(draw);
    },
    stop: () => {
      cancelAnimationFrame(frame);
      resized.disconnect();
      stopWatchingResolution();
      canvas.removeEventListener("webglcontextlost", lost);
      canvas.removeEventListener("webglcontextrestored", setup);
      if (picture) {
        gl.deleteBuffer(picture.buffer);
        gl.deleteProgram(picture.program);
        gl.deleteShader(picture.vert);
        gl.deleteShader(picture.frag);
      }
    },
  };
}

export function EscapeTimePicture({
  formula,
  bounds,
  coloring,
  c = ZERO,
}: {
  formula: EscapeFormula;
  bounds: Bounds;
  coloring: EscapeTimeColoring;
  c?: ComplexPoint;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const view = useRef<View>({ bounds, c, coloring });
  view.current = { bounds, c, coloring };
  const redraw = useRef(() => {});
  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    let stop = () => {};
    // Lessons sit far below the explorer. Compile only when one comes near the screen.
    const nearby = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        nearby.disconnect();
        const picture = startPicture(element, formula, () => view.current);
        redraw.current = picture.redraw;
        stop = picture.stop;
      },
      { rootMargin: "100% 0px" },
    );
    nearby.observe(element);
    return () => {
      nearby.disconnect();
      stop();
      redraw.current = () => {};
    };
  }, [formula]);
  // biome-ignore lint/correctness/useExhaustiveDependencies: every render input invalidates the frame
  useEffect(() => {
    redraw.current();
  }, [c.real, c.imaginary, bounds, coloring]);
  const [left, right, bottom, top] = bounds;
  return (
    <canvas ref={canvas} width={360} height={Math.round((360 * (top - bottom)) / (right - left))} />
  );
}
