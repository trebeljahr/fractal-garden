import { useMemo, useState } from "react";
import motion from "../../styles/lessons/Investigations.module.css";
import styles from "../../styles/lessons/Lesson.module.css";
import { PEANO_SHARED_POINTS, peanoPoint, peanoRoute } from "../../utils/lessons/peanoLesson";
import { LessonFrame } from "./LessonFrame";

const SQUARE = 340;
const LEFT = 70;
const TOP = 70;
const place = ([x, y]: [number, number]): [number, number] => [
  LEFT + x * SQUARE,
  TOP + (1 - y) * SQUARE,
];

export default function PeanoFillLesson() {
  const [round, setRound] = useState(3);
  const [position, setPosition] = useState(0.5);
  const [shared, setShared] = useState<number[] | null>(null);
  const route = useMemo(() => peanoRoute(round), [round]);
  const path = route
    .map((point, index) => `${index ? "L" : "M"}${place(point).join(" ")}`)
    .join("");
  const marks = shared ?? [position];
  const [dotX, dotY] = place(peanoPoint(marks[0]));
  return (
    <LessonFrame title="From a line to a square" kind="peano-fill">
      <p>Slide along the line. The dot shows where that position lands on the finished curve.</p>
      <svg
        viewBox="0 0 480 430"
        role="img"
        aria-label="A line above a square filled by the Peano route."
        style={{ maxHeight: "64vh" }}
      >
        <path d={`M${LEFT} 30H${LEFT + SQUARE}`} className={styles.line} />
        {marks.map((mark) => (
          <circle
            key={mark}
            cx={LEFT + mark * SQUARE}
            cy={30}
            r={7}
            fill={shared ? "#d68fa3" : "#f5c56d"}
          />
        ))}
        <path d={`M${LEFT} ${TOP}h${SQUARE}v${SQUARE}h${-SQUARE}z`} className={motion.reference} />
        <path d={path} fill="none" stroke="#7ec9bb" strokeWidth={round > 3 ? 0.7 : 1.5} />
        <circle cx={dotX} cy={dotY} r={8} fill={shared ? "#d68fa3" : "#f5c56d"} stroke="#10151a" />
      </svg>
      <div className={motion.readout} aria-live="polite">
        {shared
          ? `${shared.length} different places on the line land on this one dot.`
          : `Position ${position.toFixed(3)}`}
      </div>
      <label className={styles.parameter}>
        <span>
          Position on the line
          <output>{position.toFixed(3)}</output>
        </span>
        <input
          type="range"
          aria-label="Position on the line"
          min={0}
          max={1}
          step={0.001}
          value={position}
          onChange={(event) => {
            setShared(null);
            setPosition(Number(event.target.value));
          }}
        />
      </label>
      <label className={styles.parameter}>
        <span>
          Round
          <output>{round}</output>
        </span>
        <input
          type="range"
          aria-label="Round"
          min={1}
          max={4}
          value={round}
          onChange={(event) => setRound(Number(event.target.value))}
        />
      </label>
      <div className={styles.options}>
        {PEANO_SHARED_POINTS.map(({ label, positions }) => (
          <button
            key={label}
            type="button"
            aria-pressed={shared === positions}
            onClick={() => setShared(shared === positions ? null : positions)}
          >
            {label}
          </button>
        ))}
      </div>
    </LessonFrame>
  );
}
