// biome-ignore-all lint/suspicious/noArrayIndexKey: Indices identify the four fixed route positions.
import { useMemo, useState } from "react";
import styles from "../../styles/lessons/Lesson.module.css";
import extra from "../../styles/lessons/PathConnections.module.css";
import { type GridPoint, hilbertChunks, hilbertLinks } from "../../utils/lessons/hilbertJoin";
import { LessonFrame } from "./LessonFrame";

const colors = ["#f5c56d", "#7ec9bb", "#d68fa3", "#97ade0"];
export default function HilbertJoinLesson() {
  const [round, setRound] = useState(2);
  const [selected, setSelected] = useState(0);
  const [rotations, setRotations] = useState([1, 0, 0, 0]);
  const [reversed, setReversed] = useState([false, false, false, false]);
  const chunks = useMemo(
    () => hilbertChunks(round, rotations, reversed),
    [round, rotations, reversed],
  );
  const links = hilbertLinks(chunks);
  const size = 2 ** round;
  const cell = 360 / size;
  const project = ([x, y]: GridPoint): GridPoint => [20 + (x + 0.5) * cell, 380 - (y + 0.5) * cell];
  const path = (points: GridPoint[]) =>
    points.map((p, i) => `${i ? "L" : "M"}${project(p).join(",")}`).join("");
  const fit = links.filter((link) => link.fits).length;
  return (
    <LessonFrame title="Join four smaller routes" kind="hilbert-join">
      <div className={extra.hilbertLayout}>
        <svg
          viewBox="0 0 400 400"
          role="img"
          aria-label={`Four Hilbert routes on a ${size} by ${size} grid. ${fit} of 3 links fit.`}
        >
          {Array.from({ length: size * size }, (_, i) => (
            <circle
              key={i}
              cx={project([i % size, Math.floor(i / size)])[0]}
              cy={project([i % size, Math.floor(i / size)])[1]}
              r={1.5}
              fill="#eee8ce44"
            />
          ))}
          <path
            d="M200 20V380M20 200H380"
            stroke="#eee8ce33"
            strokeWidth={1}
            strokeDasharray="4 4"
          />
          {links.map((link, i) => (
            <path
              key={i}
              d={path([link.from, link.to])}
              fill="none"
              stroke={link.fits ? "#eee8ce" : "#eee8ce44"}
              strokeWidth={link.fits ? 3 : 1.5}
              strokeDasharray={link.fits ? undefined : "4 5"}
            />
          ))}
          {chunks.map((chunk, i) => {
            const start = project(chunk.points[0]),
              end = project(chunk.points[chunk.points.length - 1]);
            return (
              <g key={i} opacity={i === selected ? 1 : 0.65}>
                <path
                  d={path(chunk.points)}
                  fill="none"
                  stroke={colors[i]}
                  strokeWidth={i === selected ? 4 : 3}
                  strokeLinejoin="round"
                />
                <circle
                  cx={start[0]}
                  cy={start[1]}
                  r={5}
                  fill="#10151a"
                  stroke={colors[i]}
                  strokeWidth={2}
                />
                <circle
                  cx={end[0]}
                  cy={end[1]}
                  r={5}
                  fill={colors[i]}
                  stroke="#10151a"
                  strokeWidth={1}
                />
                <text
                  x={project(chunk.center)[0]}
                  y={project(chunk.center)[1]}
                  className={extra.routeLabel}
                >
                  {i + 1}
                </text>
              </g>
            );
          })}
        </svg>
        <div>
          <fieldset className={styles.options} aria-label="Choose a Hilbert route">
            {colors.map((color, i) => (
              <button
                key={color}
                type="button"
                aria-pressed={selected === i}
                onClick={() => setSelected(i)}
              >
                <span className={extra.swatch} style={{ background: color }} />
                Route {i + 1}
              </button>
            ))}
          </fieldset>
          <div className={styles.options}>
            <button
              type="button"
              onClick={() =>
                setRotations(rotations.map((n, i) => (i === selected ? (n + 1) % 4 : n)))
              }
            >
              Rotate a quarter turn
            </button>
            <button
              type="button"
              aria-pressed={reversed[selected]}
              onClick={() =>
                setReversed(reversed.map((value, i) => (i === selected ? !value : value)))
              }
            >
              Reverse direction
            </button>
          </div>
          <p aria-live="polite">{fit} of 3 links fit</p>
          <button
            type="button"
            onClick={() => {
              setRotations([0, 0, 0, 0]);
              setReversed([false, false, false, false]);
            }}
          >
            Show a joined route
          </button>
          <fieldset className={styles.options} aria-label="Hilbert grid size">
            {[2, 3].map((n) => (
              <button type="button" key={n} aria-pressed={round === n} onClick={() => setRound(n)}>
                {2 ** n} × {2 ** n} grid
              </button>
            ))}
          </fieldset>
        </div>
      </div>
    </LessonFrame>
  );
}
