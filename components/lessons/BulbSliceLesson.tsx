import { useEffect, useMemo, useRef, useState } from "react";
import styles from "../../styles/lessons/BulbSlice.module.css";
import common from "../../styles/lessons/Lesson.module.css";
import { watchDisplayResolution } from "../../utils/displayResolution";
import {
  type BulbPoint,
  bulbRoute,
  ROUTE_JUMPS,
  turnAroundAxis,
} from "../../utils/lessons/specialLessons";
import { createShaderProgram } from "../../utils/shaders/compileShader";
import vertexShader from "../../utils/shaders/mandelbrot.vert";
import bulbShader from "../../utils/shaders/mandelbulb.frag";
import sliceShader from "../../utils/shaders/mandelbulb-slice.frag";
import { LessonFrame } from "./LessonFrame";

// How far each flat view reaches from the center. Every offered power fits inside it.
const SPAN = 1.4;
const CUT_SHADER = `#define CUT\n${bulbShader}`;
// The camera sits this far above the horizontal, looking at the center.
const TILT = (38 * Math.PI) / 180;
const CAMERA_DISTANCE = 5.5;
const BACKGROUND = [0.063, 0.082, 0.102];
// The explorer's opening palette.
const EMBER = {
  u_paletteA: [0.65, 0.42, 0.25],
  u_paletteB: [0.35, 0.32, 0.25],
  u_paletteC: [1, 1, 1],
  u_paletteD: [0, 0.08, 0.18],
};
const START: [number, number] = [0.74, 0.42];
// The server and browser can disagree in the last digit of a cosine.
const fixed = (value: number) => value.toFixed(4);
const written = (value: number) => String(Number(value.toFixed(2))).replace("-", "−");

type Setter = (
  gl: WebGLRenderingContext,
  at: (name: string) => WebGLUniformLocation | null,
  width: number,
  height: number,
) => void;

function startPicture(
  canvas: HTMLCanvasElement,
  fragment: string,
  largestRatio: number,
  uniforms: () => Setter,
) {
  const gl = canvas.getContext("webgl", { antialias: false });
  if (!gl) return { redraw: () => {}, stop: () => {} };
  const build = () => {
    const output = createShaderProgram(gl, vertexShader, fragment);
    const buffer = gl.createBuffer();
    if (!output || !buffer) throw new Error("Could not create the Mandelbulb picture.");
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    return { ...output, buffer, position: gl.getAttribLocation(output.program, "aPosition") };
  };
  let picture: ReturnType<typeof build> | null = null;
  let frame = 0;
  const draw = () => {
    cancelAnimationFrame(frame);
    frame = 0;
    if (!picture) return;
    const ratio = Math.min(window.devicePixelRatio || 1, largestRatio);
    const width = Math.max(1, Math.round(canvas.clientWidth * ratio));
    const height = Math.max(1, Math.round(canvas.clientHeight * ratio));
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;
    // biome-ignore lint/correctness/useHookAtTopLevel: WebGL API, not a React hook
    gl.useProgram(picture.program);
    gl.bindBuffer(gl.ARRAY_BUFFER, picture.buffer);
    gl.enableVertexAttribArray(picture.position);
    gl.vertexAttribPointer(picture.position, 2, gl.FLOAT, false, 0, 0);
    gl.viewport(0, 0, width, height);
    const { program } = picture;
    uniforms()(gl, (name) => gl.getUniformLocation(program, name), width, height);
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

function ShaderPicture({
  fragment,
  uniforms,
  height,
  power,
  label,
  largestRatio = 2,
}: {
  fragment: string;
  uniforms: Setter;
  height: number;
  power: number;
  label?: string;
  largestRatio?: number;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const latest = useRef(uniforms);
  latest.current = uniforms;
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
        const picture = startPicture(element, fragment, largestRatio, () => latest.current);
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
  }, [fragment, largestRatio]);
  // biome-ignore lint/correctness/useExhaustiveDependencies: every render input invalidates the frame
  useEffect(() => {
    redraw.current();
  }, [height, power]);
  return (
    <canvas
      ref={canvas}
      width={360}
      height={360}
      role={label ? "img" : undefined}
      aria-label={label}
    />
  );
}

export default function BulbSliceLesson() {
  const [power, setPower] = useState(8);
  const [height, setHeight] = useState(0);
  const [chosen, setChosen] = useState(START);
  const pointer = useRef<number | null>(null);
  const copies = power - 1;
  const start: BulbPoint = [chosen[0], chosen[1], height];
  const routes = useMemo(
    () =>
      Array.from({ length: copies }, (_, copy) =>
        bulbRoute(turnAroundAxis(start, copy / copies), power),
      ),
    [start[0], start[1], start[2], power, copies],
  );
  const route = routes[0];
  const last = route[route.length - 1];
  const crossed = Math.hypot(...last) > 2;

  const cutUniforms: Setter = (gl, at, width, canvasHeight) => {
    const cos = Math.cos(TILT);
    const sin = Math.sin(TILT);
    // Columns: right, up, and back toward the camera. The vertical axis stays upright on screen.
    gl.uniformMatrix3fv(at("u_basis"), false, [1, 0, 0, 0, sin, cos, 0, -cos, sin]);
    gl.uniform3f(at("u_projection"), width / 2, canvasHeight / 2, width * 1.09);
    gl.uniform3f(at("u_target"), 0, 0, 0);
    gl.uniform1f(at("u_scale"), 0.5);
    gl.uniform1f(at("u_fogDistanceScale"), 2 / 96);
    gl.uniform1f(at("u_cameraDistance"), CAMERA_DISTANCE);
    gl.uniform1f(at("u_power"), power);
    gl.uniform1f(at("u_detail"), 12);
    gl.uniform1f(at("u_cut"), height);
    gl.uniform3fv(at("u_background"), BACKGROUND);
    gl.uniform3f(at("u_color"), 0.953, 0.71, 0.38);
    gl.uniform1f(at("u_solid"), 0);
    gl.uniform1f(at("u_shadows"), 0);
    for (const [name, value] of Object.entries(EMBER)) gl.uniform3fv(at(name), value);
  };
  const sliceUniforms: Setter = (gl, at, width, canvasHeight) => {
    gl.uniform2f(at("u_resolution"), width, canvasHeight);
    gl.uniform1f(at("u_span"), SPAN);
    gl.uniform1f(at("u_height"), height);
    gl.uniform1f(at("u_power"), power);
  };

  const pointAt = (event: React.PointerEvent<HTMLButtonElement>): [number, number] => {
    const rect = event.currentTarget.getBoundingClientRect();
    const across = (event.clientX - rect.left) / rect.width;
    const down = (event.clientY - rect.top) / rect.height;
    const limit = (value: number) => Math.max(-SPAN, Math.min(SPAN, value));
    return [limit(-SPAN + across * 2 * SPAN), limit(SPAN - down * 2 * SPAN)];
  };

  return (
    <LessonFrame title="Cut the bulb" kind="bulb-slice">
      <div className={styles.views}>
        <div>
          <div className={styles.label}>Everything above the cut removed</div>
          <div className={styles.picture}>
            <ShaderPicture
              fragment={CUT_SHADER}
              uniforms={cutUniforms}
              height={height}
              power={power}
              label={`The Mandelbulb at power ${power}, with everything above height ${written(height)} removed.`}
              largestRatio={1.5}
            />
          </div>
        </div>
        <div>
          <div className={styles.label}>The cut, seen from above. Pick a point.</div>
          <button
            type="button"
            className={styles.picture}
            aria-label={`Chosen point (${written(chosen[0])}, ${written(chosen[1])}) at height ${written(height)}, with its ${copies} matching routes. Click or drag to choose another, or use the arrow keys.`}
            onPointerDown={(event) => {
              if (!event.isPrimary || event.button !== 0) return;
              pointer.current = event.pointerId;
              event.currentTarget.setPointerCapture(event.pointerId);
              setChosen(pointAt(event));
            }}
            onPointerMove={(event) => {
              if (pointer.current === event.pointerId) setChosen(pointAt(event));
            }}
            onPointerUp={(event) => {
              if (pointer.current !== event.pointerId) return;
              pointer.current = null;
              event.currentTarget.releasePointerCapture(event.pointerId);
            }}
            onPointerCancel={() => {
              pointer.current = null;
            }}
            onKeyDown={(event) => {
              const moves: Record<string, [number, number]> = {
                ArrowLeft: [-0.02, 0],
                ArrowRight: [0.02, 0],
                ArrowUp: [0, 0.02],
                ArrowDown: [0, -0.02],
              };
              const move = moves[event.key];
              if (!move) return;
              event.preventDefault();
              setChosen(([x, y]) => [x + move[0], y + move[1]]);
            }}
          >
            <ShaderPicture
              fragment={sliceShader}
              uniforms={sliceUniforms}
              height={height}
              power={power}
            />
            <svg viewBox={`${-SPAN} ${-SPAN} ${2 * SPAN} ${2 * SPAN}`} aria-hidden="true">
              {routes.map((points, copy) => {
                const line = points
                  .map(([x, y], index) => `${index ? "L" : "M"}${fixed(x)} ${fixed(-y)}`)
                  .join("");
                return (
                  // biome-ignore lint/suspicious/noArrayIndexKey: A copy is one turn around the axis.
                  <g key={copy} fill="none">
                    <path d={line} stroke="#10151a" strokeWidth={copy ? 0.018 : 0.03} />
                    <path
                      d={line}
                      stroke={copy ? "#eee8ce" : "#ffffff"}
                      strokeWidth={copy ? 0.008 : 0.016}
                    />
                    <circle
                      cx={fixed(points[0][0])}
                      cy={fixed(-points[0][1])}
                      r={copy ? 0.022 : 0.034}
                      fill={copy ? "#eee8ce" : "#ffffff"}
                      stroke="#10151a"
                      strokeWidth={0.01}
                    />
                  </g>
                );
              })}
            </svg>
          </button>
        </div>
      </div>
      <p className={styles.readout} aria-live="polite" data-bulb-readout>
        Power {power} · {copies} matching {copies === 1 ? "route" : "routes"} ·{" "}
        {crossed
          ? `distance passes 2 on jump ${route.length}`
          : `still within 2 after ${ROUTE_JUMPS} jumps`}
      </p>
      <div className={styles.sliders}>
        <label className={common.parameter}>
          <span>
            Height
            <output>{written(height)}</output>
          </span>
          <input
            type="range"
            aria-label="Height of the cut"
            min={-1.2}
            max={1.2}
            step={0.01}
            value={height}
            onChange={(event) => setHeight(Number(event.target.value))}
          />
        </label>
        <label className={common.parameter}>
          <span>
            Power
            <output>{power}</output>
          </span>
          <input
            type="range"
            aria-label="Power"
            min={2}
            max={10}
            value={power}
            onChange={(event) => setPower(Number(event.target.value))}
          />
        </label>
      </div>
    </LessonFrame>
  );
}
