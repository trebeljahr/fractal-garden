import { useMemo, useState } from "react";
import motion from "../../styles/lessons/Investigations.module.css";
import styles from "../../styles/lessons/Lesson.module.css";
import { BARNSLEY_TREE_COLORING } from "../../utils/escapeTimeColoring";
import { EscapeTimePicture } from "./EscapeTimePicture";
import { LessonFrame } from "./LessonFrame";

const BOUNDS = [-6.5, 6.5, -5.2, 5.2] as const;
const C = { real: 0.6, imaginary: 1.1 };

export default function BarnsleyRadiusLesson() {
  const [radius, setRadius] = useState(2);
  const coloring = useMemo(
    () => ({ ...BARNSLEY_TREE_COLORING, escapeRadius: radius, iterations: 200 }),
    [radius],
  );
  return (
    <LessonFrame title="Move the finish line" kind="barnsley-radius">
      <p>Same rule, same c. Only the circle changes.</p>
      <div className={motion.surface} style={{ maxWidth: "80vh", margin: "0 auto" }}>
        <EscapeTimePicture formula="barnsley-tree" bounds={BOUNDS} coloring={coloring} c={C} />
      </div>
      <label className={styles.parameter}>
        <span>
          Circle radius
          <output>{radius.toFixed(1)}</output>
        </span>
        <input
          type="range"
          aria-label="Circle radius"
          min={1}
          max={8}
          step={0.1}
          value={radius}
          onChange={(event) => setRadius(Number(event.target.value))}
        />
      </label>
    </LessonFrame>
  );
}
