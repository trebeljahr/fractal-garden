import { type PointerEvent, useEffect, useId, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import common from "../../styles/lessons/Lesson.module.css";
import styles from "../../styles/lessons/OrbitPlane.module.css";
import { JULIA_PRESETS } from "../../utils/escapeTimePlaces";
import { useReducedMotion } from "../../utils/hooks/useReducedMotion";
import {
  clampToDisk,
  juliaEdge,
  LARGEST_C,
  OFF_PLANE_RADIUS,
  ORBIT_JUMPS,
} from "../../utils/lessons/orbitPlane";
import { crossingJump, type PlaneBounds, STAYED } from "../../utils/lessons/paintPlane";
import { type ComplexPoint, traceTeachingOrbit } from "../../utils/orbitLesson";
import { ToggleSwitch } from "../PanelPickers";
import { LessonFrame } from "./LessonFrame";
import { coordinates, DistanceChart, planeHeight } from "./PaintPlane";

const BOUNDS: PlaneBounds = [-2.2, 2.2, -1.75, 1.75];
const [LEFT, RIGHT, BOTTOM, TOP] = BOUNDS;
const INK = "#eee8ce";
const BACKGROUND = "#10151a";
const STAYS = "#f5c56d";
const ESCAPES = "#9fb3c8";
const C_DOT = "#5ec2b7";
const EDGE_COLUMNS = 800;
const EDGE_COLOR = [238, 232, 206];
// A press this close to the c dot picks up the dot rather than moving the start.
const GRAB_PIXELS = 30;
const GLIDE_MS = 900;
const MOST_DOTS = 60;
const ZERO = { real: 0, imaginary: 0 };
const RABBIT = { real: JULIA_PRESETS.Rabbit.cReal, imaginary: JULIA_PRESETS.Rabbit.cImag };
const NAMED_C: { name: string; c: ComplexPoint }[] = [
  { name: "c = 0", c: ZERO },
  { name: "Rabbit", c: RABBIT },
  { name: "Basilica", c: { real: -1, imaginary: 0 } },
  {
    name: "Spiral",
    c: { real: JULIA_PRESETS.Spiral.cReal, imaginary: JULIA_PRESETS.Spiral.cImag },
  },
  { name: "Branches", c: { real: 0, imaginary: 1 } },
  { name: "Dust", c: { real: 0.3, imaginary: 0.6 } },
];

function drawPlane(
  canvas: HTMLCanvasElement,
  route: ComplexPoint[],
  escapes: boolean,
  start: ComplexPoint,
  c: ComplexPoint | null,
  circleAlpha: string | null,
) {
  const context = canvas.getContext("2d");
  if (!context) return;
  const scale = window.devicePixelRatio || 1;
  const width = Math.round(canvas.clientWidth * scale);
  const height = Math.round(canvas.clientHeight * scale);
  if (canvas.width !== width) canvas.width = width;
  if (canvas.height !== height) canvas.height = height;
  const px = (x: number) => ((x - LEFT) / (RIGHT - LEFT)) * width;
  const py = (y: number) => ((TOP - y) / (TOP - BOTTOM)) * height;
  context.clearRect(0, 0, width, height);
  context.font = `${11 * scale}px Montserrat, sans-serif`;
  context.lineWidth = scale;
  for (const unit of [-2, -1, 0, 1, 2]) {
    context.strokeStyle = unit === 0 ? `${INK}55` : `${INK}1c`;
    context.beginPath();
    context.moveTo(px(unit), 0);
    context.lineTo(px(unit), height);
    if (Math.abs(unit) < TOP) {
      context.moveTo(0, py(unit));
      context.lineTo(width, py(unit));
    }
    context.stroke();
    if (unit === 0) continue;
    context.fillStyle = `${INK}80`;
    context.fillText(String(unit).replace("-", "−"), px(unit) + 4 * scale, py(0) + 14 * scale);
    if (Math.abs(unit) < TOP) {
      context.fillText(String(unit).replace("-", "−"), px(0) + 4 * scale, py(unit) + 14 * scale);
    }
  }
  if (circleAlpha) {
    context.strokeStyle = `${INK}${circleAlpha}`;
    context.lineWidth = 1.5 * scale;
    context.beginPath();
    context.arc(px(0), py(0), (width / (RIGHT - LEFT)) * 1, 0, Math.PI * 2);
    context.stroke();
  }
  const color = escapes ? ESCAPES : STAYS;
  context.strokeStyle = color;
  context.lineWidth = 1.5 * scale;
  context.lineJoin = "round";
  context.beginPath();
  route.forEach((point, index) => {
    if (index === 0) context.moveTo(px(point.real), py(point.imaginary));
    else context.lineTo(px(point.real), py(point.imaginary));
  });
  context.stroke();
  context.fillStyle = color;
  context.beginPath();
  for (const point of route.slice(0, MOST_DOTS)) {
    context.moveTo(px(point.real) + 2.5 * scale, py(point.imaginary));
    context.arc(px(point.real), py(point.imaginary), 2.5 * scale, 0, Math.PI * 2);
  }
  context.fill();
  context.lineWidth = 5 * scale;
  context.strokeStyle = BACKGROUND;
  context.beginPath();
  context.arc(px(start.real), py(start.imaginary), 9 * scale, 0, Math.PI * 2);
  context.stroke();
  context.lineWidth = 2.5 * scale;
  context.strokeStyle = INK;
  context.stroke();
  if (!c) return;
  context.fillStyle = C_DOT;
  context.strokeStyle = BACKGROUND;
  context.lineWidth = 2 * scale;
  context.beginPath();
  context.arc(px(c.real), py(c.imaginary), 8 * scale, 0, Math.PI * 2);
  context.fill();
  context.stroke();
  context.fillStyle = BACKGROUND;
  context.font = `700 ${12 * scale}px Montserrat, sans-serif`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText("c", px(c.real), py(c.imaginary));
  context.textAlign = "left";
  context.textBaseline = "alphabetic";
}

function drawEdge(canvas: HTMLCanvasElement, c: ComplexPoint | null) {
  const context = canvas.getContext("2d");
  if (!context) return;
  if (!c) {
    context.clearRect(0, 0, canvas.width, canvas.height);
    return;
  }
  const hits = juliaEdge(c, BOUNDS, canvas.width, canvas.height);
  const image = context.createImageData(canvas.width, canvas.height);
  for (let cell = 0; cell < hits.length; cell++) {
    if (!hits[cell]) continue;
    image.data.set(EDGE_COLOR, cell * 4);
    image.data[cell * 4 + 3] = 255;
  }
  context.putImageData(image, 0, 0);
}

export default function OrbitPlaneLesson({ adding }: { adding: boolean }) {
  const [start, setStart] = useState<ComplexPoint>(
    adding ? { real: -0.3, imaginary: 0.3 } : { real: 0.8, imaginary: 0.55 },
  );
  const [c, setC] = useState<ComplexPoint>(adding ? RABBIT : ZERO);
  const [showEdge, setShowEdge] = useState(false);
  const plane = useRef<HTMLCanvasElement>(null);
  const edge = useRef<HTMLCanvasElement>(null);
  const grabbed = useRef<{ pointer: number; handle: "start" | "c" } | null>(null);
  const glide = useRef(0);
  const cNow = useRef(c);
  cNow.current = c;
  const id = useId();
  const reduced = useReducedMotion();
  const route = useMemo(
    () => traceTeachingOrbit(c, start, false, ORBIT_JUMPS, OFF_PLANE_RADIUS),
    [c, start],
  );
  const crossing = crossingJump(c.real, c.imaginary, start.real, start.imaginary, ORBIT_JUMPS);
  const escapes = crossing !== STAYED;
  const onePiece = crossingJump(c.real, c.imaginary, 0, 0, ORBIT_JUMPS) === STAYED;

  useEffect(() => {
    const canvas = plane.current;
    if (!canvas) return;
    const draw = () =>
      drawPlane(
        canvas,
        route.map((step) => step.point),
        escapes,
        start,
        adding ? c : null,
        !adding ? "cc" : showEdge ? null : "55",
      );
    draw();
    const resized = new ResizeObserver(draw);
    resized.observe(canvas);
    return () => resized.disconnect();
  }, [route, escapes, start, c, adding, showEdge]);
  useEffect(() => {
    if (edge.current) drawEdge(edge.current, adding && showEdge ? c : null);
  }, [c, adding, showEdge]);
  useEffect(() => () => cancelAnimationFrame(glide.current), []);

  const glideTo = (target: ComplexPoint) => {
    cancelAnimationFrame(glide.current);
    if (reduced) {
      setC(target);
      return;
    }
    const from = cNow.current;
    const begun = performance.now();
    glide.current = requestAnimationFrame(function tick(now) {
      const t = Math.min(1, (now - begun) / GLIDE_MS);
      const eased = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
      setC(
        t === 1
          ? target
          : {
              real: from.real + (target.real - from.real) * eased,
              imaginary: from.imaginary + (target.imaginary - from.imaginary) * eased,
            },
      );
      if (t < 1) glide.current = requestAnimationFrame(tick);
    });
  };
  const pointAt = (event: PointerEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      real: Math.max(
        LEFT,
        Math.min(RIGHT, LEFT + ((event.clientX - rect.left) / rect.width) * (RIGHT - LEFT)),
      ),
      imaginary: Math.max(
        BOTTOM,
        Math.min(TOP, TOP - ((event.clientY - rect.top) / rect.height) * (TOP - BOTTOM)),
      ),
    };
  };
  const moveHandle = (event: PointerEvent<HTMLButtonElement>) => {
    const point = pointAt(event);
    // React would otherwise commit after this frame paints, one frame behind the pointer.
    flushSync(() => {
      if (grabbed.current?.handle === "c") setC(clampToDisk(point, LARGEST_C));
      else setStart(point);
    });
  };

  return (
    <LessonFrame
      title={adding ? "Square, then add c" : "Square a point on the plane"}
      kind={adding ? "orbits-adding" : "orbits-squaring"}
    >
      <div className={styles.lesson}>
        <button
          type="button"
          className={styles.plane}
          aria-label={`Starting point ${coordinates(start)}. ${escapes ? `Escapes on jump ${crossing}` : "Stays"}. Drag${adding ? " the point or c" : ""}, or use the arrow keys.`}
          data-orbit-plane
          onPointerDown={(event) => {
            if (!event.isPrimary || event.button !== 0) return;
            event.preventDefault();
            event.currentTarget.focus({ preventScroll: true });
            cancelAnimationFrame(glide.current);
            const rect = event.currentTarget.getBoundingClientRect();
            const point = pointAt(event);
            const reach = Math.hypot(point.real - c.real, point.imaginary - c.imaginary);
            const onC = adding && (reach / (RIGHT - LEFT)) * rect.width < GRAB_PIXELS;
            grabbed.current = { pointer: event.pointerId, handle: onC ? "c" : "start" };
            event.currentTarget.setPointerCapture(event.pointerId);
            moveHandle(event);
          }}
          onPointerMove={(event) => {
            if (grabbed.current?.pointer === event.pointerId) moveHandle(event);
          }}
          onPointerUp={() => {
            grabbed.current = null;
          }}
          onPointerCancel={() => {
            grabbed.current = null;
          }}
          onKeyDown={(event) => {
            if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
            event.preventDefault();
            const step = event.shiftKey ? 0.1 : 0.01;
            setStart({
              real: Math.max(
                LEFT,
                Math.min(
                  RIGHT,
                  start.real +
                    (event.key === "ArrowLeft" ? -step : event.key === "ArrowRight" ? step : 0),
                ),
              ),
              imaginary: Math.max(
                BOTTOM,
                Math.min(
                  TOP,
                  start.imaginary +
                    (event.key === "ArrowUp" ? step : event.key === "ArrowDown" ? -step : 0),
                ),
              ),
            });
          }}
        >
          <canvas
            ref={edge}
            className={styles.edge}
            width={EDGE_COLUMNS}
            height={planeHeight(BOUNDS, EDGE_COLUMNS)}
          />
          <canvas ref={plane} className={styles.overlay} />
        </button>
        {adding && (
          <div className={common.options} data-orbit-named>
            {NAMED_C.map(({ name, c: named }) => (
              <button type="button" key={name} onClick={() => glideTo(named)}>
                {name}
              </button>
            ))}
          </div>
        )}
        {adding && (
          <label className={styles.mode} htmlFor={`${id}-edge`}>
            <ToggleSwitch
              id={`${id}-edge`}
              checked={showEdge}
              labelledBy={`${id}-edge-label`}
              onChange={setShowEdge}
            />
            <span id={`${id}-edge-label`}>Show the edge</span>
          </label>
        )}
        <p className={styles.fate} data-orbit-outcome>
          <span className={styles.swatch} style={{ background: escapes ? ESCAPES : STAYS }} />
          {escapes ? `Escapes on jump ${crossing}` : `Stays for all ${ORBIT_JUMPS} jumps`}
        </p>
        <p data-orbit-start>Start = {coordinates(start)}</p>
        {adding && <p data-orbit-c>c = {coordinates(c)}</p>}
        {adding && showEdge && (
          <p data-orbit-edge={onePiece ? "piece" : "dust"}>
            {onePiece ? "Edge in one piece" : "Edge is dust"}
          </p>
        )}
        <DistanceChart route={route} mark={adding ? null : 1} />
      </div>
    </LessonFrame>
  );
}
