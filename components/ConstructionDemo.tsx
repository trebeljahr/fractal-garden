import { useId, useState } from "react";
import styles from "../styles/ConstructionDemo.module.css";
import { canopyBranches, carpetHoles, kochEdge } from "../utils/constructionDiagrams";
import { buildApollonianGasket } from "../utils/render/drawings/apollonianGasket";

const EXAMPLES = {
  carpet: { title: "Cut out the middle", max: 3 },
  koch: { title: "Replace one edge", max: 4 },
  canopy: { title: "Branch, shrink, repeat", max: 5 },
  apollonian: { title: "Fill the gaps", max: 3 },
} as const;

export type ConstructionKind = keyof typeof EXAMPLES;
export function isConstructionKind(value: unknown): value is ConstructionKind {
  return typeof value === "string" && Object.hasOwn(EXAMPLES, value);
}

function Drawing({ kind, step, angle }: { kind: ConstructionKind; step: number; angle: number }) {
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
    const points = kochEdge(step);
    const path = points
      .map((p, i) => `${i ? "L" : "M"}${40 + p.x * 400},${230 + p.y * 400}`)
      .join(" ");
    const highlight = points
      .slice(0, step ? 5 : 2)
      .map((p, i) => `${i ? "L" : "M"}${40 + p.x * 400},${230 + p.y * 400}`)
      .join(" ");
    return (
      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M40 230H440" className={styles.guide} />
        <path d={path} className={styles.line} />
        <path d={highlight} className={styles.newLine} />
      </g>
    );
  }
  if (kind === "canopy") {
    return (
      <g transform="translate(240 300) scale(110)" fill="none" strokeLinecap="round">
        {canopyBranches(step, angle).map((branch) => (
          <line
            key={`${branch.start.x}:${branch.start.y}:${branch.end.x}:${branch.end.y}`}
            x1={branch.start.x}
            y1={branch.start.y}
            x2={branch.end.x}
            y2={branch.end.y}
            className={branch.depth === step ? styles.newLine : styles.line}
            style={{ strokeWidth: 0.045 * 0.7 ** branch.depth }}
          />
        ))}
      </g>
    );
  }
  return (
    <g transform="translate(240 160) scale(140)" fill="none">
      {buildApollonianGasket(step).map((circle) => (
        <circle
          key={`${circle.x}:${circle.y}:${circle.radius}`}
          cx={circle.x}
          cy={circle.y}
          r={circle.radius}
          className={circle.depth === step && step > 0 ? styles.newCircle : styles.circle}
        />
      ))}
    </g>
  );
}

function caption(kind: ConstructionKind, step: number) {
  if (kind === "carpet")
    return step === 0
      ? "Start with one filled square."
      : `${8 ** step} smaller squares remain. They cover ${((8 / 9) ** step * 100).toFixed(1)}% of the original area. Amber marks the holes cut in this step.`;
  if (kind === "koch")
    return step === 0
      ? "Start with one straight edge. The snowflake starts with three edges around a triangle."
      : `${4 ** step} segments replace the original edge. Total length is ${((4 / 3) ** step).toFixed(2)} times the starting length. Amber shows one group of four new segments.`;
  if (kind === "canopy")
    return step === 0
      ? "Start with one trunk."
      : `${2 ** step} new branches grow at the tips. Each is 62% as long as its parent. Amber marks the newest branches.`;
  return step === 0
    ? "Start with three touching circles inside an outer circle."
    : `${4 * 3 ** (step - 1)} new circles fit into the gaps. Each touches three existing circles. Amber marks this step's additions.`;
}

export default function ConstructionDemo({ kind }: { kind: ConstructionKind }) {
  const [step, setStep] = useState(0);
  const [angle, setAngle] = useState(50);
  const id = useId();
  const example = EXAMPLES[kind];
  const description = caption(kind, step);
  return (
    <figure className={styles.demo} data-construction-demo={kind}>
      <figcaption id={`${id}-title`} className={styles.title}>
        {example.title}
      </figcaption>
      <div className={styles.explanation}>
        <svg viewBox="0 0 480 320" role="img" aria-labelledby={`${id}-title ${id}-summary`}>
          <title>{`${example.title}, step ${step}`}</title>
          <Drawing key={step} kind={kind} step={step} angle={angle} />
        </svg>
        <p id={`${id}-summary`} aria-live="polite" aria-atomic="true">
          {description}
        </p>
      </div>
      <fieldset className={styles.controls} aria-label={`${example.title} steps`}>
        <button type="button" disabled={step === 0} onClick={() => setStep(step - 1)}>
          Previous
        </button>
        <label className={styles.step}>
          <span>
            Step {step} of {example.max}
          </span>
          <input
            aria-label={`${example.title} step`}
            type="range"
            min={0}
            max={example.max}
            step={1}
            value={step}
            onChange={(event) => setStep(Number(event.target.value))}
          />
        </label>
        <button type="button" disabled={step === example.max} onClick={() => setStep(step + 1)}>
          Next step
        </button>
      </fieldset>
      {kind === "canopy" && (
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
            onChange={(event) => setAngle(Number(event.target.value))}
          />
        </label>
      )}
    </figure>
  );
}
