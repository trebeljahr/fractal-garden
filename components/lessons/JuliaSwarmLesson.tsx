import { useEffect, useMemo, useRef, useState } from "react";
import styles from "../../styles/lessons/LinkedExperiments.module.css";
import { JULIA_COLORING } from "../../utils/escapeTimeColoring";
import { JULIA_PRESETS } from "../../utils/escapeTimePlaces";
import { useLessonPlayback } from "../../utils/hooks/useLessonPlayback";
import { useReducedMotion } from "../../utils/hooks/useReducedMotion";
import {
  attractingLoop,
  BULB_LOOPS,
  pickBulb,
  SWARM_BOUNDS,
  SWARM_JUMPS,
  swarmStarts,
  traceSwarm,
} from "../../utils/lessons/juliaSwarm";
import { juliaExplorerLink } from "../../utils/lessons/linkedJulia";
import type { ComplexPoint } from "../../utils/orbitLesson";
import { EscapeTimePicture } from "./EscapeTimePicture";
import { LessonFrame, LessonStepControls } from "./LessonFrame";
import { LinkedMap, MAP_HEIGHT, MAP_WIDTH, parameterPixel } from "./LinkedJuliaLesson";

const RABBIT = { real: JULIA_PRESETS.Rabbit.cReal, imaginary: JULIA_PRESETS.Rabbit.cImag };
const HEART = { real: -0.1, imaginary: 0.3 };
const STARTS = swarmStarts();
const DOTS = STARTS.length / 2;
const ZERO = { real: 0, imaginary: 0 };
const [LEFT, RIGHT, BOTTOM, TOP] = SWARM_BOUNDS;
// The first jumps move the most, so they play slowly enough to follow.
const hopMs = (step: number) => (step <= 6 ? 620 : 200);
const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
const text = (p: ComplexPoint) =>
  `(${Number(p.real.toFixed(3))}, ${Number(p.imaginary.toFixed(3))})`;

function paintDots(canvas: HTMLCanvasElement, trace: Float64Array, step: number, t: number) {
  const context = canvas.getContext("2d");
  if (!context) return;
  const scale = window.devicePixelRatio || 1;
  const width = Math.round(canvas.clientWidth * scale);
  const height = Math.round(canvas.clientHeight * scale);
  if (canvas.width !== width) canvas.width = width;
  if (canvas.height !== height) canvas.height = height;
  context.clearRect(0, 0, width, height);
  context.fillStyle = "#eee8ce";
  context.strokeStyle = "#10151a";
  context.lineWidth = 0.5 * scale;
  const radius = Math.max(1.3, canvas.clientWidth / 320) * scale;
  const to = step * DOTS * 2;
  const from = Math.max(0, step - 1) * DOTS * 2;
  context.beginPath();
  for (let dot = 0; dot < DOTS; dot++) {
    const x1 = trace[to + dot * 2];
    if (Number.isNaN(x1)) continue;
    const y1 = trace[to + dot * 2 + 1];
    const x = trace[from + dot * 2] + (x1 - trace[from + dot * 2]) * t;
    const y = trace[from + dot * 2 + 1] + (y1 - trace[from + dot * 2 + 1]) * t;
    const px = ((x - LEFT) / (RIGHT - LEFT)) * width;
    const py = ((TOP - y) / (TOP - BOTTOM)) * height;
    context.moveTo(px + radius, py);
    context.arc(px, py, radius, 0, Math.PI * 2);
  }
  context.fill();
  context.stroke();
}

function placesText(loop: ComplexPoint[] | null) {
  if (!loop) return "No loop found";
  return loop.length === 1 ? "1 place" : `${loop.length} places`;
}

export default function JuliaSwarmLesson({ linked = false }: { linked?: boolean }) {
  const [c, setC] = useState<ComplexPoint>(linked ? HEART : RABBIT);
  const [motion, setMotion] = useState({ step: 0, animate: false });
  const dots = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();
  const loop = useMemo(() => attractingLoop(c), [c]);
  const trace = useMemo(() => traceSwarm(c, STARTS), [c]);
  const goTo = (next: number) =>
    setMotion({ step: next, animate: next === motion.step + 1 && !reduced });
  const playback = useLessonPlayback(motion.step, SWARM_JUMPS, goTo, hopMs(motion.step + 1) + 40);

  useEffect(() => {
    const canvas = dots.current;
    if (!canvas) return;
    const begun = performance.now();
    const duration = hopMs(motion.step);
    let frame = requestAnimationFrame(function draw(now) {
      const t = motion.animate ? Math.max(0, Math.min(1, (now - begun) / duration)) : 1;
      paintDots(canvas, trace, motion.step, ease(t));
      if (t < 1) frame = requestAnimationFrame(draw);
    });
    const resized = new ResizeObserver(() => paintDots(canvas, trace, motion.step, 1));
    resized.observe(canvas);
    return () => {
      cancelAnimationFrame(frame);
      resized.disconnect();
    };
  }, [trace, motion]);

  const xy = (p: ComplexPoint) => [
    ((p.real - LEFT) / (RIGHT - LEFT)) * MAP_WIDTH,
    ((TOP - p.imaginary) / (TOP - BOTTOM)) * MAP_HEIGHT,
  ];
  const picture = (
    <div
      className={`${styles.map} ${styles.stage}`}
      role="img"
      aria-label={`Julia picture with ${DOTS} dots after ${motion.step} jumps. ${placesText(loop)}.`}
      data-swarm-picture
    >
      <EscapeTimePicture formula="julia" bounds={SWARM_BOUNDS} coloring={JULIA_COLORING} c={c} />
      <canvas ref={dots} className={styles.dots} />
      <svg viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`} aria-hidden="true">
        {loop?.map((place) => {
          const [x, y] = xy(place);
          return (
            <g key={`${place.real}:${place.imaginary}`}>
              <circle cx={x} cy={y} r="6" fill="none" stroke="#10151a" strokeWidth="4" />
              <circle cx={x} cy={y} r="6" fill="none" stroke="#f5c56d" strokeWidth="2" />
            </g>
          );
        })}
      </svg>
    </div>
  );
  const controls = (
    <LessonStepControls
      step={motion.step}
      max={SWARM_JUMPS}
      playback={playback}
      label="Starting points"
      stepDescription={motion.step === 0 ? "Start" : `Jump ${motion.step}`}
    />
  );
  if (!linked) {
    return (
      <LessonFrame title="Many starting points at once" kind="julia-swarm">
        {controls}
        <div className={styles.solo}>{picture}</div>
      </LessonFrame>
    );
  }
  return (
    <LessonFrame title="One Mandelbrot point, one loop" kind="julia-loops">
      {controls}
      <div className={styles.pair}>
        <div>
          <h3>Mandelbrot · choose c</h3>
          <LinkedMap
            mapKind="parameter"
            c={ZERO}
            value={c}
            onChange={(point) => {
              setC(pickBulb(point));
              playback.change(SWARM_JUMPS);
            }}
            onRelease={playback.play}
            overlay={BULB_LOOPS.map(({ places, at }) => {
              const [x, y] = parameterPixel(at);
              return (
                <text key={`${at.real}:${at.imaginary}`} x={x} y={y} className={styles.bulbNumber}>
                  {places}
                </text>
              );
            })}
          />
          <p data-selected-parameter={`${c.real},${c.imaginary}`}>c = {text(c)}</p>
        </div>
        <div>
          <h3>Julia · {DOTS} starting points</h3>
          {picture}
          <p data-loop-places={loop?.length ?? 0}>{placesText(loop)}</p>
        </div>
      </div>
      <p>
        <a href={juliaExplorerLink(c)}>Explore this Julia set</a>
      </p>
    </LessonFrame>
  );
}
