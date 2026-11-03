import { useMemo, useState } from "react";
import extra from "../../styles/lessons/Investigations.module.css";
import styles from "../../styles/lessons/Lesson.module.css";
import { contractingProjection, tribonacciWord } from "../../utils/rauzy";
import BuddhabrotAccumulation from "./BuddhabrotAccumulation";
import { LessonFrame, LessonSteps } from "./LessonFrame";

function RauzyLesson() {
  const [step, setStep] = useState(0);
  const [walk, setWalk] = useState(false);
  const data = useMemo(() => {
    const word = tribonacciWord(12000),
      projection = contractingProjection();
    let x = 0,
      y = 0;
    const points = Array.from(word, (letter) => {
      const p = { x, y, letter };
      x += projection[letter][0];
      y += projection[letter][1];
      return p;
    });
    const xs = points.map((p) => p.x),
      ys = points.map((p) => p.y);
    const minX = Math.min(...xs),
      maxX = Math.max(...xs),
      minY = Math.min(...ys),
      maxY = Math.max(...ys);
    const scale = Math.min(420 / (maxX - minX), 270 / (maxY - minY));
    return {
      word,
      points: points.map((p) => ({
        ...p,
        x: 240 + (p.x - (minX + maxX) / 2) * scale,
        y: 155 - (p.y - (minY + maxY) / 2) * scale,
      })),
    };
  }, []);
  const count = walk ? Math.round((step / 24) * 80) : step * 500;
  const points = data.points.slice(0, count);
  const colors = ["#f2a65a", "#5ec2b7", "#c06c9e"];
  return (
    <LessonFrame title="Look along the staircase" kind="rauzy">
      <p>
        Choose First 80 steps and press Play to connect the corners in order. You are looking along
        the staircase, so a step forward in space may go sideways in this view.
      </p>
      <p className={extra.readout}>
        {Array.from(data.word.slice(0, 36), (n) => n + 1).join(" ")} …
      </p>
      <svg
        viewBox="0 0 480 310"
        role="img"
        aria-label={`${count} projected staircase corners, colored by their next letter.`}
      >
        {walk && (
          <polyline
            points={points.map((p) => `${p.x},${p.y}`).join(" ")}
            className={extra.reference}
          />
        )}
        {colors.map((color, letter) => (
          <path
            key={color}
            d={points
              .filter((p) => p.letter === letter)
              .map((p) => `M${p.x},${p.y}h0.1`)
              .join(" ")}
            stroke={color}
            strokeWidth={walk ? 5 : 1.8}
            strokeLinecap="round"
          />
        ))}
      </svg>
      <LessonSteps
        key={String(walk)}
        step={step}
        max={24}
        onChange={setStep}
        label="Projected word"
      />
      <div className={styles.options}>
        <button
          type="button"
          aria-pressed={!walk}
          onClick={() => {
            setWalk(false);
            setStep(0);
          }}
        >
          Fill the tile
        </button>
        <button
          type="button"
          aria-pressed={walk}
          onClick={() => {
            setWalk(true);
            setStep(0);
          }}
        >
          First 80 steps
        </button>
      </div>
      <p aria-live="polite">
        {count.toLocaleString()} corners shown. The next digit gives each dot its color: orange for
        1, teal for 2, rose for 3.
      </p>
      <p>
        Now choose Fill the tile. Thousands more corners reveal three colored regions. The next
        step's direction decides which region a corner belongs to.
      </p>
    </LessonFrame>
  );
}

export type SpecialLessonKind = "buddhabrot" | "rauzy";
export const isSpecialLessonKind = (value: unknown): value is SpecialLessonKind =>
  value === "buddhabrot" || value === "rauzy";
export default function SpecialLesson({ kind }: { kind: SpecialLessonKind }) {
  return kind === "buddhabrot" ? <BuddhabrotAccumulation /> : <RauzyLesson />;
}
