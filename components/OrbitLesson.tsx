import { memo, type PointerEvent, useEffect, useId, useMemo, useRef, useState } from "react";
import styles from "../styles/OrbitLesson.module.css";
import {
  BURNING_SHIP_COLORING,
  JULIA_COLORING,
  MANDELBROT_COLORING,
} from "../utils/escapeTimeColoring";
import { useLessonPlayback } from "../utils/hooks/useLessonPlayback";
import { useReducedMotion } from "../utils/hooks/useReducedMotion";
import {
  type ComplexPoint,
  ESCAPE_RADIUS,
  isOutside,
  jumpControl,
  jumpExit,
  jumpPoint,
  type OrbitKind,
  type Pixel,
  TEACHING_LIMIT,
  traceTeachingOrbit,
} from "../utils/orbitLesson";
import { EscapeTimePicture } from "./lessons/EscapeTimePicture";
import { LessonStepControls } from "./lessons/LessonFrame";

export function isOrbitKind(value: unknown): value is OrbitKind {
  return value === "mandelbrot" || value === "julia" || value === "burning-ship";
}
const ZERO = { real: 0, imaginary: 0 };
const DEFAULTS: Record<OrbitKind, ComplexPoint> = {
  mandelbrot: { real: -1, imaginary: 0 },
  julia: { real: 0.5, imaginary: 0 },
  "burning-ship": { real: -1.76, imaginary: -0.03 },
};
// Every formula shares one view, so the whole escape circle is always on screen.
const VIEW = { left: -2.8, right: 2.8, bottom: -2.2, top: 2.2 };
const VIEW_BOUNDS = [VIEW.left, VIEW.right, VIEW.bottom, VIEW.top] as const;
const VIEW_WIDTH = VIEW.right - VIEW.left;
const VIEW_HEIGHT = VIEW.top - VIEW.bottom;
const COLORING = {
  mandelbrot: MANDELBROT_COLORING,
  julia: JULIA_COLORING,
  "burning-ship": BURNING_SHIP_COLORING,
};
const HOP_MS = 650;
const REST_MS = 300;
const FIRST_HOP_DELAY_MS = 350;
const TINY_HOP_DELAY_MS = 150;
const FOLD_SHARE = 0.35;

function number(value: number) {
  if (Math.abs(value) < 0.0005) return "0";
  return String(Number(value.toFixed(3))).replace("-", "−");
}
function coordinates(point: ComplexPoint) {
  return `(${number(point.real)}, ${number(point.imaginary)})`;
}
function distance(a: Pixel, b: Pixel) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
function ease(t: number) {
  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
}
function lerp(a: Pixel, b: Pixel, t: number) {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}
function clampToView(point: ComplexPoint) {
  return {
    real: Number(Math.max(VIEW.left, Math.min(VIEW.right, point.real)).toFixed(2)),
    imaginary: Number(Math.max(VIEW.bottom, Math.min(VIEW.top, point.imaginary)).toFixed(2)),
  };
}

const CoordinateGrid = memo(function CoordinateGrid({
  width,
  height,
  flip,
}: {
  width: number;
  height: number;
  flip: boolean;
}) {
  const scale = width / VIEW_WIDTH;
  const originX = width / 2;
  const originY = height / 2;
  const across = [-2.5, -2, -1.5, -1, -0.5, 0.5, 1, 1.5, 2, 2.5];
  const down = [-2, -1.5, -1, -0.5, 0.5, 1, 1.5, 2];
  const px = (value: number) => originX + value * scale;
  const py = (value: number) => originY + (flip ? value : -value) * scale;
  const unit = (value: number) => Number.isInteger(value);
  const showHalves = width >= 480;
  return (
    <g>
      {across.map((value) => (
        <path
          key={`x${value}`}
          d={`M${px(value)} 0V${height}`}
          className={unit(value) ? styles.gridUnit : styles.gridHalf}
        />
      ))}
      {down.map((value) => (
        <path
          key={`y${value}`}
          d={`M0 ${py(value)}H${width}`}
          className={unit(value) ? styles.gridUnit : styles.gridHalf}
        />
      ))}
      <path d={`M0 ${originY}H${width}M${originX} 0V${height}`} className={styles.axis} />
      <circle cx={originX} cy={originY} r={ESCAPE_RADIUS * scale} className={styles.escapeCircle} />
      {across
        .filter((value) => unit(value) || showHalves)
        .map((value) => (
          <text
            key={`xl${value}`}
            x={px(value)}
            y={originY + 16}
            textAnchor="middle"
            className={styles.tick}
          >
            {number(value)}
          </text>
        ))}
      {down
        .filter((value) => unit(value) || showHalves)
        .map((value) => (
          <text
            key={`yl${value}`}
            x={originX - 7}
            y={py(value) + 4}
            textAnchor="end"
            className={styles.tick}
          >
            {number(value)}
          </text>
        ))}
      <text x={originX - 7} y={originY + 16} textAnchor="end" className={styles.tick}>
        0
      </text>
    </g>
  );
});

export default function OrbitLesson({ kind }: { kind: OrbitKind }) {
  const [value, setValue] = useState(DEFAULTS[kind]);
  const [hover, setHover] = useState<ComplexPoint | null>(null);
  const [motion, setMotion] = useState({ step: 0, animate: false });
  const [hop, setHop] = useState(1);
  const [dragging, setDragging] = useState(false);
  const [width, setWidth] = useState(640);
  const stage = useRef<HTMLButtonElement>(null);
  const route = useRef<HTMLDivElement>(null);
  const pointer = useRef<number | null>(null);
  const id = useId().replace(/:/g, "");
  const reduced = useReducedMotion();
  const flip = kind === "burning-ship";
  const height = (width * VIEW_HEIGHT) / VIEW_WIDTH;
  const c = kind === "julia" ? ZERO : value;
  const orbit = useMemo(
    () => traceTeachingOrbit(c, kind === "julia" ? value : ZERO, flip),
    [c, value, kind, flip],
  );
  const max = orbit.length - 1;
  const shown = dragging ? max : Math.min(motion.step, max);
  const landed = hop < 1 ? shown - 1 : shown;

  const project = (point: ComplexPoint): Pixel => ({
    x: ((point.real - VIEW.left) / VIEW_WIDTH) * width,
    y: ((flip ? point.imaginary - VIEW.bottom : VIEW.top - point.imaginary) / VIEW_HEIGHT) * height,
  });
  // A jump draws in two stages when the Burning Ship folds the point first.
  const jump = (index: number) => {
    const from = project(orbit[index - 1].point);
    const via = project(orbit[index].folded ?? orbit[index - 1].point);
    const to = project(orbit[index].point);
    return { from, via, to, control: jumpControl(via, to), folds: distance(from, via) > 1 };
  };
  const hopPixels = (() => {
    if (shown === 0) return 0;
    const { from, via, to } = jump(shown);
    return distance(from, via) + distance(via, to);
  })();
  const fade = (index: number) => Math.max(0.2, 1 - 0.15 * (shown - index));

  const goTo = (next: number) => {
    const animate = next === shown + 1 && !reduced;
    setHop(animate ? 0 : 1);
    setMotion({ step: next, animate });
  };
  const delay =
    shown === 0 ? FIRST_HOP_DELAY_MS : hopPixels < 2 ? TINY_HOP_DELAY_MS : HOP_MS + REST_MS;
  const playback = useLessonPlayback(shown, max, goTo, delay);

  useEffect(() => {
    if (!motion.animate) return;
    const begun = performance.now();
    let frame = requestAnimationFrame(function tick(now) {
      const t = Math.max(0, Math.min(1, (now - begun) / HOP_MS));
      setHop(t);
      if (t < 1) frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [motion]);
  useEffect(() => {
    const element = stage.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry.contentRect.width > 0) setWidth(entry.contentRect.width);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const element = route.current;
    if (element && landed >= 0) element.scrollTop = element.scrollHeight;
  }, [landed]);

  const pointAt = (event: PointerEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const across = (event.clientX - rect.left) / rect.width;
    const down = (event.clientY - rect.top) / rect.height;
    return clampToView({
      real: VIEW.left + across * VIEW_WIDTH,
      imaginary: flip ? VIEW.bottom + down * VIEW_HEIGHT : VIEW.top - down * VIEW_HEIGHT,
    });
  };

  const crossed = isOutside(orbit[max].point);
  const finished = landed === max;
  const outcome = !finished
    ? ""
    : !crossed
      ? `Still inside the dashed circle after ${max} jumps.`
      : max === 0
        ? "Already outside the dashed circle."
        : `Crossed the dashed circle on jump ${max}.`;
  const title = kind === "julia" ? "Follow one starting point" : "Follow one pixel";
  const rule =
    kind === "julia"
      ? "Pick a pixel to start there. Each jump squares the point."
      : `Pick a pixel to test it. The point starts at 0. Each jump ${flip ? "folds and squares it" : "squares it"}, then adds the pixel's coordinates.`;

  const ring = project(value);
  const tagAt = (at: Pixel) => {
    const flipped = at.x > width - 130;
    return {
      x: at.x + (flipped ? -16 : 16),
      y: at.y + (at.y < 26 ? 18 : -14),
      textAnchor: flipped ? ("end" as const) : ("start" as const),
    };
  };
  const tag = tagAt(ring);
  const tagWidth = coordinates(value).length * 7.5;
  const tagLeft = tag.textAnchor === "end" ? tag.x - tagWidth : tag.x;
  const ghost = hover && project(hover);
  // A jump number sits up and right of its dot; skip it where the ring's tag already is.
  const clearOfRing = (at: Pixel) =>
    distance(at, ring) > 24 &&
    !(
      Math.abs(at.y - 8 - tag.y) < 14 &&
      at.x + 8 > tagLeft - 12 &&
      at.x + 8 < tagLeft + tagWidth + 4
    );
  const lastJump = max > 0 ? jump(max) : null;
  const exit = lastJump && finished ? jumpExit(lastJump.via, lastJump.to, width, height) : null;

  const trail = [];
  for (let index = 1; index <= shown; index++) {
    const { from, via, to, control, folds } = jump(index);
    const t = index === shown ? hop : 1;
    const foldShare = folds ? FOLD_SHARE : 0;
    const foldEnd = foldShare ? lerp(from, via, ease(Math.min(1, t / foldShare))) : via;
    const arcT = ease(Math.max(0, (t - foldShare) / (1 - foldShare)));
    const current = index === shown;
    const end = jumpPoint(via, control, to, arcT);
    const partial = lerp(via, control, arcT);
    trail.push(
      <g key={index} opacity={fade(index)}>
        {folds && (
          <path d={`M${from.x} ${from.y}L${foldEnd.x} ${foldEnd.y}`} className={styles.fold} />
        )}
        {arcT > 0 && (
          <path
            d={`M${via.x} ${via.y}Q${partial.x} ${partial.y} ${end.x} ${end.y}`}
            className={current ? styles.hopCurrent : styles.hop}
            markerEnd={!current && distance(via, to) > 16 ? `url(#${id}-arrow)` : undefined}
          />
        )}
      </g>,
    );
  }
  const head = (() => {
    if (shown === 0) return project(orbit[0].point);
    const { from, via, to, control, folds } = jump(shown);
    const foldShare = folds ? FOLD_SHARE : 0;
    if (foldShare && hop < foldShare) return lerp(from, via, ease(hop / foldShare));
    return jumpPoint(via, control, to, ease((hop - foldShare) / (1 - foldShare)));
  })();
  const headLift = hop < 1 ? Math.sin(Math.PI * hop) * 2.5 : 0;
  const labelled: Pixel[] = [];
  const landings = orbit.slice(0, Math.max(0, landed) + 1).map(({ iteration, point }) => {
    const at = project(point);
    const fresh = labelled.every((other) => distance(other, at) > 18);
    if (fresh) labelled.push(at);
    return { iteration, at, fresh: fresh && clearOfRing(at) };
  });

  return (
    <figure className={styles.lesson} data-orbit-lesson={kind} aria-labelledby={`${id}-title`}>
      <figcaption id={`${id}-title`} className={styles.title}>
        {title}
      </figcaption>
      <p className={styles.rule}>{rule}</p>
      <div className={styles.layout}>
        <div className={styles.main}>
          <button
            type="button"
            ref={stage}
            className={styles.stage}
            aria-label={`Chosen pixel ${coordinates(value)}. Click or drag to choose another, or use the arrow keys. Press Enter to play.`}
            data-orbit-stage
            onPointerDown={(event) => {
              if (!event.isPrimary || event.button !== 0) return;
              pointer.current = event.pointerId;
              event.currentTarget.setPointerCapture(event.pointerId);
              setHover(null);
              setValue(pointAt(event));
              playback.change(0);
            }}
            onPointerMove={(event) => {
              if (pointer.current !== event.pointerId) {
                if (event.pointerType === "mouse") setHover(pointAt(event));
                return;
              }
              setDragging(true);
              setValue(pointAt(event));
            }}
            onPointerLeave={() => setHover(null)}
            onPointerUp={(event) => {
              if (pointer.current !== event.pointerId) return;
              pointer.current = null;
              event.currentTarget.releasePointerCapture(event.pointerId);
              setValue(pointAt(event));
              setDragging(false);
              playback.play();
            }}
            onPointerCancel={() => {
              pointer.current = null;
              setDragging(false);
            }}
            onClick={(event) => {
              if (event.detail === 0) playback.play();
            }}
            onKeyDown={(event) => {
              if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
              event.preventDefault();
              const dx = event.key === "ArrowLeft" ? -0.05 : event.key === "ArrowRight" ? 0.05 : 0;
              const dy = event.key === "ArrowUp" ? 0.05 : event.key === "ArrowDown" ? -0.05 : 0;
              setValue(
                clampToView({
                  real: value.real + dx,
                  imaginary: value.imaginary + (flip ? -dy : dy),
                }),
              );
              playback.change(TEACHING_LIMIT);
            }}
          >
            <EscapeTimePicture formula={kind} bounds={VIEW_BOUNDS} coloring={COLORING[kind]} />
            <svg viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
              <defs>
                <marker
                  id={`${id}-arrow`}
                  markerWidth="8"
                  markerHeight="8"
                  refX="6"
                  refY="3"
                  orient="auto"
                  markerUnits="strokeWidth"
                >
                  <path d="M0 0L6 3L0 6Z" fill="#eee8ce" />
                </marker>
              </defs>
              <CoordinateGrid width={width} height={height} flip={flip} />
              {trail}
              {landings.map(({ iteration, at, fresh }) => (
                <g key={iteration} opacity={fade(iteration)}>
                  <circle cx={at.x} cy={at.y} r="3.5" className={styles.landing} />
                  {fresh && (
                    <text x={at.x + 8} y={at.y - 8} className={styles.jumpNumber}>
                      {iteration}
                    </text>
                  )}
                </g>
              ))}
              <circle cx={ring.x} cy={ring.y} r="10" fill="none" className={styles.ring} />
              {ghost && hover ? (
                <g data-orbit-ghost>
                  <circle cx={ghost.x} cy={ghost.y} r="10" className={styles.ghost} />
                  <text {...tagAt(ghost)} className={styles.ringTag}>
                    {coordinates(hover)}
                  </text>
                </g>
              ) : (
                <text {...tag} className={styles.ringTag}>
                  {coordinates(value)}
                </text>
              )}
              {motion.animate && hop >= 1 && !exit && (
                <circle
                  key={`ripple-${shown}`}
                  cx={head.x}
                  cy={head.y}
                  r="6"
                  className={styles.ripple}
                />
              )}
              <circle
                cx={head.x}
                cy={head.y}
                r={6 + headLift}
                className={styles.point}
                data-orbit-point
              />
              {exit && (
                <path
                  d="M-16 -9L0 0L-16 9Z"
                  className={styles.exit}
                  transform={`translate(${exit.x} ${exit.y}) rotate(${(exit.angle * 180) / Math.PI})`}
                />
              )}
            </svg>
          </button>
          <LessonStepControls
            step={shown}
            max={max}
            playback={playback}
            label={title}
            stepDescription={shown === 0 ? "Start" : `Jump ${shown}`}
          />
        </div>
        <div className={styles.routeColumn}>
          <div ref={route} className={styles.route}>
            <table>
              <thead>
                <tr>
                  <th scope="col">Jump</th>
                  <th scope="col">Point</th>
                </tr>
              </thead>
              <tbody>
                {orbit.slice(0, Math.max(0, landed) + 1).map(({ iteration, point }) => (
                  <tr key={iteration} data-current={iteration === landed || undefined}>
                    <td>{iteration}</td>
                    <td>{coordinates(point)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className={styles.outcome} aria-live="polite" data-orbit-outcome>
            {outcome}
          </p>
        </div>
      </div>
    </figure>
  );
}
