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
  colorOnPlace,
  dotsAfter,
  ESCAPES,
  fateGrid,
  pickBulb,
  tallyDots,
} from "../../utils/lessons/juliaAttractor";
import type { ComplexPoint } from "../../utils/orbitLesson";
import { LessonFrame, LessonStepControls } from "./LessonFrame";
import { LinkedMap, parameterPixel } from "./LinkedJuliaLesson";

const RABBIT = { real: JULIA_PRESETS.Rabbit.cReal, imaginary: JULIA_PRESETS.Rabbit.cImag };
const ZERO = { real: 0, imaginary: 0 };
const BACKGROUND = "#10151a";
const INK = "#eee8ce";
const ESCAPING_DOT = "#8a95a1";
const ESCAPING_FILL = "#39424c";
const [LEFT, RIGHT, BOTTOM, TOP] = ATTRACTOR_BOUNDS;
const ASPECT = (TOP - BOTTOM) / (RIGHT - LEFT);
// A quick picture follows the drag. The sharp one waits until the ring rests.
const QUICK_COLUMNS = 150;
const SHARPEST_COLUMNS = 640;
const SHARPEN_AFTER_MS = 120;
// Labels and rows stop being readable past these many places.
const MOST_LABELS = 5;
const MOST_ROWS = 6;
// The first jumps move the most, so they play slowly enough to follow.
const hopMs = (step: number) => (step <= 6 ? 620 : 150);
const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function number(value: number, digits: number) {
  return String(Number(value.toFixed(digits)) + 0).replace("-", "−");
}
function coordinates(point: ComplexPoint, digits = 5) {
  return `(${number(point.real, digits)}, ${number(point.imaginary, digits)})`;
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

  // A dot that has landed joins its bunch, which is drawn once at the exact place.
  const landed = t < 1 ? frame.landedBefore : frame.landedOn;
  const places = loop?.length ?? 0;
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
    const to = loop[(color + step) % places];
    const from = loop[(color + Math.max(0, step - 1)) % places];
    context.fillStyle = fateColor(color, places);
    context.beginPath();
    context.arc(
      px(lerp(from.real, to.real, t)),
      py(lerp(from.imaginary, to.imaginary, t)),
      Math.min(7, 2.5 + 0.14 * Math.sqrt(count)) * scale,
      0,
      Math.PI * 2,
    );
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
  const [motion, setMotion] = useState({ step: 0, animate: false });
  const starts = useRef<HTMLCanvasElement>(null);
  const dotsCanvas = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();
  const { step, animate } = motion;
  const field = useMemo(() => {
    const loop = attractingLoop(c);
    return { loop, ...attractorDots(c, loop) };
  }, [c]);
  const { loop } = field;
  const goTo = (next: number) => setMotion({ step: next, animate: next === step + 1 && !reduced });
  const playback = useLessonPlayback(step, ATTRACTOR_JUMPS, goTo, hopMs(step + 1) + 40);
  const frame = useMemo(() => {
    const positions = dotsAfter(c, field.starts, step);
    const previous = animate ? dotsAfter(c, field.starts, step - 1) : positions;
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
  const placesText = !loop
    ? "No attractor found"
    : places === 1
      ? "Attractor: 1 exact place"
      : `Attractor: ${places} exact places`;
  return (
    <LessonFrame title="Where each point ends up" kind="julia-attractor">
      <LessonStepControls
        step={step}
        max={ATTRACTOR_JUMPS}
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
              aria-label={`Starting points colored by where they end up, for c = ${coordinates(c, 3)}. ${placesText}.`}
            />
          </div>
        </div>
        <div className={styles.main}>
          <div className={styles.now}>
            <h3>Where the points are now</h3>
            <canvas
              ref={dotsCanvas}
              role="img"
              aria-label={`The points after ${step} jumps. ${frame.escaped} have escaped and ${frame.moving} are still moving.`}
            />
          </div>
          <div className={styles.key}>
            <p data-attractor-places={places}>{placesText}</p>
            <table>
              <thead>
                <tr>
                  <th scope="col">Place</th>
                  <th scope="col">Dots</th>
                </tr>
              </thead>
              <tbody>
                {loop && places <= MOST_ROWS
                  ? loop.map((place, index) => (
                      <tr key={`${place.real}:${place.imaginary}`}>
                        <td>
                          <span
                            className={styles.swatch}
                            style={{
                              background: fateColor(colorOnPlace(index, step, places), places),
                            }}
                          />
                          {coordinates(place)}
                        </td>
                        <td>{frame.onPlace[index]}</td>
                      </tr>
                    ))
                  : loop && (
                      <tr>
                        <td>
                          <span className={styles.swatch} style={{ background: INK }} />
                          {places} places
                        </td>
                        <td>{frame.onPlace.reduce((sum, count) => sum + count, 0)}</td>
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
                    Still moving
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
