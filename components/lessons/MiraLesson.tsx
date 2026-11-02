import { useMemo, useState } from "react";
import motion from "../../styles/lessons/Investigations.module.css";
import styles from "../../styles/lessons/Lesson.module.css";
import { miraOrbit, orbitBounds, paintOrbit } from "../../utils/miraMap";
import { LessonFrame } from "./LessonFrame";
import { PlaneStage } from "./PlaneStage";

const BOUNDS = [-22, 22, -18, 18] as const;
const WIDTH = 640;
const MAX_STEPS = 200000;
// Enough landings to see the shape, few enough to show where the point is now.
const RECENT = 3000;
const PAINT = {
  background: "#10151a",
  color: "#c79cff",
  colorEnd: "#ffe9c2",
  coloring: "age" as const,
  pointSize: 2,
};
const STOPS = [3000, 5000, 10000, 20000, 50000, 100000, 200000];

export default function MiraLesson() {
  const [a, setA] = useState(0.7);
  const [b, setB] = useState(0.9998);
  const [start, setStart] = useState({ x: 12.1, y: 0 });
  const [stop, setStop] = useState(0);
  const [keep, setKeep] = useState(false);
  const points = useMemo(
    () => miraOrbit({ a, b, x0: start.x, y0: start.y }, MAX_STEPS),
    [a, b, start],
  );
  const steps = Math.min(STOPS[stop], points.length / 2);
  const first = Math.max(0, steps - RECENT);
  const recent = useMemo(() => {
    const bounds = orbitBounds(points.subarray(first * 2, steps * 2), steps - first);
    return Math.max(-bounds.minX, bounds.maxX, -bounds.minY, bounds.maxY);
  }, [points, first, steps]);
  const scale = WIDTH / (BOUNDS[1] - BOUNDS[0]);
  return (
    <LessonFrame title="Watch the arms disappear" kind="mira">
      <p>
        This shows the last 3,000 landings. Raise the steps, then compare b = 1. Drag to pick
        another start.
      </p>
      <PlaneStage
        bounds={BOUNDS}
        width={WIDTH}
        label={`Mira orbit with a = ${a}, b = ${b}, ${steps} steps.`}
        paint={(image) => {
          const from = keep ? 0 : first;
          paintOrbit(
            image.data,
            image.width,
            image.height,
            points.subarray(from * 2, steps * 2),
            steps - from,
            { scale, originX: image.width / 2, originY: image.height / 2 },
            PAINT,
          );
        }}
        paintKey={`${a}/${b}/${start.x}/${start.y}/${steps}/${keep}`}
        onPick={(x, y) => setStart({ x, y })}
      >
        <circle cx={start.x} cy={-start.y} r={0.45} fill="#f5c56d" />
      </PlaneStage>
      <div className={motion.readout} aria-live="polite">
        {steps.toLocaleString("en")} steps · a patch keeps {(b ** steps).toPrecision(2)} of its area
        · last 3,000 landings reach {recent.toFixed(1)} from the center
      </div>
      <label className={styles.parameter}>
        <span>
          Steps
          <output>{STOPS[stop].toLocaleString("en")}</output>
        </span>
        <input
          type="range"
          aria-label="Steps"
          min={0}
          max={STOPS.length - 1}
          value={stop}
          onChange={(event) => setStop(Number(event.target.value))}
        />
      </label>
      <label className={styles.parameter}>
        <span>
          a<output>{a.toFixed(3)}</output>
        </span>
        <input
          type="range"
          aria-label="a"
          min={-0.9}
          max={0.9}
          step={0.001}
          value={a}
          onChange={(event) => setA(Number(event.target.value))}
        />
      </label>
      <fieldset className={styles.options} aria-label="Area kept on each step">
        {[1, 0.9998, 0.999].map((value) => (
          <button key={value} type="button" aria-pressed={b === value} onClick={() => setB(value)}>
            b = {value}
          </button>
        ))}
      </fieldset>
      <label className={motion.checkbox}>
        <input type="checkbox" checked={keep} onChange={(event) => setKeep(event.target.checked)} />
        Keep every earlier landing
      </label>
    </LessonFrame>
  );
}
