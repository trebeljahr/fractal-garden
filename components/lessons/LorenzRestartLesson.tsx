import { useId, useMemo, useState } from "react";
import shared from "../../styles/lessons/Lesson.module.css";
import styles from "../../styles/lessons/LorenzRestart.module.css";
import {
  APART_DISTANCE,
  ATTRACTOR_LESSONS,
  type AttractorPoint,
  LORENZ_ROUNDING_NOTCH,
  RESTART_NOTCHES,
  RESTART_POINT,
  RESTART_STEPS,
  restartDifferenceLabel,
  restartRuns,
  restartStartLabel,
} from "../../utils/lessons/attractorLesson";
import { LessonFrame } from "./LessonFrame";

const LEFT = 8;
const RIGHT = 512;
const X_TOP = 8;
const X_BOTTOM = 128;
const X_RANGE = 22;
const GAP_TOP = 162;
const GAP_BOTTOM = 384;
const GAP_HIGHEST = 2;
const GAP_LOWEST = -13;
const TIME_TICKS = [0, 10, 20, 30];
const GAP_TICKS = [
  { power: 0, label: "1" },
  { power: -3, label: "0.001" },
  { power: -6, label: "0.000001" },
  { power: -9, label: "0.000000001" },
  { power: -12, label: "0.000000000001" },
];
const { dt } = ATTRACTOR_LESSONS.lorenz;
const SPAN = RESTART_STEPS * dt;

const timeToX = (time: number) => LEFT + (time / SPAN) * (RIGHT - LEFT);
const xToY = (x: number) => (X_TOP + X_BOTTOM) / 2 - (x / X_RANGE) * ((X_BOTTOM - X_TOP) / 2);
const powerToY = (power: number) =>
  GAP_TOP +
  ((GAP_HIGHEST - Math.max(GAP_LOWEST, Math.min(GAP_HIGHEST, power))) /
    (GAP_HIGHEST - GAP_LOWEST)) *
    (GAP_BOTTOM - GAP_TOP);

function linePath(count: number, stride: number, at: (index: number) => number) {
  const parts: string[] = [];
  for (let index = 0; index < count; index += stride)
    parts.push(`${index ? "L" : "M"}${timeToX(index * dt).toFixed(1)},${at(index).toFixed(1)}`);
  return parts.join("");
}
const xPath = (run: AttractorPoint[]) => linePath(run.length, 3, (index) => xToY(run[index][0]));
const gapPath = (gaps: number[]) =>
  linePath(gaps.length, 6, (index) => powerToY(Math.log10(Math.max(gaps[index], 1e-300))));

export default function LorenzRestartLesson() {
  const [notch, setNotch] = useState(LORENZ_ROUNDING_NOTCH);
  const id = useId();
  const { restarts, gapPaths, originalPath } = useMemo(() => {
    const { original, restarts } = restartRuns();
    return {
      restarts,
      gapPaths: restarts.map(({ gaps }) => gapPath(gaps)),
      originalPath: xPath(original),
    };
  }, []);
  const chosen = restarts[notch];
  const rerunPath = useMemo(() => xPath(chosen.run), [chosen]);
  const smaller = restarts[notch + 1];
  const apart = chosen.apartTime;
  const apartLine = apart === null ? null : timeToX(apart);
  const apartY = powerToY(Math.log10(APART_DISTANCE));
  return (
    <LessonFrame title="How soon does a small rounding matter?" kind="lorenz-restart">
      <svg
        viewBox="0 0 520 408"
        role="img"
        aria-labelledby={`${id}-plot ${id}-readout`}
        className={styles.plot}
      >
        <title id={`${id}-plot`}>
          Two runs of the Lorenz equations against time, and the distance between them on a scale
          where equal steps are equal multiples
        </title>
        <path d={`M${LEFT},${xToY(0)}H${RIGHT}`} className={styles.grid} />
        <text x={LEFT + 2} y={X_TOP + 14} className={shared.label}>
          x
        </text>
        <path d={rerunPath} className={styles.rerun} />
        <path d={originalPath} className={styles.original} />
        {GAP_TICKS.map(({ power, label }) => (
          <g key={power}>
            <path d={`M${LEFT},${powerToY(power)}H${RIGHT}`} className={styles.grid} />
            <text x={RIGHT - 2} y={powerToY(power) - 4} textAnchor="end" className={styles.tick}>
              {label}
            </text>
          </g>
        ))}
        <text x={LEFT + 2} y={GAP_TOP - 8} className={styles.tick}>
          gap between the runs
        </text>
        {gapPaths.map((path, index) =>
          index === notch ? null : <path key={path} d={path} className={styles.otherGap} />,
        )}
        <path d={`M${LEFT},${apartY}H${RIGHT}`} className={styles.apartLine} />
        <path d={gapPaths[notch]} className={styles.gap} />
        {restarts.map(({ notch: other, apartTime }) =>
          apartTime === null ? null : (
            <circle
              key={other}
              cx={timeToX(apartTime)}
              cy={apartY}
              r={other === notch ? 5 : 2.5}
              className={other === notch ? styles.chosenDot : styles.dot}
            />
          ),
        )}
        {apartLine !== null && (
          <path d={`M${apartLine},${X_TOP}V${GAP_BOTTOM}`} className={styles.marker} />
        )}
        <text x={LEFT + 2} y={apartY - 6} className={styles.apartLabel}>
          visibly apart
        </text>
        <path d={`M${LEFT},${GAP_BOTTOM}H${RIGHT}`} className={shared.axis} />
        {TIME_TICKS.map((time) => (
          <text
            key={time}
            x={timeToX(time)}
            y={GAP_BOTTOM + 18}
            textAnchor={time === 0 ? "start" : "middle"}
            className={styles.tick}
          >
            {time === 0 ? "time 0" : time}
          </text>
        ))}
      </svg>
      <label className={shared.parameter}>
        <span>
          Difference at the restart <b>{restartDifferenceLabel(notch)}</b>
        </span>
        <input
          type="range"
          min={0}
          max={RESTART_NOTCHES - 1}
          step={1}
          value={notch}
          aria-valuetext={restartDifferenceLabel(notch)}
          onChange={(event) => setNotch(Number(event.target.value))}
        />
      </label>
      <div id={`${id}-readout`} aria-live="polite" aria-atomic="true" className={styles.readout}>
        <p data-restart-starts>
          <span className={styles.originalName}>Run 1</span> starts at x = {RESTART_POINT[0]},{" "}
          <span className={styles.rerunName}>run 2</span> at x = {restartStartLabel(notch)}.
        </p>
        <p data-restart-apart>
          {apart === null ? "Not visibly apart yet." : `Visibly apart at time ${apart.toFixed(2)}.`}
          {apart !== null && smaller?.apartTime != null
            ? ` Ten times smaller: ${smaller.apartTime.toFixed(2)}, which is ${(smaller.apartTime - apart).toFixed(2)} later.`
            : ""}
        </p>
      </div>
    </LessonFrame>
  );
}
