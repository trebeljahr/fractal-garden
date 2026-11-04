import { type PointerEvent, type ReactNode, useEffect, useRef } from "react";
import { flushSync } from "react-dom";
import styles from "../../styles/lessons/PaintPlane.module.css";
import { usePointPicker } from "../../utils/hooks/usePointPicker";
import type { PlaneBounds } from "../../utils/lessons/paintPlane";
import type { ComplexPoint, OrbitStep } from "../../utils/orbitLesson";
import { isOutside } from "../../utils/orbitLesson";

const INK = "#10151a";
const LINE = "#eee8ce";
const MARK = LINE;
const ROUTE = "#f5c56d";
const RING = LINE;
const ESCAPE_CIRCLE = 2;
// A route that stays shows this many jumps, so a repeat is still readable.
const CHART_JUMPS = 60;
// A route that leaves fills the chart, without stretching two jumps across all of it.
const CHART_FEWEST_JUMPS = 12;
const CHART_TOP = 3;

function number(value: number, digits = 2) {
  return String(Number(value.toFixed(digits)) + 0).replace("-", "−");
}
export function coordinates(point: ComplexPoint, digits = 2) {
  return `(${number(point.real, digits)}, ${number(point.imaginary, digits)})`;
}
export function planeHeight(bounds: PlaneBounds, width: number) {
  const [left, right, bottom, top] = bounds;
  return Math.round((width * (top - bottom)) / (right - left));
}

function aspect([left, right, bottom, top]: PlaneBounds) {
  return `${right - left} / ${top - bottom}`;
}

function fitToDisplay(canvas: HTMLCanvasElement) {
  const scale = window.devicePixelRatio || 1;
  const width = Math.round(canvas.clientWidth * scale);
  const height = Math.round(canvas.clientHeight * scale);
  if (canvas.width !== width) canvas.width = width;
  if (canvas.height !== height) canvas.height = height;
  return { width, height, scale };
}

function drawPlane(
  canvas: HTMLCanvasElement,
  bounds: PlaneBounds,
  route: OrbitStep[],
  ring: ComplexPoint,
) {
  const context = canvas.getContext("2d");
  if (!context) return;
  const { width, height, scale } = fitToDisplay(canvas);
  const [left, right, bottom, top] = bounds;
  const px = (x: number) => ((x - left) / (right - left)) * width;
  const py = (y: number) => ((top - y) / (top - bottom)) * height;
  context.clearRect(0, 0, width, height);
  context.font = `${11 * scale}px Montserrat, sans-serif`;
  context.lineWidth = scale;
  for (let x = Math.ceil(left); x <= right; x++) {
    context.strokeStyle = x === 0 ? `${MARK}cc` : `${MARK}44`;
    context.beginPath();
    context.moveTo(px(x), 0);
    context.lineTo(px(x), height);
    context.stroke();
    if (x !== 0) {
      context.fillStyle = MARK;
      context.fillText(number(x, 0), px(x) + 4 * scale, py(0) + 14 * scale);
    }
  }
  for (let y = Math.ceil(bottom); y <= top; y++) {
    context.strokeStyle = y === 0 ? `${MARK}cc` : `${MARK}44`;
    context.beginPath();
    context.moveTo(0, py(y));
    context.lineTo(width, py(y));
    context.stroke();
    if (y !== 0) {
      context.fillStyle = MARK;
      context.fillText(number(y, 0), px(0) + 4 * scale, py(y) + 14 * scale);
    }
  }
  context.strokeStyle = LINE;
  context.lineWidth = 1.5 * scale;
  context.setLineDash([6 * scale, 5 * scale]);
  context.beginPath();
  context.arc(px(0), py(0), (ESCAPE_CIRCLE / (right - left)) * width, 0, Math.PI * 2);
  context.stroke();
  context.setLineDash([]);
  // The dots are the route. The line only says which dot comes next.
  context.lineJoin = "round";
  context.strokeStyle = `${ROUTE}aa`;
  context.lineWidth = 2 * scale;
  context.beginPath();
  route.forEach(({ point }, index) => {
    if (index === 0) context.moveTo(px(point.real), py(point.imaginary));
    else context.lineTo(px(point.real), py(point.imaginary));
  });
  context.stroke();
  context.fillStyle = ROUTE;
  context.beginPath();
  for (const { point } of route) {
    context.moveTo(px(point.real) + 3 * scale, py(point.imaginary));
    context.arc(px(point.real), py(point.imaginary), 3 * scale, 0, Math.PI * 2);
  }
  context.fill();
  const x = px(ring.real);
  const y = py(ring.imaginary);
  context.lineWidth = 5 * scale;
  context.strokeStyle = INK;
  context.beginPath();
  context.arc(x, y, 7 * scale, 0, Math.PI * 2);
  context.stroke();
  context.lineWidth = 2.5 * scale;
  context.strokeStyle = RING;
  context.stroke();
}

/** One line per route: how far the point is from zero after each jump. */
export function DistanceChart({
  route,
  shown,
  mark = ESCAPE_CIRCLE,
}: {
  route: OrbitStep[];
  shown?: number;
  /** The distance to mark with a dashed line, or null for none. */
  mark?: number | null;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    const draw = () => {
      const context = element.getContext("2d");
      if (!context) return;
      const { width, height, scale } = fitToDisplay(element);
      const gutter = 16 * scale;
      const crossed = isOutside(route[route.length - 1].point);
      const span = crossed ? Math.max(CHART_FEWEST_JUMPS, route.length - 1) : CHART_JUMPS;
      const px = (jump: number) => gutter + (jump / span) * (width - gutter);
      const py = (distance: number) =>
        height - 2 * scale - (Math.min(CHART_TOP, distance) / CHART_TOP) * (height - 8 * scale);
      context.clearRect(0, 0, width, height);
      context.font = `${11 * scale}px Montserrat, sans-serif`;
      context.fillStyle = `${LINE}aa`;
      context.textBaseline = "middle";
      context.fillText("0", 2 * scale, py(0) - 4 * scale);
      if (mark !== null) {
        context.fillText(String(mark), 2 * scale, py(mark));
        context.strokeStyle = `${LINE}aa`;
        context.lineWidth = scale;
        context.setLineDash([6 * scale, 5 * scale]);
        context.beginPath();
        context.moveTo(gutter, py(mark));
        context.lineTo(width, py(mark));
        context.stroke();
        context.setLineDash([]);
      }
      const last = Math.min(shown ?? route.length, route.length, span + 1);
      context.strokeStyle = LINE;
      context.lineWidth = 2 * scale;
      context.lineJoin = "round";
      context.beginPath();
      for (let index = 0; index < last; index++) {
        const { real, imaginary } = route[index].point;
        const y = py(Math.hypot(real, imaginary));
        if (index === 0) context.moveTo(px(index), y);
        else context.lineTo(px(index), y);
      }
      context.stroke();
    };
    draw();
    const resized = new ResizeObserver(draw);
    resized.observe(element);
    return () => resized.disconnect();
  }, [route, shown, mark]);
  return (
    <figure className={styles.chart}>
      <figcaption>Distance from zero at each jump</figcaption>
      <canvas
        ref={canvas}
        role="img"
        aria-label={`Distance from zero over ${route.length - 1} jumps.`}
      />
    </figure>
  );
}

/** A button over a plane that follows the pointer, a sideways slide or the arrow keys. */
function PlanePicker({
  bounds,
  value,
  onMove,
  label,
  children,
}: {
  bounds: PlaneBounds;
  value: ComplexPoint;
  onMove: (point: ComplexPoint) => void;
  label: string;
  children: ReactNode;
}) {
  const [left, right, bottom, top] = bounds;
  const pointAt = (event: PointerEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      real: Math.max(
        left,
        Math.min(right, left + ((event.clientX - rect.left) / rect.width) * (right - left)),
      ),
      imaginary: Math.max(
        bottom,
        Math.min(top, top - ((event.clientY - rect.top) / rect.height) * (top - bottom)),
      ),
    };
  };
  // React would otherwise commit after this frame paints, one frame behind the pointer.
  const move = (point: ComplexPoint) => flushSync(() => onMove(point));
  const picker = usePointPicker({
    under: pointAt,
    onChange: move,
    onHover: (point) => {
      if (point) move(point);
    },
  });
  return (
    <button
      type="button"
      className={styles.plane}
      aria-label={`${label} ${coordinates(value)}. Move the pointer or use the arrow keys.`}
      data-paint-plane
      {...picker}
      onPointerDownCapture={(event) => {
        event.currentTarget.focus({ preventScroll: true });
      }}
      onKeyDown={(event) => {
        if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
        event.preventDefault();
        const delta = event.shiftKey ? 0.1 : 0.01;
        move({
          real: Math.max(
            left,
            Math.min(
              right,
              value.real +
                (event.key === "ArrowLeft" ? -delta : event.key === "ArrowRight" ? delta : 0),
            ),
          ),
          imaginary: Math.max(
            bottom,
            Math.min(
              top,
              value.imaginary +
                (event.key === "ArrowUp" ? delta : event.key === "ArrowDown" ? -delta : 0),
            ),
          ),
        });
      }}
    >
      {children}
    </button>
  );
}

/** A plain plane with the route of the number under the pointer. */
export function OrbitPlane({
  bounds,
  value,
  onChange,
  route,
  label,
}: {
  bounds: PlaneBounds;
  value: ComplexPoint;
  onChange: (point: ComplexPoint) => void;
  route: OrbitStep[];
  label: string;
}) {
  const overlay = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = overlay.current;
    if (!canvas) return;
    const draw = () => drawPlane(canvas, bounds, route, value);
    draw();
    const resized = new ResizeObserver(draw);
    resized.observe(canvas);
    return () => resized.disconnect();
  }, [bounds, route, value]);
  return (
    <PlanePicker bounds={bounds} value={value} onMove={onChange} label={label}>
      <div className={styles.paper} style={{ aspectRatio: aspect(bounds) }} />
      <canvas ref={overlay} className={styles.overlay} />
    </PlanePicker>
  );
}
