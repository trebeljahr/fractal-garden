import { useMemo, useState } from "react";
import common from "../../styles/lessons/Lesson.module.css";
import styles from "../../styles/lessons/StepLimit.module.css";
import { JULIA_COLORING, MANDELBROT_COLORING } from "../../utils/escapeTimeColoring";
import {
  ringEscapeStep,
  STEP_LIMIT_VIEWS,
  type StepLimitFormula,
} from "../../utils/lessons/stepLimit";
import { EscapeTimePicture } from "./EscapeTimePicture";
import { LessonFrame, LessonSteps } from "./LessonFrame";

const COLORING = { mandelbrot: MANDELBROT_COLORING, julia: JULIA_COLORING };
const WIDTH = 360;
const PLAY_MS = 8000;
const RING_STROKES = [
  { stroke: "#10151a", strokeWidth: 5 },
  { stroke: "#f5c56d", strokeWidth: 2.5 },
];

export default function StepLimitLesson({ formula }: { formula: StepLimitFormula }) {
  const views = STEP_LIMIT_VIEWS[formula];
  const [viewIndex, setViewIndex] = useState(0);
  const view = views[viewIndex];
  const { ring } = view;
  const [stop, setStop] = useState(view.stops.indexOf(view.start));
  const limit = view.stops[stop];
  const coloring = useMemo(() => ({ ...COLORING[formula], iterations: limit }), [formula, limit]);
  const escapeStep = useMemo(() => ringEscapeStep(formula, view), [formula, view]);
  const [left, right, bottom, top] = view.bounds;
  const height = (WIDTH * (top - bottom)) / (right - left);
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
        {ring && (
          <svg viewBox={`0 0 ${WIDTH} ${height}`} aria-hidden="true">
            {RING_STROKES.map((stroke) => (
              <circle
                key={stroke.stroke}
                cx={((ring.real - left) / (right - left)) * WIDTH}
                cy={((top - ring.imaginary) / (top - bottom)) * height}
                r="9"
                fill="none"
                {...stroke}
              />
            ))}
          </svg>
        )}
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
      {ring && (
        <p className={styles.readout} aria-live="polite">
          {escapeStep !== null && escapeStep <= limit
            ? `Ring: escaped at step ${escapeStep}`
            : "Ring: hasn't escaped yet"}
        </p>
      )}
    </LessonFrame>
  );
}
