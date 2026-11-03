import { useEffect, useMemo, useRef, useState } from "react";
import common from "../../styles/lessons/Lesson.module.css";
import styles from "../../styles/lessons/ReadoutStage.module.css";
import {
  T_SQUARE_ROUNDS,
  tSquareSquares,
  tSquareSummedArea,
  tSquareUncovered,
} from "../../utils/lessons/tSquareCover";
import { LessonFrame, LessonSteps } from "./LessonFrame";

// The explorer's colors.
const BACKGROUND = "#252424";
const COVERED = "#ffffff";
const NEXT = "#f5c56d";
const BOX = "#eee8ce";
const PADDING = 0.04;
// Below this, the small squares that make up the holes are too fine to count.
const SMALLEST_CELL_PX = 7;

export default function TSquareCoverLesson() {
  const [round, setRound] = useState(1);
  const [outlines, setOutlines] = useState(false);
  const [size, setSize] = useState(0);
  const canvas = useRef<HTMLCanvasElement>(null);
  const visible = useMemo(() => tSquareSquares(round), [round]);
  const next = useMemo(
    () => tSquareSquares(round + 1).filter((square) => square.round === round + 1),
    [round],
  );
  const every = useMemo(
    () => (outlines ? tSquareSquares(round, { hidden: true }) : []),
    [outlines, round],
  );

  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setSize(entry.contentRect.width));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const element = canvas.current;
    const context = element?.getContext("2d");
    if (!element || !context || !size) return;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    element.width = Math.round(size * ratio);
    element.height = Math.round(size * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    const unit = (size * (1 - 2 * PADDING)) / 2;
    const middle = size / 2;
    const squares = (list: typeof visible) => {
      const path = new Path2D();
      for (const { x, y, size: side } of list)
        path.rect(
          middle + (x - side / 2) * unit,
          middle + (y - side / 2) * unit,
          side * unit,
          side * unit,
        );
      return path;
    };
    context.fillStyle = BACKGROUND;
    context.fillRect(0, 0, size, size);
    if (outlines) {
      context.strokeStyle = COVERED;
      context.lineWidth = 0.75;
      context.stroke(squares(every));
    } else {
      context.fillStyle = NEXT;
      context.fill(squares(next));
      const cell = 2 ** -(round + 1);
      if (cell * unit >= SMALLEST_CELL_PX) {
        const grid = new Path2D();
        for (let at = -1; at <= 1 + cell / 2; at += cell) {
          grid.moveTo(middle + at * unit, middle - unit);
          grid.lineTo(middle + at * unit, middle + unit);
          grid.moveTo(middle - unit, middle + at * unit);
          grid.lineTo(middle + unit, middle + at * unit);
        }
        context.strokeStyle = "#eee8ce4d";
        context.lineWidth = 0.75;
        context.stroke(grid);
      }
      context.fillStyle = COVERED;
      context.fill(squares(visible));
    }
    context.strokeStyle = BOX;
    context.lineWidth = 1.5;
    context.strokeRect(middle - unit, middle - unit, 2 * unit, 2 * unit);
  }, [visible, next, every, outlines, round, size]);

  const uncovered = 100 * tSquareUncovered(round);
  const covered = (100 - uncovered).toFixed(2);
  return (
    <LessonFrame title="Cover the box" kind="t-square-cover">
      <div className={styles.layout}>
        <canvas
          ref={canvas}
          className={styles.flat}
          role="img"
          aria-label={`Round ${round}: the squares cover ${covered}% of the box.`}
        />
        <div className={styles.side}>
          <dl className={styles.readout} data-t-square-readout>
            <div>
              <dt>Covered</dt>
              <dd>{covered}% of the box</dd>
            </div>
            <div>
              <dt>Uncovered</dt>
              <dd>{uncovered.toFixed(2)}%</dd>
            </div>
            <div>
              <dt>Squares added up</dt>
              <dd>{(100 * tSquareSummedArea(round)).toFixed(0)}%</dd>
            </div>
          </dl>
          <fieldset className={common.options} aria-label="Drawing">
            <button type="button" aria-pressed={!outlines} onClick={() => setOutlines(false)}>
              Filled
            </button>
            <button type="button" aria-pressed={outlines} onClick={() => setOutlines(true)}>
              Outlines
            </button>
          </fieldset>
        </div>
      </div>
      <LessonSteps
        step={round}
        max={T_SQUARE_ROUNDS}
        onChange={setRound}
        label="T-square"
        stepDescription={`Round ${round} of ${T_SQUARE_ROUNDS}`}
        duration={T_SQUARE_ROUNDS * 1200}
      />
    </LessonFrame>
  );
}
