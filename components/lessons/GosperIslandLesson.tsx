import { useMemo, useState } from "react";
import motion from "../../styles/lessons/Investigations.module.css";
import styles from "../../styles/lessons/Lesson.module.css";
import {
  bigGosperIsland,
  gosperIsland,
  type IslandPoint,
  latticeCenter,
  polygonArea,
  polygonPerimeter,
  SEVEN_ISLANDS,
} from "../../utils/gosperIsland";
import { LessonFrame } from "./LessonFrame";

const COLORS = ["#f5c56d", "#7ec9bb", "#d68fa3", "#97ade0", "#c7a4ef", "#9fd17f", "#ef9a6b"];
const toPath = (points: IslandPoint[], dx = 0, dy = 0) =>
  `${points.map(([x, y], index) => `${index ? "L" : "M"}${(x + dx).toFixed(4)} ${(-(y + dy)).toFixed(4)}`).join("")}Z`;

export default function GosperIslandLesson() {
  const [round, setRound] = useState(0);
  const [showSeven, setShowSeven] = useState(true);
  const [showBig, setShowBig] = useState(true);
  const small = useMemo(() => gosperIsland(round), [round]);
  const big = useMemo(() => bigGosperIsland(round), [round]);
  const hexagon = useMemo(() => gosperIsland(0), []);
  const area = polygonArea(small) / polygonArea(hexagon);
  const coast = polygonPerimeter(small) / polygonPerimeter(hexagon);
  return (
    <LessonFrame title="Seven islands, one island" kind="gosper-island">
      <p>
        Start at Round 0: seven hexagons, and one bent hexagon drawn around them. Raise the round.
        The outline still fits.
      </p>
      <svg
        viewBox="-3.2 -3.2 6.4 6.4"
        role="img"
        aria-label={`Seven Gosper islands at round ${round}.`}
        style={{ maxHeight: "64vh" }}
      >
        {showSeven &&
          SEVEN_ISLANDS.map(([a, b], index) => {
            const [x, y] = latticeCenter(a, b);
            return (
              <path
                key={`${a},${b}`}
                d={toPath(small, x, y)}
                fill={COLORS[index]}
                fillOpacity={0.65}
                stroke="#10151a"
                strokeWidth={0.012}
              />
            );
          })}
        {showBig && <path d={toPath(big)} fill="none" stroke="#eee8ce" strokeWidth={0.03} />}
      </svg>
      <div className={motion.readout} aria-live="polite">
        One small island: area × {area.toFixed(4)}, coastline × {coast.toFixed(3)}, compared with
        its hexagon
      </div>
      <label className={styles.parameter}>
        <span>
          Round
          <output>{round}</output>
        </span>
        <input
          type="range"
          aria-label="Round"
          min={0}
          max={5}
          value={round}
          onChange={(event) => setRound(Number(event.target.value))}
        />
      </label>
      <label className={motion.checkbox}>
        <input
          type="checkbox"
          checked={showSeven}
          onChange={(event) => setShowSeven(event.target.checked)}
        />
        Seven small islands
      </label>
      <label className={motion.checkbox}>
        <input
          type="checkbox"
          checked={showBig}
          onChange={(event) => setShowBig(event.target.checked)}
        />
        One big island, one round further along
      </label>
    </LessonFrame>
  );
}
