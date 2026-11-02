import { useMemo, useState } from "react";
import common from "../../styles/lessons/Lesson.module.css";
import styles from "../../styles/lessons/StepLimit.module.css";
import { JULIA_COLORING, MANDELBROT_COLORING } from "../../utils/escapeTimeColoring";
import {
  colorKeyGradient,
  colorRepeatSteps,
  STEP_LIMIT_VIEWS,
  type StepLimitFormula,
} from "../../utils/lessons/stepLimit";
import { EscapeTimePicture } from "./EscapeTimePicture";
import { LessonFrame, LessonSteps } from "./LessonFrame";

const COLORING = { mandelbrot: MANDELBROT_COLORING, julia: JULIA_COLORING };
const PLAY_MS = 8000;

export default function StepLimitLesson({ formula }: { formula: StepLimitFormula }) {
  const views = STEP_LIMIT_VIEWS[formula];
  const [viewIndex, setViewIndex] = useState(0);
  const view = views[viewIndex];
  const [stop, setStop] = useState(view.stops.indexOf(view.start));
  const limit = view.stops[stop];
  const base = COLORING[formula];
  const coloring = useMemo(() => ({ ...base, iterations: limit }), [base, limit]);
  return (
    <LessonFrame title="Give the computer more steps" kind={`step-limit-${formula}`}>
      {views.length > 1 && (
        <div className={common.options}>
          {views.map((option, index) => (
            <button
              type="button"
              key={option.name}
              aria-pressed={index === viewIndex}
              onClick={() => {
                setViewIndex(index);
                setStop(option.stops.indexOf(option.start));
              }}
            >
              {option.name}
            </button>
          ))}
        </div>
      )}
      <div className={styles.picture} role="img" aria-label={`${view.name} after ${limit} steps`}>
        <EscapeTimePicture formula={formula} bounds={view.bounds} coloring={coloring} c={view.c} />
      </div>
      <LessonSteps
        key={view.name}
        step={stop}
        max={view.stops.length - 1}
        onChange={setStop}
        label="Step limit"
        duration={PLAY_MS}
        stepDescription={`${limit} steps`}
      />
      <div className={styles.key}>
        <div className={styles.notEscaped}>
          <span className={styles.swatch} style={{ background: base.interior }} />
          Not escaped yet. It might be in the set.
        </div>
        <div>
          Escaped, so outside the set. Color shows the step:
          <div className={styles.strip} style={{ background: colorKeyGradient(base) }} />
          <div className={styles.ticks}>
            <span>0</span>
            <span>{Math.round(colorRepeatSteps(base))} steps, then the colors repeat</span>
          </div>
        </div>
      </div>
    </LessonFrame>
  );
}
