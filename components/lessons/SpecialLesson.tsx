import { useMemo, useState } from "react";
import extra from "../../styles/lessons/Investigations.module.css";
import styles from "../../styles/lessons/Lesson.module.css";
import { bulbPower } from "../../utils/lessons/specialLessons";
import { contractingProjection, tribonacciWord } from "../../utils/rauzy";
import BuddhabrotAccumulation from "./BuddhabrotAccumulation";
import { LessonFrame, LessonSteps } from "./LessonFrame";

function MandelbulbLesson() {
  const [step, setStep] = useState(0);
  const [power, setPower] = useState(8);
  const [latitude, setLatitude] = useState(52);
  const radius = 0.9,
    theta = (latitude * Math.PI) / 180,
    phi = 0.6;
  const t = step / 100;
  const input = bulbPower(radius, theta, phi, 1);
  // Interpolate radius and angles separately so both endpoints match the true power map.
  const r = radius ** (1 + (power - 1) * t);
  const unit = bulbPower(1, theta, phi, 1 + (power - 1) * t);
  const output = unit.map((v) => v * r);
  const project = (p: number[]) => [
    240 + 125 * (p[0] + p[1] * 0.5),
    160 - 125 * (p[2] - p[1] * 0.3),
  ];
  const origin = [240, 160],
    a = project(input),
    b = project(output);
  return (
    <LessonFrame title="Change the distance and the angles" kind="mandelbulb">
      <p>
        The point starts 0.9 units from the center. Press Play to follow one power calculation: its
        angles turn and that distance shrinks. The hollow dot marks where it began.
      </p>
      <svg
        viewBox="0 0 480 320"
        role="img"
        aria-label={`Spherical power ${power}, transformation ${step}% complete. Radius changes from 0.9 to ${(radius ** power).toFixed(3)}.`}
      >
        <path d="M80 160H400M240 20V300M165 205L315 115" className={styles.axis} />
        <circle cx="240" cy="160" r="125" className={extra.reference} />
        <path d={`M${origin}L${a}`} className={extra.reference} />
        <circle cx={a[0]} cy={a[1]} r="5" fill="none" stroke="#eee8ce" />
        <path d={`M${origin}L${b}`} className={styles.accent} />
        <circle cx={b[0]} cy={b[1]} r="5" className={styles.point} />
      </svg>
      <LessonSteps
        key={`${power}-${latitude}`}
        step={step}
        max={100}
        onChange={setStep}
        label="Spherical power transformation"
      />
      <label className={styles.parameter}>
        <span>
          Power <output>{power}</output>
        </span>
        <input
          type="range"
          aria-label="Power"
          min={2}
          max={10}
          value={power}
          onChange={(e) => {
            setPower(Number(e.target.value));
            setStep(0);
          }}
        />
      </label>
      <label className={styles.parameter}>
        <span>
          Starting angle from vertical <output>{latitude}°</output>
        </span>
        <input
          type="range"
          aria-label="Starting angle from vertical"
          min={10}
          max={170}
          value={latitude}
          onChange={(e) => {
            setLatitude(Number(e.target.value));
            setStep(0);
          }}
        />
      </label>
      <p>
        Distance from the center: 0.900 → {(radius ** power).toFixed(3)}. Angle from vertical:{" "}
        {latitude}° → {latitude * power}°. Angle around the vertical axis: 34.4° →{" "}
        {(((phi * 180) / Math.PI) * power).toFixed(1)}°.
      </p>
      <p>
        Try a different Power. It multiplies both angles and changes how much the distance shrinks.
        These are the two changes shown here; the full calculation then adds the chosen position
        before repeating.
      </p>
    </LessonFrame>
  );
}

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

export type SpecialLessonKind = "buddhabrot" | "mandelbulb" | "rauzy";
export const isSpecialLessonKind = (value: unknown): value is SpecialLessonKind =>
  value === "buddhabrot" || value === "mandelbulb" || value === "rauzy";
export default function SpecialLesson({ kind }: { kind: SpecialLessonKind }) {
  return kind === "buddhabrot" ? (
    <BuddhabrotAccumulation />
  ) : kind === "mandelbulb" ? (
    <MandelbulbLesson />
  ) : (
    <RauzyLesson />
  );
}
