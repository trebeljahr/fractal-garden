import { useId, useState } from "react";
import shared from "../../styles/lessons/Lesson.module.css";
import styles from "../../styles/lessons/LogisticLesson.module.css";
import {
  cobwebSegments,
  LOGISTIC_LESSON_STEPS,
  type LogisticPoint,
  logisticNext,
  logisticOrbit,
} from "../../utils/lessons/logisticLesson";
import { LessonFrame, LessonSteps } from "./LessonFrame";

const PRESETS = [
  { name: "Settling", r: 2.8 },
  { name: "Two-cycle", r: 3.2 },
  { name: "Irregular trace", r: 3.9 },
];

const chart = (point: LogisticPoint) => ({ x: 42 + point.x * 274, y: 258 - point.y * 220 });
const series = (value: number, index: number) =>
  chart({ x: index / LOGISTIC_LESSON_STEPS, y: value });
const path = (points: LogisticPoint[]) =>
  points.map((p, index) => `${index ? "L" : "M"}${p.x},${p.y}`).join(" ");
const segmentPath = (segments: ReturnType<typeof cobwebSegments>) =>
  segments.map(({ from, to }) => path([chart(from), chart(to)])).join(" ");

export default function LogisticLesson() {
  const [r, setR] = useState(2.8);
  const [start, setStart] = useState(0.5);
  const [step, setStep] = useState(0);
  const id = useId();
  const values = logisticOrbit(r, start);
  const visible = values.slice(0, step + 1);
  const samples = visible.map((value, iteration) => ({ value, iteration }));
  const segments = cobwebSegments(visible);
  const current = values[step];
  const currentPosition = chart({ x: current, y: step ? current : 0 });
  const timePosition = series(current, step);
  const curve = Array.from({ length: 101 }, (_, i) =>
    chart({ x: i / 100, y: logisticNext(r, i / 100) }),
  );
  const changeR = (value: number) => {
    setR(value);
    setStep(0);
  };
  const changeStart = (value: number) => {
    setStart(value);
    setStep(0);
  };
  const choosePreset = (value: number) => {
    setR(value);
    setStart(0.5);
    setStep(0);
  };
  return (
    <LessonFrame title="Follow one value through the map" kind="logistic">
      <p>
        One iteration moves up to the curve, then across to the diagonal. The diagonal feeds the new
        value back as the next input.
      </p>
      <fieldset className={shared.options} aria-label="Logistic example">
        {PRESETS.map((preset) => (
          <button
            key={preset.r}
            type="button"
            aria-pressed={r === preset.r && start === 0.5}
            onClick={() => choosePreset(preset.r)}
          >
            {`${preset.name} · r=${preset.r}`}
          </button>
        ))}
      </fieldset>
      <div className={styles.plots}>
        <svg viewBox="0 0 360 300" role="img" aria-labelledby={`${id}-cobweb ${id}-summary`}>
          <title
            id={`${id}-cobweb`}
          >{`Cobweb for r=${r.toFixed(2)}, after ${step} iterations`}</title>
          <path d="M42 38V258H316" className={shared.axis} />
          <path d="M42 258L316 38" className={styles.diagonal} />
          <path d={path(curve)} className={shared.line} />
          <path d={segmentPath(segments)} className={styles.history} />
          <path d={segmentPath(segments.slice(-2))} className={shared.accent} />
          <circle cx={currentPosition.x} cy={currentPosition.y} r="4" className={shared.point} />
          <text x="44" y="23" className={shared.label}>
            next value
          </text>
          <text x="254" y="286" className={shared.label}>
            input x
          </text>
          <text x="27" y="274" className={shared.label}>
            0
          </text>
          <text x="309" y="274" className={shared.label}>
            1
          </text>
          <text x="25" y="44" className={shared.label}>
            1
          </text>
          <text x="246" y="53" className={shared.label}>
            y = x
          </text>
        </svg>
        <svg viewBox="0 0 360 300" role="img" aria-labelledby={`${id}-series ${id}-summary`}>
          <title id={`${id}-series`}>{`The same ${step + 1} orbit values in time order`}</title>
          <path d="M42 38V258H316" className={shared.axis} />
          <path d={path(visible.map(series))} className={shared.line} />
          {samples.map(({ value, iteration }) => {
            const point = series(value, iteration);
            return (
              <circle
                key={iteration}
                cx={point.x}
                cy={point.y}
                r="2.5"
                className={styles.seriesPoint}
              />
            );
          })}
          <circle cx={timePosition.x} cy={timePosition.y} r="4" className={shared.point} />
          <text x="44" y="23" className={shared.label}>
            orbit value x
          </text>
          <text x="234" y="286" className={shared.label}>
            iteration n
          </text>
          <text x="37" y="274" className={shared.label}>
            0
          </text>
          <text x="303" y="274" className={shared.label}>
            32
          </text>
          <text x="25" y="44" className={shared.label}>
            1
          </text>
        </svg>
      </div>
      <p id={`${id}-summary`} aria-live="polite" aria-atomic="true">
        {step === 0
          ? `Start at x₀ = ${start.toFixed(4)}. Step forward to evaluate r × x × (1 − x).`
          : `x${step} = ${r.toFixed(2)} × ${values[step - 1].toFixed(4)} × (1 − ${values[step - 1].toFixed(4)}) = ${current.toFixed(4)}.`}{" "}
        Amber marks the same current value in both plots.
      </p>
      <LessonSteps
        step={step}
        max={LOGISTIC_LESSON_STEPS}
        onChange={setStep}
        label="Logistic iteration"
      />
      <div className={styles.parameters}>
        <label className={shared.parameter}>
          <span>
            Growth parameter r <output>{r.toFixed(2)}</output>
          </span>
          <input
            type="range"
            min={0}
            max={4}
            step={0.01}
            value={r}
            aria-label="Logistic parameter r"
            onChange={(event) => changeR(Number(event.target.value))}
          />
        </label>
        <label className={shared.parameter}>
          <span>
            Starting value x₀ <output>{start.toFixed(2)}</output>
          </span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={start}
            aria-label="Logistic starting value"
            onChange={(event) => changeStart(Number(event.target.value))}
          />
        </label>
      </div>
      <p>
        The presets start at x₀ = 0.5. Compare a settling trace at r = 2.8 with the alternating pair
        approached at r = 3.2. At r = 3.9, this short trace looks irregular.
      </p>
      <p>
        Thirty-two steps cannot prove long-term behavior. The large bifurcation image discards early
        values and stacks later values for many choices of r.
      </p>
    </LessonFrame>
  );
}
