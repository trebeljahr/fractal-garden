// biome-ignore-all lint/suspicious/noArrayIndexKey: Fixed character positions identify instructions; these items have no state or reorder operation.
import { useId, useState } from "react";
import shared from "../../styles/lessons/Lesson.module.css";
import styles from "../../styles/lessons/LSystemLesson.module.css";
import {
  instructionDescription,
  LESSON_SYSTEMS,
  type LSystemPreset,
  lessonWord,
  type TurtlePoint,
  type TurtleSegment,
  walkLessonWord,
} from "../../utils/lessons/lsystemLesson";
import { LessonFrame, LessonSteps } from "./LessonFrame";

function drawingFit(points: TurtlePoint[]) {
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const scale = Math.min(370 / Math.max(maxX - minX, 1), 220 / Math.max(maxY - minY, 1));
  return (point: TurtlePoint) => ({
    x: 240 + (point.x - (minX + maxX) / 2) * scale,
    y: 150 - (point.y - (minY + maxY) / 2) * scale,
  });
}

export default function LSystemLesson({ preset = "koch" }: { preset?: LSystemPreset }) {
  const system = LESSON_SYSTEMS[preset];
  const [rewrites, setRewrites] = useState(1);
  const [step, setStep] = useState(0);
  const id = useId();
  const word = lessonWord(preset, rewrites);
  const states = walkLessonWord(preset, word);
  const current = states[step];
  const full = states.flatMap((state) => (state.segment ? [state.segment] : []));
  const visible = states
    .slice(0, step + 1)
    .flatMap((state) => (state.segment ? [state.segment] : []));
  const fit = drawingFit(states.map((state) => state.point));
  const position = fit(current.point);
  const path = (segments: TurtleSegment[]) =>
    segments
      .map(({ from, to }) => {
        const a = fit(from);
        const b = fit(to);
        return `M${a.x},${a.y}L${b.x},${b.y}`;
      })
      .join(" ");
  const direction = system.plus < 0 ? "clockwise" : "counterclockwise";
  const title = "Read the rule, walk the path";
  const changeRewrites = (value: number) => {
    setRewrites(value);
    setStep(0);
  };
  return (
    <LessonFrame title={title} kind={`lsystem-${preset}`}>
      <p>
        Rewriting builds the instruction word. Stepping reads one symbol at a time. The arrow shows
        the turtle's position and direction.
      </p>
      <div className={styles.ruleRow}>
        <span>
          Start: <code>{system.axiom}</code>
        </span>
        {Object.entries(system.rules).map(([symbol, replacement]) => (
          <code key={symbol}>{`${symbol} → ${replacement}`}</code>
        ))}
      </div>
      <label className={shared.parameter}>
        <span>
          Rewrites <output>{rewrites}</output>
        </span>
        <input
          type="range"
          aria-label="L-system rewrites"
          min={0}
          max={system.maxRewrites}
          step={1}
          value={rewrites}
          onChange={(event) => changeRewrites(Number(event.target.value))}
        />
      </label>
      <div className={styles.word}>
        {Array.from(word).map((symbol, index) => (
          <code
            key={`${index}:${symbol}`}
            className={index === step - 1 ? styles.active : undefined}
          >
            {symbol}
          </code>
        ))}
      </div>
      <div className={shared.grid}>
        <svg viewBox="0 0 480 300" role="img" aria-labelledby={`${id}-drawing ${id}-summary`}>
          <title
            id={`${id}-drawing`}
          >{`${system.name}, instruction ${step} of ${word.length}`}</title>
          <path d={path(full)} className={styles.future} />
          <path d={path(visible)} className={shared.line} />
          {current.segment && <path d={path([current.segment])} className={shared.accent} />}
          <circle
            cx={fit(states[0].point).x}
            cy={fit(states[0].point).y}
            r="5"
            className={styles.start}
          />
          <path
            d="M10 0L-6 -5L-3 0L-6 5Z"
            transform={`translate(${position.x} ${position.y}) rotate(${-current.heading})`}
            className={styles.turtle}
          />
        </svg>
        <div id={`${id}-summary`} aria-live="polite" aria-atomic="true">
          <p>{instructionDescription(preset, current)}</p>
          <p>
            {current.drawn} of {full.length} segments drawn. Amber marks the last instruction.
          </p>
        </div>
      </div>
      <LessonSteps
        step={step}
        max={word.length}
        onChange={setStep}
        label={`${system.name} instruction`}
      />
      <p>
        {system.draw === "FG" ? "F and G both draw." : "F draws."}{" "}
        {preset === "hilbert" && "V and W only guide the next rewrite. "}
        In this {system.name.toLowerCase()} rule, + turns {direction}; − turns the other way. Faint
        lines show the completed path for this word.
      </p>
      <p>
        {preset === "koch"
          ? "This follows one snowflake edge. The full explorer starts with three edges and counts that triangle as Iterations 1."
          : preset === "hilbert"
            ? "Rewrites 1 makes the first U. The full explorer labels it Iterations 2, because its starting W counts as Iterations 1."
            : "The full Dragon explorer uses the same rewrite count for Iterations. Its first displayed stage has one rewrite and two segments."}
      </p>
    </LessonFrame>
  );
}
