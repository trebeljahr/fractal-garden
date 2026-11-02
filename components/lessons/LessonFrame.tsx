import type { ReactNode } from "react";
import styles from "../../styles/lessons/Lesson.module.css";
import { useLessonPlayback } from "../../utils/hooks/useLessonPlayback";
import { ConstructionIcon } from "../ConstructionIcon";

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
  stepDescription,
  disabled = false,
}: {
  step: number;
  max: number;
  onChange: (step: number) => void;
  label: string;
  duration?: number;
  stepDescription?: string;
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
    <LessonStepControls
      step={step}
      max={max}
      playback={playback}
      label={label}
      stepDescription={stepDescription}
      disabled={disabled}
    />
  );
}

export function LessonStepControls({
  step,
  max,
  playback,
  label,
  stepDescription,
  disabled = false,
}: {
  step: number;
  max: number;
  playback: ReturnType<typeof useLessonPlayback<HTMLFieldSetElement>>;
  label: string;
  stepDescription?: string;
  disabled?: boolean;
}) {
  return (
    <fieldset
      disabled={disabled}
      ref={playback.ref}
      className={styles.controls}
      aria-label={`${label} steps`}
    >
      <button
        type="button"
        aria-label="Previous step"
        title="Previous step"
        disabled={step === 0}
        onClick={() => playback.change(step - 1)}
      >
        <ConstructionIcon name="previous" />
      </button>
      <button
        type="button"
        aria-label={`${playback.playing ? "Pause" : "Play"} ${label}`}
        aria-pressed={playback.playing}
        title={playback.playing ? "Pause" : "Play"}
        disabled={max === 0}
        onClick={playback.toggle}
      >
        <ConstructionIcon name={playback.playing ? "pause" : "play"} />
      </button>
      <label className={styles.step}>
        <span>{stepDescription ?? `Step ${step} of ${max}`}</span>
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
      <button
        type="button"
        aria-label="Next step"
        title="Next step"
        disabled={step === max}
        onClick={() => playback.change(step + 1)}
      >
        <ConstructionIcon name="next" />
      </button>
    </fieldset>
  );
}
