import { type KeyboardEvent, type PointerEvent, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import styles from "../../styles/lessons/FernCollage.module.css";
import common from "../../styles/lessons/Lesson.module.css";
import { CLASSIC_FERN_MATRIX } from "../../utils/barnsleyFern";
import {
  coverMoves,
  FERN_BOX,
  FERN_WINDOW,
  type FernMove,
  FernPlot,
  type FernSpot,
  FernWalk,
  HANDLE_CORNERS,
  moveCorners,
  moveWithCorner,
} from "../../utils/lessons/fernCollage";
import { LessonFrame } from "./LessonFrame";

const TRUE_FERN = CLASSIC_FERN_MATRIX.map((row) => row.slice(0, 6));
const CLASSIC_CHANCES = CLASSIC_FERN_MATRIX.map((row) => row[6]);
const EQUAL_CHANCES = [0.25, 0.25, 0.25, 0.25];
type Choosing = "classic" | "equal" | "all";

// In the order of the moves: stem, big, left, right. The explorer's fern color is the big one.
const MOVES = [
  { name: "Stem", color: "#eee8ce" },
  { name: "Big", color: "#96f78e" },
  { name: "Left", color: "#f5c56d" },
  { name: "Right", color: "#7cc4ff" },
];
const TABLE_ORDER = [1, 2, 3, 0];
const BACKGROUND = "#252424";
const pixelColor = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16));
  return (0xff000000 | (b << 16) | (g << 8) | r) >>> 0;
};
const COLORS = MOVES.map(({ color }) => pixelColor(color));

const MOST_DOTS = 10_000_000;
// From a few dots to ten million in about two and a half seconds.
const FIRST_DOTS = 50;
const GROWTH_MS = 200;
const MS_PER_FRAME = 10;
const DOTS_BETWEEN_CHECKS = 4096;
const ARROW_STEP = 0.05;

const { left, right, top, bottom } = FERN_WINDOW;
const VIEW_SCALE = 100;
const viewX = (x: number) => (x - left) * VIEW_SCALE;
const viewY = (y: number) => (top - y) * VIEW_SCALE;
const outline = (spots: FernSpot[]) => spots.map(({ x, y }) => `${viewX(x)},${viewY(y)}`).join(" ");
const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));
const number = (value: number) =>
  (Math.abs(value) < 0.005 ? 0 : value).toFixed(2).replace("-", "−");

export default function FernCollageLesson() {
  const [moves, setMoves] = useState(TRUE_FERN);
  const [choosing, setChoosing] = useState<Choosing>("classic");
  const [size, setSize] = useState(0);
  const stage = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const readout = useRef<HTMLParagraphElement>(null);
  const latest = useRef({ moves, choosing });
  latest.current = { moves, choosing };
  // What the drawing loop should start next. Growing shows the fern appear from a few dots.
  const order = useRef<{ grow: boolean } | null>({ grow: true });
  const wake = useRef(() => {});
  const drag = useRef<{ id: number; move: number; corner: number; dx: number; dy: number } | null>(
    null,
  );

  const redraw = (grow: boolean) => {
    order.current = { grow: grow || Boolean(order.current?.grow) };
    wake.current();
  };

  useEffect(() => {
    const element = stage.current;
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
    const width = Math.round(size * ratio);
    const height = Math.round((width * (top - bottom)) / (right - left));
    element.width = width;
    element.height = height;
    const image = context.createImageData(width, height);
    const shown = new FernPlot(
      width,
      height,
      new Uint32Array(image.data.buffer),
      COLORS,
      pixelColor(BACKGROUND),
    );
    const building = new FernPlot(
      width,
      height,
      new Uint32Array(width * height),
      COLORS,
      pixelColor(BACKGROUND),
    );
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    context.putImageData(image, 0, 0);

    let walk: FernWalk | null = null;
    let frameId = 0;
    let growingSince: number | null = null;
    let seen = false;
    const showDots = (text: string) => {
      if (readout.current) readout.current.textContent = text;
    };
    const frame = () => {
      frameId = 0;
      const now = performance.now();
      const deadline = now + MS_PER_FRAME;
      const { moves: current, choosing: mode } = latest.current;
      if (mode === "all") {
        if (order.current && !walk) {
          order.current = null;
          building.clear();
          walk = new FernWalk(current, building);
        }
        // The last finished picture stays up until this one is done, so dragging doesn't flicker.
        if (walk?.run(deadline)) {
          walk = null;
          shown.pixels.set(building.pixels);
          shown.dots = 0;
          context.putImageData(image, 0, 0);
          showDots("No random choices");
        }
        if (walk || order.current) frameId = requestAnimationFrame(frame);
        return;
      }
      walk = null;
      if (order.current) {
        growingSince = order.current.grow && !calm ? now : null;
        order.current = null;
        shown.clear();
      }
      const chances = mode === "equal" ? EQUAL_CHANCES : CLASSIC_CHANCES;
      const wanted =
        growingSince === null
          ? MOST_DOTS
          : Math.min(
              MOST_DOTS,
              Math.floor(FIRST_DOTS * Math.exp((now - growingSince) / GROWTH_MS)),
            );
      let remaining = wanted - shown.dots;
      while (remaining > 0 && performance.now() < deadline) {
        const dots = Math.min(remaining, DOTS_BETWEEN_CHECKS);
        shown.sow(current, chances, dots);
        remaining -= dots;
      }
      context.putImageData(image, 0, 0);
      showDots(`${shown.dots.toLocaleString("en-US")} dots`);
      if (shown.dots < MOST_DOTS || order.current) frameId = requestAnimationFrame(frame);
    };
    wake.current = () => {
      if (seen && !frameId) frameId = requestAnimationFrame(frame);
    };
    // The fern starts growing when the reader first reaches it, then finishes wherever they scroll.
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        seen = true;
        wake.current();
      },
      { threshold: 0.25 },
    );
    observer.observe(element);
    order.current ??= { grow: false };
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frameId);
      wake.current = () => {};
    };
  }, [size]);

  const place = (move: number, corner: number, x: number, y: number) => {
    const spot = { x: clamp(x, left, right), y: clamp(y, bottom, top) };
    const next = latest.current.moves.map((old, index) =>
      index === move ? moveWithCorner(old, corner, spot) : old,
    );
    latest.current.moves = next;
    // React would otherwise commit after this frame paints, one frame behind the pointer.
    flushSync(() => setMoves(next));
    redraw(false);
  };

  const spotUnder = (event: PointerEvent<HTMLButtonElement>) => {
    const box = stage.current?.getBoundingClientRect();
    if (!box) return { x: 0, y: 0 };
    return {
      x: left + ((event.clientX - box.left) / box.width) * (right - left),
      y: top - ((event.clientY - box.top) / box.height) * (top - bottom),
    };
  };

  const grab = (event: PointerEvent<HTMLButtonElement>, move: number, corner: number) => {
    if (!event.isPrimary || event.button !== 0) return;
    const under = spotUnder(event);
    // Touch targets overlap, so the nearest dot wins.
    let best = { move, corner };
    let distance = Math.hypot(
      moveCorners(moves[move])[corner].x - under.x,
      moveCorners(moves[move])[corner].y - under.y,
    );
    moves.forEach((candidate, index) => {
      const corners = moveCorners(candidate);
      for (const handle of HANDLE_CORNERS) {
        const next = Math.hypot(corners[handle].x - under.x, corners[handle].y - under.y);
        if (next < distance) {
          distance = next;
          best = { move: index, corner: handle };
        }
      }
    });
    const held = moveCorners(moves[best.move])[best.corner];
    drag.current = {
      id: event.pointerId,
      ...best,
      dx: held.x - under.x,
      dy: held.y - under.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const pull = (event: PointerEvent<HTMLButtonElement>) => {
    const held = drag.current;
    if (held?.id !== event.pointerId) return;
    const under = spotUnder(event);
    place(held.move, held.corner, under.x + held.dx, under.y + held.dy);
  };

  const letGo = () => {
    drag.current = null;
  };

  const nudge = (event: KeyboardEvent<HTMLButtonElement>, move: number, corner: number) => {
    const step = {
      ArrowLeft: [-ARROW_STEP, 0],
      ArrowRight: [ARROW_STEP, 0],
      ArrowUp: [0, ARROW_STEP],
      ArrowDown: [0, -ARROW_STEP],
    }[event.key];
    if (!step) return;
    event.preventDefault();
    const { x, y } = moveCorners(moves[move])[corner];
    place(move, corner, x + step[0], y + step[1]);
  };

  const start = (next: FernMove[], mode: Choosing) => {
    setMoves(next);
    setChoosing(mode);
    latest.current = { moves: next, choosing: mode };
    redraw(true);
  };
  const choose = (mode: Choosing) => start(moves, mode);
  const chanceOf = (move: number) =>
    choosing === "all"
      ? "all"
      : `${Math.round((choosing === "equal" ? EQUAL_CHANCES : CLASSIC_CHANCES)[move] * 100)}%`;

  return (
    <LessonFrame title="Twelve dots, 24 numbers" kind="fern-collage">
      <div className={styles.layout}>
        <div ref={stage} className={styles.stage}>
          <canvas
            ref={canvas}
            role="img"
            aria-label="A fern drawn from dots, with four colored parallelograms over it"
          />
          <svg
            viewBox={`0 0 ${(right - left) * VIEW_SCALE} ${(top - bottom) * VIEW_SCALE}`}
            aria-hidden="true"
          >
            <rect
              x={viewX(FERN_BOX.left)}
              y={viewY(FERN_BOX.top)}
              width={(FERN_BOX.right - FERN_BOX.left) * VIEW_SCALE}
              height={(FERN_BOX.top - FERN_BOX.bottom) * VIEW_SCALE}
              className={styles.box}
            />
            {moves.map((move, index) => (
              <polygon
                key={MOVES[index].name}
                points={outline(moveCorners(move))}
                stroke={MOVES[index].color}
                className={styles.copy}
              />
            ))}
          </svg>
          {moves.map((move, index) => {
            const corners = moveCorners(move);
            return HANDLE_CORNERS.map((corner) => (
              <button
                key={`${MOVES[index].name}-${corner}`}
                type="button"
                className={styles.handle}
                style={{
                  left: `${(viewX(corners[corner].x) / ((right - left) * VIEW_SCALE)) * 100}%`,
                  top: `${(viewY(corners[corner].y) / ((top - bottom) * VIEW_SCALE)) * 100}%`,
                  color: MOVES[index].color,
                }}
                aria-label={`${MOVES[index].name} parallelogram, corner ${corner}: x ${number(corners[corner].x)}, y ${number(corners[corner].y)}. Arrow keys move it.`}
                onPointerDown={(event) => grab(event, index, corner)}
                onPointerMove={pull}
                onPointerUp={letGo}
                onPointerCancel={letGo}
                onLostPointerCapture={letGo}
                onKeyDown={(event) => nudge(event, index, corner)}
              />
            ));
          })}
        </div>
        <div className={styles.side}>
          <p ref={readout} className={styles.readout} data-fern-readout>
            0 dots
          </p>
          <table className={styles.numbers}>
            <thead>
              <tr>
                <th aria-label="Move" />
                {["a", "b", "c", "d", "e", "f"].map((name) => (
                  <th key={name} scope="col">
                    {name}
                  </th>
                ))}
                <th scope="col" className={styles.chance}>
                  chance
                </th>
              </tr>
            </thead>
            <tbody>
              {TABLE_ORDER.map((index) => (
                <tr key={MOVES[index].name}>
                  <th scope="row" style={{ color: MOVES[index].color }}>
                    {MOVES[index].name}
                  </th>
                  {moves[index].map((value, column) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: the six columns never reorder.
                    <td key={column}>{number(value)}</td>
                  ))}
                  <td className={styles.chance}>{chanceOf(index)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <fieldset className={common.options} aria-label="Start again">
            <button type="button" onClick={() => start(TRUE_FERN, "classic")}>
              True fern
            </button>
            <button type="button" onClick={() => start(coverMoves(), "equal")}>
              Cover the rectangle
            </button>
          </fieldset>
          <fieldset className={common.options} aria-label="Chances">
            <button
              type="button"
              aria-pressed={choosing === "classic"}
              onClick={() => choose("classic")}
            >
              85, 7, 7, 1
            </button>
            <button
              type="button"
              aria-pressed={choosing === "equal"}
              onClick={() => choose("equal")}
            >
              Equal
            </button>
            <button type="button" aria-pressed={choosing === "all"} onClick={() => choose("all")}>
              All four at once
            </button>
          </fieldset>
        </div>
      </div>
    </LessonFrame>
  );
}
