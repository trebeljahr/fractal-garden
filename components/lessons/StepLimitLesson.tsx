import { useId, useMemo, useState } from "react";
import common from "../../styles/lessons/Lesson.module.css";
import styles from "../../styles/lessons/StepLimit.module.css";
import { JULIA_COLORING, MANDELBROT_COLORING } from "../../utils/escapeTimeColoring";
import {
  BLACK_AND_WHITE,
  colorKeyGradient,
  colorRepeatSteps,
  STEP_LIMIT_VIEWS,
  type StepLimitFormula,
} from "../../utils/lessons/stepLimit";
import { ToggleSwitch } from "../PanelPickers";
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
  const [blackAndWhite, setBlackAndWhite] = useState(false);
  const id = useId();
  const base = COLORING[formula];
  const coloring = useMemo(
    () => ({ ...base, ...(blackAndWhite ? BLACK_AND_WHITE : {}), iterations: limit }),
    [base, blackAndWhite, limit],
  );
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
      <LessonSteps
        key={view.name}
        step={stop}
        max={view.stops.length - 1}
        onChange={setStop}
        label="Step limit"
        duration={PLAY_MS}
        stepDescription={`${limit} steps`}
      />
      <div
        className={styles.picture}
        role="img"
        aria-label={`${view.name} after ${limit} steps${blackAndWhite ? ", in black and white" : ""}`}
      >
        <EscapeTimePicture formula={formula} bounds={view.bounds} coloring={coloring} c={view.c} />
      </div>
      <label className={styles.mode} htmlFor={`${id}-switch`}>
        <span className={blackAndWhite ? undefined : styles.active}>Colors</span>
        <ToggleSwitch
          id={`${id}-switch`}
          checked={blackAndWhite}
          labelledBy={`${id}-label`}
          onChange={setBlackAndWhite}
        />
        <span id={`${id}-label`} className={blackAndWhite ? styles.active : undefined}>
          Black and white
        </span>
      </label>
      <div className={styles.key}>
        <div className={styles.keyRow}>
          <span className={styles.swatch} style={{ background: coloring.interior }} />
          Not escaped yet. It might be in the set.
        </div>
        {blackAndWhite ? (
          <div className={styles.keyRow}>
            <span className={styles.swatch} style={{ background: "#fff" }} />
            Escaped, so outside the set.
          </div>
        ) : (
          <div>
            Escaped, so outside the set. Color shows the step:
            <div className={styles.strip} style={{ background: colorKeyGradient(base) }} />
            <div className={styles.ticks}>
              <span>0</span>
              <span>{Math.round(colorRepeatSteps(base))} steps, then the colors repeat</span>
            </div>
          </div>
        )}
      </div>
    </LessonFrame>
  );
}
