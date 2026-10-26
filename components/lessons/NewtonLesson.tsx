import { useId, useState } from "react";
import common from "../../styles/lessons/Lesson.module.css";
import styles from "../../styles/lessons/NewtonLesson.module.css";
import {
  NEWTON_ROOTS,
  type NewtonPoint,
  type NewtonState,
  type NewtonTraceState,
  nearestNewtonRoot,
  realNewtonTangent,
  traceNewton,
} from "../../utils/lessons/newtonLesson";
import { LessonFrame, LessonSteps } from "./LessonFrame";

type Mode = "real" | "complex";
const REAL_STARTS = [2, 0.5, 0];
const COMPLEX_STARTS = [
  { label: "Near root 1", point: { real: 1.2, imaginary: 0.2 } },
  { label: "Near root 2", point: { real: -0.7, imaginary: 0.6 } },
  { label: "Near root 3", point: { real: -0.7, imaginary: -0.6 } },
  { label: "Zero slope", point: { real: 0, imaginary: 0 } },
];
const samePoint = (a: NewtonPoint, b: NewtonPoint) =>
  a.real === b.real && a.imaginary === b.imaginary;
const format = (point: NewtonPoint) =>
  `${point.real.toFixed(5)} ${point.imaginary < 0 ? "−" : "+"} ${Math.abs(point.imaginary).toFixed(5)}i`;

function stopDescription(state: NewtonState, step: number) {
  if (state.reason === "root")
    return `The guess is within 0.0008 of root ${state.root + 1}, close enough to stop this demonstration.`;
  if (state.reason === "slope")
    return "The slope is zero or too close to zero. Dividing by it cannot give us the next guess, so this calculation stops.";
  if (state.reason === "unstable")
    return "The numbers are too large for this diagram to keep calculating. It stops without finding a root.";
  if (state.reason === "limit")
    return `After ${step} steps, the guess still is not close enough to a root. More steps might give a different result.`;
  return "Take the next step to calculate a new guess.";
}

function realPosition(x: number, y: number) {
  return { x: 50 + ((x + 0.25) / 2.5) * 380, y: 22 + ((8 - y) / 9.5) * 250 };
}
function complexPosition(point: NewtonPoint) {
  return { x: 240 + point.real * 76, y: 160 - point.imaginary * 76 };
}
function clippedPosition(point: NewtonPoint) {
  const scale = Math.min(1, 2.35 / Math.abs(point.real), 1.65 / Math.abs(point.imaginary));
  return {
    x: 240 + point.real * scale * 76,
    y: 160 - point.imaginary * scale * 76,
    clipped: scale < 1,
  };
}

function RealPlot({ state, next, id }: { state: NewtonState; next?: NewtonState; id: string }) {
  const x = state.point.real;
  const tangent = realNewtonTangent(x);
  const current = realPosition(x, tangent.value);
  const intercept = tangent.intercept === null ? null : realPosition(tangent.intercept, 0);
  const curve = Array.from({ length: 101 }, (_, index) => {
    const value = -0.25 + index / 40;
    const p = realPosition(value, value ** 3 - 1);
    return `${index ? "L" : "M"}${p.x},${p.y}`;
  }).join(" ");
  const yAxis = realPosition(0, 0);
  const left = realPosition(-0.25, tangent.value + tangent.slope * (-0.25 - x));
  const right = realPosition(2.25, tangent.value + tangent.slope * (2.25 - x));
  return (
    <svg
      viewBox="0 0 480 310"
      className={styles.plot}
      role="img"
      aria-labelledby={`${id}-real-title ${id}-status`}
    >
      <title id={`${id}-real-title`}>{`Tangent to x cubed minus one at x = ${x.toFixed(5)}`}</title>
      <defs>
        <clipPath id={`${id}-real-clip`}>
          <rect x="50" y="22" width="380" height="250" />
        </clipPath>
      </defs>
      <path d={`M50 ${yAxis.y}H430M${yAxis.x} 22V272`} className={common.axis} />
      {[0, 1, 2].map((value) => {
        const p = realPosition(value, 0);
        return (
          <text key={value} x={p.x} y={p.y + 20} textAnchor="middle" className={common.label}>
            {value}
          </text>
        );
      })}
      <text x="441" y={yAxis.y + 5} className={common.label}>
        x
      </text>
      {[-1, 4, 7].map((value) => {
        const p = realPosition(0, value);
        return (
          <text key={value} x={p.x - 10} y={p.y + 5} textAnchor="end" className={common.label}>
            {value}
          </text>
        );
      })}
      <text x="110" y="40" className={common.label}>
        f(x) = x³ − 1
      </text>
      <g clipPath={`url(#${id}-real-clip)`}>
        <path d={curve} className={common.line} />
        {state.reason !== "root" && (
          <path d={`M${left.x} ${left.y}L${right.x} ${right.y}`} className={styles.tangent} />
        )}
        {next && intercept && (
          <>
            <path
              d={`M${current.x} ${current.y}L${intercept.x} ${intercept.y}`}
              className={common.accent}
            />
            <circle cx={intercept.x} cy={intercept.y} r="5" className={common.point} />
            <text x={intercept.x + 9} y={intercept.y - 10} className={common.label}>
              next x
            </text>
          </>
        )}
        <circle cx={current.x} cy={current.y} r="5" className={styles.currentPoint} />
      </g>
    </svg>
  );
}

function ComplexPlot({ trace, step, id }: { trace: NewtonTraceState[]; step: number; id: string }) {
  const current = clippedPosition(trace[step].point);
  const path = trace
    .slice(0, step + 1)
    .map(({ point }, index) => {
      const p = complexPosition(point);
      return `${index ? "L" : "M"}${p.x},${p.y}`;
    })
    .join(" ");
  return (
    <svg
      viewBox="0 0 480 320"
      className={styles.plot}
      role="img"
      aria-labelledby={`${id}-complex-title ${id}-status`}
    >
      <title
        id={`${id}-complex-title`}
      >{`Newton orbit, step ${step}. Three hollow circles mark the roots.`}</title>
      <defs>
        <clipPath id={`${id}-complex-clip`}>
          <rect x="55" y="28" width="370" height="264" />
        </clipPath>
      </defs>
      <path d="M55 160H425M240 28V292" className={common.axis} />
      {[-2, -1, 1, 2].map((value) => (
        <text key={value} x={240 + value * 76} y="180" textAnchor="middle" className={common.label}>
          {value}
        </text>
      ))}
      <text x="429" y="151" className={common.label}>
        real
      </text>
      <text x="251" y="27" className={common.label}>
        imaginary
      </text>
      {NEWTON_ROOTS.map((root, index) => {
        const p = complexPosition(root);
        return (
          <g key={root.imaginary}>
            <circle cx={p.x} cy={p.y} r="6" className={styles.root} />
            <text x={p.x + 11} y={p.y - 9} className={common.label}>
              root {index + 1}
            </text>
          </g>
        );
      })}
      <g clipPath={`url(#${id}-complex-clip)`}>
        <path d={path} className={common.line} />
        {trace.slice(0, step).map(({ point, iteration }) => {
          const p = complexPosition(point);
          return <circle key={iteration} cx={p.x} cy={p.y} r="2.5" className={styles.oldPoint} />;
        })}
      </g>
      <circle cx={current.x} cy={current.y} r="5" className={common.point} />
      {current.clipped && (
        <text x="65" y="308" className={common.label}>
          Current point is outside this window.
        </text>
      )}
    </svg>
  );
}

export default function NewtonLesson() {
  const [mode, setMode] = useState<Mode>("real");
  const [realStart, setRealStart] = useState(2);
  const [complexStart, setComplexStart] = useState<NewtonPoint>(COMPLEX_STARTS[1].point);
  const [step, setStep] = useState(0);
  const id = useId();
  const trace = traceNewton(mode === "real" ? { real: realStart, imaginary: 0 } : complexStart);
  const current = trace[step];
  const next = trace[step + 1];
  const tangent = realNewtonTangent(current.point.real);
  const nearest = nearestNewtonRoot(current.point);
  const setView = (nextMode: Mode) => {
    if (nextMode !== mode) {
      setMode(nextMode);
      setStep(0);
    }
  };
  const updateComplex = (part: keyof NewtonPoint, value: number) => {
    setComplexStart((old) => ({ ...old, [part]: value }));
    setStep(0);
  };
  return (
    <LessonFrame title="Improve a guess" kind="newton">
      <fieldset className={common.options} aria-label="Newton lesson view">
        <button type="button" aria-pressed={mode === "real"} onClick={() => setView("real")}>
          Graph view
        </button>
        <button type="button" aria-pressed={mode === "complex"} onClick={() => setView("complex")}>
          Three roots
        </button>
      </fieldset>
      <p>
        {mode === "real"
          ? "The answer is where the curve crosses the horizontal axis. The straight line follows the curve's slope at your guess. Use the line's crossing as the next guess, then draw a new line there."
          : "Each marked root is an answer to the same equation. Choose a starting point, then follow its guesses. Which root do they approach?"}
      </p>
      {mode === "real" ? (
        <RealPlot state={current} next={next} id={id} />
      ) : (
        <ComplexPlot trace={trace} step={step} id={id} />
      )}
      <div id={`${id}-status`} className={styles.status} aria-live="polite" aria-atomic="true">
        <p>
          <strong>
            {mode === "real"
              ? `x${step} = ${current.point.real.toFixed(5)}`
              : `z${step} = ${format(current.point)}`}
          </strong>
          {mode === "real" ? `, f(x${step}) = ${tangent.value.toFixed(5)}.` : ""}
          {mode === "real" && next && tangent.intercept !== null
            ? ` The line crosses zero at ${tangent.intercept.toFixed(5)}: our next guess.`
            : ""}
        </p>
        <p>{stopDescription(current, step)}</p>
        {mode === "complex" && current.reason === "active" && (
          <p>
            Root {nearest.root + 1} is closest to this guess, at a distance of{" "}
            {nearest.distance.toFixed(5)}. A later guess may be closer to another root.
          </p>
        )}
      </div>
      <LessonSteps label="Newton iteration" step={step} max={trace.length - 1} onChange={setStep} />
      {mode === "real" ? (
        <fieldset className={common.options} aria-label="Real starting estimate">
          {REAL_STARTS.map((value) => (
            <button
              type="button"
              key={value}
              aria-pressed={realStart === value}
              onClick={() => {
                setRealStart(value);
                setStep(0);
              }}
            >
              {value === 0 ? "Start at 0 (flat)" : `Start at ${value}`}
            </button>
          ))}
        </fieldset>
      ) : (
        <>
          <fieldset className={common.options} aria-label="Complex starting region">
            {COMPLEX_STARTS.map(({ label, point }) => (
              <button
                type="button"
                key={label}
                aria-pressed={samePoint(complexStart, point)}
                onClick={() => {
                  setComplexStart(point);
                  setStep(0);
                }}
              >
                {label}
              </button>
            ))}
          </fieldset>
          {(["real", "imaginary"] as const).map((part) => (
            <label className={common.parameter} key={part}>
              <span>
                {part === "real" ? "Horizontal starting position" : "Vertical starting position"}
                <output>{complexStart[part].toFixed(2)}</output>
              </span>
              <input
                type="range"
                aria-label={`Newton starting point ${part}`}
                min={-1.5}
                max={1.5}
                step={0.05}
                value={complexStart[part]}
                onChange={(event) => updateComplex(part, Number(event.target.value))}
              />
            </label>
          ))}
          <p>
            A guess can jump outside the picture. When that happens, the amber point stays at the
            edge and the numbers above give its position.
          </p>
        </>
      )}
      <p>
        This diagram stops after twelve steps or when a guess is close enough to a root. The
        displayed decimals are rounded.
      </p>
    </LessonFrame>
  );
}
