import { type PointerEvent, useEffect, useMemo, useRef, useState } from "react";
import slice from "../../styles/lessons/BulbSlice.module.css";
import common from "../../styles/lessons/Lesson.module.css";
import styles from "../../styles/lessons/ReadoutStage.module.css";
import { usePointPicker } from "../../utils/hooks/usePointPicker";
import {
  CORNER,
  cutFilled,
  cutFlakeScene,
  cutSquares,
  flakeVolumeLeft,
  OCTAHEDRON_CUT_LEVELS,
} from "../../utils/lessons/octahedronCut";
import { dragRotation, viewRotation } from "../../utils/orientation";
import { drawPolyhedronScene, projectScenePoint } from "../../utils/polyhedronFractals";
import { LessonFrame, LessonSteps } from "./LessonFrame";

const CAMERA_DISTANCE = 6;
const BACKGROUND = "#252424";
const FILL = "#b49cff";
const STROKE = "#efe8ff";
const CUT = "#f5c56d";
const OUTLINE = "#eee8ce";
const KEY_TURN = Math.PI / 18;
// Past this the lines between pieces blur together and read as cracks in a solid cut.
const LAST_LEVEL_WITH_LINES = 3;
// Nearly straight on, so the solid's corners point the same way as the flat cut's.
const OPENING = viewRotation(26, 12);

type Squares = ReturnType<typeof cutSquares>;
type Place = (x: number, z: number) => { x: number; y: number };

function squaresPath(squares: Squares, place: Place) {
  const path = new Path2D();
  for (const { x, z, radius } of squares) {
    const right = place(x + radius, z);
    const near = place(x, z + radius);
    const left = place(x - radius, z);
    const far = place(x, z - radius);
    path.moveTo(right.x, right.y);
    path.lineTo(near.x, near.y);
    path.lineTo(left.x, left.y);
    path.lineTo(far.x, far.y);
    path.closePath();
  }
  return path;
}

function fillCut(context: CanvasRenderingContext2D, squares: Squares, place: Place, level: number) {
  const path = squaresPath(squares, place);
  context.fillStyle = CUT;
  context.fill(path);
  if (level > LAST_LEVEL_WITH_LINES) return;
  context.strokeStyle = BACKGROUND;
  context.lineJoin = "round";
  context.lineWidth = 0.7;
  context.stroke(path);
}

function sizeCanvas(element: HTMLCanvasElement, context: CanvasRenderingContext2D, size: number) {
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  element.width = Math.round(size * ratio);
  element.height = Math.round(size * ratio);
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
}

export default function OctahedronCutLesson() {
  const [level, setLevel] = useState(1);
  // Hundredths of the way to the top corner, so 0.25, 0.5 and 0.75 are exact stops.
  const [stop, setStop] = useState(0);
  const [grab, setGrab] = useState(OPENING);
  const [size, setSize] = useState(0);
  const solid = useRef<HTMLCanvasElement>(null);
  const flat = useRef<HTMLCanvasElement>(null);
  const held = useRef<{ x: number; y: number } | null>(null);
  const height = stop / 100;
  // Up-and-down swipes scroll the page. Any other drag turns the solid by the distance moved.
  const picker = usePointPicker({
    under: (event: PointerEvent<HTMLButtonElement>) => ({ x: event.clientX, y: event.clientY }),
    onChange: (point) => {
      const from = held.current;
      held.current = point;
      if (!from) return;
      const dx = point.x - from.x;
      const dy = point.y - from.y;
      const angle = (Math.hypot(dx, dy) / Math.max(1, size)) * Math.PI;
      setGrab((old) => dragRotation(old, dx, dy, angle));
    },
    onRelease: () => {
      held.current = null;
    },
  });
  const stage = picker.ref;

  const scene = useMemo(() => cutFlakeScene(level, height), [level, height]);
  const squares = useMemo(() => cutSquares(level, height), [level, height]);

  useEffect(() => {
    const element = stage.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setSize(entry.contentRect.width));
    observer.observe(element);
    return () => observer.disconnect();
  }, [stage]);

  useEffect(() => {
    const element = solid.current;
    const context = element?.getContext("2d");
    if (!element || !context || !size) return;
    sizeCanvas(element, context, size);
    const camera = { rotationX: 0, rotationY: 0, grab, cameraDistance: CAMERA_DISTANCE };
    drawPolyhedronScene(context, size, size, scene, {
      ...camera,
      background: BACKGROUND,
      fillColor: FILL,
      strokeColor: STROKE,
      lineWidth: 0.7,
      showFaces: true,
      showWireframe: level <= LAST_LEVEL_WITH_LINES,
    });
    // Nothing is left above the cut, so a camera above it sees the whole cut in front.
    const y = height * CORNER;
    if (grab[7] * CAMERA_DISTANCE > y) {
      fillCut(
        context,
        squares,
        (x, z) => projectScenePoint([x * CORNER, y, z * CORNER], camera, size, size),
        level,
      );
    }
  }, [scene, squares, height, grab, level, size]);

  useEffect(() => {
    const element = flat.current;
    const context = element?.getContext("2d");
    if (!element || !context || !size) return;
    sizeCanvas(element, context, size);
    context.fillStyle = BACKGROUND;
    context.fillRect(0, 0, size, size);
    const unit = size * 0.46;
    const place: Place = (x, z) => ({ x: size / 2 + x * unit, y: size / 2 + z * unit });
    fillCut(context, squares, place, level);
    context.strokeStyle = OUTLINE;
    context.lineWidth = 1;
    context.stroke(squaresPath([{ x: 0, z: 0, radius: 1 - height }], place));
  }, [squares, height, level, size]);

  const filled = cutFilled(level, height);
  const filledText = filled === null ? "One point" : `${(100 * filled).toFixed(1)}%`;

  return (
    <LessonFrame title="Cut the flake" kind="octahedron-cut">
      <div className={slice.views}>
        <div>
          <div className={slice.label}>Everything above the cut removed</div>
          <button
            type="button"
            className={styles.stage}
            aria-label={`Level ${level} of the octahedron flake with everything above height ${height.toFixed(2)} removed. Drag or use the arrow keys to turn it.`}
            {...picker}
            onPointerDown={(event) => {
              held.current = null;
              picker.onPointerDown(event);
            }}
            onKeyDown={(event) => {
              const move = {
                ArrowLeft: [-1, 0],
                ArrowRight: [1, 0],
                ArrowUp: [0, -1],
                ArrowDown: [0, 1],
              }[event.key];
              if (!move) return;
              event.preventDefault();
              setGrab((old) => dragRotation(old, move[0], move[1], KEY_TURN));
            }}
          >
            <canvas ref={solid} />
          </button>
        </div>
        <div>
          <div className={slice.label}>The cut, seen from above</div>
          <canvas
            ref={flat}
            className={styles.flat}
            role="img"
            aria-label={`The cut at height ${height.toFixed(2)}, level ${level}: ${filled === null ? "only the top corner" : `${filledText} filled`}.`}
          />
        </div>
      </div>
      <label className={common.parameter}>
        <span>
          Height
          <output>{height.toFixed(2)}</output>
        </span>
        <input
          type="range"
          aria-label="Height of the cut"
          min={0}
          max={100}
          step={1}
          value={stop}
          onChange={(event) => setStop(Number(event.target.value))}
        />
      </label>
      <dl className={styles.readout} data-octahedron-cut-readout>
        <div>
          <dt>Cut filled</dt>
          <dd>{filledText}</dd>
        </div>
        <div>
          <dt>Volume left</dt>
          <dd>{(100 * flakeVolumeLeft(level)).toFixed(1)}%</dd>
        </div>
      </dl>
      <LessonSteps
        step={level}
        max={OCTAHEDRON_CUT_LEVELS}
        onChange={setLevel}
        label="Octahedron flake"
        stepDescription={`Level ${level} of ${OCTAHEDRON_CUT_LEVELS}`}
        duration={OCTAHEDRON_CUT_LEVELS * 1200}
      />
    </LessonFrame>
  );
}
