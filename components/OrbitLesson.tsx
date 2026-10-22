import { useId, useState } from "react";
import styles from "../styles/ConstructionDemo.module.css";
import { type ComplexPoint, traceTeachingOrbit } from "../utils/orbitLesson";

export type OrbitKind = "mandelbrot" | "julia" | "burning-ship";
export function isOrbitKind(value: unknown): value is OrbitKind {
  return value === "mandelbrot" || value === "julia" || value === "burning-ship";
}

const DEFAULTS: Record<OrbitKind, ComplexPoint> = {
  mandelbrot: { real: -1, imaginary: 0 },
  julia: { real: 0.2, imaginary: 0.1 },
  "burning-ship": { real: -1.76, imaginary: -0.03 },
};
function format(point: ComplexPoint) {
  return `${point.real.toFixed(3)} ${point.imaginary < 0 ? "−" : "+"} ${Math.abs(point.imaginary).toFixed(3)}i`;
}
function position(point: ComplexPoint) {
  const length = Math.hypot(point.real, point.imaginary);
  const scale = length > 4.65 ? 4.65 / length : 1;
  return {
    x: 240 + point.real * scale * 32,
    y: 160 - point.imaginary * scale * 32,
    clipped: scale < 1,
  };
}

export default function OrbitLesson({ kind }: { kind: OrbitKind }) {
  const [value, setValue] = useState(DEFAULTS[kind]);
  const [step, setStep] = useState(0);
  const id = useId();
  const c = kind === "julia" ? { real: -0.8, imaginary: 0.156 } : value;
  const start = kind === "julia" ? value : { real: 0, imaginary: 0 };
  const orbit = traceTeachingOrbit(c, start, kind === "burning-ship");
  const lastStep = orbit.length - 1;
  const current = orbit[step];
  const escaped = Math.hypot(current.point.real, current.point.imaginary) > 4;
  const latest = position(current.point);
  const folded = current.folded && position(current.folded);
  const previous = step > 0 ? position(orbit[step - 1].point) : null;
  const title =
    kind === "julia"
      ? "Move the starting point"
      : kind === "burning-ship"
        ? "Fold before squaring"
        : "Follow one point's orbit";
  const update = (part: keyof ComplexPoint, next: number) => {
    setValue((old) => ({ ...old, [part]: next }));
    setStep(0);
  };
  return (
    <figure className={styles.demo} data-orbit-lesson={kind}>
      <figcaption id={`${id}-title`} className={styles.title}>
        {title}
      </figcaption>
      <p className={styles.lessonIntro}>
        {kind === "julia"
          ? "Keep c fixed and move z₀. Each starting point corresponds to a different pixel in the Julia image."
          : "Choose c, then follow z from zero. Each value of c corresponds to a different pixel in the main image."}
      </p>
      <div className={styles.explanation}>
        <svg viewBox="0 0 480 320" role="img" aria-labelledby={`${id}-title ${id}-summary`}>
          <title>{`Complex-plane orbit, step ${step}. Dashed circle has radius four.`}</title>
          <path d="M70 160H410M240 12V308" className={styles.guide} fill="none" />
          <circle cx="240" cy="160" r="128" className={styles.guide} fill="none" />
          <text x="382" y="152" className={styles.axisLabel}>
            real
          </text>
          <text x="250" y="26" className={styles.axisLabel}>
            imaginary
          </text>
          <text x="374" y="180" className={styles.axisLabel}>
            4
          </text>
          <polyline
            points={orbit
              .slice(0, step + 1)
              .map(({ point }) => {
                const p = position(point);
                return `${p.x},${p.y}`;
              })
              .join(" ")}
            className={styles.line}
            fill="none"
          />
          {orbit.slice(0, step + 1).map(({ point, iteration }) => {
            const p = position(point);
            return <circle key={iteration} cx={p.x} cy={p.y} r="3" className={styles.solid} />;
          })}
          {folded && previous && (
            <>
              <path
                d={`M${previous.x} ${previous.y}L${folded.x} ${folded.y}`}
                className={styles.foldLine}
                fill="none"
              />
              <circle cx={folded.x} cy={folded.y} r="7" className={styles.foldLine} fill="none" />
            </>
          )}
          <circle cx={latest.x} cy={latest.y} r="5" className={styles.orbitPoint} />
          {latest.clipped && (
            <text x="240" y="307" textAnchor="middle" className={styles.axisLabel}>
              Current point is beyond this window.
            </text>
          )}
        </svg>
        <div
          id={`${id}-summary`}
          className={styles.orbitSummary}
          aria-live="polite"
          aria-atomic="true"
        >
          <p>
            <strong>
              z{step} = {format(current.point)}
            </strong>
          </p>
          {current.folded && (
            <p>
              Before squaring, absolute values give {format(current.folded)}. The dashed amber line
              shows this fold.
            </p>
          )}
          <p>
            {escaped
              ? "This orbit escaped past radius 4."
              : step === lastStep
                ? "No escape in these 12 steps. This short test does not prove that the orbit stays bounded forever."
                : "Inside radius 4 so far. Take another step to see what happens."}
          </p>
          {latest.clipped && (
            <p>
              The amber point marks the direction of the full coordinate shown above; its distance
              is clipped.
            </p>
          )}
        </div>
      </div>
      <fieldset className={styles.controls} aria-label={`${title} steps`}>
        <button type="button" disabled={step === 0} onClick={() => setStep(step - 1)}>
          Previous
        </button>
        <span className={styles.step}>
          Step {step} of {lastStep}
        </span>
        <button type="button" disabled={step === lastStep} onClick={() => setStep(step + 1)}>
          Next step
        </button>
      </fieldset>
      <fieldset className={styles.parameters}>
        <legend>{kind === "julia" ? "Starting point z₀" : "Parameter c"}</legend>
        {(["real", "imaginary"] as const).map((part) => (
          <label key={part} className={styles.angle}>
            <span>
              {part === "real" ? "Real part" : "Imaginary part"}
              <output>{value[part].toFixed(2)}</output>
            </span>
            <input
              type="range"
              aria-label={`${kind === "julia" ? "Starting point" : "Parameter c"} ${part}`}
              min={part === "real" ? -2 : -1}
              max={1}
              step={0.01}
              value={value[part]}
              onChange={(event) => update(part, Number(event.target.value))}
            />
          </label>
        ))}
        <p className={styles.lessonIntro}>
          {kind === "julia" ? `Fixed c = ${format(c)}.` : "Starting point z₀ = 0."} This lesson
          stops after an escape beyond radius 4. Points beyond radius 4.65 are shown at that outer
          radius. The main image uses radius 256 for its escape coloring.
        </p>
      </fieldset>
    </figure>
  );
}
