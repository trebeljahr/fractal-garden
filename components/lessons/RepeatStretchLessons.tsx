import { useEffect, useMemo, useRef, useState } from "react";
import common from "../../styles/lessons/Lesson.module.css";
import linked from "../../styles/lessons/LinkedExperiments.module.css";
import styles from "../../styles/lessons/RepeatStretch.module.css";
import { attractingOrbit } from "../../utils/lessons/juliaAttractor";
import {
  allRepeats,
  bulbOutline,
  fixedPoints,
  heartOutline,
  MOST_REPEAT_JUMPS,
  NEWTON_NO_ROOT,
  NEWTON_STOPS,
  newtonAverageFate,
  newtonView,
  oneJumpStretch,
  PATCH_C,
  PATCH_PLACES,
  patchAfter,
  patchRun,
  twoJumpStretch,
  twoRepeat,
} from "../../utils/lessons/repeatStretch";
import type { ComplexPoint } from "../../utils/orbitLesson";
import { LessonFrame, LessonSteps } from "./LessonFrame";
import { LinkedMap, MAP_HEIGHT, MAP_WIDTH, parameterPixel } from "./LinkedJuliaLesson";

const ZERO = { real: 0, imaginary: 0 };
const BACKGROUND = "#10151a";
const INK = "#eee8ce";
const AMBER = "#f5c56d";
const TEAL = "#5ec2b7";
const GRAY = "#8a95a1";
const PLANE = { left: -1.8, right: 1.8, bottom: -1.5, top: 1.5 };
const planeX = (x: number) => ((x - PLANE.left) / (PLANE.right - PLANE.left)) * MAP_WIDTH;
const planeY = (y: number) => ((PLANE.top - y) / (PLANE.top - PLANE.bottom)) * MAP_HEIGHT;
const PATCH_SIZE = 0.1;
const times = (value: number) => `×${Number(value.toPrecision(2))}`;
const pairText = (p: ComplexPoint) =>
  `(${Number(p.real.toFixed(3))}, ${Number(p.imaginary.toFixed(3))})`;
const line = (points: ComplexPoint[]) =>
  points
    .map((p) =>
      parameterPixel(p)
        .map((value) => value.toFixed(1))
        .join(","),
    )
    .join(" ");

function Axes() {
  return (
    <path
      d={`M0 ${planeY(0)}H${MAP_WIDTH}M${planeX(0)} 0V${MAP_HEIGHT}`}
      stroke={`${INK}40`}
      fill="none"
    />
  );
}

/** A dim patch before the jumps and a bright one after: amber if it shrank, gray if it grew. */
function Patch({
  z,
  c,
  jumps,
  stretch,
  labelBelow = false,
}: {
  z: ComplexPoint;
  c: ComplexPoint;
  jumps: number;
  stretch: number;
  labelBelow?: boolean;
}) {
  const outline = (points: ComplexPoint[]) =>
    points.map((p) => `${planeX(p.real).toFixed(1)},${planeY(p.imaginary).toFixed(1)}`).join(" ");
  const x = Number(planeX(z.real).toFixed(1));
  const y = Number(planeY(z.imaginary).toFixed(1));
  const color = stretch < 1 ? AMBER : GRAY;
  return (
    <g>
      <polygon points={outline(patchAfter(z, c, PATCH_SIZE, 0))} fill={`${INK}30`} />
      <polygon points={outline(patchAfter(z, c, PATCH_SIZE, jumps))} fill={color} opacity="0.75" />
      <circle cx={x} cy={y} r="2.5" fill={INK} />
      <text x={x + 7} y={y + (labelBelow ? 16 : -7)} fill={INK} className={styles.stretch}>
        {times(stretch)}
      </text>
    </g>
  );
}

export function RepeatStretchLesson() {
  const [c, setC] = useState<ComplexPoint>({ real: -0.3, imaginary: 0.3 });
  const heart = useMemo(() => line(heartOutline()), []);
  const bulb = useMemo(() => line(bulbOutline()), []);
  const [firstFixed, secondFixed] = fixedPoints(c);
  const [firstPlace, secondPlace] = twoRepeat(c);
  const twoJumps = twoJumpStretch(c);
  return (
    <LessonFrame title="Does a repeat draw points in?" kind="repeat-stretch">
      <div className={linked.pair}>
        <div>
          <h3>Mandelbrot · choose c</h3>
          <LinkedMap
            mapKind="parameter"
            c={ZERO}
            value={c}
            onChange={setC}
            overlay={
              <>
                <polyline points={heart} fill="none" stroke={AMBER} strokeWidth="1.5" />
                <polyline points={bulb} fill="none" stroke={TEAL} strokeWidth="1.5" />
              </>
            }
          />
          <p data-selected-parameter={`${c.real},${c.imaginary}`}>c = {pairText(c)}</p>
        </div>
        <div>
          <h3>Patches around each repeat</h3>
          <svg
            viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
            role="img"
            aria-label={`For c = ${pairText(c)}, one jump stretches a patch around the fixed points ${times(oneJumpStretch(firstFixed))} and ${times(oneJumpStretch(secondFixed))}. Two jumps stretch a patch around the repeat of two numbers ${times(twoJumps)}.`}
          >
            <Axes />
            <line
              x1={planeX(firstPlace.real)}
              y1={planeY(firstPlace.imaginary)}
              x2={planeX(secondPlace.real)}
              y2={planeY(secondPlace.imaginary)}
              stroke={TEAL}
              strokeWidth="1.5"
            />
            {[firstPlace, secondPlace].map((z) => (
              <Patch
                key={`${z.real}:${z.imaginary}`}
                z={z}
                c={c}
                jumps={2}
                stretch={twoJumps}
                labelBelow
              />
            ))}
            {[firstFixed, secondFixed].map((z) => (
              <Patch
                key={`${z.real}:${z.imaginary}`}
                z={z}
                c={c}
                jumps={1}
                stretch={oneJumpStretch(z)}
              />
            ))}
          </svg>
          <p data-stretch-readout>
            Fixed points, after one jump: {times(oneJumpStretch(firstFixed))} and{" "}
            {times(oneJumpStretch(secondFixed))}. Repeat of two numbers (joined by the line), after
            two jumps: {times(twoJumps)}.
          </p>
        </div>
      </div>
    </LessonFrame>
  );
}

function fitCanvas(canvas: HTMLCanvasElement) {
  const context = canvas.getContext("2d");
  if (!context) return null;
  const scale = window.devicePixelRatio || 1;
  const width = Math.max(1, Math.round(canvas.clientWidth * scale));
  const height = Math.max(1, Math.round(canvas.clientHeight * scale));
  if (canvas.width !== width) canvas.width = width;
  if (canvas.height !== height) canvas.height = height;
  context.fillStyle = BACKGROUND;
  context.fillRect(0, 0, width, height);
  const x = (real: number) => ((real - PLANE.left) / (PLANE.right - PLANE.left)) * width;
  const y = (imaginary: number) => ((PLANE.top - imaginary) / (PLANE.top - PLANE.bottom)) * height;
  context.strokeStyle = `${INK}30`;
  context.lineWidth = scale;
  context.beginPath();
  context.moveTo(x(0), 0);
  context.lineTo(x(0), height);
  context.moveTo(0, y(0));
  context.lineTo(width, y(0));
  context.stroke();
  return { context, scale, x, y };
}

function fillDots(
  frame: NonNullable<ReturnType<typeof fitCanvas>>,
  points: Float64Array,
  color: string,
  radius: number,
) {
  const { context, x, y, scale } = frame;
  const size = radius * scale;
  context.fillStyle = color;
  context.beginPath();
  for (let at = 0; at < points.length; at += 2) {
    if (Number.isNaN(points[at])) continue;
    const px = x(points[at]);
    const py = y(points[at + 1]);
    context.moveTo(px + size, py);
    context.arc(px, py, size, 0, Math.PI * 2);
  }
  context.fill();
}

function usePainter(paint: (canvas: HTMLCanvasElement) => void) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const latest = useRef(paint);
  latest.current = paint;
  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    const resized = new ResizeObserver(() => latest.current(element));
    resized.observe(element);
    return () => resized.disconnect();
  }, []);
  // No dependencies: every render may change the picture.
  useEffect(() => {
    if (canvas.current) latest.current(canvas.current);
  });
  return canvas;
}

export function AllRepeatsLesson() {
  const [c, setC] = useState<ComplexPoint>({ real: -0.123, imaginary: 0.745 });
  const [step, setStep] = useState(10);
  const jumps = step + 1;
  const points = useMemo(() => allRepeats(c, jumps), [c, jumps]);
  const orbit = useMemo(() => attractingOrbit(c), [c]);
  const canvas = usePainter((element) => {
    const frame = fitCanvas(element);
    if (!frame) return;
    fillDots(frame, points, INK, jumps > 8 ? 0.9 : jumps > 5 ? 1.5 : 2.5);
    if (orbit)
      fillDots(frame, Float64Array.from(orbit.flatMap((p) => [p.real, p.imaginary])), AMBER, 3.5);
  });
  const answers = 2 ** jumps;
  const repeat = orbit
    ? `Amber: zero's repeat, ${orbit.length} ${orbit.length === 1 ? "place" : "places"} long, the only one that draws points in.`
    : "No repeat draws points in here.";
  return (
    <LessonFrame title="Every repeat at once" kind="all-repeats">
      <LessonSteps
        step={step}
        max={MOST_REPEAT_JUMPS - 1}
        onChange={setStep}
        label="Repeats"
        stepDescription={`${jumps} ${jumps === 1 ? "jump" : "jumps"}`}
      />
      <div className={linked.pair}>
        <div>
          <h3>Mandelbrot · choose c</h3>
          <LinkedMap mapKind="parameter" c={ZERO} value={c} onChange={setC} />
          <p data-selected-parameter={`${c.real},${c.imaginary}`}>c = {pairText(c)}</p>
        </div>
        <div>
          <h3>Points that come back</h3>
          <canvas
            ref={canvas}
            className={styles.plane}
            role="img"
            aria-label={`${answers} points return to where they started after ${jumps} jumps for c = ${pairText(c)}. ${repeat}`}
          />
          <p data-repeats-readout>
            2<sup>{jumps}</sup> = {answers.toLocaleString("en-US")} points return after {jumps}{" "}
            {jumps === 1 ? "jump" : "jumps"}. {repeat}
          </p>
        </div>
      </div>
    </LessonFrame>
  );
}

const size = (value: number) =>
  value < 1e-6 ? "less than 0.000001" : String(Number(value.toPrecision(2)));
const REPEAT_OF_C = Float64Array.from([0, 0, -1, 0]);

export function TinyPatchLesson() {
  const [placeIndex, setPlaceIndex] = useState(0);
  const [step, setStep] = useState(0);
  const frames = useMemo(() => patchRun(PATCH_PLACES[placeIndex].at), [placeIndex]);
  const edge = useMemo(() => allRepeats(PATCH_C, 12), []);
  const shown = Math.min(step, frames.length - 1);
  const frame = frames[shown];
  const canvas = usePainter((element) => {
    const painted = fitCanvas(element);
    if (!painted) return;
    fillDots(painted, edge, `${INK}70`, 1);
    fillDots(painted, REPEAT_OF_C, TEAL, 4);
    // The patch starts as one spot, far too small to see unless it is drawn large.
    fillDots(painted, frame.positions, AMBER, frame.width < 0.02 ? 4 : 1.4);
  });
  const allGone = frame.escaped === frames[0].positions.length / 2;
  const outcome = allGone
    ? "Every dot has flown off."
    : `${frame.width < 1 ? `The dots span ${size(frame.width)}. ` : ""}${frame.escaped.toLocaleString("en-US")} dots have flown off and ${frame.settled.toLocaleString("en-US")} have joined the repeat of 0 and −1.`;
  return (
    <LessonFrame title="A patch a millionth wide" kind="tiny-patch">
      <div className={common.options}>
        {PATCH_PLACES.map((option, index) => (
          <button
            type="button"
            key={option.name}
            aria-pressed={index === placeIndex}
            onClick={() => {
              setPlaceIndex(index);
              setStep(0);
            }}
          >
            {option.name}
          </button>
        ))}
      </div>
      <LessonSteps
        key={placeIndex}
        step={shown}
        max={frames.length - 1}
        onChange={setStep}
        label="Patch"
        duration={Math.max(1, frames.length - 1) * 450}
        stepDescription={shown === 0 ? "Start" : `Jump ${shown}`}
      />
      <canvas
        ref={canvas}
        className={styles.widePlane}
        role="img"
        aria-label={`After ${shown} jumps from ${PATCH_PLACES[placeIndex].name}. ${outcome}`}
      />
      <p data-patch-readout>{outcome}</p>
    </LessonFrame>
  );
}

const PICTURE = 640;
const QUICK = 160;
const FRAME_BUDGET_MS = 12;
const ROOT_COLORS = [
  [200, 70, 70],
  [70, 160, 90],
  [80, 110, 210],
];
const FADE_JUMPS = 40;

function paintRow(
  data: Uint8ClampedArray,
  columns: number,
  half: number,
  center: ComplexPoint,
  imaginary: number,
  offset: number,
) {
  for (let column = 0; column < columns; column++) {
    const real = center.real - half + ((column + 0.5) / columns) * 2 * half;
    const { root, jumps } = newtonAverageFate(real, imaginary);
    const at = offset + column * 4;
    if (root === NEWTON_NO_ROOT) {
      data[at] = 0;
      data[at + 1] = 0;
      data[at + 2] = 0;
    } else {
      const shade = 0.5 + 0.5 * Math.max(0, 1 - jumps / FADE_JUMPS);
      data[at] = ROOT_COLORS[root][0] * shade;
      data[at + 1] = ROOT_COLORS[root][1] * shade;
      data[at + 2] = ROOT_COLORS[root][2] * shade;
    }
    data[at + 3] = 255;
  }
}

export function NewtonCopyLesson() {
  const [stop, setStop] = useState(0);
  const canvas = useRef<HTMLCanvasElement>(null);
  const view = newtonView(stop);
  useEffect(() => {
    const context = canvas.current?.getContext("2d");
    if (!context) return;
    const { half, center } = newtonView(stop);
    const rowAt = (row: number, rows: number) =>
      center.imaginary + half - ((row + 0.5) / rows) * 2 * half;
    // A rough picture follows the slider. The sharp one paints over it, row by row.
    const quick = context.createImageData(QUICK, QUICK);
    for (let row = 0; row < QUICK; row++)
      paintRow(quick.data, QUICK, half, center, rowAt(row, QUICK), row * QUICK * 4);
    const rough = document.createElement("canvas");
    rough.width = QUICK;
    rough.height = QUICK;
    rough.getContext("2d")?.putImageData(quick, 0, 0);
    context.imageSmoothingEnabled = false;
    context.drawImage(rough, 0, 0, PICTURE, PICTURE);
    const image = context.createImageData(PICTURE, 1);
    let row = 0;
    let frame = requestAnimationFrame(function paint() {
      const begun = performance.now();
      for (; row < PICTURE && performance.now() - begun < FRAME_BUDGET_MS; row++) {
        paintRow(image.data, PICTURE, half, center, rowAt(row, PICTURE), 0);
        context.putImageData(image, 0, row);
      }
      if (row < PICTURE) frame = requestAnimationFrame(paint);
    });
    return () => cancelAnimationFrame(frame);
  }, [stop]);
  const zoom = Number(view.zoom.toPrecision(2));
  return (
    <LessonFrame title="Polynomials whose guesses get stuck" kind="newton-copy">
      <LessonSteps
        step={stop}
        max={NEWTON_STOPS}
        onChange={setStop}
        label="Zoom"
        duration={8000}
        stepDescription={`Zoom ×${zoom}`}
      />
      <canvas
        ref={canvas}
        width={PICTURE}
        height={PICTURE}
        className={styles.square}
        role="img"
        aria-label={`Each point is a third root. Red if the guess at the average of the roots reaches −1, green if 1, blue if the third root, black if none. Zoomed ${zoom} times.`}
      />
      <p>
        Each point is a choice of third root. The guess at the average of the roots reaches{" "}
        <span style={{ color: "#e07a7a" }}>−1</span>, <span style={{ color: "#6cc586" }}>1</span>,{" "}
        <span style={{ color: "#8ea6ec" }}>the third root</span>, or none of them (black).
      </p>
    </LessonFrame>
  );
}
