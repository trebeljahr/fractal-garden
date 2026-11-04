import { type PointerEvent, useEffect, useMemo, useRef, useState } from "react";
import styles from "../../styles/lessons/ReadoutStage.module.css";
import { usePointPicker, useTriedPoint } from "../../utils/hooks/usePointPicker";
import {
  nearestVicsekSquare,
  vicsekNeighbors,
  vicsekPieces,
  vicsekSquares,
} from "../../utils/lessons/vicsekJoins";
import { LessonFrame, LessonSteps } from "./LessonFrame";

type Spot = [number, number];

const MAX_LEVEL = 4;
const FIRST_LEVEL = 3;
// The center of the top right copy. Taking it out splits the shape at every level from 2 on.
const START: Spot = [5 / 6, 1 / 6];
const PADDING = 0.08;
// The explorer's colors, then one tint for each piece that comes away.
const BACKGROUND = "#252424";
const PIECE_COLORS = ["#f2efde", "#f7b267", "#7fd8e8", "#f28fb1"];
const REMOVED = "#f5c56d";

const clamp = (value: number) => Math.max(0, Math.min(1, value));

export default function VicsekJoinsLesson() {
  const [level, setLevel] = useState(FIRST_LEVEL);
  const [size, setSize] = useState(0);
  const spot = useTriedPoint<Spot>(START);
  const canvas = useRef<HTMLCanvasElement>(null);
  const shape = useMemo(() => {
    const squares = vicsekSquares("saltire", level);
    return { squares, neighbors: vicsekNeighbors("saltire", squares) };
  }, [level]);
  const removed = nearestVicsekSquare(shape.squares, level, spot.value[0], spot.value[1]);
  const { piece, count } = useMemo(
    () => vicsekPieces(shape.neighbors, removed),
    [shape.neighbors, removed],
  );

  const picker = usePointPicker<Spot>({
    under: (event: PointerEvent<HTMLButtonElement>) => {
      const rect = event.currentTarget.getBoundingClientRect();
      const inner = rect.width * (1 - 2 * PADDING);
      return [
        clamp((event.clientX - rect.left - rect.width * PADDING) / inner),
        clamp((event.clientY - rect.top - rect.height * PADDING) / inner),
      ];
    },
    onChange: spot.keep,
    onHover: spot.tryOut,
  });
  const stage = picker.ref;

  useEffect(() => {
    const element = stage.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setSize(entry.contentRect.width));
    observer.observe(element);
    return () => observer.disconnect();
  }, [stage]);

  useEffect(() => {
    const element = canvas.current;
    const context = element?.getContext("2d");
    if (!element || !context || !size) return;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    element.width = Math.round(size * ratio);
    element.height = Math.round(size * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.fillStyle = BACKGROUND;
    context.fillRect(0, 0, size, size);
    const width = (size * (1 - 2 * PADDING)) / 3 ** level;
    const at = (cell: number) => size * PADDING + cell * width;
    shape.squares.forEach(([x, y], i) => {
      if (piece[i] < 0) return;
      context.fillStyle = PIECE_COLORS[piece[i]];
      context.fillRect(at(x), at(y), width, width);
    });
    const [x, y] = shape.squares[removed];
    context.strokeStyle = REMOVED;
    context.lineWidth = 1.5;
    context.strokeRect(at(x), at(y), width, width);
  }, [shape, piece, removed, level, size]);

  const squares = shape.squares.length;
  return (
    <LessonFrame title="Take out a square" kind="vicsek-joins">
      <div className={styles.layout}>
        <button
          type="button"
          className={`${styles.stage} ${styles.pick}`}
          aria-label={`Taking out this square leaves ${count} ${count === 1 ? "piece" : "pieces"}. Move the pointer or use the arrow keys to choose another square.`}
          {...picker}
          onKeyDown={(event) => {
            const move = {
              ArrowLeft: [-1, 0],
              ArrowRight: [1, 0],
              ArrowUp: [0, -1],
              ArrowDown: [0, 1],
            }[event.key];
            if (!move) return;
            event.preventDefault();
            const step = 1 / 3 ** level;
            const [x, y] = shape.squares[removed];
            spot.keep([clamp((x + 0.5 + move[0]) * step), clamp((y + 0.5 + move[1]) * step)]);
          }}
        >
          <canvas ref={canvas} />
        </button>
        <div className={styles.side}>
          <dl className={styles.readout} data-vicsek-readout>
            <div>
              <dt>Squares</dt>
              <dd>{squares.toLocaleString("en-US")}</dd>
            </div>
            <div>
              <dt>Joined at</dt>
              <dd>{(squares - 1).toLocaleString("en-US")} corners</dd>
            </div>
            <div>
              <dt>Pieces left</dt>
              <dd>{count}</dd>
            </div>
          </dl>
        </div>
      </div>
      <LessonSteps
        step={level - 1}
        max={MAX_LEVEL - 1}
        onChange={(step) => setLevel(step + 1)}
        label="Vicsek squares"
        stepDescription={`Level ${level} of ${MAX_LEVEL}`}
        duration={MAX_LEVEL * 1000}
      />
    </LessonFrame>
  );
}
