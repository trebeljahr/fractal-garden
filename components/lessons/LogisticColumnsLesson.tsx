import { type PointerEvent, useEffect, useMemo, useRef, useState } from "react";
import styles from "../../styles/lessons/LogisticColumns.module.css";
import { MANDELBROT_COLORING } from "../../utils/escapeTimeColoring";
import { useReducedMotion } from "../../utils/hooks/useReducedMotion";
import {
  acrossToR,
  logisticColumn,
  mandelbrotNumber,
  repeatLength,
  rToAcross,
} from "../../utils/lessons/logisticLesson";
import { EscapeTimePicture } from "./EscapeTimePicture";
import { LessonFrame } from "./LessonFrame";

const COLUMNS = 900;
const ROWS = 330;
const FILL_MS = 1800;
const STRIP = [-2, 0.25, -0.5, 0.5] as const;
const SPLITS = [3, 1 + Math.sqrt(6), 1 + Math.sqrt(8)];
const TICKS = [
  { r: 1, rLabel: "r = 1", cLabel: "c = 1/4" },
  { r: 2, rLabel: "2", cLabel: "0" },
  { r: 3, rLabel: "3", cLabel: "−3/4" },
  { r: SPLITS[1], rLabel: "3.45", cLabel: "−5/4" },
  { r: SPLITS[2], rLabel: "3.83", cLabel: "−7/4" },
  { r: 4, rLabel: "4", cLabel: "−2" },
];
const OPENING_ACROSS = rToAcross(2.8);
const written = (value: number, digits = 2) =>
  String(Number(value.toFixed(digits))).replace("-", "−");
const percent = (across: number) => `${(across * 100).toFixed(3)}%`;
const tickShift = (across: number) => (across === 0 ? 0 : across === 1 ? -100 : -50);

export default function LogisticColumnsLesson() {
  const [across, setAcross] = useState(OPENING_ACROSS);
  const [filling, setFilling] = useState<"blank" | "sweeping" | "full">("blank");
  const canvas = useRef<HTMLCanvasElement>(null);
  const painted = useRef(new Uint8Array(COLUMNS));
  const last = useRef<number | null>(null);
  const pressed = useRef<number | null>(null);
  const sweep = useRef(0);
  const reduced = useReducedMotion();
  const r = acrossToR(across);
  const repeat = useMemo(() => repeatLength(logisticColumn(r)), [r]);

  const paintColumn = (column: number) => {
    const context = canvas.current?.getContext("2d");
    if (!context || painted.current[column]) return;
    painted.current[column] = 1;
    const hits = new Uint16Array(ROWS);
    for (const value of logisticColumn(acrossToR((column + 0.5) / COLUMNS)))
      hits[Math.min(ROWS - 1, Math.floor((1 - value) * ROWS))]++;
    const image = context.createImageData(1, ROWS);
    for (let row = 0; row < ROWS; row++) {
      if (!hits[row]) continue;
      image.data[row * 4] = 238;
      image.data[row * 4 + 1] = 232;
      image.data[row * 4 + 2] = 206;
      image.data[row * 4 + 3] = Math.min(255, 90 + hits[row] * 55);
    }
    context.putImageData(image, column, 0);
  };
  const paintBetween = (from: number, to: number) => {
    const first = Math.floor(Math.min(from, to) * COLUMNS);
    const end = Math.floor(Math.max(from, to) * COLUMNS);
    for (let column = first; column <= Math.min(end, COLUMNS - 1); column++) paintColumn(column);
  };
  const moveTo = (next: number) => {
    const clamped = Math.max(0, Math.min(1, next));
    paintBetween(last.current ?? clamped, clamped);
    last.current = clamped;
    setAcross(clamped);
  };
  const acrossAt = (event: PointerEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return (event.clientX - rect.left) / rect.width;
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: The first column is painted once.
  useEffect(() => {
    paintBetween(OPENING_ACROSS, OPENING_ACROSS);
    return () => cancelAnimationFrame(sweep.current);
  }, []);

  const fill = () => {
    if (reduced) {
      paintBetween(0, 1);
      setFilling("full");
      return;
    }
    setFilling("sweeping");
    const begun = performance.now();
    let column = 0;
    sweep.current = requestAnimationFrame(function tick(now) {
      const end = Math.min(COLUMNS, Math.ceil(((now - begun) / FILL_MS) * COLUMNS));
      for (; column < end; column++) paintColumn(column);
      if (column < COLUMNS) sweep.current = requestAnimationFrame(tick);
      else setFilling("full");
    });
  };
  const clear = () => {
    cancelAnimationFrame(sweep.current);
    canvas.current?.getContext("2d")?.clearRect(0, 0, COLUMNS, ROWS);
    painted.current.fill(0);
    last.current = null;
    setFilling("blank");
    paintBetween(across, across);
  };

  const outcome =
    repeat === null
      ? "no repeat in these answers"
      : repeat === 1
        ? "settles on 1 number"
        : `repeats ${repeat} numbers`;
  return (
    <LessonFrame title="Give each r a column" kind="logistic-columns">
      <button
        type="button"
        className={styles.stage}
        aria-label={`r = ${written(r)}, c = ${written(mandelbrotNumber(r))}: ${outcome}. Move the pointer or use the left and right arrow keys to mark more columns.`}
        onPointerDown={(event) => {
          if (!event.isPrimary || event.button !== 0) return;
          pressed.current = event.pointerId;
          event.currentTarget.setPointerCapture(event.pointerId);
          last.current = null;
          moveTo(acrossAt(event));
        }}
        onPointerMove={(event) => {
          if (event.pointerType === "mouse" || pressed.current === event.pointerId)
            moveTo(acrossAt(event));
        }}
        onPointerUp={(event) => {
          if (pressed.current !== event.pointerId) return;
          pressed.current = null;
          event.currentTarget.releasePointerCapture(event.pointerId);
        }}
        onPointerCancel={() => {
          pressed.current = null;
        }}
        onPointerLeave={() => {
          last.current = null;
        }}
        onKeyDown={(event) => {
          const moves: Record<string, number> = { ArrowLeft: -0.005, ArrowRight: 0.005 };
          const move = moves[event.key];
          if (move === undefined) return;
          event.preventDefault();
          moveTo(across + move);
        }}
      >
        <span className={styles.scale}>
          {TICKS.map(({ r: tick, cLabel }) => {
            const at = rToAcross(tick);
            return (
              <span
                key={cLabel}
                style={{ left: percent(at), transform: `translateX(${tickShift(at)}%)` }}
              >
                {cLabel}
              </span>
            );
          })}
        </span>
        <span className={styles.pictures}>
          <span className={styles.strip}>
            <EscapeTimePicture formula="mandelbrot" bounds={STRIP} coloring={MANDELBROT_COLORING} />
            <span className={styles.ring} style={{ left: percent(across) }} />
          </span>
          <canvas ref={canvas} className={styles.columns} width={COLUMNS} height={ROWS} />
          {SPLITS.map((split) => (
            <span
              key={split}
              className={styles.guide}
              style={{ left: percent(rToAcross(split)) }}
            />
          ))}
          <span className={styles.cursor} style={{ left: percent(across) }} />
        </span>
        <span className={styles.scale}>
          {TICKS.map(({ r: tick, rLabel }) => {
            const at = rToAcross(tick);
            return (
              <span
                key={rLabel}
                style={{ left: percent(at), transform: `translateX(${tickShift(at)}%)` }}
              >
                {rLabel}
              </span>
            );
          })}
        </span>
      </button>
      <p className={styles.readout} aria-live="off" data-columns-readout>
        r = {written(r)} · c = {written(mandelbrotNumber(r))} · {outcome}
      </p>
      <div className={styles.actions}>
        <button type="button" disabled={filling !== "blank"} onClick={fill}>
          Fill the rest
        </button>
        <button type="button" onClick={clear}>
          Clear
        </button>
      </div>
    </LessonFrame>
  );
}
