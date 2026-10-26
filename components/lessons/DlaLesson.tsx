import { useId, useState } from "react";
import styles from "../../styles/lessons/DlaLesson.module.css";
import common from "../../styles/lessons/Lesson.module.css";
import {
  DLA_LESSON_CLUSTER,
  DLA_LESSON_SIZE,
  type DlaPoint,
  dlaContactCells,
  traceDlaWalk,
} from "../../utils/lessons/dlaLesson";
import { LessonFrame, LessonSteps } from "./LessonFrame";

const REPLAYS = [22, 25, 1].map((seed) => ({ seed, frames: traceDlaWalk(seed) }));
const CELL = 20;
const OFFSET = 28;
const GRID_LINES = Array.from({ length: DLA_LESSON_SIZE + 1 }, (_, index) => OFFSET + index * CELL);
const center = (point: DlaPoint) => ({
  x: OFFSET + (point.x + 0.5) * CELL,
  y: OFFSET + (point.y + 0.5) * CELL,
});
const neighbors = [-1, 0, 1].flatMap((y) =>
  [-1, 0, 1]
    .filter((x) => x !== 0 || y !== 0)
    .map((x) => ({ x: DLA_LESSON_CLUSTER[0].x + x, y: DLA_LESSON_CLUSTER[0].y + y })),
);

export default function DlaLesson() {
  const [replay, setReplay] = useState(0);
  const [step, setStep] = useState(0);
  const id = useId();
  const { frames } = REPLAYS[replay];
  const current = frames[step];
  const position = center(current.point);
  const contacts = dlaContactCells(current.point, DLA_LESSON_CLUSTER);
  const diagonal = contacts.some(
    (cell) => cell.x !== current.point.x && cell.y !== current.point.y,
  );
  const location = `(${current.point.x}, ${current.point.y})`;
  const description =
    current.status === "stuck"
      ? `The particle touches ${diagonal ? "a corner" : "an edge"} of the fixed square at ${location}. It sticks here. The next particle could stick to either square.`
      : current.status === "discarded"
        ? `The particle left the picture at ${location} without touching the fixed square. This walk adds nothing to the cluster.`
        : current.status === "limit"
          ? `The walk reached its move limit at ${location} without touching the fixed square.`
          : `The particle is at ${location}. It has not touched the fixed square yet. Take another step to see where it moves.`;
  const chooseReplay = (next: number) => {
    setReplay(next);
    setStep(0);
  };
  return (
    <LessonFrame title="Follow one particle until it sticks" kind="dla">
      <p>
        The cream square stays fixed. Press Next step to move the amber particle one square in a
        random direction. Watch for its first touch.
      </p>
      <fieldset className={common.options} aria-label="Random walk replay">
        {REPLAYS.map((item, index) => (
          <button
            type="button"
            key={item.seed}
            aria-pressed={replay === index}
            onClick={() => chooseReplay(index)}
          >
            Walk {index + 1}
          </button>
        ))}
        <button type="button" onClick={() => setStep(0)}>
          Replay walk
        </button>
      </fieldset>
      <div className={common.grid}>
        <svg
          className={styles.diagram}
          viewBox="0 0 320 320"
          role="img"
          aria-labelledby={`${id}-title ${id}-summary`}
        >
          <title
            id={`${id}-title`}
          >{`Random walk ${replay + 1}, step ${step}, ${current.status}`}</title>
          {neighbors.map((point) => (
            <rect
              key={`${point.x}:${point.y}`}
              x={OFFSET + point.x * CELL + 1}
              y={OFFSET + point.y * CELL + 1}
              width={CELL - 2}
              height={CELL - 2}
              className={styles.contactCell}
            />
          ))}
          {GRID_LINES.map((coordinate) => (
            <path
              key={coordinate}
              d={`M${coordinate} ${OFFSET}v${DLA_LESSON_SIZE * CELL}M${OFFSET} ${coordinate}h${DLA_LESSON_SIZE * CELL}`}
              className={styles.gridLine}
            />
          ))}
          {DLA_LESSON_CLUSTER.map((point) => (
            <rect
              key={`${point.x}:${point.y}`}
              x={OFFSET + point.x * CELL + 2}
              y={OFFSET + point.y * CELL + 2}
              width={CELL - 4}
              height={CELL - 4}
              className={styles.frozen}
            />
          ))}
          <polyline
            points={frames
              .slice(0, step + 1)
              .map(({ point }) => {
                const p = center(point);
                return `${p.x},${p.y}`;
              })
              .join(" ")}
            className={styles.trail}
          />
          {current.status === "stuck" ? (
            <rect
              x={OFFSET + current.point.x * CELL + 2}
              y={OFFSET + current.point.y * CELL + 2}
              width={CELL - 4}
              height={CELL - 4}
              className={styles.newFrozen}
            />
          ) : (
            <circle cx={position.x} cy={position.y} r="5.5" className={styles.walker} />
          )}
          {[0, 6, 12].map((value) => (
            <g key={value}>
              <text
                x={OFFSET + (value + 0.5) * CELL}
                y="306"
                textAnchor="middle"
                className={styles.coordinate}
              >
                {value}
              </text>
              <text
                x="17"
                y={OFFSET + (value + 0.5) * CELL + 4}
                textAnchor="middle"
                className={styles.coordinate}
              >
                {value}
              </text>
            </g>
          ))}
          <text x="306" y="306" textAnchor="middle" className={styles.coordinate}>
            x
          </text>
          <text x="17" y="20" textAnchor="middle" className={styles.coordinate}>
            y
          </text>
        </svg>
        <div>
          <p id={`${id}-summary`} aria-live="polite" aria-atomic="true">
            {description}
          </p>
          <p>
            The particle stops when it touches the cream square. Touching at a corner counts too.
          </p>
          <p className={styles.legend}>
            <span>Cream square: fixed particle</span>
            <span>Dashed amber line: past moves</span>
            <span>
              {current.status === "stuck"
                ? "Amber square: newly stuck particle"
                : "Outlined amber dot: moving particle"}
            </span>
          </p>
        </div>
      </div>
      <LessonSteps label="DLA walker" step={step} max={frames.length - 1} onChange={setStep} />
      <p>
        Try another walk. Random moves can carry a particle out of the picture before it touches
        anything. That particle adds nothing; we release another and try again.
      </p>
    </LessonFrame>
  );
}
