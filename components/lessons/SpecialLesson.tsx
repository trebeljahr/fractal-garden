import { useMemo, useState } from "react";
import extra from "../../styles/lessons/Investigations.module.css";
import styles from "../../styles/lessons/Lesson.module.css";
import { buddhaSamples, bulbPower, histogramOrbit } from "../../utils/lessons/specialLessons";
import { contractingProjection, tribonacciWord } from "../../utils/rauzy";
import { LessonFrame, LessonSteps } from "./LessonFrame";

function BuddhabrotLesson() {
  const [step, setStep] = useState(0);
  const [preset, setPreset] = useState(2);
  const samples = useMemo(() => buddhaSamples(), []);
  const constants = [
    { x: 0, y: 0 },
    { x: -1, y: 0 },
    { x: 0.3, y: 0.6 },
  ];
  const orbit = histogramOrbit(constants[preset]);
  const cells = new Uint32Array(80 * 60);
  let escaped = 0;
  for (const sample of samples.slice(0, step * 100)) {
    if (!sample.escaped) continue;
    escaped++;
    for (const p of sample.points) {
      const x = Math.floor(((p.x + 2) / 4) * 80),
        y = Math.floor(((1.5 - p.y) / 3) * 60);
      if (x >= 0 && x < 80 && y >= 0 && y < 60) cells[y * 80 + x]++;
    }
  }
  const peak = Math.max(1, ...Array.from(cells));
  const plot = (p: { x: number; y: number }) => [40 + (p.x + 2) * 100, 10 + (1.5 - p.y) * 100];
  const path = orbit.points
    .filter((p) => Math.abs(p.x) <= 2 && Math.abs(p.y) <= 1.5)
    .map((p, i) => `${i ? "L" : "M"}${plot(p).join(",")}`)
    .join(" ");
  return (
    <LessonFrame title="Count the places escaping orbits visit" kind="buddhabrot">
      <p>
        A Mandelbrot image colors the starting parameter. A Buddhabrot counts the intermediate
        positions of escaping orbits.
      </p>
      <div className={styles.options}>
        {["c = 0", "c = −1", "c = 0.3 + 0.6i"].map((name, i) => (
          <button type="button" key={name} aria-pressed={preset === i} onClick={() => setPreset(i)}>
            {name}
          </button>
        ))}
      </div>
      <svg
        viewBox="0 0 480 320"
        role="img"
        aria-label={`One orbit: ${orbit.escaped ? "escapes and contributes visits" : "does not escape within 80 updates and contributes nothing"}`}
      >
        <path d="M40 160H440M240 10V310" className={styles.axis} />
        <path d={path} className={orbit.escaped ? styles.accent : extra.reference} />
        {Array.from(new Map(orbit.points.slice(0, 12).map((p) => [`${p.x}:${p.y}`, p])).values())
          .filter((p) => Math.abs(p.x) <= 2 && Math.abs(p.y) <= 1.5)
          .map((p) => (
            <circle
              key={`${p.x}:${p.y}`}
              cx={plot(p)[0]}
              cy={plot(p)[1]}
              r="3"
              className={styles.point}
            />
          ))}
      </svg>
      <p>
        {orbit.escaped
          ? `This orbit escapes after ${orbit.points.length} updates. Its in-frame positions contribute to the count below.`
          : "This orbit stays within the escape radius for all 80 updates. It contributes no visits to this sample."}
      </p>
      <svg
        viewBox="0 0 480 320"
        role="img"
        aria-label={`${escaped} escaping orbits contribute to a visit histogram from ${step * 100} samples.`}
      >
        {Array.from(cells, (value, index) => ({
          value,
          x: index % 80,
          y: Math.floor(index / 80),
        })).map(({ value, x, y }) =>
          value ? (
            <rect
              key={`${x}:${y}`}
              x={40 + x * 5}
              y={10 + y * 5}
              width="5"
              height="5"
              fill="#f5c56d"
              opacity={Math.log1p(value) / Math.log1p(peak)}
            />
          ) : null,
        )}
      </svg>
      <LessonSteps step={step} max={20} onChange={setStep} label="Orbit accumulation" />
      <p aria-live="polite">
        {step * 100} sampled parameters · {escaped} escaping orbits. Brighter cells receive more
        visits, with logarithmic brightness.
      </p>
      <p>
        Long-lived escaping orbits can visit many regions before leaving. Their repeated visits
        reveal structure that escape-time coloring hides.
      </p>
    </LessonFrame>
  );
}

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
    <LessonFrame title="Raise a radius and multiply two angles" kind="mandelbulb">
      <p>
        A complex power multiplies one angle. The Mandelbulb extends that idea to two spherical
        angles and a radius.
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
          Starting polar angle <output>{latitude}°</output>
        </span>
        <input
          type="range"
          aria-label="Starting polar angle"
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
        Radius: 0.900 → {(radius ** power).toFixed(3)}. Polar angle: {latitude}° →{" "}
        {latitude * power}°. Longitude: 34.4° → {(((phi * 180) / Math.PI) * power).toFixed(1)}°.
      </p>
      <p>
        The hollow point marks the input. Amber shows the transformation. The connecting motion
        illustrates the power operation, not successive fractal iterates.
      </p>
      <p>
        The full recurrence adds the original point after each power operation. Repeating that rule
        separates escaping points from the bulb.
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
    <LessonFrame title="An infinite word leaves a bounded trace" kind="rauzy">
      <p>
        The substitution 1 → 12, 2 → 13, 3 → 1 creates a staircase in three dimensions. Its sideways
        deviations form this tile.
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
        {count.toLocaleString()} projected corners. Orange, teal and rose identify the next letters
        1, 2 and 3.
      </p>
      <p>
        The projection removes the staircase’s average growing direction. The remaining coordinates
        stay bounded while new corners fill the three subtiles.
      </p>
      <p>
        The tile has area. Its rough boundary carries the fractal detail, unlike a dust whose entire
        interior disappears.
      </p>
    </LessonFrame>
  );
}

export type SpecialLessonKind = "buddhabrot" | "mandelbulb" | "rauzy";
export const isSpecialLessonKind = (value: unknown): value is SpecialLessonKind =>
  value === "buddhabrot" || value === "mandelbulb" || value === "rauzy";
export default function SpecialLesson({ kind }: { kind: SpecialLessonKind }) {
  return kind === "buddhabrot" ? (
    <BuddhabrotLesson />
  ) : kind === "mandelbulb" ? (
    <MandelbulbLesson />
  ) : (
    <RauzyLesson />
  );
}
