import { type CSSProperties, useEffect, useId, useMemo, useState } from "react";
import styles from "../styles/ConstructionDemo.module.css";
import {
  canopyBranches,
  carpetHoles,
  circleContacts,
  kochEdge,
} from "../utils/constructionDiagrams";
import {
  CANOPY_STEPS,
  canopyClosestRoute,
  canopyGap,
  canopyTouchRatio,
} from "../utils/lessons/canopyContact";
import { buildApollonianGasket } from "../utils/render/drawings/apollonianGasket";
import { LessonSteps } from "./lessons/LessonFrame";

const EXAMPLES = {
  carpet: { title: "Remove the center square", max: 3 },
  koch: { title: "Replace one edge", max: 4 },
  canopy: { title: "Branch, shrink, repeat", max: CANOPY_STEPS },
  apollonian: { title: "Fill the gaps", max: 3 },
} as const;

export type ConstructionKind = keyof typeof EXAMPLES;
export function isConstructionKind(value: unknown): value is ConstructionKind {
  return typeof value === "string" && Object.hasOwn(EXAMPLES, value);
}

const percent = (ratio: number) => `${(ratio * 100).toFixed(1)}%`;

/** The slider moves in tenths of a percent, so that is as close as "touching" can mean on it. */
const sameOnSlider = (a: number, b: number) => Math.round(a * 1000) === Math.round(b * 1000);

const branchWidth = (depth: number) => Math.max(0.045 * 0.7 ** depth, 0.006);

function CanopyDrawing({ step, angle, ratio }: { step: number; angle: number; ratio: number }) {
  // The whole tree sets the framing, so stepping through it does not rescale the picture.
  const { branches, levels, frame, top } = useMemo(() => {
    const branches = canopyBranches(CANOPY_STEPS, angle, ratio);
    const levels: string[] = [];
    let side = 0;
    let top = 0;
    let bottom = 0;
    for (const { start, end, depth } of branches) {
      levels[depth] =
        `${levels[depth] ?? ""}M${start.x.toFixed(4)} ${start.y.toFixed(4)}L${end.x.toFixed(4)} ${end.y.toFixed(4)}`;
      side = Math.max(side, Math.abs(end.x));
      top = Math.min(top, end.y);
      bottom = Math.max(bottom, end.y);
    }
    const scale = Math.min(440 / (2 * side), 296 / (bottom - top), 130);
    const frame = `translate(240 ${160 - ((top + bottom) / 2) * scale}) scale(${scale})`;
    return { branches, levels, frame, top };
  }, [angle, ratio]);
  const route = useMemo(
    () => (step > 0 ? canopyClosestRoute(angle, ratio, step) : []),
    [angle, ratio, step],
  );
  const touch = useMemo(() => canopyTouchRatio(angle), [angle]);
  const contact = sameOnSlider(ratio, touch) ? canopyClosestRoute(angle, ratio).pop() : undefined;
  return (
    <g transform={frame} fill="none" strokeLinecap="round" strokeLinejoin="round">
      {step > 0 && <line x1={0} y1={-1} x2={0} y2={top} className={styles.centerLine} />}
      {levels.slice(0, step + 1).map((path, depth) =>
        depth === step && step <= 5 ? (
          branches
            .filter((branch) => branch.depth === step)
            .map((branch) => (
              <line
                key={`${branch.start.x}:${branch.start.y}:${branch.end.x}:${branch.end.y}`}
                x1={branch.start.x}
                y1={branch.start.y}
                x2={branch.end.x}
                y2={branch.end.y}
                pathLength={1}
                className={`${styles.newLine} ${styles.growingBranch}`}
                style={{ strokeWidth: branchWidth(depth) }}
              />
            ))
        ) : (
          <path
            // biome-ignore lint/suspicious/noArrayIndexKey: A level's depth never changes.
            key={depth}
            d={path}
            className={depth === step ? styles.newLine : styles.line}
            style={{ strokeWidth: branchWidth(depth) }}
          />
        ),
      )}
      {route.length > 0 && (
        <polyline
          points={route.map(({ x, y }) => `${x},${y}`).join(" ")}
          className={styles.route}
        />
      )}
      {contact && <circle cx={0} cy={contact.y} r={0.035} className={styles.contact} />}
    </g>
  );
}

function CanopyReadout({
  step,
  angle,
  ratio,
  onTouch,
}: {
  step: number;
  angle: number;
  ratio: number;
  onTouch: (ratio: number) => void;
}) {
  const touch = useMemo(() => canopyTouchRatio(angle), [angle]);
  const touching = sameOnSlider(ratio, touch);
  const gap = (value: number) => (value < 0 ? "Crossing" : `${value.toFixed(3)} trunks`);
  return (
    <div data-canopy-contact={touching ? "touching" : ratio < touch ? "apart" : "crossing"}>
      <p className={styles.angle}>
        <span>
          Gap at this step{" "}
          <output>{step > 0 ? gap(canopyGap(angle, ratio, step)) : "None yet"}</output>
        </span>
      </p>
      <p className={styles.angle}>
        <span>
          Gap if it never stops{" "}
          <output>{touching ? "Touching" : gap(canopyGap(angle, ratio))}</output>
        </span>
      </p>
      <p className={styles.angle}>
        <span>
          Halves touch at
          <span className={styles.touchRatio}>
            <output>{percent(touch)}</output>
            <button type="button" disabled={touching} onClick={() => onTouch(touch)}>
              Go there
            </button>
          </span>
        </span>
      </p>
    </div>
  );
}

function Drawing({
  kind,
  step,
  angle,
  ratio,
}: {
  kind: ConstructionKind;
  step: number;
  angle: number;
  ratio: number;
}) {
  if (kind === "carpet") {
    return (
      <g transform="translate(100 20) scale(280)">
        <rect width="1" height="1" className={styles.solid} />
        {carpetHoles(step).map((hole) => (
          <rect
            key={`${hole.x}:${hole.y}:${hole.size}`}
            x={hole.x}
            y={hole.y}
            width={hole.size}
            height={hole.size}
            className={hole.depth === step ? styles.cut : styles.hole}
          />
        ))}
      </g>
    );
  }
  if (kind === "koch") {
    const points = kochEdge(Math.max(0, step - 1));
    const path = points
      .map((p, i) => `${i ? "L" : "M"}${40 + p.x * 400},${230 + p.y * 400}`)
      .join(" ");
    return (
      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d={path} className={step ? styles.guide : styles.line} />
        {step > 0 &&
          points.slice(1).map((end, index) => {
            const start = points[index];
            const dx = end.x - start.x;
            const dy = end.y - start.y;
            return (
              <g
                key={`${step}:${start.x}:${start.y}`}
                transform={`translate(${40 + start.x * 400} ${230 + start.y * 400}) rotate(${(Math.atan2(dy, dx) * 180) / Math.PI}) scale(${Math.hypot(dx, dy) * 400})`}
              >
                <polyline
                  points={`0,0 ${1 / 3},0 0.5,${-Math.sqrt(3) / 6} ${2 / 3},0 1,0`}
                  className={styles.replacement}
                  vectorEffect="non-scaling-stroke"
                />
              </g>
            );
          })}
      </g>
    );
  }
  if (kind === "canopy") return <CanopyDrawing step={step} angle={angle} ratio={ratio} />;
  const circles = buildApollonianGasket(step);
  return (
    <g transform="translate(240 160) scale(140)" fill="none">
      {circles.map((circle) => (
        <circle
          key={`${circle.x}:${circle.y}:${circle.radius}`}
          cx={circle.x}
          cy={circle.y}
          r={circle.radius}
          className={circle.depth === step && step > 0 ? styles.newCircle : styles.circle}
          style={{ transformOrigin: `${circle.x}px ${circle.y}px` } as CSSProperties}
        />
      ))}
      {circles
        .filter((circle) => circle.depth === step && step > 0)
        .flatMap((circle) =>
          circleContacts(circle, circles).map((point) => (
            <circle
              key={`${circle.x}:${circle.y}:${point.x}:${point.y}`}
              cx={point.x}
              cy={point.y}
              r={Math.min(0.012, circle.radius * 0.14)}
              className={styles.contact}
            />
          )),
        )}
    </g>
  );
}

function caption(kind: ConstructionKind, step: number, ratio: number) {
  if (kind === "carpet")
    return step === 0
      ? "Start with one filled square."
      : `${8 ** step} smaller squares remain. They cover ${((8 / 9) ** step * 100).toFixed(1)}% of the original area. Amber marks the squares removed in this step.`;
  if (kind === "koch")
    return step === 0
      ? "Start with one straight edge. The snowflake starts with three edges around a triangle."
      : `${4 ** step} segments replace the original edge. Total length is ${((4 / 3) ** step).toFixed(2)} times the starting length. Each dashed edge becomes four amber segments.`;
  if (kind === "canopy")
    return step === 0
      ? "Start with one trunk."
      : `${2 ** step} new branches are added at the tips. Each is ${percent(ratio)} as long as its parent. Amber marks the newest branches.`;
  return step === 0
    ? "Start with three touching circles inside an outer circle."
    : `${4 * 3 ** (step - 1)} new circles fit into the gaps. Amber marks this step's additions; dots mark where they touch older circles.`;
}

export default function ConstructionDemo({ kind }: { kind: ConstructionKind }) {
  const [step, setStep] = useState(0);
  const [forward, setForward] = useState(false);
  const [angle, setAngle] = useState(120);
  const [ratio, setRatio] = useState(0.55);
  const id = useId();
  const example = EXAMPLES[kind];
  const description = caption(kind, step, ratio);
  const changeStep = (next: number) => {
    setForward(next > step);
    setStep(next);
  };
  // The tree opens fully drawn, once the page is live, to keep its branches out of the page's HTML.
  useEffect(() => {
    if (kind === "canopy") setStep(CANOPY_STEPS);
  }, [kind]);
  return (
    <figure className={styles.demo} data-construction-demo={kind} data-motion={forward}>
      <figcaption id={`${id}-title`} className={styles.title}>
        {example.title}
      </figcaption>
      <div className={styles.explanation}>
        <svg viewBox="0 0 480 320" role="img" aria-labelledby={`${id}-title ${id}-summary`}>
          <title>{`${example.title}, step ${step}`}</title>
          <Drawing kind={kind} step={step} angle={angle} ratio={ratio} />
        </svg>
        <p id={`${id}-summary`} aria-live="polite" aria-atomic="true">
          {description}
        </p>
      </div>
      <LessonSteps
        key={`${angle}:${ratio}`}
        step={step}
        max={example.max}
        onChange={changeStep}
        label={example.title}
        duration={example.max * (kind === "canopy" ? 800 : 1500)}
      />
      {kind === "canopy" && (
        <>
          <label className={styles.angle}>
            <span>
              Branch angle <output>{angle}°</output>
            </span>
            <input
              type="range"
              aria-label="Construction branch angle"
              min={20}
              max={180}
              value={angle}
              onChange={(event) => {
                setForward(false);
                setAngle(Number(event.target.value));
              }}
            />
          </label>
          <label className={styles.angle}>
            <span>
              Length ratio <output>{percent(ratio)}</output>
            </span>
            <input
              type="range"
              aria-label="Construction length ratio"
              min={0.45}
              max={0.75}
              step={0.001}
              value={ratio}
              onChange={(event) => {
                setForward(false);
                setRatio(Number(event.target.value));
              }}
            />
          </label>
          <CanopyReadout
            step={step}
            angle={angle}
            ratio={ratio}
            onTouch={(touch) => {
              setForward(false);
              setRatio(touch);
            }}
          />
        </>
      )}
    </figure>
  );
}
