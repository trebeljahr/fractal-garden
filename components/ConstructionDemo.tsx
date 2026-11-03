import { type CSSProperties, useId, useState } from "react";
import styles from "../styles/ConstructionDemo.module.css";
import {
  canopyBranches,
  canopyRouteLimit,
  carpetHoles,
  circleContacts,
  kochEdge,
} from "../utils/constructionDiagrams";
import { buildApollonianGasket } from "../utils/render/drawings/apollonianGasket";
import { LessonSteps } from "./lessons/LessonFrame";

const EXAMPLES = {
  carpet: { title: "Remove the center square", max: 3 },
  koch: { title: "Replace one edge", max: 4 },
  canopy: { title: "Branch, shrink, repeat", max: 5 },
  apollonian: { title: "Fill the gaps", max: 3 },
} as const;

export type ConstructionKind = keyof typeof EXAMPLES;
export function isConstructionKind(value: unknown): value is ConstructionKind {
  return typeof value === "string" && Object.hasOwn(EXAMPLES, value);
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
  if (kind === "canopy") {
    return (
      <g transform="translate(240 300) scale(98)" fill="none" strokeLinecap="round">
        {canopyBranches(step, angle, ratio).map((branch) => (
          <line
            key={`${branch.start.x}:${branch.start.y}:${branch.end.x}:${branch.end.y}`}
            x1={branch.start.x}
            y1={branch.start.y}
            x2={branch.end.x}
            y2={branch.end.y}
            pathLength={1}
            className={
              branch.depth === step ? `${styles.newLine} ${styles.growingBranch}` : styles.line
            }
            style={{ strokeWidth: 0.045 * 0.7 ** branch.depth }}
          />
        ))}
      </g>
    );
  }
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
      : `${2 ** step} new branches are added at the tips. Each is ${Math.round(ratio * 100)}% as long as its parent. Amber marks the newest branches.`;
  return step === 0
    ? "Start with three touching circles inside an outer circle."
    : `${4 * 3 ** (step - 1)} new circles fit into the gaps. Amber marks this step's additions; dots mark where they touch older circles.`;
}

export default function ConstructionDemo({ kind }: { kind: ConstructionKind }) {
  const [step, setStep] = useState(0);
  const [forward, setForward] = useState(false);
  const [angle, setAngle] = useState(50);
  const [ratio, setRatio] = useState(0.6);
  const id = useId();
  const example = EXAMPLES[kind];
  const description = caption(kind, step, ratio);
  const changeStep = (next: number) => {
    setForward(next > step);
    setStep(next);
  };
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
        duration={example.max * 1500}
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
              max={100}
              value={angle}
              onChange={(event) => {
                setForward(false);
                setAngle(Number(event.target.value));
              }}
            />
          </label>
          <label className={styles.angle}>
            <span>
              Length ratio <output>{Math.round(ratio * 100)}%</output>
            </span>
            <input
              type="range"
              aria-label="Construction length ratio"
              min={0.4}
              max={0.7}
              step={0.01}
              value={ratio}
              onChange={(event) => {
                setForward(false);
                setRatio(Number(event.target.value));
              }}
            />
          </label>
          <p className={styles.angle} data-canopy-route>
            <span>
              Any route, followed forever{" "}
              <output>{canopyRouteLimit(ratio).toFixed(2)} trunks</output>
            </span>
          </p>
        </>
      )}
    </figure>
  );
}
