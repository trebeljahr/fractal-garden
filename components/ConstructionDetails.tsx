import { useId, useState } from "react";
import base from "../styles/ConstructionDemo.module.css";
import styles from "../styles/ConstructionDetails.module.css";
import { applyFernRule, type FernPoint, traceFern } from "../utils/barnsleyFern";
import { mengerLayers } from "../utils/menger";
import { type ForkPoint, pythagorasFork } from "../utils/pythagorasFork";
import { LessonSteps } from "./lessons/LessonFrame";

export type DetailKind = "menger" | "pythagoras" | "fern";
export function isDetailKind(value: unknown): value is DetailKind {
  return value === "menger" || value === "pythagoras" || value === "fern";
}

function Steps({
  name,
  step,
  max,
  onChange,
}: {
  name: string;
  step: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return <LessonSteps step={step} max={max} onChange={onChange} label={name} />;
}

function MengerLesson() {
  const [step, setStep] = useState(0);
  const [showRemoved, setShowRemoved] = useState(true);
  const id = useId();
  const title = "Look through three layers";
  return (
    <figure className={`${base.demo} ${styles.lesson}`} data-detail-lesson="menger">
      <figcaption id={`${id}-title`} className={base.title}>
        {title}
      </figcaption>
      <p className={base.lessonIntro}>
        Each grid is one layer of the same cube, from front to back. Step forward to remove seven
        cubes.
      </p>
      <svg
        className={styles.layers}
        viewBox="0 0 480 220"
        role="img"
        aria-labelledby={`${id}-title ${id}-summary`}
      >
        <title>{`Three cube layers, ${step === 0 ? "27 cubes before removal" : "20 cubes after removal"}`}</title>
        {mengerLayers().map((layer, index) => (
          <g key={layer[0].z} transform={`translate(${14 + index * 157} 14)`}>
            {layer.map(({ x, y, z, kept }) => {
              const removed = step > 0 && !kept;
              const left = (x + 1) * 43;
              const top = (y + 1) * 43;
              return (
                <g key={`${x}:${y}:${z}`}>
                  <rect
                    x={left}
                    y={top}
                    width="39"
                    height="39"
                    className={removed ? styles.emptyCell : styles.keptCell}
                  />
                  {removed && showRemoved && (
                    <path
                      d={`M${left + 12} ${top + 12}l15 15m0-15l-15 15`}
                      className={styles.removedMark}
                    />
                  )}
                </g>
              );
            })}
            <text x="63" y="158" className={styles.diagramLabel} textAnchor="middle">
              {["Front", "Middle", "Back"][index]}
            </text>
            <text x="63" y="184" className={styles.diagramValue} textAnchor="middle">
              {step ? layer.filter((cell) => cell.kept).length : 9} cubes
            </text>
          </g>
        ))}
      </svg>
      <p id={`${id}-summary`} className={styles.summary} aria-live="polite" aria-atomic="true">
        {step === 0
          ? "A three-by-three-by-three split gives 27 cubes: nine in each layer."
          : "8 + 4 + 8 = 20 cubes remain. The middle layer loses five cubes. The front and back each lose one."}
      </p>
      <Steps name={title} step={step} max={1} onChange={setStep} />
      <label className={styles.checkbox}>
        <input
          type="checkbox"
          checked={showRemoved}
          disabled={step === 0}
          onChange={(event) => setShowRemoved(event.target.checked)}
        />
        Show removed positions with an amber ×
      </label>
      <p className={base.lessonIntro}>
        The empty centers line up into tunnels. The full sponge repeats this removal inside every
        surviving cube.
      </p>
    </figure>
  );
}

function forkPoints(points: ForkPoint[]) {
  return points.map(({ x, y }) => `${180 + x * 120},${200 - y * 120}`).join(" ");
}
function squareCenter(points: ForkPoint[]) {
  return {
    x: 180 + (points.reduce((sum, p) => sum + p.x, 0) / 4) * 120,
    y: 200 - (points.reduce((sum, p) => sum + p.y, 0) / 4) * 120,
  };
}

function PythagorasLesson() {
  const [step, setStep] = useState(0);
  const [angle, setAngle] = useState(45);
  const id = useId();
  const title = "One square becomes two branches";
  const fork = pythagorasFork(angle);
  const left = squareCenter(fork.left);
  const right = squareCenter(fork.right);
  const [a, tip, b] = fork.triangle;
  const arm = (end: ForkPoint) => {
    const length = Math.hypot(end.x - tip.x, end.y - tip.y);
    return { x: ((end.x - tip.x) / length) * 0.08, y: ((end.y - tip.y) / length) * 0.08 };
  };
  const u = arm(a);
  const v = arm(b);
  const corner = forkPoints([
    { x: tip.x + u.x, y: tip.y + u.y },
    { x: tip.x + u.x + v.x, y: tip.y + u.y + v.y },
    { x: tip.x + v.x, y: tip.y + v.y },
  ]);
  return (
    <figure className={`${base.demo} ${styles.lesson}`} data-detail-lesson="pythagoras">
      <figcaption id={`${id}-title`} className={base.title}>
        {title}
      </figcaption>
      <div className={base.explanation}>
        <svg
          className={styles.forkDrawing}
          viewBox="0 0 480 360"
          role="img"
          aria-labelledby={`${id}-title ${id}-summary`}
        >
          <title>{`Pythagoras fork, step ${step}, angle ${angle} degrees`}</title>
          <polygon points={forkPoints(fork.parent)} className={styles.parentSquare} />
          <text x="240" y="250" textAnchor="middle" className={styles.diagramLabel}>
            Parent
          </text>
          <text x="240" y="275" textAnchor="middle" className={styles.diagramValue}>
            area 1
          </text>
          {step > 0 && (
            <g key={`triangle:${step}`} className={styles.reveal}>
              <polygon points={forkPoints(fork.triangle)} className={styles.triangle} />
              <polyline points={corner} className={styles.rightAngle} />
              <path
                d={`M204 200 A24 24 0 0 0 ${180 + 24 * Math.cos((angle * Math.PI) / 180)} ${200 - 24 * Math.sin((angle * Math.PI) / 180)}`}
                className={styles.rightAngle}
              />
              <text x="210" y="193" className={styles.angleLabel}>
                {`${angle}°`}
              </text>
            </g>
          )}
          {step > 1 && (
            <g key={`children:${step}`} className={styles.reveal}>
              <polygon points={forkPoints(fork.left)} className={styles.leftSquare} />
              <polygon points={forkPoints(fork.right)} className={styles.rightSquare} />
              <text x={left.x} y={left.y + 5} textAnchor="middle" className={styles.diagramValue}>
                {fork.leftArea.toFixed(2)}
              </text>
              <text x={right.x} y={right.y + 5} textAnchor="middle" className={styles.diagramValue}>
                {fork.rightArea.toFixed(2)}
              </text>
            </g>
          )}
        </svg>
        <p id={`${id}-summary`} aria-live="polite" aria-atomic="true">
          {step === 0
            ? "Start with a square of side length 1. Its area is 1."
            : step === 1
              ? "The square's top edge becomes the hypotenuse of a right triangle. The small corner marks its right angle."
              : `The child areas equal ${(fork.leftArea * 100).toFixed(1)}% and ${(fork.rightArea * 100).toFixed(1)}% of the parent's area. Together they have area 1.`}
        </p>
      </div>
      <Steps name={title} step={step} max={2} onChange={setStep} />
      <label className={base.angle}>
        <span>
          Triangle angle <output>{angle}°</output>
        </span>
        <input
          type="range"
          aria-label="Triangle angle"
          min={15}
          max={75}
          value={angle}
          disabled={step === 0}
          onChange={(event) => setAngle(Number(event.target.value))}
        />
      </label>
      {step === 2 && (
        <div className={styles.areaComparison}>
          <div className={styles.areaBar} role="img" aria-label="The two child areas add up to one">
            <span style={{ width: `${fork.leftArea * 100}%` }} />
          </div>
          <p className={base.lessonIntro}>
            Left {fork.leftArea.toFixed(3)} + right {fork.rightArea.toFixed(3)} = 1.000. Move the
            angle to change the split.
          </p>
        </div>
      )}
    </figure>
  );
}

const FERN_RULES = [
  { label: "Stem", chance: "1%", description: "Compress onto the stem." },
  {
    label: "Main copy",
    chance: "85%",
    description: "Shrink, turn slightly, and shift toward the tip.",
  },
  { label: "Left leaflet", chance: "7%", description: "Shrink and turn into the left leaflets." },
  {
    label: "Right leaflet",
    chance: "7%",
    description: "Shrink, reflect, and turn into the right leaflets.",
  },
];
const FERN_TRACE = traceFern(32);
const FERN_REFERENCE = traceFern(1500, 42)
  .slice(50)
  .map(({ point }) => point);
function fernPosition(point: FernPoint) {
  return { x: 150 + point.x * 27, y: 321 - point.y * 29 };
}
function dotPath(points: FernPoint[]) {
  return points
    .map((point) => {
      const p = fernPosition(point);
      return `M${p.x.toFixed(2)} ${p.y.toFixed(2)}h0.1`;
    })
    .join("");
}
const FERN_BACKGROUND = dotPath(FERN_REFERENCE);
const FERN_COPIES = FERN_RULES.map((_, rule) =>
  dotPath(FERN_REFERENCE.map((point) => applyFernRule(point, rule))),
);
const coordinates = (point: FernPoint) => `(${point.x.toFixed(3)}, ${point.y.toFixed(3)})`;

function FernLesson() {
  const [step, setStep] = useState(0);
  const [selectedRule, setSelectedRule] = useState(1);
  const id = useId();
  const title = "Four rules, one moving point";
  const current = FERN_TRACE[step];
  const position = fernPosition(current.point);
  const previous = step > 0 ? FERN_TRACE[step - 1].point : null;
  const changeStep = (next: number) => {
    setStep(next);
  };
  return (
    <figure className={`${base.demo} ${styles.lesson}`} data-detail-lesson="fern">
      <figcaption id={`${id}-title`} className={base.title}>
        {title}
      </figcaption>
      <p className={base.lessonIntro}>
        Preview a rule’s copy in amber. The outlined point follows a separate, fixed replay.
      </p>
      <div className={styles.fernLayout}>
        <svg
          viewBox="0 0 300 350"
          role="img"
          aria-labelledby={`${id}-title ${id}-copy ${id}-summary`}
        >
          <title>{`Barnsley fern, ${FERN_RULES[selectedRule].label}, point step ${step}`}</title>
          <path d={FERN_BACKGROUND} className={styles.fernReference} />
          <path key={selectedRule} d={FERN_COPIES[selectedRule]} className={styles.fernCopy} />
          <polyline
            points={FERN_TRACE.slice(0, step + 1)
              .map(({ point }) => {
                const p = fernPosition(point);
                return `${p.x},${p.y}`;
              })
              .join(" ")}
            className={styles.fernTrail}
          />
          <circle cx={position.x} cy={position.y} r="5" className={styles.fernPoint} />
        </svg>
        <div className={styles.fernControls}>
          <fieldset className={styles.ruleChoices}>
            <legend>Preview a transformation</legend>
            {FERN_RULES.map((rule, index) => (
              <button
                key={rule.label}
                type="button"
                aria-pressed={selectedRule === index}
                onClick={() => setSelectedRule(index)}
              >
                <span>{rule.label}</span>
                <span>{rule.chance}</span>
              </button>
            ))}
          </fieldset>
          <p id={`${id}-copy`} className={base.lessonIntro} aria-live="polite" aria-atomic="true">
            <strong>Preview: {FERN_RULES[selectedRule].label}.</strong>{" "}
            {FERN_RULES[selectedRule].description} Amber shows this rule applied to every point of
            the whole fern.
          </p>
        </div>
      </div>
      <div className={styles.replay}>
        <h3>Replay one point</h3>
        <p id={`${id}-summary`} className={styles.summary} aria-live="polite" aria-atomic="true">
          {previous && current.rule !== null
            ? `Replay step ${step} uses ${FERN_RULES[current.rule].label.toLowerCase()}: ${coordinates(previous)} → ${coordinates(current.point)}.`
            : "Start at (0.000, 0.000). The outlined dot marks the moving point."}
        </p>
      </div>
      <Steps name={title} step={step} max={32} onChange={changeStep} />
      <p className={base.lessonIntro}>
        This example replays one fixed sequence of weighted choices. Each step selects a rule and
        applies it to the previous point. The full explorer keeps making fresh choices.
      </p>
    </figure>
  );
}

export default function ConstructionDetails({ kind }: { kind: DetailKind }) {
  if (kind === "menger") return <MengerLesson />;
  if (kind === "pythagoras") return <PythagorasLesson />;
  return <FernLesson />;
}
