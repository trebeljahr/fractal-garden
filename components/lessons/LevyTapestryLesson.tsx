import { useMemo, useState } from "react";
import motion from "../../styles/lessons/Investigations.module.css";
import styles from "../../styles/lessons/Lesson.module.css";
import { levyTapestryEdges, levyTapestrySides } from "../../utils/lessons/levyTapestry";
import { LessonFrame } from "./LessonFrame";

const COLORS = ["#f5c56d", "#7ec9bb", "#d68fa3", "#97ade0"];
const SIZE = 480;

export default function LevyTapestryLesson() {
  const [round, setRound] = useState(4);
  const [shown, setShown] = useState([true, true, true, true]);
  const { paths, square } = useMemo(() => {
    const sides = levyTapestrySides(round);
    const all = sides.flat();
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (let i = 0; i < all.length; i += 2) {
      minX = Math.min(minX, all[i]);
      maxX = Math.max(maxX, all[i]);
      minY = Math.min(minY, all[i + 1]);
      maxY = Math.max(maxY, all[i + 1]);
    }
    const scale = (SIZE * 0.92) / Math.max(maxX - minX, maxY - minY, 1e-9);
    const px = (x: number) => SIZE / 2 + (x - (minX + maxX) / 2) * scale;
    const py = (y: number) => SIZE / 2 - (y - (minY + maxY) / 2) * scale;
    return {
      paths: sides.map((side) => {
        let d = "";
        for (let i = 0; i < side.length; i += 2)
          d += `${i ? "L" : "M"}${px(side[i]).toFixed(2)} ${py(side[i + 1]).toFixed(2)}`;
        return d;
      }),
      square: sides
        .map(
          (side, index) =>
            `${index ? "L" : "M"}${px(side[0]).toFixed(2)} ${py(side[1]).toFixed(2)}`,
        )
        .join("")
        .concat("Z"),
    };
  }, [round]);
  const { strokes, edges } = useMemo(() => levyTapestryEdges(round), [round]);
  return (
    <LessonFrame title="Four copies of one curve" kind="levy-tapestry">
      <p>Each color starts on one side of the square. Turn sides off to see one curve alone.</p>
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        role="img"
        aria-label={`Lévy tapestry at round ${round}.`}
        style={{ maxHeight: "64vh" }}
      >
        <path d={square} className={motion.reference} />
        {paths.map((d, side) => (
          <path
            key={COLORS[side]}
            d={d}
            fill="none"
            stroke={COLORS[side]}
            strokeWidth={round > 9 ? 0.6 : 1.3}
            opacity={shown[side] ? 1 : 0}
          />
        ))}
      </svg>
      <div className={motion.readout} aria-live="polite">
        {strokes} strokes · {edges} different edges · {strokes - edges} strokes repeat an edge
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
          max={14}
          value={round}
          onChange={(event) => setRound(Number(event.target.value))}
        />
      </label>
      <div className={styles.options}>
        {COLORS.map((color, side) => (
          <button
            key={color}
            type="button"
            aria-pressed={shown[side]}
            onClick={() => setShown(shown.map((value, i) => (i === side ? !value : value)))}
          >
            Side {side + 1}
          </button>
        ))}
      </div>
    </LessonFrame>
  );
}
