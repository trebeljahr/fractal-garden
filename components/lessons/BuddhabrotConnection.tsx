import { useEffect, useId, useRef, useState } from "react";
import styles from "../../styles/lessons/BuddhabrotConnection.module.css";
import shared from "../../styles/lessons/Lesson.module.css";
import {
  buildConnectionCloud,
  connectionProjection,
  logisticParameter,
  logisticValue,
} from "../../utils/lessons/buddhabrotConnection";
import { LessonFrame } from "./LessonFrame";

type Cloud = ReturnType<typeof buildConnectionCloud>;
let cachedCloud: Cloud | undefined;
const buffers = new WeakMap<
  HTMLCanvasElement,
  { image: ImageData; counts: Uint16Array; realCounts: Uint16Array }
>();

function drawConnection(
  canvas: HTMLCanvasElement,
  data: Cloud,
  angle: number,
  sliceOnly: boolean,
  logistic: boolean,
) {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  if (!width || !height) return;
  const dpr = window.devicePixelRatio || 1;
  const pixelWidth = Math.round(width * dpr);
  const pixelHeight = Math.round(height * dpr);
  if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
    canvas.width = pixelWidth;
    canvas.height = pixelHeight;
    buffers.delete(canvas);
  }
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  let buffer = buffers.get(canvas);
  if (!buffer) {
    buffer = {
      image: ctx.createImageData(pixelWidth, pixelHeight),
      counts: new Uint16Array(pixelWidth * pixelHeight),
      realCounts: new Uint16Array(pixelWidth * pixelHeight),
    };
    buffers.set(canvas, buffer);
  }
  const { image, counts, realCounts } = buffer;
  counts.fill(0);
  realCounts.fill(0);
  const margin = width < 450 ? 38 : 52;
  const radians = (angle * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const project = connectionProjection(angle);
  // Fit the turning cloud with a uniform camera zoom; never stretch an axis
  // or lower the point count / framebuffer resolution during motion.
  const verticalSpan = 2 * (1.15 * Math.abs(cos) + 2 * Math.abs(sin));
  const scale = Math.min((width - 2 * margin) / 2.7, (height - 2 * margin) / verticalSpan);
  const plot = (x: number, y: number) =>
    logistic
      ? {
          x: margin + ((x - 1) / 3) * (width - 2 * margin),
          y: height - margin - y * (height - 2 * margin),
        }
      : { x: width / 2 + (x + 0.75) * scale, y: height / 2 - y * scale };
  for (const [points, target] of [
    [data.cloud, counts],
    [data.slice, realCounts],
  ] as const) {
    if (points === data.cloud && (sliceOnly || logistic)) continue;
    for (const p of points) {
      const r = logistic ? logisticParameter(p.cr) : 0;
      const rotated = project(p);
      const screen = plot(logistic ? r : rotated.x, logistic ? logisticValue(r, p.zr) : rotated.y);
      const x = Math.round(screen.x * dpr);
      const y = Math.round(screen.y * dpr);
      if (x < 0 || y < 0 || x >= canvas.width || y >= canvas.height) continue;
      const index = y * canvas.width + x;
      target[index] = Math.min(65535, target[index] + 1);
    }
  }
  for (let i = 0; i < counts.length; i++) {
    const real = realCounts[i];
    const strength = real
      ? Math.min(1, 0.48 + Math.log1p(real) * 0.12)
      : counts[i]
        ? Math.min(0.8, 0.24 + Math.log1p(counts[i]) * 0.13)
        : 0;
    image.data[i * 4] = 16 + (real ? 229 : 222) * strength;
    image.data[i * 4 + 1] = 21 + (real ? 176 : 211) * strength;
    image.data[i * 4 + 2] = 26 + (real ? 83 : 180) * strength;
    image.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.font = `${width < 450 ? 11 : 13}px Montserrat, sans-serif`;
  ctx.strokeStyle = "#eee8ce44";
  ctx.fillStyle = "#eee8cebb";
  ctx.lineWidth = 1;
  const line = (x1: number, y1: number, x2: number, y2: number) => {
    const a = plot(x1, y1),
      b = plot(x2, y2);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  };
  if (logistic) {
    line(1, 0, 4, 0);
    line(1, 0, 1, 1);
    ctx.textAlign = "center";
    for (const r of [1, 2, 3, 4]) {
      const p = plot(r, 0);
      ctx.fillText(String(r), p.x, p.y + 18);
    }
    ctx.textAlign = "right";
    for (const value of [0, 0.5, 1]) {
      const p = plot(1, value);
      ctx.fillText(String(value), p.x - 8, p.y + 4);
    }
    ctx.textAlign = "center";
    ctx.fillText("growth r", width / 2, height - 8);
    ctx.textAlign = "left";
    ctx.fillText("later value x", margin, 23);
  } else {
    line(-2.1, 0, 0.6, 0);
    ctx.textAlign = "center";
    for (const c of [-2, -1, 0]) {
      const p = plot(c, 0);
      ctx.fillText(String(c), p.x, p.y + 18);
    }
    ctx.fillText("chosen number cᵣ", width / 2, height - 15);
    ctx.textAlign = "left";
    ctx.fillText(
      angle === 0
        ? "parameter height cᵢ"
        : angle === 180
          ? "parameter height −cᵢ"
          : angle === 90
            ? "later position zᵣ"
            : "height after turning",
      16,
      24,
    );
    if (angle === 0 || angle === 90 || angle === 180) {
      const extent = angle === 90 ? 2 : 1;
      line(0, -extent, 0, extent);
      for (const y of angle === 90 ? [-2, -1, 1, 2] : [-1, 1]) {
        const p = plot(0, y);
        ctx.fillText(String(y), p.x + 7, p.y + 4);
      }
    }
  }
}

export default function BuddhabrotConnection() {
  const [angle, setAngle] = useState(0);
  const [sliceOnly, setSliceOnly] = useState(false);
  const [logistic, setLogistic] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [data, setData] = useState<Cloud>();
  const canvas = useRef<HTMLCanvasElement>(null);
  const container = useRef<HTMLDivElement>(null);
  const manualSlice = useRef(false);
  const angleRef = useRef(angle);
  angleRef.current = angle;
  const id = useId();
  const redraw = useRef(() => {});
  redraw.current = () => {
    if (canvas.current && data) drawConnection(canvas.current, data, angle, sliceOnly, logistic);
  };
  useEffect(() => {
    // Only prepare the samples when the reader approaches the article figure.
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        cachedCloud ??= buildConnectionCloud();
        setData(cachedCloud);
        observer.disconnect();
      },
      { rootMargin: "300px" },
    );
    if (container.current) observer.observe(container.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const element = canvas.current;
    if (!element || !data) return;
    const draw = () => drawConnection(element, data, angle, sliceOnly, logistic);
    draw();
  }, [data, angle, sliceOnly, logistic]);
  useEffect(() => {
    const observer = new ResizeObserver(() => redraw.current());
    if (canvas.current) observer.observe(canvas.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!playing) return;
    let frame = 0;
    const start = performance.now();
    const from = angleRef.current;
    const stop = () => setPlaying(false);
    const visibility = () => {
      if (document.hidden) stop();
    };
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) stop();
    });
    if (container.current) observer.observe(container.current);
    document.addEventListener("visibilitychange", visibility);
    const tick = (now: number) => {
      const next = Math.min(90, from + (now - start) * 0.018);
      setAngle(next);
      if (next === 90) {
        setSliceOnly(true);
        stop();
      } else frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [playing]);
  const choose = (next: number, coordinates = false) => {
    manualSlice.current = false;
    setPlaying(false);
    setAngle(next);
    setSliceOnly(next === 90);
    setLogistic(coordinates);
  };
  const caption = logistic
    ? "These are the same amber dots in the logistic map's coordinates. Read from left to right: one branch splits into two, then four. Farther right, many values appear."
    : angle === 90 && sliceOnly
      ? "Each column now separates the later answers from one calculation. One lasting answer makes one branch; two alternating answers make two. Choose Logistic map to change the coordinates."
      : angle === 90
        ? "Other slices overlap the branches from this side. Keep only the center slice to see them clearly."
        : angle === 0 || angle === 180
          ? sliceOnly
            ? "From here, the center slice looks like a line. Turn the view to separate the answers hidden behind one another."
            : "All the answers from one chosen number overlap at its position. Together they show the Mandelbrot shape. Press Play turn to see what is behind it."
          : "The turn separates answers that overlapped in the front view. Follow the amber dots: they come from numbers on the Mandelbrot picture's horizontal center line.";
  return (
    <LessonFrame title="From Mandelbrot to the logistic map" kind="buddhabrot-connection">
      <div ref={container}>
        <fieldset className={shared.options} aria-label="Connection view">
          <button type="button" aria-pressed={angle === 0 && !logistic} onClick={() => choose(0)}>
            Mandelbrot
          </button>
          <button type="button" aria-pressed={angle === 45 && !logistic} onClick={() => choose(45)}>
            Turn 45°
          </button>
          <button
            type="button"
            aria-pressed={angle === 90 && sliceOnly && !logistic}
            onClick={() => choose(90)}
          >
            Real slice
          </button>
          <button type="button" aria-pressed={logistic} onClick={() => choose(90, true)}>
            Logistic map
          </button>
        </fieldset>
        <div className={styles.plot}>
          <canvas
            ref={canvas}
            role="img"
            aria-label={
              logistic
                ? "Logistic bifurcation diagram, growth parameter r from 1 to 4 and later values x from 0 to 1"
                : `Bounded orbit cloud turned ${Math.round(angle)} degrees around the real parameter axis${sliceOnly ? ", showing only the real center slice" : ""}`
            }
            aria-describedby={`${id}-caption`}
          />
          {!data && <span className={styles.loading}>Preparing the paths…</span>}
        </div>
        <div className={styles.rotation}>
          <button
            type="button"
            disabled={!data}
            aria-pressed={playing}
            onClick={() => {
              if (playing) {
                setPlaying(false);
                return;
              }
              setLogistic(false);
              setSliceOnly(false);
              manualSlice.current = false;
              if (angle >= 90) {
                angleRef.current = 0;
                setAngle(0);
              }
              setPlaying(true);
            }}
          >
            {playing ? "Pause turn" : "Play turn"}
          </button>
          <label className={shared.parameter}>
            <span>
              Turn the view <output aria-live="off">{Math.round(angle)}°</output>
            </span>
            <input
              type="range"
              min={0}
              max={180}
              step={1}
              value={angle}
              aria-label="Connection rotation"
              onChange={(event) => {
                const next = Number(event.target.value);
                setPlaying(false);
                setLogistic(false);
                setAngle(next);
                setSliceOnly(manualSlice.current || next === 90);
              }}
            />
          </label>
        </div>
        <label className={styles.slice}>
          <input
            type="checkbox"
            checked={sliceOnly}
            disabled={logistic}
            onChange={(event) => {
              setPlaying(false);
              manualSlice.current = event.target.checked;
              setSliceOnly(event.target.checked);
            }}
          />
          Only the amber center slice
        </label>
        <p id={`${id}-caption`} className={styles.caption} aria-live="polite">
          {caption}
        </p>
      </div>
    </LessonFrame>
  );
}
