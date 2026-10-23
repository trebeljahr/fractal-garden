import type { ReactNode } from "react";
import styles from "../../styles/lessons/Lesson.module.css";

export function LessonFrame({
  title,
  kind,
  children,
  className,
}: {
  title: string;
  kind: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <figure
      className={[styles.frame, className].filter(Boolean).join(" ")}
      data-teaching-lesson={kind}
    >
      <figcaption className={styles.title}>{title}</figcaption>
      {children}
    </figure>
  );
}

export function LessonSteps({
  step,
  max,
  onChange,
  label,
}: {
  step: number;
  max: number;
  onChange: (step: number) => void;
  label: string;
}) {
  return (
    <fieldset className={styles.controls} aria-label={`${label} steps`}>
      <button type="button" disabled={step === 0} onClick={() => onChange(step - 1)}>
        Previous
      </button>
      <label className={styles.step}>
        <span>
          Step {step} of {max}
        </span>
        <input
          type="range"
          aria-label={`${label} step`}
          min={0}
          max={max}
          step={1}
          value={step}
          onChange={(event) => onChange(Number(event.target.value))}
        />
      </label>
      <button type="button" disabled={step === max} onClick={() => onChange(step + 1)}>
        Next step
      </button>
    </fieldset>
  );
}
