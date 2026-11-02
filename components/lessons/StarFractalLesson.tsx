import { useMemo, useState } from "react";
import motion from "../../styles/lessons/Investigations.module.css";
import styles from "../../styles/lessons/Lesson.module.css";
import { buildStars, starReach, touchingRatio, traceStars } from "../../utils/starFractal";
import { LessonFrame } from "./LessonFrame";

const TOUCHING = touchingRatio(5);
const SIZE = 480;

export default function StarFractalLesson() {
  const [ratio, setRatio] = useState(0.5);
  const [depth, setDepth] = useState(3);
  const [smallestOnly, setSmallestOnly] = useState(false);
  const settings = useMemo(() => ({ points: 5, skip: 2, ratio, offset: 1, rotation: 0 }), [ratio]);
  const paths = useMemo(() => {
    const scale = (SIZE * 0.46) / starReach(settings, depth);
    const place = (x: number, y: number): [number, number] => [
      SIZE / 2 + x * scale,
      SIZE / 2 + y * scale,
    ];
    const stars = buildStars(settings, depth);
    return Array.from({ length: depth + 1 }, (_, level) => {
      let d = "";
      traceStars(
        {
          moveTo: (x, y) => {
            d += `M${x.toFixed(2)} ${y.toFixed(2)}`;
          },
          lineTo: (x, y) => {
            d += `L${x.toFixed(2)} ${y.toFixed(2)}`;
          },
          closePath: () => {
            d += "Z";
          },
        },
        stars.filter((star) => star.depth === level),
        settings,
        place,
      );
      return d;
    });
  }, [settings, depth]);
  return (
    <LessonFrame title="Find where the copies touch" kind="star-fractal">
      <p>Shrink the copies until neighboring groups stop overlapping and just meet.</p>
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        role="img"
        aria-label={`Star fractal with copies ${ratio.toFixed(3)} of their parent's size.`}
        style={{ maxHeight: "64vh" }}
      >
        {paths.map((d, level) => (
          <path
            // biome-ignore lint/suspicious/noArrayIndexKey: A level's position never changes.
            key={level}
            d={d}
            fill="none"
            stroke={level === depth ? "#f5c56d" : "#7ec9bb"}
            strokeWidth={level === depth ? 0.9 : 1}
            opacity={smallestOnly && level !== depth ? 0 : 1}
          />
        ))}
      </svg>
      <div className={motion.readout} aria-live="polite">
        Copy size {ratio.toFixed(3)}
        {Math.abs(ratio - TOUCHING) < 0.0015 ? " · neighbors touch" : ""}
      </div>
      <label className={styles.parameter}>
        <span>
          Copy size
          <output>{ratio.toFixed(3)}</output>
        </span>
        <input
          type="range"
          aria-label="Copy size"
          min={0.2}
          max={0.6}
          step={0.001}
          value={ratio}
          onChange={(event) => setRatio(Number(event.target.value))}
        />
      </label>
      <label className={styles.parameter}>
        <span>
          Levels
          <output>{depth}</output>
        </span>
        <input
          type="range"
          aria-label="Levels"
          min={1}
          max={5}
          value={depth}
          onChange={(event) => setDepth(Number(event.target.value))}
        />
      </label>
      <div className={styles.options}>
        <button type="button" onClick={() => setRatio(TOUCHING)}>
          Go to the touching size
        </button>
      </div>
      <label className={motion.checkbox}>
        <input
          type="checkbox"
          checked={smallestOnly}
          onChange={(event) => setSmallestOnly(event.target.checked)}
        />
        Show only the smallest stars
      </label>
    </LessonFrame>
  );
}
