import { memo, type PointerEvent, useEffect, useId, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import styles from "../styles/OrbitLesson.module.css";
import {
  BARNSLEY_TREE_COLORING,
  BURNING_SHIP_COLORING,
  CACTUS_COLORING,
  JULIA_COLORING,
  MANDELBAR_COLORING,
  MANDELBROT_COLORING,
} from "../utils/escapeTimeColoring";
import { JULIA_PRESETS } from "../utils/escapeTimePlaces";
import { useLessonPlayback } from "../utils/hooks/useLessonPlayback";
import { usePointPicker } from "../utils/hooks/usePointPicker";
import { useReducedMotion } from "../utils/hooks/useReducedMotion";
import {
  CACTUS_RADIUS,
  type ComplexPoint,
  ESCAPE_RADIUS,
  isOutside,
  jumpControl,
  jumpExit,
  jumpPoint,
  landsExactly,
  ORBIT_LESSON_LIMIT,
  type OrbitKind,
  type OrbitLoop,
  type Pixel,
  squarePoint,
  traceBarnsleyTreeOrbit,
  traceCactusOrbit,
  traceMandelbarOrbit,
  traceUntilLoop,
  untilLoop,
} from "../utils/orbitLesson";
import { EscapeTimePicture } from "./lessons/EscapeTimePicture";
import { HandJump } from "./lessons/HandJump";

export function isOrbitKind(value: unknown): value is OrbitKind {
  return (
    value === "mandelbrot" ||
    value === "julia" ||
    value === "burning-ship" ||
    value === "mandelbar" ||
    value === "cactus" ||
    value === "barnsley-tree"
  );
}
const ZERO = { real: 0, imaginary: 0 };
const JULIA_C = { real: JULIA_PRESETS.Rabbit.cReal, imaginary: JULIA_PRESETS.Rabbit.cImag };
function number(value: number, digits = 3) {
  if (Math.abs(value) < 0.0005) return "0";
  return String(Number(value.toFixed(digits))).replace("-", "−");
}
const TREE_C = { real: 0.6, imaginary: 1.1 };
const DEFAULTS: Record<OrbitKind, ComplexPoint> = {
  mandelbrot: { real: -1, imaginary: 0 },
  julia: { real: 0.3, imaginary: 0 },
  "burning-ship": { real: -1.76, imaginary: -0.03 },
  mandelbar: { real: -1, imaginary: 0.5 },
  cactus: { real: 0.3, imaginary: 0 },
  "barnsley-tree": { real: 0.9, imaginary: 0.6 },
};
// Each view shows its whole escape circle, except the Mandelbrot view, which shows the set.
const VIEW = { left: -2.8, right: 2.8, bottom: -2.2, top: 2.2 };
const MANDELBROT_HALF_HEIGHT = (3.1 * 2.2) / 5.6;
const MANDELBROT_VIEW = {
  left: -2.25,
  right: 0.85,
  bottom: -MANDELBROT_HALF_HEIGHT,
  top: MANDELBROT_HALF_HEIGHT,
};
const WIDE_VIEW = { left: -3.4, right: 3.4, bottom: -2.7, top: 2.7 };
const VIEWS: Record<OrbitKind, typeof VIEW> = {
  mandelbrot: MANDELBROT_VIEW,
  julia: VIEW,
  "burning-ship": VIEW,
  mandelbar: VIEW,
  cactus: WIDE_VIEW,
  "barnsley-tree": VIEW,
};
const RADIUS: Record<OrbitKind, number> = {
  mandelbrot: ESCAPE_RADIUS,
  julia: ESCAPE_RADIUS,
  "burning-ship": ESCAPE_RADIUS,
  mandelbar: ESCAPE_RADIUS,
  cactus: CACTUS_RADIUS,
  "barnsley-tree": ESCAPE_RADIUS,
};
const COLORING = {
  mandelbrot: MANDELBROT_COLORING,
  julia: JULIA_COLORING,
  "burning-ship": BURNING_SHIP_COLORING,
  mandelbar: MANDELBAR_COLORING,
  cactus: CACTUS_COLORING,
  "barnsley-tree": { ...BARNSLEY_TREE_COLORING, escapeRadius: ESCAPE_RADIUS },
};
function traceOrbit(kind: OrbitKind, value: ComplexPoint) {
  if (kind === "julia") return traceUntilLoop(JULIA_C, value);
  if (kind === "mandelbar") return untilLoop((jumps) => traceMandelbarOrbit(value, jumps));
  if (kind === "cactus")
    return untilLoop(
      (jumps) => traceCactusOrbit(value, jumps),
      ORBIT_LESSON_LIMIT,
      (z) => {
        // The rule's derivative is 3z^2 + c - 1.
        const square = squarePoint(z);
        return Math.hypot(3 * square.real + value.real - 1, 3 * square.imaginary + value.imaginary);
      },
    );
  if (kind === "barnsley-tree")
    return untilLoop(
      (jumps) => traceBarnsleyTreeOrbit(TREE_C, value, jumps),
      ORBIT_LESSON_LIMIT,
      () => Math.hypot(TREE_C.real, TREE_C.imaginary),
    );
  return traceUntilLoop(value, ZERO, kind === "burning-ship");
}
function gapFactor(gap: number) {
  return gap < 0.01 ? "less than 0.01" : number(gap, 2);
}
function repeatOutcome(max: number, loop: OrbitLoop, exact: boolean, gap: number) {
  const each = loop.period === 1 ? "each jump" : `each round of ${loop.period} jumps`;
  if (!exact)
    return `Jump ${max} matches jump ${loop.from} to 3 decimals. Near here, ${each} shrinks the gap between two close points to ${gapFactor(gap)} of its size, so the point can't leave.`;
  const repeats =
    loop.period === 1 ? "The point stays here." : `The same ${loop.period} jumps repeat from here.`;
  const pushed =
    gap > 1 ? ` A point close by moves ${number(gap, 1)} times farther away ${each}.` : "";
  return `Jump ${max} lands back on jump ${loop.from}. ${repeats}${pushed}`;
}
const STARTS_AT_PIXEL: OrbitKind[] = ["julia", "barnsley-tree"];
const WORKED_BY_HAND: OrbitKind[] = ["julia", "burning-ship"];
const RULES: Partial<Record<OrbitKind, string>> = {
  julia: `Pick a pixel to start there. Each jump squares the point, then adds c = (${number(JULIA_C.real, 5)}, ${number(JULIA_C.imaginary, 5)}).`,
  "burning-ship":
    "Pick a pixel to test it. The point starts at 0. Each jump folds and squares it, then adds the pixel's coordinates.",
  mandelbar:
    "Pick a pixel to test it. The point starts at 0. Each jump mirrors it across the horizontal axis and squares it, then adds the pixel's coordinates.",
  cactus:
    "Pick a pixel to test it. The point starts at that pixel, called c. Each jump goes to z³ + (c − 1)z − c.",
  "barnsley-tree":
    "Pick a pixel to start there. Each jump moves the point one unit toward the vertical axis, then multiplies it by c = (0.6, 1.1).",
};
const HOP_MS = 650;
const REST_MS = 300;
const FIRST_HOP_DELAY_MS = 350;
const TINY_HOP_DELAY_MS = 150;
const FOLD_SHARE = 0.35;
// A jump the reader asks for runs slower than playback, so the sums can be read.
const HAND_SPEED = 2;

export function coordinates(point: ComplexPoint, digits = 3) {
  return `(${number(point.real, digits)}, ${number(point.imaginary, digits)})`;
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
export function clampToView(point: ComplexPoint, view: typeof VIEW) {
  return {
    real: Math.max(view.left, Math.min(view.right, point.real)),
    imaginary: Math.max(view.bottom, Math.min(view.top, point.imaginary)),
  };
}
// A chosen point rests on two decimals. While dragging it follows the pointer exactly.
export function snap(point: ComplexPoint) {
  return { real: Number(point.real.toFixed(2)), imaginary: Number(point.imaginary.toFixed(2)) };
}
// Later jumps run faster, so a long orbit doesn't take much longer to watch.
function pace(jump: number) {
  return Math.max(0.35, 1 - 0.06 * (jump - 1));
}

const halves = (reach: number) => {
  const values: number[] = [];
  for (let value = -Math.floor(reach * 2) / 2; value <= reach; value += 0.5)
    if (value !== 0) values.push(value);
  return values;
};

export const CoordinateGrid = memo(function CoordinateGrid({
  width,
  height,
  flip,
  view,
  radius,
}: {
  width: number;
  height: number;
  flip: boolean;
  view: typeof VIEW;
  /** The escape circle to draw, or nothing for none. */
  radius?: number;
}) {
  const scale = width / (view.right - view.left);
  const originX = -view.left * scale;
  const originY = height / 2;
  // Stop short of the edge so a tick label is never cut in half.
  const across = halves(Math.max(-view.left, view.right) - 0.1).filter(
    (value) => value > view.left + 0.1 && value < view.right - 0.1,
  );
  const down = halves(view.top - 0.1);
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
      {radius !== undefined && (
        <circle cx={originX} cy={originY} r={radius * scale} className={styles.escapeCircle} />
      )}
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
  const handWorked = WORKED_BY_HAND.includes(kind);
  const [motion, setMotion] = useState({
    step: handWorked ? 1 : 0,
    animate: false,
    speed: 1,
  });
  const [hop, setHop] = useState(1);
  const [dragging, setDragging] = useState(false);
  const [width, setWidth] = useState(640);
  const route = useRef<HTMLDivElement>(null);
  const id = useId().replace(/:/g, "");
  const reduced = useReducedMotion();
  const flip = kind === "burning-ship";
  const view = VIEWS[kind];
  const radius = RADIUS[kind];
  const viewWidth = view.right - view.left;
  const viewHeight = view.top - view.bottom;
  const viewBounds = useMemo(() => [view.left, view.right, view.bottom, view.top] as const, [view]);
  const height = (width * viewHeight) / viewWidth;
  const { orbit, loop, gap } = useMemo(() => traceOrbit(kind, value), [value, kind]);
  const max = orbit.length - 1;
  const shown = dragging ? max : Math.min(motion.step, max);
  const landed = hop < 1 ? shown - 1 : shown;
  const finished = landed === max;
  const inLoop = (index: number) => finished && loop !== null && index > loop.from;

  const project = (point: ComplexPoint): Pixel => ({
    x: ((point.real - view.left) / viewWidth) * width,
    y: ((flip ? point.imaginary - view.bottom : view.top - point.imaginary) / viewHeight) * height,
  });
  // A jump draws in two stages when the rule moves the point before the jump.
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
  const fade = (index: number) => (inLoop(index) ? 1 : Math.max(0.2, 1 - 0.15 * (shown - index)));

  const goTo = (next: number) => {
    const animate = next === shown + 1 && !reduced;
    setHop(animate ? 0 : 1);
    setMotion({ step: next, animate, speed: pace(next) });
  };
  const delay =
    shown === 0
      ? FIRST_HOP_DELAY_MS
      : hopPixels < 2
        ? TINY_HOP_DELAY_MS
        : (HOP_MS + REST_MS) * pace(shown);
  const playback = useLessonPlayback(shown, max, goTo, delay);
  const nextJump = () => {
    playback.change(shown === max ? 0 : shown + 1);
    setMotion((current) => ({ ...current, speed: HAND_SPEED }));
  };

  useEffect(() => {
    if (!motion.animate) return;
    const begun = performance.now();
    const duration = HOP_MS * motion.speed;
    let frame = requestAnimationFrame(function tick(now) {
      const t = Math.max(0, Math.min(1, (now - begun) / duration));
      setHop(t);
      if (t < 1) frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [motion]);
  useEffect(() => {
    const element = route.current;
    if (element && landed >= 0) element.scrollTop = element.scrollHeight;
  }, [landed]);

  const pointAt = (event: PointerEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const across = (event.clientX - rect.left) / rect.width;
    const down = (event.clientY - rect.top) / rect.height;
    return clampToView(
      {
        real: view.left + across * viewWidth,
        imaginary: flip ? view.bottom + down * viewHeight : view.top - down * viewHeight,
      },
      view,
    );
  };
  const picker = usePointPicker({
    under: pointAt,
    onChange: (at) => {
      if (!dragging) playback.change(0);
      // React would otherwise commit after this frame paints, one frame behind the pointer.
      flushSync(() => {
        setHover(null);
        setDragging(true);
        setValue(at);
      });
    },
    onHover: (at) => setHover(at),
    onRelease: () => {
      setValue((current) => snap(current));
      setDragging(false);
      playback.play();
    },
  });
  const stage = picker.ref;
  useEffect(() => {
    const element = stage.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry.contentRect.width > 0) setWidth(entry.contentRect.width);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [stage]);

  const crossed = isOutside(orbit[max].point, radius);
  const outcome = !finished
    ? ""
    : loop
      ? repeatOutcome(max, loop, landsExactly(orbit, loop), gap ?? 1)
      : !crossed
        ? `Still ${kind === "mandelbrot" ? "within two units of zero" : "inside the dashed circle"} after ${max} jumps. It could still leave.`
        : max === 0
          ? `Already ${kind === "mandelbrot" ? "more than two units from zero" : "outside the dashed circle"}.`
          : `${kind === "mandelbrot" ? "Went past two units from zero" : "Crossed the dashed circle"} on jump ${max}.`;
  const title = STARTS_AT_PIXEL.includes(kind) ? "Follow one starting point" : "Follow one pixel";
  const rule =
    RULES[kind] ??
    "Pick a pixel to test it. The point starts at 0. Each jump squares it, then adds the pixel's coordinates.";

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
  const tagWidth = coordinates(value, 2).length * 7.5;
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
    const looping = inLoop(index);
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
            className={current || looping ? styles.hopCurrent : styles.hop}
            markerEnd={
              !current && distance(via, to) > 16
                ? `url(#${id}-${looping ? "loop-arrow" : "arrow"})`
                : undefined
            }
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
      <div className={styles.layout} data-sums={handWorked || undefined}>
        <div className={styles.main}>
          <button
            type="button"
            className={styles.stage}
            aria-label={`Chosen pixel ${coordinates(value, 2)}. Click or drag to choose another, or use the arrow keys. Press Enter to play.`}
            data-orbit-stage
            data-dragging={dragging || undefined}
            {...picker}
            onPointerCancel={() => {
              picker.onPointerCancel();
              setValue(snap(value));
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
                snap(
                  clampToView(
                    {
                      real: value.real + dx,
                      imaginary: value.imaginary + (flip ? -dy : dy),
                    },
                    view,
                  ),
                ),
              );
              playback.change(ORBIT_LESSON_LIMIT);
            }}
          >
            <EscapeTimePicture
              formula={kind}
              bounds={viewBounds}
              coloring={COLORING[kind]}
              c={kind === "julia" ? JULIA_C : kind === "barnsley-tree" ? TREE_C : undefined}
            />
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
                <marker
                  id={`${id}-loop-arrow`}
                  markerWidth="5"
                  markerHeight="5"
                  refX="4"
                  refY="2"
                  orient="auto"
                  markerUnits="strokeWidth"
                >
                  <path d="M0 0L4 2L0 4Z" fill="#f5c56d" />
                </marker>
              </defs>
              <CoordinateGrid
                width={width}
                height={height}
                flip={flip}
                view={view}
                radius={kind === "mandelbrot" ? undefined : radius}
              />
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
                    {coordinates(hover, 2)}
                  </text>
                </g>
              ) : (
                <text {...tag} className={styles.ringTag}>
                  {coordinates(value, 2)}
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
                  <tr
                    key={iteration}
                    data-current={
                      iteration === landed || (finished && iteration === loop?.from) || undefined
                    }
                  >
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
      {handWorked && (
        <HandJump
          orbit={orbit}
          c={kind === "julia" ? JULIA_C : value}
          fold={kind === "burning-ship"}
          jump={dragging ? Math.min(1, max) : shown}
          animate={motion.animate}
          duration={(HOP_MS + REST_MS) * motion.speed}
          announce={!playback.playing}
          onNext={nextJump}
        />
      )}
    </figure>
  );
}
