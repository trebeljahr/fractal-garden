import { useId, useState } from "react";
import common from "../../styles/lessons/Lesson.module.css";
import styles from "../../styles/lessons/NewtonLesson.module.css";
import { type NewtonState, realNewtonTangent, traceNewton } from "../../utils/lessons/newtonLesson";
import { LessonFrame, LessonSteps } from "./LessonFrame";

const STARTS = [2, 0.5, 0.1, 0];
const GRAPH_STEPS = 24;
const CHART_RIGHT = 2.25;
const written = (value: number) => String(Number(value.toFixed(5)));

function worked(state: NewtonState, next?: NewtonState) {
  const x = written(state.point.real);
  if (state.reason === "root") return `${x} is within 0.0008 of the root at 1.`;
  if (state.reason === "slope")
    return `3 × ${x}² = 0. The line is flat, so there is no next guess.`;
  if (!next) return `After ${GRAPH_STEPS} steps the guess is ${x}.`;
  return `${x} − (${x}³ − 1) / (3 × ${x}²) = ${written(next.point.real)}`;
}

function realPosition(x: number, y: number) {
  return { x: 50 + ((x + 0.25) / 2.5) * 380, y: 22 + ((8 - y) / 9.5) * 250 };
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
      {[4, 7].map((value) => {
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
      {x > CHART_RIGHT && (
        <text x="425" y={yAxis.y - 10} textAnchor="end" className={common.label}>
          {`x = ${written(x)} →`}
        </text>
      )}
    </svg>
  );
}

export default function NewtonLesson() {
  const [start, setStart] = useState(2);
  const [step, setStep] = useState(0);
  const id = useId();
  const trace = traceNewton({ real: start, imaginary: 0 }, GRAPH_STEPS);
  const current = trace[step];
  const next = trace[step + 1];
  return (
    <LessonFrame title="Improve a guess" kind="newton">
      <RealPlot state={current} next={next} id={id} />
      <p id={`${id}-status`} className={styles.status} aria-live="polite" data-newton-worked>
        {worked(current, next)}
      </p>
      <LessonSteps label="Newton step" step={step} max={trace.length - 1} onChange={setStep} />
      <fieldset className={common.options} aria-label="Starting guess">
        {STARTS.map((value) => (
          <button
            type="button"
            key={value}
            aria-pressed={start === value}
            onClick={() => {
              setStart(value);
              setStep(0);
            }}
          >
            Start at {value}
          </button>
        ))}
      </fieldset>
    </LessonFrame>
  );
}
