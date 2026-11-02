import {
  type PointerEvent,
  type ReactNode,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import styles from "../../styles/lessons/LinkedExperiments.module.css";
import { JULIA_COLORING, MANDELBROT_COLORING } from "../../utils/escapeTimeColoring";
import { useReducedMotion } from "../../utils/hooks/useReducedMotion";
import { juliaExplorerLink, LINKED_LIMIT, LINKED_RADIUS } from "../../utils/lessons/linkedJulia";
import { type ComplexPoint, isOutside, traceUntilLoop } from "../../utils/orbitLesson";
import { EscapeTimePicture } from "./EscapeTimePicture";
import { LessonFrame } from "./LessonFrame";

const ZERO = { real: 0, imaginary: 0 };
export const MAP_WIDTH = 360;
export const MAP_HEIGHT = 300;
const STEP_MS = 100;
// Picks closer together than this are one drag, so the orbit keeps growing through them.
const SAME_DRAG_MS = 250;
const BOUNDS = { parameter: [-2, 1, -1.25, 1.25], start: [-1.8, 1.8, -1.5, 1.5] } as const;
const text = (p: ComplexPoint) =>
  `(${Number(p.real.toFixed(3))}, ${Number(p.imaginary.toFixed(3))})`;
export const parameterPixel = (p: ComplexPoint) => {
  const [left, right, bottom, top] = BOUNDS.parameter;
  return [
    ((p.real - left) / (right - left)) * MAP_WIDTH,
    ((top - p.imaginary) / (top - bottom)) * MAP_HEIGHT,
  ];
};

export function LinkedMap({
  mapKind,
  c,
  value,
  onChange,
  onRelease,
  orbit,
  loop,
  outcome = "",
  overlay,
}: {
  mapKind: "parameter" | "start";
  c: ComplexPoint;
  value: ComplexPoint;
  onChange: (point: ComplexPoint) => void;
  onRelease?: () => void;
  orbit?: ComplexPoint[];
  loop?: ComplexPoint[];
  outcome?: string;
  overlay?: ReactNode;
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
    ((p.real - left) / (right - left)) * MAP_WIDTH,
    ((top - p.imaginary) / (top - bottom)) * MAP_HEIGHT,
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
        onRelease?.();
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
      <svg viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`} aria-hidden="true">
        <defs>
          <clipPath id={id}>
            <rect width={MAP_WIDTH} height={MAP_HEIGHT} />
          </clipPath>
        </defs>
        <g clipPath={`url(#${id})`}>
          {overlay}
          {orbit && (
            <polyline
              points={orbit.map((p) => xy(p).join(",")).join(" ")}
              fill="none"
              stroke="#5ec2b7"
              strokeWidth="2"
            />
          )}
          {loop && (
            <polyline
              points={loop.map((p) => xy(p).join(",")).join(" ")}
              fill="none"
              stroke="#f5c56d"
              strokeWidth="2.5"
              data-linked-loop
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
  const { orbit, loop } = useMemo(
    () => traceUntilLoop(c, start, false, LINKED_LIMIT, LINKED_RADIUS),
    [c, start],
  );
  const max = orbit.length - 1;
  const shown = orbit.slice(0, Math.min(step, max) + 1);
  const end = orbit[max];
  const outcome = loop
    ? `Lands back on an earlier point after ${end.iteration} calculations. `
    : isOutside(end.point, LINKED_RADIUS)
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
    // A route that finished stays whole for the rest of the drag, so its loop doesn't flicker.
    else if (step >= max) setStep(LINKED_LIMIT);
    lastPick.current = now;
    setStart(point);
  };
  return (
    <LessonFrame title="One Mandelbrot point, a whole Julia picture" kind="linked-julia">
      <p>Drag either ring.</p>
      <div className={styles.pair}>
        <div>
          <h3>Mandelbrot · choose c</h3>
          <LinkedMap mapKind="parameter" c={ZERO} value={c} onChange={chooseC} />
          <p data-selected-parameter={`${c.real},${c.imaginary}`}>c = {text(c)}</p>
        </div>
        <div>
          <h3>Julia · follow a starting point</h3>
          <LinkedMap
            mapKind="start"
            c={c}
            value={start}
            onChange={chooseStart}
            orbit={shown.map((item) => item.point)}
            loop={
              loop && step >= max ? orbit.slice(loop.from).map((item) => item.point) : undefined
            }
            outcome={outcome}
          />
          <p data-selected-start={`${start.real},${start.imaginary}`}>{text(start)}</p>
        </div>
      </div>
      <p>
        <a href={juliaExplorerLink(c)}>Explore this Julia set</a>
      </p>
    </LessonFrame>
  );
}
