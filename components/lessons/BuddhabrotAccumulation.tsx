// biome-ignore-all lint/suspicious/noArrayIndexKey: Histogram indices identify fixed spatial cells.
import { useMemo, useState } from "react";
import styles from "../../styles/lessons/Lesson.module.css";
import layout from "../../styles/lessons/LinkedExperiments.module.css";
import { accumulateOrbits, visitOpacity } from "../../utils/lessons/buddhabrotAccumulation";
import { buddhaSamples, histogramOrbit } from "../../utils/lessons/specialLessons";
import { LessonFrame, LessonSteps } from "./LessonFrame";

const CONSTANTS = [
  { x: 0, y: 0 },
  { x: -1, y: 0 },
  { x: 0.3, y: 0.6 },
];
const LABELS = ["c = 0", "c = −1", "c = 0.3 + 0.6i"];
const plot = (p: { x: number; y: number }) => [40 + (p.x + 2) * 100, 10 + (1.5 - p.y) * 100];
const inWindow = (p: { x: number; y: number }) => Math.abs(p.x) <= 2 && Math.abs(p.y) <= 1.5;

export default function BuddhabrotAccumulation() {
  const [preset, setPreset] = useState(2);
  const [step, setStep] = useState(0);
  const [reset, setReset] = useState(0);
  const [recordings, setRecordings] = useState<number[]>([]);
  const samples = useMemo(() => buddhaSamples(), []);
  const orbits = useMemo(() => CONSTANTS.map((c) => histogramOrbit(c)), []);
  const orbit = orbits[preset];
  const histogram = useMemo(
    () =>
      accumulateOrbits([
        ...recordings.map((index) => orbits[index]),
        ...samples.slice(0, step * 100),
      ]),
    [recordings, step, samples, orbits],
  );
  const selected = accumulateOrbits([orbit]);
  const selectedBins = Array.from(selected.cells).filter((count) => count > 0).length;
  let previousVisible = false;
  const path = orbit.points
    .map((p) => {
      const visible = inWindow(p);
      const command = visible ? `${previousVisible ? "L" : "M"}${plot(p).join(",")}` : "";
      previousVisible = visible;
      return command;
    })
    .join(" ");
  return (
    <LessonFrame title="Record a route in the picture" kind="buddhabrot">
      <p>
        Choose a number. The first picture follows its calculation. Record this route to add its
        visits to the second picture.
      </p>
      <div className={styles.options}>
        {LABELS.map((label, index) => (
          <button
            type="button"
            key={label}
            aria-pressed={preset === index}
            onClick={() => setPreset(index)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className={layout.pair}>
        <div>
          <h3>Selected route</h3>
          <svg
            viewBox="0 0 480 320"
            role="img"
            aria-label={
              orbit.escaped
                ? `Selected orbit escapes after ${orbit.points.length} updates`
                : "Selected orbit has not escaped after 80 updates"
            }
          >
            <path d="M40 160H440M240 10V310" className={styles.axis} />
            <path d={path} className={styles.accent} />
            {Array.from(
              new Map(orbit.points.slice(0, 12).map((p) => [`${p.x}:${p.y}`, p])).values(),
            )
              .filter(inWindow)
              .map((p) => (
                <circle
                  key={`${p.x}:${p.y}`}
                  cx={plot(p)[0]}
                  cy={plot(p)[1]}
                  r="3"
                  fill="#f5c56d"
                />
              ))}
          </svg>
          <p>
            {orbit.escaped
              ? `Escapes after ${orbit.points.length} updates. It adds ${selected.visits} visits to ${selectedBins} squares in this window.`
              : "No escape in 80 updates. This route adds no visits."}
          </p>
        </div>
        <div>
          <h3>Recorded visits</h3>
          <svg
            viewBox="0 0 480 320"
            role="img"
            aria-label={`${histogram.visits} recorded visits from ${histogram.escaped} escaping routes`}
            data-recorded-visits={histogram.visits}
          >
            <path d="M40 160H440M240 10V310" className={styles.axis} />
            {Array.from(histogram.cells, (count, index) =>
              count > 0 ? (
                <rect
                  key={`${index % 80}:${Math.floor(index / 80)}`}
                  x={40 + (index % 80) * 5}
                  y={10 + Math.floor(index / 80) * 5}
                  width="5"
                  height="5"
                  fill="#f5c56d"
                  opacity={visitOpacity(count)}
                  data-bin={index}
                  data-count={count}
                />
              ) : null,
            )}
            {Array.from(selected.cells, (count, index) =>
              count > 0 ? (
                <rect
                  key={`${index % 80}:${Math.floor(index / 80)}`}
                  x={40 + (index % 80) * 5 - 1}
                  y={10 + Math.floor(index / 80) * 5 - 1}
                  width="7"
                  height="7"
                  fill="none"
                  stroke="#eee8ce"
                  strokeWidth="0.7"
                />
              ) : null,
            )}
          </svg>
          <p>
            The outlined squares match the selected route. Each recording adds the visits again.
          </p>
        </div>
      </div>
      <div className={styles.options}>
        <button
          type="button"
          disabled={!orbit.escaped}
          onClick={() => setRecordings((old) => [...old, preset])}
        >
          Record this route
        </button>
        <button
          type="button"
          onClick={() => {
            setRecordings([]);
            setReset((n) => n + 1);
            setStep(0);
          }}
        >
          Clear visits
        </button>
      </div>
      <p aria-live="polite" data-recording-count={recordings.length}>
        {recordings.length} manual recording{recordings.length === 1 ? "" : "s"} · {step * 100}{" "}
        other numbers tested · {histogram.visits} visits recorded. More visits make a square
        brighter, up to the display's brightest color.
      </p>
      <LessonSteps
        key={reset}
        step={step}
        max={20}
        onChange={setStep}
        label="Other sampled routes"
      />
      <p>
        Next step tests 100 other numbers. Only routes that escape within 80 updates contribute.
        Visits outside this window are not shown.
      </p>
    </LessonFrame>
  );
}
