import { type PointerEvent, useEffect, useId, useMemo, useRef, useState } from "react";
import common from "../../styles/lessons/Lesson.module.css";
import styles from "../../styles/lessons/LinkedExperiments.module.css";
import { JULIA_COLORING, MANDELBROT_COLORING } from "../../utils/escapeTimeColoring";
import { JULIA_PRESETS } from "../../utils/escapeTimePlaces";
import { useReducedMotion } from "../../utils/hooks/useReducedMotion";
import { juliaExplorerLink, LINKED_LIMIT, LINKED_RADIUS } from "../../utils/lessons/linkedJulia";
import { type ComplexPoint, isOutside, traceTeachingOrbit } from "../../utils/orbitLesson";
import { EscapeTimePicture } from "./EscapeTimePicture";
import { LessonFrame } from "./LessonFrame";

const ZERO = { real: 0, imaginary: 0 };
const WIDTH = 360;
const HEIGHT = 300;
const STEP_MS = 100;
// Picks closer together than this are one drag, so the orbit keeps growing through them.
const SAME_DRAG_MS = 250;
const BOUNDS = { parameter: [-2, 1, -1.25, 1.25], start: [-1.8, 1.8, -1.5, 1.5] } as const;
const text = (p: ComplexPoint) =>
  `(${Number(p.real.toFixed(3))}, ${Number(p.imaginary.toFixed(3))})`;
const PRESETS = [
  { name: "Circle", c: ZERO },
  { name: "Two lobes", c: { real: -1, imaginary: 0 } },
  {
    name: "Rabbit",
    c: { real: JULIA_PRESETS.Rabbit.cReal, imaginary: JULIA_PRESETS.Rabbit.cImag },
  },
  { name: "Dust", c: { real: 0.3, imaginary: 0.6 } },
];

function LinkedMap({
  mapKind,
  c,
  value,
  onChange,
  orbit,
  outcome = "",
}: {
  mapKind: "parameter" | "start";
  c: ComplexPoint;
  value: ComplexPoint;
  onChange: (point: ComplexPoint) => void;
  orbit?: ComplexPoint[];
  outcome?: string;
}) {
  const pointer = useRef<number | null>(null);
  const [left, right, bottom, top] = BOUNDS[mapKind];
  const select = (real: number, imaginary: number) =>
    onChange({
      real: Number(Math.max(left, Math.min(right, real)).toFixed(3)),
      imaginary: Number(Math.max(bottom, Math.min(top, imaginary)).toFixed(3)),
    });
  const move = (event: PointerEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    select(
      left + ((event.clientX - rect.left) / rect.width) * (right - left),
      top - ((event.clientY - rect.top) / rect.height) * (top - bottom),
    );
  };
  const xy = (p: ComplexPoint) => [
    ((p.real - left) / (right - left)) * WIDTH,
    ((top - p.imaginary) / (top - bottom)) * HEIGHT,
  ];
  const point = xy(value);
  const id = useId().replace(/:/g, "");
  return (
    <button
      type="button"
      className={styles.map}
      aria-label={`${mapKind === "parameter" ? "Mandelbrot parameter" : "Julia starting point"} ${text(value)}. ${outcome}Drag or use arrow keys.`}
      onPointerDown={(event) => {
        if (!event.isPrimary || event.button !== 0) return;
        event.preventDefault();
        event.currentTarget.focus({ preventScroll: true });
        pointer.current = event.pointerId;
        event.currentTarget.setPointerCapture(event.pointerId);
        move(event);
      }}
      onPointerMove={(event) => {
        if (pointer.current === event.pointerId) move(event);
      }}
      onPointerUp={(event) => {
        if (pointer.current !== event.pointerId) return;
        move(event);
        pointer.current = null;
        event.currentTarget.releasePointerCapture(event.pointerId);
      }}
      onPointerCancel={() => {
        pointer.current = null;
      }}
      onLostPointerCapture={() => {
        pointer.current = null;
      }}
      onKeyDown={(event) => {
        if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
        event.preventDefault();
        const delta = event.shiftKey ? 0.1 : 0.01;
        select(
          value.real +
            (event.key === "ArrowLeft" ? -delta : event.key === "ArrowRight" ? delta : 0),
          value.imaginary +
            (event.key === "ArrowUp" ? delta : event.key === "ArrowDown" ? -delta : 0),
        );
      }}
    >
      {mapKind === "parameter" ? (
        <EscapeTimePicture
          formula="mandelbrot"
          bounds={BOUNDS.parameter}
          coloring={MANDELBROT_COLORING}
        />
      ) : (
        <EscapeTimePicture formula="julia" bounds={BOUNDS.start} coloring={JULIA_COLORING} c={c} />
      )}
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} aria-hidden="true">
        <defs>
          <clipPath id={id}>
            <rect width={WIDTH} height={HEIGHT} />
          </clipPath>
        </defs>
        <g clipPath={`url(#${id})`}>
          {orbit && (
            <polyline
              points={orbit.map((p) => xy(p).join(",")).join(" ")}
              fill="none"
              stroke="#5ec2b7"
              strokeWidth="2"
            />
          )}
          {Array.from(new Map(orbit?.map((p) => [`${p.real}:${p.imaginary}`, p])).values()).map(
            (p) => (
              <circle
                key={`${p.real}:${p.imaginary}`}
                cx={xy(p)[0]}
                cy={xy(p)[1]}
                r="2.5"
                fill="#5ec2b7"
              />
            ),
          )}
          {orbit && orbit.length > 1 && (
            <circle
              cx={xy(orbit[orbit.length - 1])[0]}
              cy={xy(orbit[orbit.length - 1])[1]}
              r="4.5"
              fill="#eee8ce"
              stroke="#10151a"
              strokeWidth="1.5"
            />
          )}
          <circle cx={point[0]} cy={point[1]} r="7" fill="none" stroke="#10151a" strokeWidth="5" />
          <circle
            cx={point[0]}
            cy={point[1]}
            r="7"
            fill="none"
            stroke={mapKind === "parameter" ? "#f5c56d" : "#5ec2b7"}
            strokeWidth="2.5"
          />
        </g>
      </svg>
    </button>
  );
}

export default function LinkedJuliaLesson() {
  const [c, setC] = useState<ComplexPoint>({ real: -1, imaginary: 0 });
  const [start, setStart] = useState<ComplexPoint>({ real: 0.5, imaginary: 0 });
  // The whole route shows until a new starting point plays it from the start.
  const [step, setStep] = useState(LINKED_LIMIT);
  const lastPick = useRef(Number.NEGATIVE_INFINITY);
  const reducedMotion = useReducedMotion();
  const orbit = useMemo(
    () => traceTeachingOrbit(c, start, false, LINKED_LIMIT, LINKED_RADIUS),
    [c, start],
  );
  const max = orbit.length - 1;
  const shown = orbit.slice(0, Math.min(step, max) + 1);
  const end = orbit[max];
  const outcome = isOutside(end.point, LINKED_RADIUS)
    ? `Escapes after ${end.iteration} calculations. `
    : `No escape after ${end.iteration} calculations. `;
  useEffect(() => {
    if (step >= max) return;
    const timer = window.setTimeout(() => setStep(step + 1), STEP_MS);
    return () => window.clearTimeout(timer);
  }, [step, max]);
  const chooseC = (point: ComplexPoint) => {
    setC(point);
    setStep(LINKED_LIMIT);
  };
  const chooseStart = (point: ComplexPoint) => {
    if (point.real === start.real && point.imaginary === start.imaginary) return;
    const now = performance.now();
    if (!reducedMotion && now - lastPick.current > SAME_DRAG_MS) setStep(0);
    lastPick.current = now;
    setStart(point);
  };
  return (
    <LessonFrame title="One Mandelbrot point, a whole Julia picture" kind="linked-julia">
      <p>
        Drag the amber ring across the Mandelbrot picture. Watch the Julia shape change: every point
        in it now adds the number you chose.
      </p>
      <div className={common.options}>
        {PRESETS.map((preset) => (
          <button
            type="button"
            key={preset.name}
            aria-pressed={c.real === preset.c.real && c.imaginary === preset.c.imaginary}
            onClick={() => chooseC(preset.c)}
          >
            {preset.name}
          </button>
        ))}
      </div>
      <div className={styles.pair}>
        <div>
          <h3>Mandelbrot · choose the number to add</h3>
          <LinkedMap mapKind="parameter" c={ZERO} value={c} onChange={chooseC} />
          <p data-selected-parameter={`${c.real},${c.imaginary}`}>
            The amber ring chooses c = {text(c)}. Each test here starts at zero.
          </p>
          <div className={styles.coordinates}>
            {(["real", "imaginary"] as const).map((axis) => (
              <label key={axis}>
                {axis === "real" ? "Horizontal" : "Vertical"} <output>{c[axis]}</output>
                <input
                  type="range"
                  aria-label={`Julia parameter ${axis}`}
                  min={axis === "real" ? -2 : -1.25}
                  max={axis === "real" ? 1 : 1.25}
                  step="0.001"
                  value={c[axis]}
                  onChange={(e) => chooseC({ ...c, [axis]: Number(e.target.value) })}
                />
              </label>
            ))}
          </div>
        </div>
        <div>
          <h3>Julia · choose a starting point</h3>
          <LinkedMap
            mapKind="start"
            c={c}
            value={start}
            onChange={chooseStart}
            orbit={shown.map((item) => item.point)}
            outcome={outcome}
          />
          <p data-selected-start={`${start.real},${start.imaginary}`}>
            The teal ring starts at {text(start)}. The line follows each square and add.
          </p>
          <div className={styles.coordinates}>
            {(["real", "imaginary"] as const).map((axis) => (
              <label key={axis}>
                {axis === "real" ? "Horizontal" : "Vertical"} <output>{start[axis]}</output>
                <input
                  type="range"
                  aria-label={`Linked Julia start ${axis}`}
                  min={axis === "real" ? -1.8 : -1.5}
                  max={axis === "real" ? 1.8 : 1.5}
                  step="0.001"
                  value={start[axis]}
                  onChange={(e) => chooseStart({ ...start, [axis]: Number(e.target.value) })}
                />
              </label>
            ))}
          </div>
        </div>
      </div>
      <p>
        <a href={juliaExplorerLink(c)}>Explore this Julia set</a>
      </p>
    </LessonFrame>
  );
}
