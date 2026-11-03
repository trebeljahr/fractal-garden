import { type PointerEvent, useEffect, useMemo, useRef, useState } from "react";
import styles from "../../styles/lessons/ApollonianCurvatures.module.css";
import common from "../../styles/lessons/Lesson.module.css";
import { usePointPicker, useTriedPoint } from "../../utils/hooks/usePointPicker";
import {
  centerOf,
  type Disc,
  fillEveryGap,
  fillGap,
  formatCurvature,
  formatRadius,
  gapOutline,
  locate,
  openGaps,
  type Packing,
  radiusOf,
  readSpot,
  type Spot,
  type Start,
  startPacking,
  subtracted,
  touchPoint,
} from "../../utils/lessons/apollonianCurvatures";
import { LessonFrame } from "./LessonFrame";

// The explorer's colors.
const BACKGROUND = "#252424";
const INK = "#efdfb6";
const AROUND = "#f5c56d";
const KNOWN = "#7fc4f5";
const RESULT = "#ffffff";
// The outer circle's radius as a share of half the stage. Its number sits in the corner.
const RING = 0.95;
const SMALLEST_LABEL = 9;
const LARGEST_LABEL = 30;
const OUTER_LABEL = 22;
const FINE_LINE_BELOW = 3;

// Writes a circle's number on it where it fits. The outer circle's goes in the corner outside it.
function writeLabel(context: CanvasRenderingContext2D, disc: Disc, size: number, color: string) {
  const half = size / 2;
  const scale = half * RING;
  const text = formatCurvature(disc.curvature);
  const radius = radiusOf(disc) * scale;
  const center = centerOf(disc);
  const outer = disc.curvature < 0;
  const font = outer
    ? OUTER_LABEL
    : Math.min(LARGEST_LABEL, radius * 1.05, (1.6 * radius) / (0.62 * text.length));
  if (font < SMALLEST_LABEL) return;
  const corner = half - (scale + OUTER_LABEL * 0.9) * Math.SQRT1_2;
  context.font = `600 ${font}px Montserrat, sans-serif`;
  context.fillStyle = color;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(
    text,
    outer ? corner : half + center.x * scale,
    outer ? corner : half - center.y * scale,
  );
}

function Rule({ around, known, result }: { around: string; known: number; result: number }) {
  return (
    <p>
      2 × (<span className={styles.around}>{around}</span>) −{" "}
      <span className={styles.known}>{subtracted(known)}</span> ={" "}
      <span className={styles.result}>{formatCurvature(result)}</span>
    </p>
  );
}

function Stage({ start }: { start: Start }) {
  const [packing, setPacking] = useState<Packing>(() => startPacking(start));
  const spot = useTriedPoint<Spot | null>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState(0);
  const picked = useRef<Spot | null>(null);

  const under = (event: PointerEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const half = rect.width / 2;
    return locate(
      packing,
      (event.clientX - rect.left - half) / (half * RING),
      (rect.top + half - event.clientY) / (half * RING),
    );
  };
  const act = (hit: Spot | null) => {
    if (!hit) return;
    if (hit.circle !== null) {
      spot.keep(hit);
      return;
    }
    const next = fillGap(packing, hit.gap);
    setPacking(next);
    spot.keep({ gap: hit.gap, circle: next.circles.length - 1 });
  };
  // A press only tries a spot out. Lifting the finger or mouse button acts on it.
  const picker = usePointPicker<Spot | null>({
    under,
    onChange: (hit) => {
      picked.current = hit;
      spot.tryOut(hit);
    },
    onHover: spot.tryOut,
    onRelease: () => act(picked.current),
  });

  const stage = picker.ref;
  useEffect(() => {
    const element = stage.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setSize(entry.contentRect.width));
    observer.observe(element);
    return () => observer.disconnect();
  }, [stage]);

  const [fontsReady, setFontsReady] = useState(false);
  useEffect(() => {
    document.fonts.ready.then(() => setFontsReady(true));
  }, []);

  const reading = spot.value ? readSpot(packing, spot.value) : null;
  const outline = spot.value?.circle === null ? gapOutline(packing, spot.value.gap) : null;

  // Thousands of circles sit under the pointer, so they are drawn once per change and copied.
  const base = useMemo(() => {
    if (!size) return null;
    const ratio = window.devicePixelRatio || 1;
    const layer = document.createElement("canvas");
    layer.width = Math.round(size * ratio);
    layer.height = layer.width;
    const context = layer.getContext("2d");
    if (!context) return null;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    const half = size / 2;
    const scale = half * RING;
    const heavy = new Path2D();
    const fine = new Path2D();
    for (const disc of packing.circles) {
      const center = centerOf(disc);
      const radius = radiusOf(disc) * scale;
      const x = half + center.x * scale;
      const y = half - center.y * scale;
      const path = radius < FINE_LINE_BELOW ? fine : heavy;
      path.moveTo(x + radius, y);
      path.arc(x, y, radius, 0, Math.PI * 2);
    }
    context.fillStyle = BACKGROUND;
    context.fillRect(0, 0, size, size);
    context.strokeStyle = INK;
    context.lineWidth = 1;
    context.stroke(heavy);
    context.lineWidth = 0.5;
    context.stroke(fine);
    if (fontsReady) for (const disc of packing.circles) writeLabel(context, disc, size, INK);
    return layer;
  }, [packing, size, fontsReady]);

  useEffect(() => {
    const element = canvas.current;
    const context = element?.getContext("2d");
    if (!element || !context || !base) return;
    if (element.width !== base.width) {
      element.width = base.width;
      element.height = base.height;
    }
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.drawImage(base, 0, 0);
    if (!reading) return;

    const ratio = base.width / size;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    const half = size / 2;
    const scale = half * RING;
    const px = (x: number) => half + x * scale;
    const py = (y: number) => half - y * scale;
    if (outline) {
      context.beginPath();
      outline.forEach(({ x, y }, index) => {
        if (index) context.lineTo(px(x), py(y));
        else context.moveTo(px(x), py(y));
      });
      context.closePath();
      context.fillStyle = INK;
      context.globalAlpha = 0.14;
      context.fill();
      context.globalAlpha = 1;
    }
    const lit = [
      ...reading.around.map((disc) => [disc, AROUND] as const),
      [reading.other, KNOWN] as const,
      [reading.result, RESULT] as const,
    ];
    for (const [disc, color] of lit) {
      const center = centerOf(disc);
      const radius = radiusOf(disc) * scale;
      context.beginPath();
      context.arc(px(center.x), py(center.y), radius, 0, Math.PI * 2);
      if (disc.curvature > 0) {
        context.fillStyle = color;
        context.globalAlpha = 0.16;
        context.fill();
        context.globalAlpha = 1;
      }
      context.setLineDash(disc === reading.ghost && radius >= 2 * FINE_LINE_BELOW ? [5, 4] : []);
      context.strokeStyle = color;
      context.lineWidth = 2;
      context.stroke();
      context.setLineDash([]);
    }
    // Both circles touch the same three.
    for (const [disc, color] of lit.slice(3)) {
      const dot = Math.max(1.5, Math.min(3, 0.16 * radiusOf(disc) * scale));
      for (const neighbor of reading.around) {
        const { x, y } = touchPoint(disc, neighbor);
        context.beginPath();
        context.arc(px(x), py(y), dot, 0, Math.PI * 2);
        context.fillStyle = color;
        context.fill();
        context.lineWidth = 1;
        context.strokeStyle = BACKGROUND;
        context.stroke();
      }
    }
    if (fontsReady) for (const [disc, color] of lit) writeLabel(context, disc, size, color);
  }, [base, reading, outline, size, fontsReady]);

  const largest = packing.circles.reduce((top, disc) => Math.max(top, disc.curvature), 0);
  const around = reading?.around.map((disc) => formatCurvature(disc.curvature)).join(" + ") ?? "";
  const open = openGaps(packing);
  const pointedAt = reading
    ? `${formatCurvature(reading.result.curvature)} and ${formatCurvature(reading.other.curvature)} both touch ${around.replaceAll(" + ", ", ")}.`
    : "";
  return (
    <div className={styles.layout}>
      <button
        type="button"
        className={styles.stage}
        aria-label={`${packing.circles.length} circles. ${pointedAt} Point at or tap a gap to add its circle, or use the left and right arrow keys to choose one and Enter to add it.`}
        {...picker}
        onKeyDown={(event) => {
          const move = { ArrowLeft: -1, ArrowRight: 1 }[event.key];
          if (move && open.length) {
            event.preventDefault();
            const at = spot.value?.circle === null ? open.indexOf(spot.value.gap) : -1;
            const next = at < 0 ? (move > 0 ? 0 : open.length - 1) : at + move;
            spot.keep({ gap: open[(next + open.length) % open.length], circle: null });
          } else if ((event.key === "Enter" || event.key === " ") && spot.value?.circle === null) {
            event.preventDefault();
            act(spot.value);
          }
        }}
      >
        <canvas ref={canvas} />
      </button>
      <div>
        <div className={styles.rule} data-apollonian-rule>
          {reading ? (
            <>
              <Rule
                around={around}
                known={reading.other.curvature}
                result={reading.result.curvature}
              />
              <Rule
                around={around}
                known={reading.result.curvature}
                result={reading.other.curvature}
              />
              <p>Radius {formatRadius(reading.result)}</p>
            </>
          ) : (
            <p>Choose a gap.</p>
          )}
        </div>
        <p className={styles.count} data-apollonian-count>
          {packing.circles.length} circles. Largest curvature {formatCurvature(largest)}.
        </p>
        <div className={styles.actions}>
          <button
            type="button"
            disabled={!open.length}
            onClick={() => {
              setPacking(fillEveryGap(packing));
              spot.keep(null);
            }}
          >
            Fill every gap
          </button>
          <button
            type="button"
            disabled={packing.circles.length === 4}
            onClick={() => {
              setPacking(startPacking(start));
              spot.keep(null);
            }}
          >
            Start over
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ApollonianCurvaturesLesson() {
  const [start, setStart] = useState<Start>("whole");
  return (
    <LessonFrame title="Fill the gaps" kind="apollonian-curvatures">
      <fieldset className={common.options} aria-label="First four circles">
        <button type="button" aria-pressed={start === "whole"} onClick={() => setStart("whole")}>
          −1, 2, 2, 3
        </button>
        <button type="button" aria-pressed={start === "equal"} onClick={() => setStart("equal")}>
          Three equal circles
        </button>
      </fieldset>
      <Stage key={start} start={start} />
    </LessonFrame>
  );
}
