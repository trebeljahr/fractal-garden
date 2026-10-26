// biome-ignore-all lint/suspicious/noArrayIndexKey: Each crease has a fixed position along the strip.
import { useMemo, useState } from "react";
import styles from "../../styles/lessons/Lesson.module.css";
import extra from "../../styles/lessons/PathConnections.module.css";
import {
  dragonCreases,
  dragonOpeningBounds,
  type FoldPoint,
  openedDragon,
} from "../../utils/lessons/dragonFold";
import { LessonFrame } from "./LessonFrame";

export default function DragonFoldLesson() {
  const [folds, setFolds] = useState(3);
  const [opening, setOpening] = useState(0);
  const [crease, setCrease] = useState(0);
  const turns = useMemo(() => dragonCreases(folds), [folds]);
  const bounds = useMemo(() => dragonOpeningBounds(folds), [folds]);
  const points = openedDragon(folds, opening);
  const scale = Math.min(430 / (bounds.maxX - bounds.minX), 280 / (bounds.maxY - bounds.minY));
  const project = ([x, y]: FoldPoint): FoldPoint => [
    Number((250 + (x - (bounds.minX + bounds.maxX) / 2) * scale).toFixed(4)),
    Number((165 - (y - (bounds.minY + bounds.maxY) / 2) * scale).toFixed(4)),
  ];
  const d = (line: FoldPoint[]) =>
    line.map((p, i) => `${i ? "L" : "M"}${project(p).join(",")}`).join("");
  const changeFolds = (next: number) => {
    setFolds(next);
    setCrease(0);
    setOpening(0);
  };
  const selected = project(points[crease + 1]);
  return (
    <LessonFrame title="Open the folded strip" kind="dragon-fold" className={extra.pathConnections}>
      <p>
        After {folds} folds, {2 ** folds} sections lie on top of one another. Open the creases
        slowly and follow the two amber sections as they separate.
      </p>
      <div className={styles.options}>
        <button type="button" disabled={folds === 1} onClick={() => changeFolds(folds - 1)}>
          One fewer fold
        </button>
        <button type="button" disabled={folds === 5} onClick={() => changeFolds(folds + 1)}>
          One more fold
        </button>
        <button type="button" onClick={() => setOpening(90)} disabled={opening === 90}>
          Open to right angles
        </button>
      </div>
      <svg
        viewBox="0 0 500 330"
        role="img"
        aria-label={`${folds} paper folds, creases opened to ${opening} degrees. Selected crease ${crease + 1} turns ${turns[crease] === 1 ? "left" : "right"}.`}
      >
        <path d={d(points)} stroke="#eee8ce77" strokeWidth={8} strokeLinejoin="round" fill="none" />
        <path d={d(points)} stroke="#10151a" strokeWidth={3} strokeLinejoin="round" fill="none" />
        <path
          d={d(points.slice(crease, crease + 3))}
          stroke="#f5c56d"
          strokeWidth={5}
          strokeLinejoin="round"
          fill="none"
        />
        <circle
          cx={selected[0]}
          cy={selected[1]}
          r={5}
          fill="#10151a"
          stroke="#f5c56d"
          strokeWidth={2}
        />
        <circle cx={project(points[0])[0]} cy={project(points[0])[1]} r={4} fill="#eee8ce" />
      </svg>
      <label className={styles.parameter}>
        <span>
          Open the creases <output>{opening}°</output>
        </span>
        <input
          aria-label="Dragon crease opening"
          type="range"
          min={0}
          max={90}
          value={opening}
          onChange={(e) => setOpening(Number(e.target.value))}
        />
      </label>
      <fieldset className={extra.creaseButtons} aria-label="Choose a crease">
        <legend>Choose a turn along the strip</legend>
        {turns.map((turn, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Crease ${i + 1}: ${turn === 1 ? "left" : "right"} turn`}
            aria-pressed={crease === i}
            onClick={() => setCrease(i)}
          >
            {turn === 1 ? "L" : "R"}
          </button>
        ))}
      </fieldset>
      <p aria-live="polite">
        Crease {crease + 1}: turn {turns[crease] === 1 ? "left" : "right"}.{" "}
        {opening === 90
          ? "Each crease is a right angle. Follow the left and right turns from the pale dot to trace the dragon."
          : "Keep opening the strip until each crease makes a right angle."}
      </p>
      <p>
        L and R mean left and right as you follow the strip from the pale dot. Choose one to
        highlight its crease.
      </p>
    </LessonFrame>
  );
}
