// biome-ignore-all lint/suspicious/noArrayIndexKey: Indices identify fixed segments and construction rounds.
import { useMemo, useState } from "react";
import extra from "../../styles/lessons/KochMeasurement.module.css";
import styles from "../../styles/lessons/Lesson.module.css";
import {
  addedKochTriangles,
  type KochPoint,
  kochMeasurements,
  measuredKoch,
  straightenKoch,
} from "../../utils/lessons/kochMeasurement";
import { LessonFrame } from "./LessonFrame";

const path = (points: KochPoint[], project: (p: KochPoint) => KochPoint, closed = false) =>
  `${points
    .map(
      (p, i) =>
        `${i ? "L" : "M"}${project(p)
          .map((n) => Number(n.toFixed(4)))
          .join(",")}`,
    )
    .join("")}${closed ? "Z" : ""}`;
const edgeProject = ([x, y]: KochPoint): KochPoint => [35 + 155 * x, 70 - 155 * y];
const snowProject = ([x, y]: KochPoint): KochPoint => [70 + 230 * x, 100 - 230 * y];

export default function KochMeasurementLesson() {
  const [round, setRound] = useState(1);
  const [straight, setStraight] = useState(0);
  const [inward, setInward] = useState(false);
  const data = useMemo(
    () => ({
      edge: measuredKoch(round, inward),
      snowflake: measuredKoch(round, inward, true),
      triangles: addedKochTriangles(round, inward),
      ...kochMeasurements(round, inward),
    }),
    [round, inward],
  );
  const unfolded = straightenKoch(data.edge, straight / 100);
  return (
    <LessonFrame title="Straighten the edge. Keep its length." kind="koch-measurement">
      <p>Slide the control to lay the pieces along a ruler. None of them gets longer or shorter.</p>
      <div className={styles.options}>
        <fieldset className={extra.rounds} aria-label="Koch construction round">
          {[0, 1, 2, 3].map((n) => (
            <button type="button" key={n} aria-pressed={round === n} onClick={() => setRound(n)}>
              Round {n}
            </button>
          ))}
        </fieldset>
      </div>
      <svg
        viewBox="0 0 450 205"
        role="img"
        aria-label={`One original edge after round ${round}, length ${data.length.toFixed(3)}, ${straight}% straightened`}
      >
        <path d="M35 160H190M35 153V167M190 153V167" className={styles.axis} />
        <text x={112} y={190} textAnchor="middle" className={extra.label}>
          Original edge: 1
        </text>
        <path
          d={path(data.edge, edgeProject)}
          fill="none"
          stroke="#eee8ce44"
          strokeWidth={1.5}
          strokeDasharray="4 4"
        />
        {unfolded.slice(1).map((p, i) => (
          <path
            key={i}
            d={path([unfolded[i], p], edgeProject)}
            fill="none"
            stroke="#f5c56d"
            strokeWidth={3}
          />
        ))}
        {round === 1 &&
          unfolded.map((p, i) => (
            <circle
              key={i}
              cx={Number(edgeProject(p)[0].toFixed(4))}
              cy={Number(edgeProject(p)[1].toFixed(4))}
              r={3.2}
              fill="#10151a"
              stroke="#f5c56d"
              strokeWidth={1.5}
            />
          ))}
      </svg>
      <label className={styles.parameter}>
        <span>
          Straighten the edge <output>{straight}%</output>
        </span>
        <input
          aria-label="Straighten Koch edge"
          type="range"
          min={0}
          max={100}
          value={straight}
          onChange={(e) => setStraight(Number(e.target.value))}
        />
      </label>
      <p aria-live="polite">
        {round === 0
          ? "One straight edge. Choose Round 1 to replace it with four pieces."
          : round === 1
            ? "Four pieces, each one third as long. Together they measure 1⅓ original edges."
            : `${4 ** round} pieces now measure ${data.length.toFixed(3)} original edges. Each round multiplies the length by four thirds.`}
      </p>
      <div className={extra.areaViews}>
        <svg
          viewBox="0 0 370 340"
          role="img"
          aria-label={`${inward ? "Anti-snowflake" : "Snowflake"} round ${round}, ${inward ? "removed" : "added"} triangles highlighted`}
        >
          <path
            d={path(data.snowflake, snowProject, true)}
            fill="#eee8ce20"
            stroke="#eee8ce"
            strokeWidth={1.5}
          />
          {data.triangles.map((triangle, i) => (
            <path
              key={i}
              d={path(triangle, snowProject, true)}
              fill="#f5c56d99"
              stroke="#f5c56d"
              strokeWidth={0.6}
            />
          ))}
          <path
            d={path(measuredKoch(0, false, true), snowProject, true)}
            fill="none"
            stroke="#eee8ce55"
            strokeWidth={1}
            strokeDasharray="4 4"
          />
        </svg>
        <div className={extra.areaReadout}>
          <p className={extra.areaTitle}>
            {inward ? "Area removed each round" : "Area added each round"}
          </p>
          <svg
            viewBox="0 0 270 220"
            role="img"
            aria-label={`Area relative to the starting triangle: ${data.area.toFixed(3)}. ${inward ? "Removed" : "Added"} amounts ${data.additions.map((n) => n.toFixed(3)).join(", ") || "none"}.`}
          >
            <text x={10} y={20} className={extra.label}>
              Starting triangle
            </text>
            <rect x={10} y={30} width={240} height={18} fill="#eee8ce55" />
            {[1, 2, 3].map((n) => (
              <g key={n}>
                <text x={10} y={62 + n * 42} className={extra.label}>
                  Round {n}
                </text>
                <rect
                  x={95}
                  y={49 + n * 42}
                  width={round >= n ? (data.additions[n - 1] ?? 0) * 240 : 0}
                  height={17}
                  fill="#f5c56d"
                  opacity={n === round ? 1 : 0.5}
                />
                {round >= n && (
                  <text x={260} y={62 + n * 42} textAnchor="end" className={extra.label}>
                    {((data.additions[n - 1] ?? 0) * 100).toFixed(1)}%
                  </text>
                )}
              </g>
            ))}
          </svg>
          <p>
            Total area: <strong>{data.area.toFixed(3)}</strong> starting triangles.
          </p>
        </div>
      </div>
      <div className={styles.options}>
        <button type="button" aria-pressed={!inward} onClick={() => setInward(false)}>
          Bumps outward
        </button>
        <button type="button" aria-pressed={inward} onClick={() => setInward(true)}>
          Bumps inward
        </button>
      </div>
      <p>
        The amber triangles are {inward ? "removed" : "added"} in the chosen round. After the first
        round, each batch has four ninths of the area of the batch before it.
      </p>
    </LessonFrame>
  );
}
