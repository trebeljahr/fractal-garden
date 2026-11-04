import { type PointerEvent, type ReactNode, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import styles from "../../styles/lessons/PaintPlane.module.css";
import { MANDELBROT_COLORING } from "../../utils/escapeTimeColoring";
import { usePointPicker } from "../../utils/hooks/usePointPicker";
import { useReducedMotion } from "../../utils/hooks/useReducedMotion";
import {
  createGrid,
  ESCAPED_COLOR,
  type PaintGrid,
  type PlaneBounds,
  paintDab,
  paintRow,
  paintStroke,
  STAYED,
  STAYED_COLOR,
  UNTESTED,
} from "../../utils/lessons/paintPlane";
import { escapeStepColor } from "../../utils/lessons/stepLimit";
import type { ComplexPoint, OrbitStep } from "../../utils/orbitLesson";
import { isOutside } from "../../utils/orbitLesson";

const INK = "#10151a";
const MARK = "#6d7276";
const PAPER_HALO = "#eee8ce55";
const ROUTE = "#c8421c";
const RING = "#f5c56d";
const LINE = "#eee8ce";
const COLUMNS = 900;
const BRUSH_SHARE = 0.018;
const FILL_MS = 1800;
const ESCAPE_CIRCLE = 2;
// Past these the route's dots and halo would only darken a solid line.
const MOST_DOTS = 150;
const MOST_HALO_JUMPS = 2000;
// A route that stays shows this many jumps, so a repeat is still readable.
const CHART_JUMPS = 60;
// A route that leaves fills the chart, without stretching two jumps across all of it.
const CHART_FEWEST_JUMPS = 12;
const CHART_TOP = 3;

export function markColor(step: number, stepColors: boolean) {
  if (step === STAYED) return STAYED_COLOR;
  return stepColors ? escapeStepColor(step, MANDELBROT_COLORING) : ESCAPED_COLOR;
}
export function cssColor([red, green, blue]: number[]) {
  return `rgb(${red}, ${green}, ${blue})`;
}
export function number(value: number, digits = 2) {
  return String(Number(value.toFixed(digits)) + 0).replace("-", "−");
}
export function coordinates(point: ComplexPoint, digits = 2) {
  return `(${number(point.real, digits)}, ${number(point.imaginary, digits)})`;
}
export function planeHeight(bounds: PlaneBounds, width: number) {
  const [left, right, bottom, top] = bounds;
  return Math.round((width * (top - bottom)) / (right - left));
}

function fitToDisplay(canvas: HTMLCanvasElement) {
  const scale = window.devicePixelRatio || 1;
  const width = Math.round(canvas.clientWidth * scale);
  const height = Math.round(canvas.clientHeight * scale);
  if (canvas.width !== width) canvas.width = width;
  if (canvas.height !== height) canvas.height = height;
  return { width, height, scale };
}

export function drawPlane(
  canvas: HTMLCanvasElement,
  bounds: PlaneBounds,
  options: {
    route?: OrbitStep[];
    shown?: number;
    ring?: ComplexPoint;
    circle?: boolean;
  },
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
  if (options.circle) {
    context.strokeStyle = INK;
    context.setLineDash([6 * scale, 5 * scale]);
    context.beginPath();
    context.arc(px(0), py(0), (ESCAPE_CIRCLE / (right - left)) * width, 0, Math.PI * 2);
    context.stroke();
    context.setLineDash([]);
  }
  const route = options.route;
  if (route) {
    const shown = Math.min(options.shown ?? route.length, route.length);
    const trace = () => {
      context.beginPath();
      let lastX = Number.NaN;
      let lastY = Number.NaN;
      for (let index = 0; index < shown; index++) {
        const { real, imaginary } = route[index].point;
        const x = px(real);
        const y = py(imaginary);
        // A long route lands on the same pixel thousands of times.
        if (Math.abs(x - lastX) < 1 && Math.abs(y - lastY) < 1) continue;
        if (index === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
        lastX = x;
        lastY = y;
      }
      context.stroke();
    };
    context.lineJoin = "round";
    if (shown <= MOST_HALO_JUMPS) {
      context.strokeStyle = PAPER_HALO;
      context.lineWidth = 3 * scale;
      trace();
    }
    context.strokeStyle = ROUTE;
    context.lineWidth = 1.5 * scale;
    trace();
    if (shown <= MOST_DOTS) {
      context.fillStyle = ROUTE;
      context.beginPath();
      for (let index = 0; index < shown; index++) {
        const { real, imaginary } = route[index].point;
        context.moveTo(px(real) + 2.5 * scale, py(imaginary));
        context.arc(px(real), py(imaginary), 2.5 * scale, 0, Math.PI * 2);
      }
      context.fill();
    }
  }
  if (options.ring) {
    const x = px(options.ring.real);
    const y = py(options.ring.imaginary);
    context.lineWidth = 5 * scale;
    context.strokeStyle = INK;
    context.beginPath();
    context.arc(x, y, 7 * scale, 0, Math.PI * 2);
    context.stroke();
    context.lineWidth = 2.5 * scale;
    context.strokeStyle = RING;
    context.stroke();
  }
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
      context.lineWidth = 1.5 * scale;
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

/**
 * A blank plane where each pixel is a number c. Every spot under the pointer gets its own
 * test, so the edge of the Mandelbrot set shows up inside the mark as the pointer crosses it.
 */
export function PaintPlane({
  bounds,
  value,
  onChange,
  route,
  circle = false,
  stepColors = false,
  label,
  children,
}: {
  bounds: PlaneBounds;
  value: ComplexPoint;
  onChange: (point: ComplexPoint) => void;
  route?: OrbitStep[];
  circle?: boolean;
  stepColors?: boolean;
  label: string;
  children?: ReactNode;
}) {
  const [left, right, bottom, top] = bounds;
  const paper = useRef<HTMLCanvasElement>(null);
  const overlay = useRef<HTMLCanvasElement>(null);
  const grid = useRef<PaintGrid | null>(null);
  const image = useRef<ImageData | null>(null);
  const last = useRef<ComplexPoint | null>(null);
  const sweep = useRef(0);
  const colors = useRef(stepColors);
  colors.current = stepColors;
  const [filling, setFilling] = useState<"blank" | "sweeping" | "full">("blank");
  const reduced = useReducedMotion();
  const brush = BRUSH_SHARE * (right - left);

  const show = (cells: number[]) => {
    const canvas = paper.current;
    const context = canvas?.getContext("2d");
    if (!grid.current || !image.current || !context || !cells.length) return;
    const { columns, steps } = grid.current;
    const { data } = image.current;
    let firstRow = Number.POSITIVE_INFINITY;
    let lastRow = 0;
    for (const cell of cells) {
      const color = markColor(steps[cell], colors.current);
      data[cell * 4] = color[0];
      data[cell * 4 + 1] = color[1];
      data[cell * 4 + 2] = color[2];
      data[cell * 4 + 3] = 255;
      const row = Math.floor(cell / columns);
      if (row < firstRow) firstRow = row;
      if (row > lastRow) lastRow = row;
    }
    context.putImageData(image.current, 0, 0, 0, firstRow, columns, lastRow - firstRow + 1);
  };
  const testedCells = () => {
    const cells: number[] = [];
    grid.current?.steps.forEach((step, cell) => {
      if (step !== UNTESTED) cells.push(cell);
    });
    return cells;
  };
  const start = () => {
    const context = paper.current?.getContext("2d");
    if (!context) return;
    grid.current = createGrid(bounds, COLUMNS);
    image.current = context.createImageData(COLUMNS, grid.current.rows);
    context.clearRect(0, 0, COLUMNS, grid.current.rows);
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: the plane is built once for its props
  useEffect(() => {
    start();
    return () => cancelAnimationFrame(sweep.current);
  }, []);
  // A value from outside the pointer, such as a preset, marks only its own spot.
  // biome-ignore lint/correctness/useExhaustiveDependencies: painting follows the value only
  useEffect(() => {
    if (last.current === value || !grid.current) return;
    show(paintDab(grid.current, value, brush));
  }, [value]);
  // biome-ignore lint/correctness/useExhaustiveDependencies: colors are read from a ref
  useEffect(() => {
    show(testedCells());
  }, [stepColors]);
  useEffect(() => {
    const canvas = overlay.current;
    if (!canvas) return;
    const draw = () => drawPlane(canvas, bounds, { route, ring: value, circle });
    draw();
    const resized = new ResizeObserver(draw);
    resized.observe(canvas);
    return () => resized.disconnect();
  }, [bounds, route, value, circle]);

  const fill = () => {
    if (!grid.current) return;
    const { rows } = grid.current;
    const finished = () => setFilling("full");
    if (reduced) {
      const cells: number[] = [];
      for (let row = 0; row < rows; row++) {
        for (const cell of paintRow(grid.current, row)) cells.push(cell);
      }
      show(cells);
      finished();
      return;
    }
    setFilling("sweeping");
    const begun = performance.now();
    let row = 0;
    sweep.current = requestAnimationFrame(function tick(now) {
      const target = Math.min(rows, Math.ceil(((now - begun) / FILL_MS) * rows));
      const cells: number[] = [];
      while (grid.current && row < target) {
        for (const cell of paintRow(grid.current, row)) cells.push(cell);
        row++;
      }
      show(cells);
      if (row < rows) sweep.current = requestAnimationFrame(tick);
      else finished();
    });
  };
  const clear = () => {
    cancelAnimationFrame(sweep.current);
    start();
    setFilling("blank");
    last.current = null;
    if (grid.current) show(paintDab(grid.current, value, brush));
  };

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
  const moveTo = (point: ComplexPoint) => {
    if (grid.current) show(paintStroke(grid.current, last.current ?? point, point, brush));
    last.current = point;
    // React would otherwise commit after this frame paints, one frame behind the pointer.
    flushSync(() => onChange(point));
  };
  const picker = usePointPicker({
    under: pointAt,
    onChange: moveTo,
    onHover: (point) => {
      if (point) moveTo(point);
      else last.current = null;
    },
  });

  return (
    <div className={styles.wrap}>
      <button
        type="button"
        className={styles.plane}
        aria-label={`${label} ${coordinates(value)}. Move the pointer or use the arrow keys.`}
        data-paint-plane
        {...picker}
        onPointerDownCapture={(event) => {
          event.currentTarget.focus({ preventScroll: true });
          // A finger lands somewhere new, so its stroke must not join the last one.
          if (event.pointerType !== "mouse") last.current = null;
        }}
        onKeyDown={(event) => {
          if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
          event.preventDefault();
          const delta = event.shiftKey ? 0.1 : 0.01;
          last.current = value;
          moveTo({
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
        <canvas
          ref={paper}
          className={styles.paper}
          width={COLUMNS}
          height={planeHeight(bounds, COLUMNS)}
        />
        <canvas ref={overlay} className={styles.overlay} />
      </button>
      <div className={styles.actions}>
        <button type="button" disabled={filling !== "blank"} onClick={fill}>
          Fill the rest
        </button>
        <button type="button" onClick={clear}>
          Clear
        </button>
        {children}
      </div>
    </div>
  );
}
