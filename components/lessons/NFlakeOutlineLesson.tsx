import { useEffect, useMemo, useRef, useState } from "react";
import common from "../../styles/lessons/Lesson.module.css";
import styles from "../../styles/lessons/ReadoutStage.module.css";
import { hexagonKochOutline, outlineLines } from "../../utils/lessons/nFlakeOutline";
import {
  drawNFlake,
  getMaxIterations,
  getScaleFactor,
  nFlakeRadius,
  usesCenterPolygon,
} from "../../utils/render/drawings/nFlake";
import { LessonFrame, LessonSteps } from "./LessonFrame";

// The explorer's colors.
const BACKGROUND = "#252424";
const COLOR = "#94f0d7";
const OUTLINE = "#f5c56d";
const SIDES = [3, 4, 5, 6, 7, 8];

export default function NFlakeOutlineLesson() {
  const [sides, setSides] = useState(6);
  const [center, setCenter] = useState(true);
  const [koch, setKoch] = useState(true);
  const [wanted, setWanted] = useState(1);
  const [size, setSize] = useState(0);
  const canvas = useRef<HTMLCanvasElement>(null);
  const max = getMaxIterations(sides, center);
  const round = Math.min(wanted, max);
  const hexagon = sides === 6;
  const canCenter = usesCenterPolygon(sides, true);
  const hasCenter = usesCenterPolygon(sides, center);
  const outline = useMemo(() => (hexagon ? hexagonKochOutline(round) : []), [hexagon, round]);

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
    drawNFlake(context, size, size, {
      sides,
      iterations: round,
      includeCenter: center,
      rotation: 0,
      background: BACKGROUND,
      color: COLOR,
      fillPolygons: true,
      strokePolygons: true,
      lineWidth: 0.8,
    });
    if (hexagon && koch) {
      const unit = nFlakeRadius(size, size);
      const line = new Path2D();
      for (const [x, y] of outline) line.lineTo(size / 2 + x * unit, size / 2 + y * unit);
      line.closePath();
      context.strokeStyle = OUTLINE;
      context.lineWidth = 2;
      context.lineJoin = "round";
      context.stroke(line);
    }
  }, [sides, center, round, hexagon, koch, outline, size]);

  const copies = sides + (hasCenter ? 1 : 0);
  return (
    <LessonFrame title="Trace the outline" kind="n-flake-outline">
      <div className={styles.layout}>
        <canvas
          ref={canvas}
          className={styles.flat}
          role="img"
          aria-label={`A flake of ${copies ** round} polygons with ${sides} sides, round ${round}.`}
        />
        <div className={styles.side}>
          <dl className={styles.readout} data-n-flake-readout>
            <div>
              <dt>Polygons</dt>
              <dd>{(copies ** round).toLocaleString("en-US")}</dd>
            </div>
            <div>
              <dt>Each copy</dt>
              <dd>{(100 * getScaleFactor(sides)).toFixed(1)}% as wide</dd>
            </div>
            {hexagon && (
              <>
                <div>
                  <dt>Lines on the outline</dt>
                  <dd>{outlineLines(round).toLocaleString("en-US")}</dd>
                </div>
                <div>
                  <dt>Each line</dt>
                  <dd>{round ? `1/${3 ** round} of a side` : "A whole side"}</dd>
                </div>
              </>
            )}
          </dl>
          <fieldset className={common.options} aria-label="Sides">
            {SIDES.map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={sides === value}
                aria-label={`${value} sides`}
                onClick={() => setSides(value)}
              >
                {value}
              </button>
            ))}
          </fieldset>
          <fieldset className={common.options} aria-label="Drawing">
            <button
              type="button"
              aria-pressed={hasCenter}
              disabled={!canCenter}
              onClick={() => setCenter(!center)}
            >
              Center copy
            </button>
            <button
              type="button"
              aria-pressed={hexagon && koch}
              disabled={!hexagon}
              onClick={() => setKoch(!koch)}
            >
              Koch curve
            </button>
          </fieldset>
        </div>
      </div>
      <LessonSteps
        step={round}
        max={max}
        onChange={setWanted}
        label="N-flake"
        stepDescription={`Round ${round} of ${max}`}
        duration={max * 1200}
      />
    </LessonFrame>
  );
}
