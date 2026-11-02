import { useEffect, useMemo, useRef, useState } from "react";
import styles from "../../styles/lessons/JuliaAttractor.module.css";
import { JULIA_PRESETS } from "../../utils/escapeTimePlaces";
import { useLessonPlayback } from "../../utils/hooks/useLessonPlayback";
import { useReducedMotion } from "../../utils/hooks/useReducedMotion";
import {
  ATTRACTOR_BOUNDS,
  ATTRACTOR_COLORS,
  ATTRACTOR_JUMPS,
  attractingLoop,
  attractorDots,
  BULB_LOOPS,
  dotsAfter,
  ESCAPES,
  fateGrid,
  pickBulb,
  tallyDots,
} from "../../utils/lessons/juliaAttractor";
import { type ComplexPoint, jumpControl, jumpPoint } from "../../utils/orbitLesson";
import { LessonFrame, LessonStepControls } from "./LessonFrame";
import { LinkedMap, parameterPixel } from "./LinkedJuliaLesson";

const RABBIT = { real: JULIA_PRESETS.Rabbit.cReal, imaginary: JULIA_PRESETS.Rabbit.cImag };
const ZERO = { real: 0, imaginary: 0 };
const BACKGROUND = "#10151a";
const INK = "#eee8ce";
const ESCAPING_DOT = "#8a95a1";
const ESCAPING_FILL = "#39424c";
const ORBIT = "#f5c56d";
const [LEFT, RIGHT, BOTTOM, TOP] = ATTRACTOR_BOUNDS;
const ASPECT = (TOP - BOTTOM) / (RIGHT - LEFT);
// A quick picture follows the drag. The sharp one waits until the ring rests.
const QUICK_COLUMNS = 150;
const SHARPEST_COLUMNS = 640;
const SHARPEN_AFTER_MS = 120;
// Labels, the written loop, arrows and lines stop being readable past these many places.
const MOST_LABELS = 5;
const MOST_WRITTEN = 6;
const MOST_ARROWS = 8;
const MOST_LINES = 32;
// The first jumps move the most, so they play slowly enough to follow. Once the dots
// have joined the loop, it plays slowly enough to follow them around it.
const hopMs = (step: number) => (step <= 6 ? 620 : step <= ATTRACTOR_JUMPS ? 150 : 520);
const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function number(value: number, digits: number) {
  return String(Number(value.toFixed(digits)) + 0).replace("-", "−");
}
function coordinates(point: ComplexPoint, digits = 5) {
  return `(${number(point.real, digits)}, ${number(point.imaginary, digits)})`;
}
function orbitText(loop: ComplexPoint[] | null) {
  if (!loop) return "No attractor found";
  if (loop.length === 1) return `Fixed point: ${coordinates(loop[0])}`;
  if (loop.length > MOST_WRITTEN) return `Loop of ${loop.length} places`;
  return `Loop: ${[...loop, loop[0]].map((place) => coordinates(place)).join(" → ")} → …`;
}
// More colors than the palette holds would need repeats, so a long loop shares one color.
function fateColor(fate: number, places: number) {
  if (fate === ESCAPES) return ESCAPING_DOT;
  return fate < 0 || places > ATTRACTOR_COLORS.length ? INK : ATTRACTOR_COLORS[fate];
}

function paintStarts(
  canvas: HTMLCanvasElement,
  c: ComplexPoint,
  loop: ComplexPoint[] | null,
  columns: number,
) {
  const context = canvas.getContext("2d");
  if (!context) return;
  const rows = Math.round(columns * ASPECT);
  const fates = fateGrid(c, loop, columns, rows);
  canvas.width = columns;
  canvas.height = rows;
  const image = context.createImageData(columns, rows);
  const places = loop?.length ?? 0;
  const channels = (hex: string) =>
    [1, 3, 5].map((at) => Number.parseInt(hex.slice(at, at + 2), 16));
  const lookup = new Map<number, number[]>();
  for (let pixel = 0; pixel < fates.length; pixel++) {
    const fate = fates[pixel];
    let color = lookup.get(fate);
    if (!color) {
      color = channels(fate === ESCAPES ? ESCAPING_FILL : fateColor(fate, places));
      lookup.set(fate, color);
    }
    image.data.set(color, pixel * 4);
    image.data[pixel * 4 + 3] = 255;
  }
  context.putImageData(image, 0, 0);
}

type Frame = {
  loop: ComplexPoint[] | null;
  colors: Int16Array;
  step: number;
  positions: Float64Array;
  previous: Float64Array;
  landedOn: Int16Array;
  landedBefore: Int16Array;
  onPlace: number[];
  moving: number;
};

function paintDots(canvas: HTMLCanvasElement, frame: Frame, t: number) {
  const context = canvas.getContext("2d");
  if (!context) return;
  const { loop, colors, step, positions, previous, onPlace } = frame;
  const scale = window.devicePixelRatio || 1;
  const width = Math.round(canvas.clientWidth * scale);
  const height = Math.round(canvas.clientHeight * scale);
  if (canvas.width !== width) canvas.width = width;
  if (canvas.height !== height) canvas.height = height;
  const px = (x: number) => ((x - LEFT) / (RIGHT - LEFT)) * width;
  const py = (y: number) => ((TOP - y) / (TOP - BOTTOM)) * height;

  context.fillStyle = BACKGROUND;
  context.fillRect(0, 0, width, height);
  context.font = `${11 * scale}px Montserrat, sans-serif`;
  context.lineWidth = scale;
  for (const unit of [-1, 0, 1]) {
    context.strokeStyle = unit === 0 ? `${INK}55` : `${INK}22`;
    context.beginPath();
    context.moveTo(px(unit), 0);
    context.lineTo(px(unit), height);
    context.moveTo(0, py(unit));
    context.lineTo(width, py(unit));
    context.stroke();
    if (unit !== 0) {
      context.fillStyle = `${INK}80`;
      context.fillText(number(unit, 0), px(unit) + 4 * scale, py(0) + 14 * scale);
      context.fillText(number(unit, 0), px(0) + 4 * scale, py(unit) + 14 * scale);
    }
  }

  const places = loop?.length ?? 0;
  const pixel = (place: ComplexPoint) => ({ x: px(place.real), y: py(place.imaginary) });
  // The loop itself. It firms up as dots join it.
  const joined = onPlace.reduce((sum, count) => sum + count, 0);
  if (loop && joined && places > 1 && places <= MOST_LINES) {
    context.globalAlpha = 0.3 + (0.7 * joined) / (joined + frame.moving);
    context.strokeStyle = ORBIT;
    context.fillStyle = ORBIT;
    context.lineWidth = 1.5 * scale;
    loop.forEach((place, index) => {
      const from = pixel(place);
      const to = pixel(loop[(index + 1) % places]);
      const bend = jumpControl(from, to);
      context.beginPath();
      context.moveTo(from.x, from.y);
      context.quadraticCurveTo(bend.x, bend.y, to.x, to.y);
      context.stroke();
      if (places > MOST_ARROWS) return;
      const tip = jumpPoint(from, bend, to, 0.78);
      const behind = jumpPoint(from, bend, to, 0.74);
      const angle = Math.atan2(tip.y - behind.y, tip.x - behind.x);
      const size = 7 * scale;
      context.beginPath();
      context.moveTo(tip.x + Math.cos(angle) * size, tip.y + Math.sin(angle) * size);
      context.lineTo(tip.x + Math.cos(angle + 2.5) * size, tip.y + Math.sin(angle + 2.5) * size);
      context.lineTo(tip.x + Math.cos(angle - 2.5) * size, tip.y + Math.sin(angle - 2.5) * size);
      context.fill();
    });
    context.globalAlpha = 1;
  }

  // A dot on the loop joins its bunch, which is drawn once and travels along the loop.
  const landed = t < 1 ? frame.landedBefore : frame.landedOn;
  const radius = Math.max(1.3, canvas.clientWidth / 340) * scale;
  const bunches = new Array<number>(places).fill(0);
  for (const fate of Array.from(new Set(colors))) {
    context.fillStyle = fateColor(fate, places);
    context.beginPath();
    for (let dot = 0; dot < colors.length; dot++) {
      if (colors[dot] !== fate) continue;
      if (landed[dot] >= 0) {
        bunches[fate]++;
        continue;
      }
      const x1 = positions[dot * 2];
      const x0 = previous[dot * 2];
      if (Number.isNaN(x1) || Number.isNaN(x0)) continue;
      const x = px(lerp(x0, x1, t));
      const y = py(lerp(previous[dot * 2 + 1], positions[dot * 2 + 1], t));
      context.moveTo(x + radius, y);
      context.arc(x, y, radius, 0, Math.PI * 2);
    }
    context.fill();
  }
  if (!loop) return;
  bunches.forEach((count, color) => {
    if (!count) return;
    const to = pixel(loop[(color + step) % places]);
    const from = pixel(loop[(color + Math.max(0, step - 1)) % places]);
    const at = jumpPoint(from, jumpControl(from, to), to, t);
    context.fillStyle = fateColor(color, places);
    context.beginPath();
    context.arc(at.x, at.y, Math.min(7, 2.5 + 0.14 * Math.sqrt(count)) * scale, 0, Math.PI * 2);
    context.fill();
  });
  if (places > MOST_LABELS) return;
  context.font = `600 ${12 * scale}px Montserrat, sans-serif`;
  context.lineWidth = 3 * scale;
  context.strokeStyle = BACKGROUND;
  context.fillStyle = INK;
  loop.forEach((place, index) => {
    if (!onPlace[index]) return;
    const label = coordinates(place);
    const fits = px(place.real) + context.measureText(label).width + 24 * scale < width;
    context.textAlign = fits ? "left" : "right";
    const x = px(place.real) + (fits ? 12 : -12) * scale;
    const y = py(place.imaginary) - 10 * scale;
    context.strokeText(label, x, y);
    context.fillText(label, x, y);
  });
  context.textAlign = "left";
}

export default function JuliaAttractorLesson() {
  const [c, setC] = useState<ComplexPoint>(RABBIT);
  const [motion, setMotion] = useState({ step: 0, animate: false, furthest: ATTRACTOR_JUMPS });
  const starts = useRef<HTMLCanvasElement>(null);
  const dotsCanvas = useRef<HTMLCanvasElement>(null);
  const lastFrame = useRef<{ dots: Float64Array; step: number; positions: Float64Array } | null>(
    null,
  );
  const reduced = useReducedMotion();
  const { step, animate, furthest } = motion;
  const field = useMemo(() => {
    const loop = attractingLoop(c);
    return { loop, ...attractorDots(c, loop) };
  }, [c]);
  const { loop } = field;
  const goTo = (next: number) =>
    setMotion({
      step: next,
      animate: next === step + 1 && !reduced,
      furthest: Math.max(furthest, next + 1),
    });
  // The orbit never ends, so playing has no last jump. Pausing or scrolling away stops it.
  const playback = useLessonPlayback(step, Number.POSITIVE_INFINITY, goTo, hopMs(step + 1) + 40);
  const frame = useMemo(() => {
    const last = lastFrame.current;
    const before =
      last?.dots === field.starts && last.step === step - 1
        ? last.positions
        : animate
          ? dotsAfter(c, field.starts, step - 1)
          : null;
    const positions = before ? dotsAfter(c, before, 1) : dotsAfter(c, field.starts, step);
    lastFrame.current = { dots: field.starts, step, positions };
    const previous = animate && before ? before : positions;
    const tally = tallyDots(c, positions, loop);
    return {
      ...tally,
      loop,
      colors: field.colors,
      step,
      positions,
      previous,
      landedBefore: animate ? tallyDots(c, previous, loop).landedOn : tally.landedOn,
    };
  }, [c, field, loop, step, animate]);

  useEffect(() => {
    const canvas = starts.current;
    if (!canvas) return;
    paintStarts(canvas, c, loop, QUICK_COLUMNS);
    const timer = window.setTimeout(() => {
      const scale = window.devicePixelRatio || 1;
      paintStarts(canvas, c, loop, Math.min(SHARPEST_COLUMNS, canvas.clientWidth * scale));
    }, SHARPEN_AFTER_MS);
    return () => window.clearTimeout(timer);
  }, [c, loop]);
  useEffect(() => {
    const canvas = dotsCanvas.current;
    if (!canvas) return;
    const begun = performance.now();
    const duration = hopMs(frame.step);
    let raf = requestAnimationFrame(function draw(now) {
      const t = animate ? Math.max(0, Math.min(1, (now - begun) / duration)) : 1;
      paintDots(canvas, frame, ease(t));
      if (t < 1) raf = requestAnimationFrame(draw);
    });
    const resized = new ResizeObserver(() => paintDots(canvas, frame, 1));
    resized.observe(canvas);
    return () => {
      cancelAnimationFrame(raf);
      resized.disconnect();
    };
  }, [frame, animate]);

  const places = loop?.length ?? 0;
  const orbit = orbitText(loop);
  const joinedDots = frame.onPlace.reduce((sum, count) => sum + count, 0);
  return (
    <LessonFrame title="Where each point's orbit goes" kind="julia-attractor">
      <LessonStepControls
        step={step}
        max={Math.max(ATTRACTOR_JUMPS, furthest)}
        playback={playback}
        label="Points"
        stepDescription={step === 0 ? "Start" : `Jump ${step}`}
      />
      <div className={styles.layout}>
        <div className={styles.side}>
          <div className={styles.choose}>
            <h3>Mandelbrot · choose c</h3>
            <LinkedMap
              mapKind="parameter"
              c={ZERO}
              value={c}
              onChange={(point) => {
                setC(pickBulb(point));
                playback.change(ATTRACTOR_JUMPS);
                setMotion({ step: ATTRACTOR_JUMPS, animate: false, furthest: ATTRACTOR_JUMPS });
              }}
              onRelease={playback.play}
              overlay={BULB_LOOPS.map(({ places: count, at }) => {
                const [x, y] = parameterPixel(at);
                return (
                  <text
                    key={`${at.real}:${at.imaginary}`}
                    x={x}
                    y={y}
                    className={styles.bulbNumber}
                  >
                    {count}
                  </text>
                );
              })}
            />
            <p data-selected-parameter={`${c.real},${c.imaginary}`}>c = {coordinates(c, 3)}</p>
          </div>
          <div>
            <h3>Where each point starts</h3>
            <canvas
              ref={starts}
              role="img"
              aria-label={`Starting points colored by their turn on the loop, for c = ${coordinates(c, 3)}. ${orbit}.`}
            />
          </div>
        </div>
        <div className={styles.main}>
          <div className={styles.now}>
            <h3>Where the points are now</h3>
            <canvas
              ref={dotsCanvas}
              role="img"
              aria-label={`The points after ${step} jumps. ${frame.escaped} have escaped, ${joinedDots} are on the loop and ${frame.moving} are still on the way.`}
            />
          </div>
          <div className={styles.key}>
            <p data-attractor-places={places}>{orbit}</p>
            <table>
              <tbody>
                {loop && (
                  <tr>
                    <td>
                      {places <= ATTRACTOR_COLORS.length ? (
                        ATTRACTOR_COLORS.slice(0, places).map((color) => (
                          <span
                            key={color}
                            className={styles.swatch}
                            style={{ background: color }}
                          />
                        ))
                      ) : (
                        <span className={styles.swatch} style={{ background: INK }} />
                      )}
                      {places === 1 ? "On the fixed point" : "On the loop"}
                    </td>
                    <td>{joinedDots}</td>
                  </tr>
                )}
                <tr>
                  <td>
                    <span className={styles.swatch} style={{ background: ESCAPING_DOT }} />
                    Escaped
                  </td>
                  <td>{frame.escaped}</td>
                </tr>
                <tr>
                  <td>
                    <span className={styles.hollow} />
                    Still on the way
                  </td>
                  <td>{frame.moving}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </LessonFrame>
  );
}
