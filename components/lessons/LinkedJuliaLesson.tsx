import { type PointerEvent, useEffect, useId, useMemo, useRef, useState } from "react";
import common from "../../styles/lessons/Lesson.module.css";
import styles from "../../styles/lessons/LinkedExperiments.module.css";
import { juliaExplorerLink, LINKED_LIMIT, quadraticEscape } from "../../utils/lessons/linkedJulia";
import { type ComplexPoint, traceTeachingOrbit } from "../../utils/orbitLesson";
import { LessonFrame, LessonSteps } from "./LessonFrame";

const ZERO = { real: 0, imaginary: 0 };
const WIDTH = 360;
const HEIGHT = 300;
const BOUNDS = { parameter: [-2, 1, -1.25, 1.25], start: [-1.8, 1.8, -1.5, 1.5] } as const;
const text = (p: ComplexPoint) =>
  `(${Number(p.real.toFixed(3))}, ${Number(p.imaginary.toFixed(3))})`;
const PRESETS = [
  { name: "Circle", c: ZERO },
  { name: "Two lobes", c: { real: -1, imaginary: 0 } },
  { name: "Rabbit", c: { real: -0.123, imaginary: 0.745 } },
  { name: "Dust", c: { real: 0.3, imaginary: 0.6 } },
];

function LinkedMap({
  mapKind,
  c,
  value,
  onChange,
  orbit,
}: {
  mapKind: "parameter" | "start";
  c: ComplexPoint;
  value: ComplexPoint;
  onChange: (point: ComplexPoint) => void;
  orbit?: ComplexPoint[];
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const pointer = useRef<number | null>(null);
  const [left, right, bottom, top] = BOUNDS[mapKind];
  const mapC = mapKind === "parameter" ? ZERO : c;
  useEffect(() => {
    const context = canvas.current?.getContext("2d");
    if (!context) return;
    const pixels = context.createImageData(WIDTH, HEIGHT);
    for (let y = 0; y < HEIGHT; y++)
      for (let x = 0; x < WIDTH; x++) {
        const p = {
          real: left + ((x + 0.5) / WIDTH) * (right - left),
          imaginary: top - ((y + 0.5) / HEIGHT) * (top - bottom),
        };
        const escapeCount = quadraticEscape(
          mapKind === "parameter" ? p : mapC,
          mapKind === "parameter" ? ZERO : p,
        );
        const shade =
          escapeCount === null ? 0 : 0.24 + 0.76 * Math.sqrt(escapeCount / LINKED_LIMIT);
        const index = (y * WIDTH + x) * 4;
        pixels.data[index] = escapeCount === null ? 16 : 245 * shade;
        pixels.data[index + 1] = escapeCount === null ? 21 : 197 * shade;
        pixels.data[index + 2] = escapeCount === null ? 26 : 109 * shade;
        pixels.data[index + 3] = 255;
      }
    context.putImageData(pixels, 0, 0);
  }, [mapKind, mapC, left, right, bottom, top]);
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
      aria-label={`${mapKind === "parameter" ? "Mandelbrot parameter" : "Julia starting point"} ${text(value)}. Drag or use arrow keys.`}
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
      <canvas ref={canvas} width={WIDTH} height={HEIGHT} />
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
  const [step, setStep] = useState(0);
  const orbit = useMemo(() => traceTeachingOrbit(c, start, false, LINKED_LIMIT), [c, start]);
  const max = orbit.length - 1;
  const shown = orbit.slice(0, Math.min(step, max) + 1);
  const current = shown[shown.length - 1];
  const escapeCount = quadraticEscape(c, start);
  const chooseC = (point: ComplexPoint) => {
    setC(point);
    setStep(0);
  };
  const chooseStart = (point: ComplexPoint) => {
    setStart(point);
    setStep(0);
  };
  return (
    <LessonFrame title="One Mandelbrot point, a whole Julia picture" kind="linked-julia">
      <p>
        Move the amber ring to choose the number to add. Every pixel in the Julia picture uses that
        same number.
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
            c = {text(c)}. Each pixel here starts at zero.
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
          />
          <p data-selected-start={`${start.real},${start.imaginary}`}>
            Start at {text(start)}. Every pixel here adds c = {text(c)}.
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
        Move the teal ring to test another starting point. Next step squares the current point and
        adds c.
      </p>
      <LessonSteps
        key={`${c.real}:${c.imaginary}:${start.real}:${start.imaginary}`}
        label="Linked Julia orbit"
        step={step}
        max={max}
        onChange={setStep}
        stepDescription={`Calculation ${step} of ${max}`}
      />
      <p aria-live="polite" data-linked-orbit={current.iteration}>
        After {current.iteration} calculation{current.iteration === 1 ? "" : "s"}:{" "}
        {text(current.point)}.{" "}
        {escapeCount !== null && step >= escapeCount
          ? "It has escaped. The rest of the route lies beyond the picture."
          : step === max
            ? "It has not escaped in 96 calculations. That does not prove it stays bounded forever."
            : "The teal dots follow this starting point."}
      </p>
      <p>
        Both pictures test {LINKED_LIMIT} calculations. Dark pixels have not escaped yet. In the
        Julia picture, the dark region approximates the filled Julia set; its edge is the Julia set.
      </p>
      <p>
        <a href={juliaExplorerLink(c)}>Explore this Julia set</a>
      </p>
    </LessonFrame>
  );
}
