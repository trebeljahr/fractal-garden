import { type PointerEvent, useEffect, useMemo, useRef, useState } from "react";
import common from "../../styles/lessons/Lesson.module.css";
import styles from "../../styles/lessons/MirrorPair.module.css";
import orbitStyles from "../../styles/OrbitLesson.module.css";
import { BURNING_SHIP_COLORING, MANDELBROT_COLORING } from "../../utils/escapeTimeColoring";
import { useLessonPlayback } from "../../utils/hooks/useLessonPlayback";
import { useReducedMotion } from "../../utils/hooks/useReducedMotion";
import {
  type ComplexPoint,
  ESCAPE_RADIUS,
  isOutside,
  mirrorPixel,
  mirrorRoutes,
  ORBIT_LESSON_LIMIT,
  type OrbitStep,
  type Pixel,
} from "../../utils/orbitLesson";
import { CoordinateGrid, clampToView, coordinates, snap } from "../OrbitLesson";
import { EscapeTimePicture } from "./EscapeTimePicture";
import { LessonStepControls } from "./LessonFrame";

const VIEW = { left: -2.8, right: 2.8, bottom: -2.2, top: 2.2 };
const BOUNDS = [VIEW.left, VIEW.right, VIEW.bottom, VIEW.top] as const;
const VIEW_WIDTH = VIEW.right - VIEW.left;
const VIEW_HEIGHT = VIEW.top - VIEW.bottom;
const START = { real: -0.5, imaginary: -0.5 };
const COLORS = ["#f5c56d", "#7ec9bb"];
const JUMP_MS = 600;

function outcome(route: OrbitStep[], shown: number) {
  const last = route.length - 1;
  if (isOutside(route[last].point)) return shown >= last ? `Crossed on jump ${last}.` : "";
  return shown >= last ? `Still inside after ${last} jumps.` : "";
}

export default function MirrorPairLesson() {
  const [pixel, setPixel] = useState<ComplexPoint>(START);
  const [fold, setFold] = useState(true);
  const [step, setStep] = useState(2);
  const [dragging, setDragging] = useState(false);
  const [width, setWidth] = useState(640);
  const stage = useRef<HTMLButtonElement>(null);
  const table = useRef<HTMLDivElement>(null);
  const pointer = useRef<number | null>(null);
  const reduced = useReducedMotion();
  const routes = useMemo(() => mirrorRoutes(pixel, fold), [pixel, fold]);
  const max = Math.max(routes[0].length, routes[1].length) - 1;
  const shown = dragging ? max : Math.min(step, max);
  const playback = useLessonPlayback(shown, max, setStep, JUMP_MS);
  const height = (width * VIEW_HEIGHT) / VIEW_WIDTH;

  useEffect(() => {
    const element = stage.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry.contentRect.width > 0) setWidth(entry.contentRect.width);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  // biome-ignore lint/correctness/useExhaustiveDependencies: a new jump adds a row to scroll to
  useEffect(() => {
    if (table.current) table.current.scrollTop = table.current.scrollHeight;
  }, [shown]);

  // Positive vertical coordinates point down, as in the rest of this article.
  const project = (point: ComplexPoint): Pixel => ({
    x: ((point.real - VIEW.left) / VIEW_WIDTH) * width,
    y: ((point.imaginary - VIEW.bottom) / VIEW_HEIGHT) * height,
  });
  const pointAt = (event: PointerEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return clampToView(
      {
        real: VIEW.left + ((event.clientX - rect.left) / rect.width) * VIEW_WIDTH,
        imaginary: VIEW.bottom + ((event.clientY - rect.top) / rect.height) * VIEW_HEIGHT,
      },
      VIEW,
    );
  };
  const replay = () => (reduced ? playback.change(ORBIT_LESSON_LIMIT) : playback.play());
  const starts = [pixel, mirrorPixel(pixel)];

  return (
    <figure className={orbitStyles.lesson} data-teaching-lesson="mirror-pair">
      <figcaption className={orbitStyles.title}>A pixel and its mirror image</figcaption>
      <p className={orbitStyles.rule}>Pick a pixel. The second ring is its mirror image.</p>
      <fieldset className={`${common.options} ${styles.options}`} aria-label="The rule">
        <button type="button" aria-pressed={fold} onClick={() => setFold(true)}>
          With the fold
        </button>
        <button type="button" aria-pressed={!fold} onClick={() => setFold(false)}>
          Without the fold
        </button>
      </fieldset>
      <div className={`${orbitStyles.layout} ${styles.layout}`}>
        <div className={orbitStyles.main}>
          <button
            type="button"
            ref={stage}
            className={orbitStyles.stage}
            aria-label={`Chosen pixel ${coordinates(pixel, 2)} and its mirror image ${coordinates(starts[1], 2)}. Click or drag to choose another, or use the arrow keys. Press Enter to play.`}
            data-dragging={dragging || undefined}
            onPointerDown={(event) => {
              if (!event.isPrimary || event.button !== 0) return;
              pointer.current = event.pointerId;
              event.currentTarget.setPointerCapture(event.pointerId);
              setPixel(snap(pointAt(event)));
              playback.change(0);
            }}
            onPointerMove={(event) => {
              if (pointer.current !== event.pointerId) return;
              setDragging(true);
              setPixel(pointAt(event));
            }}
            onPointerUp={(event) => {
              if (pointer.current !== event.pointerId) return;
              pointer.current = null;
              event.currentTarget.releasePointerCapture(event.pointerId);
              setPixel(snap(pointAt(event)));
              setDragging(false);
              replay();
            }}
            onPointerCancel={() => {
              pointer.current = null;
              setPixel(snap(pixel));
              setDragging(false);
            }}
            onClick={(event) => {
              if (event.detail === 0) replay();
            }}
            onKeyDown={(event) => {
              if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
              event.preventDefault();
              const dx = event.key === "ArrowLeft" ? -0.05 : event.key === "ArrowRight" ? 0.05 : 0;
              const dy = event.key === "ArrowUp" ? -0.05 : event.key === "ArrowDown" ? 0.05 : 0;
              setPixel(
                snap(clampToView({ real: pixel.real + dx, imaginary: pixel.imaginary + dy }, VIEW)),
              );
              playback.change(ORBIT_LESSON_LIMIT);
            }}
          >
            <EscapeTimePicture
              formula={fold ? "burning-ship" : "mandelbrot"}
              bounds={BOUNDS}
              coloring={fold ? BURNING_SHIP_COLORING : MANDELBROT_COLORING}
            />
            <svg viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
              <CoordinateGrid
                width={width}
                height={height}
                flip
                view={VIEW}
                radius={ESCAPE_RADIUS}
              />
              {routes.map((route, which) =>
                route.slice(1, shown + 1).map(({ iteration, point, folded }) => {
                  const from = project(route[iteration - 1].point);
                  const via = project(folded ?? route[iteration - 1].point);
                  const to = project(point);
                  const opacity = Math.max(0.25, 1 - 0.12 * (shown - iteration));
                  return (
                    <g
                      key={`${COLORS[which]}${iteration}`}
                      opacity={opacity}
                      stroke={COLORS[which]}
                    >
                      {folded && (
                        <path
                          d={`M${from.x} ${from.y}L${via.x} ${via.y}`}
                          className={styles.fold}
                        />
                      )}
                      <path d={`M${via.x} ${via.y}L${to.x} ${to.y}`} className={styles.hop} />
                      <circle cx={to.x} cy={to.y} r="3.5" fill={COLORS[which]} stroke="#10151a" />
                    </g>
                  );
                }),
              )}
              {starts.map((start, which) => {
                const at = project(start);
                const flipped = at.x > width - 110;
                return (
                  <g key={COLORS[which]}>
                    <circle
                      cx={at.x}
                      cy={at.y}
                      r="10"
                      fill="none"
                      stroke={COLORS[which]}
                      strokeWidth="2.5"
                    />
                    <text
                      x={at.x + (flipped ? -16 : 16)}
                      y={at.y + 4}
                      textAnchor={flipped ? "end" : "start"}
                      className={orbitStyles.ringTag}
                    >
                      {coordinates(start, 2)}
                    </text>
                  </g>
                );
              })}
            </svg>
          </button>
          <LessonStepControls
            step={shown}
            max={max}
            playback={playback}
            label="Mirror pair route"
            stepDescription={`Jump ${shown} of ${max}`}
          />
        </div>
        <div className={orbitStyles.routeColumn}>
          <div ref={table} className={orbitStyles.route}>
            <table>
              <thead>
                <tr>
                  <th scope="col">Jump</th>
                  <th scope="col" style={{ color: COLORS[0] }}>
                    Pixel
                  </th>
                  <th scope="col" style={{ color: COLORS[1] }}>
                    Mirror
                  </th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: shown + 1 }, (_, jump) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: A row is one jump, in order.
                  <tr key={jump} data-current={jump === shown || undefined}>
                    <td>{jump}</td>
                    {routes.map((route, which) => (
                      <td key={COLORS[which]} style={{ color: COLORS[which] }}>
                        {route[jump] ? coordinates(route[jump].point, 2) : ""}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className={orbitStyles.outcome} aria-live="polite" data-mirror-outcome>
            {routes.map((route, which) => (
              <p key={COLORS[which]} style={{ color: COLORS[which] }}>
                {outcome(route, shown)}
              </p>
            ))}
          </div>
        </div>
      </div>
    </figure>
  );
}
