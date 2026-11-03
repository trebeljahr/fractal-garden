// biome-ignore-all lint/suspicious/noArrayIndexKey: An answer's step never changes.
import { useState } from "react";
import shared from "../../styles/lessons/Lesson.module.css";
import styles from "../../styles/lessons/LogisticLesson.module.css";
import {
  LOGISTIC_LESSON_STEPS,
  logisticOrbit,
  SECOND_START_GAP,
} from "../../utils/lessons/logisticLesson";
import { LessonFrame, LessonSteps } from "./LessonFrame";

const PRESETS = [2.8, 3.2, 3.5, 3.9];
const START = 0.5;
const SECOND = "#7ec9bb";
const x = (step: number) => 44 + (step / LOGISTIC_LESSON_STEPS) * 656;
const y = (value: number) => 262 - value * 240;
const line = (values: number[]) =>
  values.map((value, step) => `${step ? "L" : "M"}${x(step)},${y(value)}`).join(" ");
const written = (value: number) => String(Number(value.toFixed(4)));

export default function LogisticLesson() {
  const [r, setR] = useState(2.8);
  const [step, setStep] = useState(2);
  const [second, setSecond] = useState(false);
  const values = logisticOrbit(r, START);
  const others = logisticOrbit(r, START + SECOND_START_GAP);
  const current = values[step];
  const previous = values[step - 1];
  return (
    <LessonFrame title="Keep repeating the calculation" kind="logistic">
      <div className={styles.options}>
        {PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            aria-pressed={r === preset}
            onClick={() => setR(preset)}
          >
            r = {preset}
          </button>
        ))}
        <button type="button" aria-pressed={second} onClick={() => setSecond(!second)}>
          Second start, {SECOND_START_GAP} higher
        </button>
      </div>
      <svg
        viewBox="0 0 720 296"
        role="img"
        aria-label={`The first ${LOGISTIC_LESSON_STEPS} answers for r = ${r.toFixed(2)}, starting at ${START}.`}
      >
        <path d="M44 22V262H700" className={shared.axis} />
        <path d={`M44 ${y(0.5)}H700`} className={styles.grid} />
        {second && (
          <>
            <path d={line(others)} fill="none" stroke={SECOND} strokeWidth="1.5" />
            {others.map((value, index) => (
              <circle key={index} cx={x(index)} cy={y(value)} r="2.5" fill={SECOND} />
            ))}
          </>
        )}
        <path d={line(values)} className={shared.line} />
        {values.map((value, index) => (
          <circle key={index} cx={x(index)} cy={y(value)} r="2.5" className={styles.answer} />
        ))}
        <circle cx={x(step)} cy={y(current)} r="5.5" className={shared.point} />
        <text x="10" y="28" className={shared.label}>
          1
        </text>
        <text x="10" y={y(0.5) + 5} className={shared.label}>
          0.5
        </text>
        <text x="10" y="266" className={shared.label}>
          0
        </text>
        <text x="372" y="288" textAnchor="middle" className={shared.label}>
          step
        </text>
        <text x="44" y="288" textAnchor="middle" className={shared.label}>
          0
        </text>
        <text x="700" y="288" textAnchor="middle" className={shared.label}>
          {LOGISTIC_LESSON_STEPS}
        </text>
      </svg>
      <p className={styles.worked} aria-live="polite" data-logistic-worked>
        {step === 0
          ? `Start at ${START}`
          : `Step ${step}: ${written(r)} × ${written(previous)} × (1 − ${written(previous)}) = ${written(current)}`}
        {second && ` · Gap ${written(Math.abs(current - others[step]))}`}
      </p>
      <LessonSteps
        step={step}
        max={LOGISTIC_LESSON_STEPS}
        onChange={setStep}
        label="Logistic step"
      />
      <label className={shared.parameter}>
        <span>
          r <output>{r.toFixed(2)}</output>
        </span>
        <input
          type="range"
          min={1}
          max={4}
          step={0.01}
          value={r}
          aria-label="Logistic parameter r"
          onChange={(event) => setR(Number(event.target.value))}
        />
      </label>
    </LessonFrame>
  );
}
