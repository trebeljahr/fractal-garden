import { useEffect, useId, useMemo, useRef, useState } from "react";
import styles from "../styles/OrbitLesson.module.css";
import {
  type ComplexPoint,
  ESCAPE_RADIUS,
  type OrbitFrame,
  type OrbitKind,
  TEACHING_LIMIT,
  teachingFrames,
  teachingPixelEscape,
  traceTeachingOrbit,
} from "../utils/orbitLesson";
import { LessonSteps } from "./lessons/LessonFrame";

export function isOrbitKind(value: unknown): value is OrbitKind {
  return value === "mandelbrot" || value === "julia" || value === "burning-ship";
}
const ZERO = { real: 0, imaginary: 0 };
const DEFAULTS: Record<OrbitKind, ComplexPoint> = {
  mandelbrot: { real: -1, imaginary: 0 },
  julia: { real: 0.5, imaginary: 0 },
  "burning-ship": { real: -1.76, imaginary: -0.03 },
};
const BOUNDS = {
  mandelbrot: [-2, 1, -1.3, 1.3],
  julia: [-1.8, 1.8, -1.5, 1.5],
  "burning-ship": [-2, 1, -1.8, 0.6],
} as const;
const OPERATION = { start: "Start", fold: "Fold", square: "Square", add: "Add" };

function number(value: number) {
  if (value !== 0 && (Math.abs(value) < 0.001 || Math.abs(value) > 999))
    return value.toExponential(2);
  return String(Number(value.toFixed(3)));
}
function coordinates(point: ComplexPoint) {
  return `(${number(point.real)}, ${number(point.imaginary)})`;
}
function pixelColor(escapeCount: number | null) {
  if (escapeCount === null) return "#10151a";
  const shade = 0.25 + (0.75 * escapeCount) / TEACHING_LIMIT;
  return `rgb(${245 * shade}, ${197 * shade}, ${109 * shade})`;
}
function position(point: ComplexPoint) {
  const length = Math.hypot(point.real, point.imaginary);
  const scale = length > 4.7 ? 4.7 / length : 1;
  return {
    x: 200 + point.real * scale * 35,
    y: 180 - point.imaginary * scale * 35,
    clipped: scale < 1,
  };
}
function movement(c: ComplexPoint) {
  const shifts = [
    c.real !== 0 && `${number(Math.abs(c.real))} ${c.real < 0 ? "left" : "right"}`,
    c.imaginary !== 0 && `${number(Math.abs(c.imaginary))} ${c.imaginary < 0 ? "down" : "up"}`,
  ].filter(Boolean);
  return shifts.length
    ? `Move ${shifts.join(" and ")}.`
    : "Adding zero leaves the point where it is.";
}
function instruction(frame: OrbitFrame, c: ComplexPoint, kind: OrbitKind) {
  switch (frame.operation) {
    case "start":
      return kind === "julia"
        ? "Start at the selected pixel. Next, square this point."
        : "Start at zero. The selected pixel supplies the number to add after every square.";
    case "fold":
      return frame.before.real < 0 || frame.before.imaginary < 0
        ? "Flip each negative coordinate to positive. A point on the left moves right; a point below zero moves up."
        : "Both coordinates are already zero or positive. This fold leaves the point where it is.";
    case "square":
      return frame.before.real === 0 && frame.before.imaginary === 0
        ? "Zero squared is zero. The point stays at the center."
        : "Square the distance from zero and double the angle from the right-hand axis.";
    case "add":
      return `${movement(c)} This completes one calculation. Use this result to begin the next.`;
  }
}

function PixelMap({
  kind,
  value,
  c,
  onChange,
}: {
  kind: OrbitKind;
  value: ComplexPoint;
  c: ComplexPoint;
  onChange: (point: ComplexPoint) => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [left, right, bottom, top] = BOUNDS[kind];
  const flip = kind === "burning-ship";
  useEffect(() => {
    const context = canvas.current?.getContext("2d");
    if (!context) return;
    const { width, height } = context.canvas;
    const pixels = context.createImageData(width, height);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const pixel = {
          real: left + ((x + 0.5) / width) * (right - left),
          imaginary: flip
            ? bottom + ((y + 0.5) / height) * (top - bottom)
            : top - ((y + 0.5) / height) * (top - bottom),
        };
        const escapeCount = teachingPixelEscape(kind, pixel, c);
        const index = (y * width + x) * 4;
        const shade = escapeCount === null ? 0 : 0.25 + (0.75 * escapeCount) / TEACHING_LIMIT;
        pixels.data[index] = escapeCount === null ? 16 : 245 * shade;
        pixels.data[index + 1] = escapeCount === null ? 21 : 197 * shade;
        pixels.data[index + 2] = escapeCount === null ? 26 : 109 * shade;
        pixels.data[index + 3] = 255;
      }
    }
    context.putImageData(pixels, 0, 0);
  }, [kind, c, left, right, bottom, top, flip]);
  const select = (real: number, imaginary: number) =>
    onChange({
      real: Number(Math.max(left, Math.min(right, real)).toFixed(2)),
      imaginary: Number(Math.max(bottom, Math.min(top, imaginary)).toFixed(2)),
    });
  return (
    <button
      type="button"
      className={styles.pixelMap}
      aria-label={`Selected pixel ${coordinates(value)}. Click to choose a pixel, or use the arrow keys.`}
      onClick={(event) => {
        if (event.detail === 0) return;
        const rect = event.currentTarget.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width;
        const y = (event.clientY - rect.top) / rect.height;
        select(
          left + x * (right - left),
          flip ? bottom + y * (top - bottom) : top - y * (top - bottom),
        );
      }}
      onKeyDown={(event) => {
        if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
        event.preventDefault();
        const dx = event.key === "ArrowLeft" ? -0.05 : event.key === "ArrowRight" ? 0.05 : 0;
        const dy = event.key === "ArrowUp" ? 0.05 : event.key === "ArrowDown" ? -0.05 : 0;
        select(value.real + dx, value.imaginary + (flip ? -dy : dy));
      }}
    >
      <canvas
        ref={canvas}
        width={300}
        height={Math.round((300 * (top - bottom)) / (right - left))}
      />
      <span
        className={styles.selectedPixel}
        style={{
          backgroundColor: pixelColor(teachingPixelEscape(kind, value, c)),
          left: `${((value.real - left) / (right - left)) * 100}%`,
          top: `${((flip ? value.imaginary - bottom : top - value.imaginary) / (top - bottom)) * 100}%`,
        }}
      />
    </button>
  );
}

export default function OrbitLesson({ kind }: { kind: OrbitKind }) {
  const [value, setValue] = useState(DEFAULTS[kind]);
  const [juliaC, setJuliaC] = useState(ZERO);
  const [step, setStep] = useState(0);
  const id = useId().replace(/:/g, "");
  const c = kind === "julia" ? juliaC : value;
  const start = kind === "julia" ? value : ZERO;
  const orbit = useMemo(
    () => traceTeachingOrbit(c, start, kind === "burning-ship"),
    [c, start, kind],
  );
  const frames = useMemo(() => teachingFrames(orbit), [orbit]);
  const current = frames[Math.min(step, frames.length - 1)];
  const completed =
    current.operation === "add" ? current.iteration : Math.max(0, current.iteration - 1);
  const escaped =
    current.operation === "add" &&
    Math.hypot(current.point.real, current.point.imaginary) > ESCAPE_RADIUS;
  const after = position(current.point);
  const before = position(current.before);
  const unchanged =
    current.before.real === current.point.real &&
    current.before.imaginary === current.point.imaginary;
  const update = (point: ComplexPoint) => {
    setValue(point);
    setStep(0);
  };
  const title = kind === "julia" ? "Follow one starting point" : "Calculate one pixel";
  const stage =
    current.operation === "start"
      ? "Start"
      : `Calculation ${current.iteration} · ${OPERATION[current.operation]}`;
  const presets =
    kind === "mandelbrot"
      ? [
          { label: "Repeating (c = −1)", value: { real: -1, imaginary: 0 } },
          { label: "Escaping (c = 1)", value: { real: 1, imaginary: 0 } },
        ]
      : kind === "julia"
        ? [
            { label: "Inside the circle", value: { real: 0.5, imaginary: 0 } },
            { label: "Outside the circle", value: { real: 1.25, imaginary: 0 } },
          ]
        : [
            { label: "Little ship", value: DEFAULTS[kind] },
            { label: "Nearby pixel", value: { real: -1.8, imaginary: -0.03 } },
            { label: "Repeating", value: { real: -1, imaginary: 0 } },
          ];
  const [left, right, bottom, top] = BOUNDS[kind];
  return (
    <figure className={styles.lesson} data-orbit-lesson={kind} aria-labelledby={`${id}-title`}>
      <figcaption id={`${id}-title`} className={styles.title}>
        {title}
      </figcaption>
      <fieldset className={styles.examples} aria-label="Examples">
        {presets.map((preset) => (
          <button
            type="button"
            key={preset.label}
            aria-pressed={
              value.real === preset.value.real &&
              value.imaginary === preset.value.imaginary &&
              (kind !== "julia" || juliaC.real === 0)
            }
            onClick={() => {
              if (kind === "julia") setJuliaC(ZERO);
              update(preset.value);
            }}
          >
            {preset.label}
          </button>
        ))}
        {kind === "julia" && (
          <button
            type="button"
            aria-pressed={juliaC.real === -1}
            onClick={() => {
              setJuliaC({ real: -1, imaginary: 0 });
              update(DEFAULTS.julia);
            }}
          >
            Add −1
          </button>
        )}
      </fieldset>
      <div className={styles.selection}>
        <div>
          <h3>The pixel being tested</h3>
          <PixelMap
            kind={kind}
            value={value}
            c={kind === "julia" ? juliaC : ZERO}
            onChange={update}
          />
          <p className={styles.mapCaption}>
            Click a pixel to test it. The ring shows its color enlarged.
          </p>
        </div>
        <fieldset className={styles.parameters}>
          <legend>
            {kind === "julia" ? "Starting point" : "Number to add (c)"} {coordinates(value)}
          </legend>
          {(["real", "imaginary"] as const).map((part) => (
            <label key={part}>
              <span>
                {part === "real" ? "Horizontal" : "Vertical"} <output>{number(value[part])}</output>
              </span>
              <input
                type="range"
                aria-label={`${kind === "julia" ? "Starting point" : "Number to add (c)"} ${part}`}
                min={part === "real" ? left : bottom}
                max={part === "real" ? right : top}
                step={0.01}
                value={value[part]}
                onChange={(event) => update({ ...value, [part]: Number(event.target.value) })}
              />
            </label>
          ))}
          <p>
            {kind === "julia"
              ? `Every pixel in this example uses the same c = ${coordinates(c)}.`
              : "Every pixel starts at zero. Its coordinates give the number to add each time."}
          </p>
          <p>
            The small image tests each pixel for {TEACHING_LIMIT} calculations. Dark pixels have not
            escaped yet. Lighter pixels took longer to escape.
          </p>
        </fieldset>
      </div>
      <h3>The calculation for this pixel</h3>
      <p>
        Press Next step to {kind === "burning-ship" ? "fold, square, then add" : "square, then add"}
        . The amber arrow shows each change.
      </p>
      <div className={styles.calculation}>
        <svg
          viewBox="0 0 400 360"
          role="img"
          aria-labelledby={`${id}-diagram-title ${id}-diagram-desc`}
        >
          <title id={`${id}-diagram-title`}>
            {`${stage}: ${coordinates(current.point)}`}
          </title>
          <desc id={`${id}-diagram-desc`}>
            White dots show completed calculations. The amber point shows the current result. The
            dashed circle is four units from zero. Points beyond the window are shown at its edge.
          </desc>
          <defs>
            <marker
              id={`${id}-arrow`}
              markerWidth="7"
              markerHeight="7"
              refX="5"
              refY="3"
              orient="auto"
              markerUnits="strokeWidth"
            >
              <path d="M0 0L6 3L0 6" fill="#f5c56d" />
            </marker>
          </defs>
          <path d="M25 180H375M200 20V340" className={styles.axis} />
          <circle cx="200" cy="180" r="140" className={styles.guide} />
          <text x="208" y="198" className={styles.axisLabel}>
            0
          </text>
          <text x="340" y="198" className={styles.axisLabel}>
            4
          </text>
          <text x="275" y="170" className={styles.axisLabel}>
            horizontal
          </text>
          <text x="210" y="30" className={styles.axisLabel}>
            vertical
          </text>
          <polyline
            points={orbit
              .slice(0, completed + 1)
              .map(({ point }) => {
                const p = position(point);
                return `${p.x},${p.y}`;
              })
              .join(" ")}
            className={styles.trail}
          />
          {orbit.slice(0, completed + 1).map(({ point, iteration }) => {
            const p = position(point);
            return <circle key={iteration} cx={p.x} cy={p.y} r="3" fill="#eee8ce" />;
          })}
          {current.operation === "square" && (
            <path
              d={`M${before.x} ${before.y}L200 180L${after.x} ${after.y}`}
              className={styles.guide}
            />
          )}
          {current.operation !== "start" && !unchanged && (
            <path
              d={`M${before.x} ${before.y}L${after.x} ${after.y}`}
              className={styles.change}
              markerEnd={`url(#${id}-arrow)`}
            />
          )}
          <circle cx={before.x} cy={before.y} r="6" className={styles.before} />
          <circle cx={after.x} cy={after.y} r="4" fill="#f5c56d" />
          {(after.clipped || before.clipped) && (
            <text x="200" y="353" textAnchor="middle" className={styles.axisLabel}>
              Beyond the window; see coordinates.
            </text>
          )}
        </svg>
        <LessonSteps
          key={`${value.real}:${value.imaginary}:${juliaC.real}`}
          step={step}
          max={frames.length - 1}
          onChange={setStep}
          label={title}
          stepDescription={stage}
          duration={(frames.length - 1) * 1600}
        />
        <div
          className={styles.summary}
          aria-live="polite"
          aria-atomic="true"
          data-orbit-operation={current.operation}
        >
          <h4>{stage}</h4>
          <p>{instruction(current, c, kind)}</p>
          <dl>
            {current.operation !== "start" && (
              <>
                <dt>Before</dt>
                <dd>{coordinates(current.before)}</dd>
              </>
            )}
            <dt>{current.operation === "start" ? "Starting point" : "After"}</dt>
            <dd>{coordinates(current.point)}</dd>
          </dl>
          {current.operation === "square" && current.before.imaginary === 0 && (
            <p>
              {number(current.before.real)} × {number(current.before.real)} ={" "}
              {number(current.point.real)}
            </p>
          )}
          {current.operation === "add" && (
            <p className={styles.outcome}>
              {escaped
                ? `After ${current.iteration} calculations, the result is outside the dashed circle. It will keep escaping. This pixel gets a color.`
                : step === frames.length - 1
                  ? `Still inside after ${current.iteration} calculations. This pixel stays dark in the small image. Some dark pixels escape with more calculations.`
                  : "The result is inside the dashed circle. Repeat the calculation to see whether it escapes."}
            </p>
          )}
        </div>
      </div>
      <p className={styles.caption}>
        Hollow point: before. Amber point: after. White dots mark completed calculations.
      </p>
      <p className={styles.caption}>
        The dashed circle is 4 units from zero. For these choices, a completed calculation outside
        it will keep escaping.
      </p>
      {kind === "burning-ship" && (
        <p className={styles.caption}>
          The ship image has positive vertical coordinates downward. The calculation diagram has
          them upward, so you can see the fold.
        </p>
      )}
    </figure>
  );
}
