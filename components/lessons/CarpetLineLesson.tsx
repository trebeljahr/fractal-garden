import { type PointerEvent, useEffect, useMemo, useRef, useState } from "react";
import common from "../../styles/lessons/Lesson.module.css";
import styles from "../../styles/lessons/ReadoutStage.module.css";
import { carpetHoles } from "../../utils/constructionDiagrams";
import { usePointPicker, useTriedPoint } from "../../utils/hooks/usePointPicker";
import {
  type CarpetHeight,
  carpetHeightAt,
  carpetHeightStep,
  carpetLineFate,
  carpetLineHoles,
  formatCarpetHeight,
  NAMED_HEIGHTS,
} from "../../utils/lessons/carpetLine";
import { LessonFrame, LessonSteps } from "./LessonFrame";

const MAX_LEVEL = 5;
const FIRST_LEVEL = 3;
const START: CarpetHeight = { top: 1, bottom: 4 };
const PADDING = 0.06;
// How near a named height a pointer lands on it, in CSS pixels.
const SNAP = 5;
// The explorer's colors, then the line and the holes it passes through.
const BACKGROUND = "#252424";
const CARPET = "#ffe100";
const HOLE = "#000000";
const LINE = "#e0123a";

const never = (level: number | null) => (level === null ? "never" : `level ${level}`);
const same = (a: CarpetHeight, b: CarpetHeight) => a.top === b.top && a.bottom === b.bottom;

export default function CarpetLineLesson() {
  const [level, setLevel] = useState(FIRST_LEVEL);
  const [size, setSize] = useState(0);
  const line = useTriedPoint<CarpetHeight>(START);
  const canvas = useRef<HTMLCanvasElement>(null);
  const holes = useMemo(() => carpetHoles(level), [level]);
  const crossed = useMemo(() => carpetLineHoles(line.value, level), [line.value, level]);
  const fate = useMemo(() => carpetLineFate(line.value), [line.value]);

  const picker = usePointPicker<CarpetHeight>({
    under: (event: PointerEvent<HTMLButtonElement>) => {
      const rect = event.currentTarget.getBoundingClientRect();
      const inner = rect.height * (1 - 2 * PADDING);
      const down = (event.clientY - rect.top - rect.height * PADDING) / inner;
      return carpetHeightAt(1 - Math.max(0, Math.min(1, down)), SNAP / inner);
    },
    onChange: line.keep,
    onHover: line.tryOut,
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
    const margin = size * PADDING;
    const inner = size - 2 * margin;
    context.fillStyle = BACKGROUND;
    context.fillRect(0, 0, size, size);
    context.fillStyle = CARPET;
    context.fillRect(margin, margin, inner, inner);
    context.fillStyle = HOLE;
    for (const { x, y, size: side } of holes)
      context.fillRect(margin + x * inner, margin + y * inner, side * inner, side * inner);
    const y = margin + inner * (1 - line.value.top / line.value.bottom);
    context.fillStyle = LINE;
    for (const hole of crossed) {
      const side = inner / 3 ** hole.level;
      context.fillRect(margin + hole.column * side, margin + hole.row * side, side, side);
    }
    context.strokeStyle = LINE;
    // Never wider than half a row, or at level 5 it would seem to touch holes it misses.
    context.lineWidth = Math.min(1.5, inner / 3 ** level / 2);
    context.beginPath();
    context.moveTo(margin / 3, y);
    context.lineTo(size - margin / 3, y);
    context.stroke();
  }, [holes, crossed, line.value, level, size]);

  const shown = formatCarpetHeight(line.value);
  return (
    <LessonFrame title="Move the line" kind="carpet-line">
      <div className={styles.layout}>
        <button
          type="button"
          className={`${styles.stage} ${styles.pick}`}
          aria-label={`A line at height ${shown} passes through ${crossed.length} holes at level ${level}. Move the pointer or use the up and down arrow keys to move it.`}
          {...picker}
          onKeyDown={(event) => {
            const direction = { ArrowUp: 1, ArrowDown: -1 }[event.key];
            if (direction !== 1 && direction !== -1) return;
            event.preventDefault();
            line.keep(carpetHeightStep(line.value, direction));
          }}
        >
          <canvas ref={canvas} />
        </button>
        <div className={styles.side}>
          <fieldset className={common.options} aria-label="Height of the line">
            {NAMED_HEIGHTS.map((height) => (
              <button
                key={height.bottom}
                type="button"
                aria-pressed={same(height, line.value)}
                onClick={() => line.keep(height)}
              >
                {formatCarpetHeight(height)}
              </button>
            ))}
          </fieldset>
          <dl className={styles.readout} data-carpet-readout>
            <div>
              <dt>Height</dt>
              <dd>{shown}</dd>
            </div>
            <div>
              <dt>Holes it passes through</dt>
              <dd>{crossed.length}</dd>
            </div>
            <div>
              <dt>First hole</dt>
              <dd>{never(fate.firstHole)}</dd>
            </div>
            <div>
              <dt>Runs along a hole's edge</dt>
              <dd>{never(fate.edge)}</dd>
            </div>
          </dl>
        </div>
      </div>
      <LessonSteps
        step={level - 1}
        max={MAX_LEVEL - 1}
        onChange={(step) => setLevel(step + 1)}
        label="Carpet"
        stepDescription={`Level ${level} of ${MAX_LEVEL}`}
        duration={MAX_LEVEL * 1000}
      />
    </LessonFrame>
  );
}
