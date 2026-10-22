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
  const { seed, frames } = REPLAYS[replay];
  const current = frames[step];
  const position = center(current.point);
  const contacts = dlaContactCells(current.point, DLA_LESSON_CLUSTER);
  const diagonal = contacts.some(
    (cell) => cell.x !== current.point.x && cell.y !== current.point.y,
  );
  const location = `(${current.point.x}, ${current.point.y})`;
  const description =
    current.status === "stuck"
      ? `Contact at ${location}, ${diagonal ? "across a diagonal" : "along an edge"}. The walker freezes here. Its walk ends at this first contact.`
      : current.status === "discarded"
        ? `Discarded at ${location}. The walker left this small window without touching the seed. This replay stops here.`
        : current.status === "limit"
          ? `Stopped at ${location} after the step limit. The walker has not touched the frozen seed.`
          : `Walker at ${location}. No frozen cell touches it yet. Take another step to move up, down, left or right.`;
  const chooseReplay = (next: number) => {
    setReplay(next);
    setStep(0);
  };
  return (
    <LessonFrame title="Follow one walker until it sticks" kind="dla">
      <p>
        A cream cell stays frozen. The outlined amber dot walks one grid cell per step. Each move
        chooses one of four directions.
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
          >{`Seeded random walk ${replay + 1}, step ${step}, ${current.status}`}</title>
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
            The eight outlined neighbors count as contact. A diagonal touch counts too. With
            sticking chance 1, the first touch freezes the walker.
          </p>
          <p className={styles.legend}>
            <span>Cream square: frozen seed</span>
            <span>Dashed amber line: past moves</span>
            <span>
              {current.status === "stuck"
                ? "Amber square: new frozen cell"
                : "Outlined amber dot: walker"}
            </span>
          </p>
        </div>
      </div>
      <LessonSteps label="DLA walker" step={step} max={frames.length - 1} onChange={setStep} />
      <p>
        Walk {replay + 1} replays random seed {seed}. The three examples include a walk that leaves
        the window. They do not measure the chance of sticking.
      </p>
      <p>
        This small model uses only unit moves and a fixed window. The full explorer releases new
        walkers and speeds up distant moves with longer jumps.
      </p>
    </LessonFrame>
  );
}
