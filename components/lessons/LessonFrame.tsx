import type { ReactNode } from "react";
import styles from "../../styles/lessons/Lesson.module.css";
import { useLessonPlayback } from "../../utils/hooks/useLessonPlayback";

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
  duration,
  disabled = false,
}: {
  step: number;
  max: number;
  onChange: (step: number) => void;
  label: string;
  duration?: number;
  disabled?: boolean;
}) {
  const playback = useLessonPlayback(
    step,
    max,
    onChange,
    duration ? duration / Math.max(1, Math.min(max, 100)) : max === 100 ? 45 : 700,
    duration ? Math.max(1, Math.ceil(max / 100)) : 1,
  );
  return (
    <fieldset
      disabled={disabled}
      ref={playback.ref}
      className={styles.controls}
      aria-label={`${label} steps`}
    >
      <button type="button" disabled={step === 0} onClick={() => playback.change(step - 1)}>
        Previous
      </button>
      <button
        type="button"
        aria-label={`${playback.playing ? "Pause" : "Play"} ${label}`}
        aria-pressed={playback.playing}
        disabled={max === 0}
        onClick={playback.toggle}
      >
        {playback.playing ? "Pause" : "Play"}
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
          onChange={(event) => playback.change(Number(event.target.value))}
        />
      </label>
      <button type="button" disabled={step === max} onClick={() => playback.change(step + 1)}>
        Next step
      </button>
    </fieldset>
  );
}
