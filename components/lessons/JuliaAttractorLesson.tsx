import { useEffect, useMemo, useRef, useState } from "react";
import styles from "../../styles/lessons/JuliaAttractor.module.css";
import { JULIA_PRESETS } from "../../utils/escapeTimePlaces";
import { useLessonPlayback } from "../../utils/hooks/useLessonPlayback";
import { useReducedMotion } from "../../utils/hooks/useReducedMotion";
import {
  ATTRACTOR_BOUNDS,
  ATTRACTOR_COLORS,
  type AttractorDots,
  attractingOrbit,
  attractorDots,
  BULB_ORBITS,
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
// Labels, the written orbit, arrows and lines stop being readable past these many places.
const MOST_LABELS = 5;
const MOST_WRITTEN = 6;
const MOST_ARROWS = 8;
const MOST_LINES = 32;
// The first jumps move the most, so they play slowly enough to follow. Later ones change
// little, so each one goes faster than the last.
const hopMs = (step: number) => (step <= 6 ? 620 : Math.max(40, 620 * 0.8 ** (step - 6)));
const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function number(value: number, digits: number) {
  return String(Number(value.toFixed(digits)) + 0).replace("-", "−");
}
function coordinates(point: ComplexPoint, digits = 5) {
  return `(${number(point.real, digits)}, ${number(point.imaginary, digits)})`;
}
function orbitText(orbit: ComplexPoint[] | null) {
  if (!orbit) return "No attractor found";
  if (orbit.length === 1) return `Fixed point: ${coordinates(orbit[0])}`;
  if (orbit.length > MOST_WRITTEN) return `Orbit of ${orbit.length} places`;
  return `Orbit: ${[...orbit, orbit[0]].map((place) => coordinates(place)).join(" → ")} → …`;
}
// More colors than the palette holds would need repeats, so a long orbit shares one color.
function fateColor(fate: number, places: number) {
  if (fate === ESCAPES) return ESCAPING_DOT;
  return fate < 0 || places > ATTRACTOR_COLORS.length ? INK : ATTRACTOR_COLORS[fate];
}

function paintStarts(
  canvas: HTMLCanvasElement,
  c: ComplexPoint,
  orbit: ComplexPoint[] | null,
  columns: number,
) {
  const context = canvas.getContext("2d");
  if (!context) return;
  const rows = Math.round(columns * ASPECT);
  const fates = fateGrid(c, orbit, columns, rows);
  canvas.width = columns;
  canvas.height = rows;
  const image = context.createImageData(columns, rows);
  const places = orbit?.length ?? 0;
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
  orbit: ComplexPoint[] | null;
  dots: AttractorDots;
  step: number;
  positions: Float64Array;
  previous: Float64Array;
  joined: number;
  moving: number;
};

function paintDots(canvas: HTMLCanvasElement, frame: Frame, t: number) {
  const context = canvas.getContext("2d");
  if (!context) return;
  const { orbit, dots, step, positions, previous } = frame;
  const { colors, arrivals } = dots;
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

  const places = orbit?.length ?? 0;
  const pixel = (place: ComplexPoint) => ({ x: px(place.real), y: py(place.imaginary) });
  // The orbit itself. It firms up as dots join it.
  if (orbit && frame.joined && places > 1 && places <= MOST_LINES) {
    context.globalAlpha = 0.3 + (0.7 * frame.joined) / (frame.joined + frame.moving);
    context.strokeStyle = ORBIT;
    context.fillStyle = ORBIT;
    context.lineWidth = 1.5 * scale;
    orbit.forEach((place, index) => {
      const from = pixel(place);
      const to = pixel(orbit[(index + 1) % places]);
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

  // A dot on the orbit joins its bunch, which is drawn once and travels along the orbit.
  const joinedBy = t < 1 ? step - 1 : step;
  const radius = Math.max(1.3, canvas.clientWidth / 340) * scale;
  const bunches = new Array<number>(places).fill(0);
  for (const fate of Array.from(new Set(colors))) {
    context.fillStyle = fateColor(fate, places);
    context.beginPath();
    for (let dot = 0; dot < colors.length; dot++) {
      if (colors[dot] !== fate) continue;
      if (fate >= 0 && arrivals[dot] <= joinedBy) {
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
  if (!orbit) return;
  bunches.forEach((count, color) => {
    if (!count) return;
    const to = pixel(orbit[(color + step) % places]);
    const from = pixel(orbit[(color + Math.max(0, step - 1)) % places]);
    const at = jumpPoint(from, jumpControl(from, to), to, t);
    context.fillStyle = fateColor(color, places);
    context.beginPath();
    context.arc(at.x, at.y, Math.min(7, 2.5 + 0.14 * Math.sqrt(count)) * scale, 0, Math.PI * 2);
    context.fill();
  });
  if (places > MOST_LABELS || !frame.joined) return;
  // Each label sits on the far side of its place from the middle of the orbit, clear of the lines.
  const middle = {
    x: orbit.reduce((sum, place) => sum + px(place.real), 0) / places,
    y: orbit.reduce((sum, place) => sum + py(place.imaginary), 0) / places,
  };
  context.font = `600 ${12 * scale}px Montserrat, sans-serif`;
  context.lineWidth = 3 * scale;
  context.strokeStyle = BACKGROUND;
  context.fillStyle = INK;
  const gap = 12 * scale;
  orbit.forEach((place) => {
    const label = coordinates(place);
    const { x, y } = pixel(place);
    const room = context.measureText(label).width + 2 * gap;
    const left = x < middle.x ? x > room : x + room > width;
    context.textAlign = left ? "right" : "left";
    const textX = x + (left ? -gap : gap);
    const textY = y + (y > middle.y ? gap + 10 * scale : -gap);
    context.strokeText(label, textX, textY);
    context.fillText(label, textX, textY);
  });
  context.textAlign = "left";
}

export default function JuliaAttractorLesson() {
  const [c, setC] = useState<ComplexPoint>(RABBIT);
  const [motion, setMotion] = useState({ step: 0, animate: false });
  const starts = useRef<HTMLCanvasElement>(null);
  const dotsCanvas = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();
  const { orbit, dots } = useMemo(() => {
    const found = attractingOrbit(c);
    return { orbit: found, dots: attractorDots(c, found) };
  }, [c]);
  const { lastJump } = dots;
  // A pick of c shows the end of its run, whichever jump that turns out to be.
  const step = Math.min(motion.step, lastJump);
  const animate = motion.animate && step === motion.step;
  const goTo = (next: number) => setMotion({ step: next, animate: next === step + 1 && !reduced });
  const playback = useLessonPlayback(step, lastJump, goTo, hopMs(step + 1) * 1.1);
  const frame = useMemo(() => {
    const positions = dotsAfter(c, dots, orbit, step);
    return {
      ...tallyDots(dots, step),
      orbit,
      dots,
      step,
      positions,
      previous: animate ? dotsAfter(c, dots, orbit, step - 1) : positions,
    };
  }, [c, dots, orbit, step, animate]);

  useEffect(() => {
    const canvas = starts.current;
    if (!canvas) return;
    paintStarts(canvas, c, orbit, QUICK_COLUMNS);
    const timer = window.setTimeout(() => {
      const scale = window.devicePixelRatio || 1;
      paintStarts(canvas, c, orbit, Math.min(SHARPEST_COLUMNS, canvas.clientWidth * scale));
    }, SHARPEN_AFTER_MS);
    return () => window.clearTimeout(timer);
  }, [c, orbit]);
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

  const places = orbit?.length ?? 0;
  const orbitLine = orbitText(orbit);
  return (
    <LessonFrame title="Where each point's orbit goes" kind="julia-attractor">
      <LessonStepControls
        step={step}
        max={lastJump}
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
                playback.change(Number.POSITIVE_INFINITY);
              }}
              onRelease={playback.play}
              overlay={BULB_ORBITS.map(({ places: count, at }) => {
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
              aria-label={`Starting points colored by their turn on the orbit, for c = ${coordinates(c, 3)}. ${orbitLine}.`}
            />
          </div>
        </div>
        <div className={styles.main}>
          <div className={styles.now}>
            <h3>Where the points are now</h3>
            <canvas
              ref={dotsCanvas}
              role="img"
              aria-label={`The points after ${step} jumps. ${frame.escaped} have escaped, ${frame.joined} are on the orbit and ${frame.moving} are still on the way.`}
            />
          </div>
          <div className={styles.key}>
            <p data-attractor-places={places}>{orbitLine}</p>
            <table>
              <tbody>
                {orbit && (
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
                      {places === 1 ? "On the fixed point" : "On the orbit"}
                    </td>
                    <td>{frame.joined}</td>
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
