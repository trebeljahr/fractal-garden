import {
  type PointerEvent,
  type ReactNode,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { flushSync } from "react-dom";
import styles from "../../styles/lessons/LinkedExperiments.module.css";
import { JULIA_COLORING, MANDELBROT_COLORING } from "../../utils/escapeTimeColoring";
import { LINKED_LIMIT, LINKED_RADIUS } from "../../utils/lessons/linkedJulia";
import { type ComplexPoint, isOutside, traceUntilLoop } from "../../utils/orbitLesson";
import { EscapeTimePicture } from "./EscapeTimePicture";
import { LessonFrame } from "./LessonFrame";

const ZERO = { real: 0, imaginary: 0 };
export const MAP_WIDTH = 360;
export const MAP_HEIGHT = 300;
// Safari reports a small move before it starts a scroll, so a finger must clearly go sideways.
const SIDEWAYS_SLIDE_PX = 10;
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
  onHover,
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
  onHover?: (point: ComplexPoint | null) => void;
  onRelease?: () => void;
  orbit?: ComplexPoint[];
  loop?: ComplexPoint[];
  outcome?: string;
  overlay?: ReactNode;
}) {
  const button = useRef<HTMLButtonElement>(null);
  const pointer = useRef<{ id: number; x: number; y: number; picking: boolean } | null>(null);
  // Once a finger slides sideways it can go anywhere on the picture without scrolling the page.
  // React's own touch listeners are passive and can't stop a scroll.
  useEffect(() => {
    const element = button.current;
    if (!element) return;
    const holdPage = (event: TouchEvent) => {
      if (pointer.current?.picking && event.cancelable) event.preventDefault();
    };
    element.addEventListener("touchmove", holdPage, { passive: false });
    return () => element.removeEventListener("touchmove", holdPage);
  }, []);
  const [left, right, bottom, top] = BOUNDS[mapKind];
  const clamped = (real: number, imaginary: number) => ({
    real: Number(Math.max(left, Math.min(right, real)).toFixed(3)),
    imaginary: Number(Math.max(bottom, Math.min(top, imaginary)).toFixed(3)),
  });
  const under = (event: PointerEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return clamped(
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
      ref={button}
      type="button"
      className={styles.map}
      aria-label={`${mapKind === "parameter" ? "Mandelbrot parameter" : "Julia starting point"} ${text(value)}. ${outcome}${onHover ? "Move the pointer" : "Drag"} or use arrow keys.`}
      onPointerDown={(event) => {
        if (!event.isPrimary || event.button !== 0) return;
        const mouse = event.pointerType === "mouse";
        pointer.current = {
          id: event.pointerId,
          x: event.clientX,
          y: event.clientY,
          picking: mouse,
        };
        event.currentTarget.setPointerCapture(event.pointerId);
        // A finger may be starting to scroll, so it picks only when it slides sideways or lifts.
        if (mouse) onChange(under(event));
      }}
      onPointerMove={(event) => {
        const press = pointer.current;
        if (press?.id === event.pointerId) {
          const sideways = Math.abs(event.clientX - press.x);
          if (sideways > SIDEWAYS_SLIDE_PX && sideways > Math.abs(event.clientY - press.y))
            press.picking = true;
          if (press.picking) onChange(under(event));
        }
        // React would otherwise commit after this frame paints, one frame behind the pointer.
        else if (onHover && event.pointerType !== "touch") flushSync(() => onHover(under(event)));
      }}
      onPointerLeave={(event) => {
        if (event.pointerType !== "touch" && pointer.current === null) onHover?.(null);
      }}
      onPointerUp={(event) => {
        if (pointer.current?.id !== event.pointerId) return;
        onChange(under(event));
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
        onChange(
          clamped(
            value.real +
              (event.key === "ArrowLeft" ? -delta : event.key === "ArrowRight" ? delta : 0),
            value.imaginary +
              (event.key === "ArrowUp" ? delta : event.key === "ArrowDown" ? -delta : 0),
          ),
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

// A pointer over a picture tries a spot out. Leaving brings back the spot that was kept.
function useTriedPoint(first: ComplexPoint) {
  const [kept, setKept] = useState(first);
  const [tried, setTried] = useState<ComplexPoint | null>(null);
  const keep = (point: ComplexPoint) => {
    setKept(point);
    setTried(null);
  };
  return { value: tried ?? kept, keep, tryOut: setTried };
}

export default function LinkedJuliaLesson() {
  const c = useTriedPoint({ real: -1, imaginary: 0 });
  const start = useTriedPoint({ real: 0.5, imaginary: 0 });
  const { orbit, loop } = useMemo(
    () => traceUntilLoop(c.value, start.value, false, LINKED_LIMIT, LINKED_RADIUS),
    [c.value, start.value],
  );
  const end = orbit[orbit.length - 1];
  const outcome = loop
    ? `Lands back on an earlier point after ${end.iteration} calculations. `
    : isOutside(end.point, LINKED_RADIUS)
      ? `Escapes after ${end.iteration} calculations. `
      : `No escape after ${end.iteration} calculations. `;
  return (
    <LessonFrame title="One Mandelbrot point, a whole Julia picture" kind="linked-julia">
      <p>Move your pointer over either picture. Click or tap to keep a spot.</p>
      <div className={styles.pair}>
        <div>
          <h3>Mandelbrot · choose c</h3>
          <LinkedMap
            mapKind="parameter"
            c={ZERO}
            value={c.value}
            onChange={c.keep}
            onHover={c.tryOut}
          />
          <p data-selected-parameter={`${c.value.real},${c.value.imaginary}`}>
            c = {text(c.value)}
          </p>
        </div>
        <div>
          <h3>Julia · follow a starting point</h3>
          <LinkedMap
            mapKind="start"
            c={c.value}
            value={start.value}
            onChange={start.keep}
            onHover={start.tryOut}
            orbit={orbit.map((item) => item.point)}
            loop={loop ? orbit.slice(loop.from).map((item) => item.point) : undefined}
            outcome={outcome}
          />
          <p data-selected-start={`${start.value.real},${start.value.imaginary}`}>
            {text(start.value)}
          </p>
        </div>
      </div>
    </LessonFrame>
  );
}
