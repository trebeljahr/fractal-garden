import { useEffect, useMemo, useRef, useState } from "react";
import common from "../../styles/lessons/Lesson.module.css";
import styles from "../../styles/lessons/NewtonPlane.module.css";
import { usePointPicker, useTriedPoint } from "../../utils/hooks/usePointPicker";
import {
  NEWTON_JUMP_LIMIT,
  NEWTON_ROOTS,
  type NewtonPoint,
  newtonDestination,
  traceNewton,
} from "../../utils/lessons/newtonLesson";
import { LessonFrame } from "./LessonFrame";

const HALF_WIDTH = 2.2;
const VIEW = 640;
const PICTURE = 720;
const FRAME_BUDGET_MS = 12;
const ZOOM_STEP = 4;
const MOST_ZOOM = 4096;
const RING_DOTS = 24;
// The ring keeps its size on screen, so zooming in tests ever closer starts.
const RING_SHARE = 0.1;
// The same three colors as the large picture, for the picture and the ring's dots.
const ROOT_COLORS = [
  [255, 0, 0],
  [0, 255, 0],
  [0, 0, 255],
];
// Lighter for thin lines on a dark plane, where pure blue is hard to see.
const LINE_COLORS = ["#ff6b6b", "#5ee06b", "#7d9bff"];
const ROOT_NAMES = ["red", "green", "blue"];
const UNRESOLVED = [16, 21, 26];
const ZERO = { real: 0, imaginary: 0 };
const OPENING = {
  route: { real: 0.5, imaginary: 0.7 },
  ring: { real: 0.4, imaginary: 0.7 },
};
const written = (value: number, digits = 2) =>
  String(Number(value.toFixed(digits)) + 0).replace("-", "−");
const pair = (point: NewtonPoint, digits = 2) =>
  `(${written(point.real, digits)}, ${written(point.imaginary, digits)})`;
const fixed = (value: number) => value.toFixed(2);

function planeFor(view: { center: NewtonPoint; zoom: number }) {
  const half = HALF_WIDTH / view.zoom;
  return {
    half,
    project: (point: NewtonPoint) => ({
      x: ((point.real - view.center.real + half) / (2 * half)) * VIEW,
      y: ((view.center.imaginary + half - point.imaginary) / (2 * half)) * VIEW,
    }),
    under: (event: React.PointerEvent<HTMLButtonElement>) => {
      const rect = event.currentTarget.getBoundingClientRect();
      return {
        real: view.center.real - half + ((event.clientX - rect.left) / rect.width) * 2 * half,
        imaginary:
          view.center.imaginary + half - ((event.clientY - rect.top) / rect.height) * 2 * half,
      };
    },
  };
}

const arrowMoves: Record<string, [number, number]> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, 1],
  ArrowDown: [0, -1],
};

function RouteLesson() {
  const spot = useTriedPoint<NewtonPoint>(OPENING.route);
  const plane = planeFor({ center: ZERO, zoom: 1 });
  const picker = usePointPicker({
    under: plane.under,
    onChange: spot.keep,
    onHover: spot.tryOut,
  });
  const trace = useMemo(() => traceNewton(spot.value, NEWTON_JUMP_LIMIT), [spot.value]);
  const last = trace[trace.length - 1];
  const reached = last.reason === "root" ? last.root : null;
  const color = reached === null ? "#eee8ce" : LINE_COLORS[reached];
  const line = trace
    .map(({ point }, index) => {
      const { x, y } = plane.project(point);
      return `${index ? "L" : "M"}${fixed(x)} ${fixed(y)}`;
    })
    .join("");
  const farthest = Math.max(...trace.map(({ point }) => Math.hypot(point.real, point.imaginary)));
  const start = plane.project(spot.value);
  const outcome =
    last.reason === "root"
      ? `Reaches the ${ROOT_NAMES[last.root]} root after ${last.iteration} jumps.`
      : last.reason === "slope"
        ? "The line is flat here, so there is no next guess."
        : `No root after ${last.iteration} jumps.`;
  const far =
    farthest > HALF_WIDTH ? ` Its farthest guess is ${written(farthest, 1)} from the center.` : "";
  return (
    <LessonFrame title="Follow a guess" kind="newton-route">
      <div className={styles.layout}>
        <button
          type="button"
          className={styles.stage}
          data-newton-stage
          aria-label={`First guess ${pair(spot.value)}. ${outcome} Move the pointer or use the arrow keys.`}
          {...picker}
          onKeyDown={(event) => {
            const move = arrowMoves[event.key];
            if (!move) return;
            event.preventDefault();
            spot.keep({
              real: spot.value.real + move[0] * 0.02,
              imaginary: spot.value.imaginary + move[1] * 0.02,
            });
          }}
        >
          <svg viewBox={`0 0 ${VIEW} ${VIEW}`} aria-hidden="true">
            <path d={`M0 ${VIEW / 2}H${VIEW}M${VIEW / 2} 0V${VIEW}`} className={styles.axis} />
            {NEWTON_ROOTS.map((root, index) => {
              const { x, y } = plane.project(root);
              return (
                <circle
                  key={ROOT_NAMES[index]}
                  cx={fixed(x)}
                  cy={fixed(y)}
                  r="9"
                  fill="none"
                  stroke={LINE_COLORS[index]}
                  strokeWidth="3"
                />
              );
            })}
            <path d={line} fill="none" stroke={color} strokeWidth="1.75" strokeLinejoin="round" />
            {trace.slice(1).map(({ point, iteration }) => {
              const { x, y } = plane.project(point);
              return <circle key={iteration} cx={fixed(x)} cy={fixed(y)} r="3.5" fill={color} />;
            })}
            <circle
              cx={fixed(start.x)}
              cy={fixed(start.y)}
              r="8"
              fill="none"
              stroke="#f5c56d"
              strokeWidth="2.5"
            />
          </svg>
        </button>
        <p className={styles.readout} data-newton-readout>
          {pair(spot.value)}. {outcome}
          {far}
        </p>
      </div>
    </LessonFrame>
  );
}

function usePicture(center: NewtonPoint, zoom: number) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const context = canvas.current?.getContext("2d");
    if (!context) return;
    const half = HALF_WIDTH / zoom;
    const image = context.createImageData(PICTURE, 1);
    let row = 0;
    let frame = requestAnimationFrame(function paint() {
      const begun = performance.now();
      for (; row < PICTURE && performance.now() - begun < FRAME_BUDGET_MS; row++) {
        const imaginary = center.imaginary + half - ((row + 0.5) / PICTURE) * 2 * half;
        for (let column = 0; column < PICTURE; column++) {
          const real = center.real - half + ((column + 0.5) / PICTURE) * 2 * half;
          const { root } = newtonDestination(real, imaginary);
          const color = root === null ? UNRESOLVED : ROOT_COLORS[root];
          image.data[column * 4] = color[0];
          image.data[column * 4 + 1] = color[1];
          image.data[column * 4 + 2] = color[2];
          image.data[column * 4 + 3] = 255;
        }
        context.putImageData(image, 0, row);
      }
      if (row < PICTURE) frame = requestAnimationFrame(paint);
    });
    return () => cancelAnimationFrame(frame);
  }, [center, zoom]);
  return canvas;
}

function RingLesson() {
  const [view, setView] = useState({ center: ZERO, zoom: 1 });
  const spot = useTriedPoint<NewtonPoint>(OPENING.ring);
  const plane = planeFor(view);
  const picker = usePointPicker({
    under: plane.under,
    onChange: spot.keep,
    onHover: spot.tryOut,
  });
  const canvas = usePicture(view.center, view.zoom);
  const radius = RING_SHARE * plane.half;
  const dots = useMemo(
    () =>
      Array.from({ length: RING_DOTS }, (_, index) => {
        const angle = (2 * Math.PI * (index + 0.5)) / RING_DOTS;
        const point = {
          real: spot.value.real + radius * Math.cos(angle),
          imaginary: spot.value.imaginary + radius * Math.sin(angle),
        };
        return { point, root: newtonDestination(point.real, point.imaginary).root };
      }),
    [spot.value, radius],
  );
  const reached = new Set(dots.map(({ root }) => root).filter((root) => root !== null));
  const unresolved = dots.filter(({ root }) => root === null).length;
  const zoomTo = (zoom: number, center: NewtonPoint) =>
    setView({ zoom, center: zoom === 1 ? ZERO : center });
  const middle = plane.project(spot.value);
  const outcome = `The ring reaches ${reached.size} ${reached.size === 1 ? "root" : "roots"}${unresolved ? `, and ${unresolved} of its dots reach none within ${NEWTON_JUMP_LIMIT} jumps` : ""}.`;
  return (
    <LessonFrame title="Test a border" kind="newton-ring">
      <div className={styles.layout}>
        <button
          type="button"
          className={styles.stage}
          data-newton-stage
          aria-label={`Ring around ${pair(spot.value, 4)}. ${outcome} Move the pointer or use the arrow keys.`}
          {...picker}
          onKeyDown={(event) => {
            const move = arrowMoves[event.key];
            if (!move) return;
            event.preventDefault();
            spot.keep({
              real: spot.value.real + move[0] * 0.01 * plane.half,
              imaginary: spot.value.imaginary + move[1] * 0.01 * plane.half,
            });
          }}
        >
          <canvas ref={canvas} width={PICTURE} height={PICTURE} />
          <svg viewBox={`0 0 ${VIEW} ${VIEW}`} aria-hidden="true">
            <circle
              cx={fixed(middle.x)}
              cy={fixed(middle.y)}
              r={fixed((RING_SHARE / 2) * VIEW)}
              fill="none"
              stroke="#ffffff"
              strokeWidth="1.5"
            />
            {dots.map(({ point, root }, index) => {
              const { x, y } = plane.project(point);
              const color = root === null ? UNRESOLVED : ROOT_COLORS[root];
              return (
                <circle
                  // biome-ignore lint/suspicious/noArrayIndexKey: A dot's place on the ring never changes.
                  key={index}
                  cx={fixed(x)}
                  cy={fixed(y)}
                  r="5"
                  fill={`rgb(${color.join(",")})`}
                  stroke="#10151a"
                  strokeWidth="1"
                />
              );
            })}
          </svg>
        </button>
        <div>
          <p className={styles.readout} aria-live="off" data-newton-readout>
            {pair(spot.value, view.zoom > 16 ? 5 : 2)}
            <br />
            Zoom ×{view.zoom}
            <br />
            {outcome}
          </p>
          <div className={common.options}>
            <button
              type="button"
              disabled={view.zoom >= MOST_ZOOM}
              onClick={() => zoomTo(view.zoom * ZOOM_STEP, spot.kept)}
            >
              Zoom in
            </button>
            <button
              type="button"
              disabled={view.zoom <= 1}
              onClick={() => zoomTo(view.zoom / ZOOM_STEP, view.center)}
            >
              Zoom out
            </button>
            <button
              type="button"
              onClick={() => {
                spot.keep(ZERO);
                setView({ center: ZERO, zoom: view.zoom });
              }}
            >
              Around 0
            </button>
          </div>
        </div>
      </div>
    </LessonFrame>
  );
}

export default function NewtonPlaneLesson({ kind }: { kind: "route" | "ring" }) {
  return kind === "route" ? <RouteLesson /> : <RingLesson />;
}
