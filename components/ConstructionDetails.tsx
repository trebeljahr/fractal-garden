import { useId, useState } from "react";
import base from "../styles/ConstructionDemo.module.css";
import styles from "../styles/ConstructionDetails.module.css";
import { mengerLayers } from "../utils/menger";
import { type ForkPoint, pythagorasFork } from "../utils/pythagorasFork";
import { LessonSteps } from "./lessons/LessonFrame";

export type DetailKind = "menger" | "pythagoras";
export function isDetailKind(value: unknown): value is DetailKind {
  return value === "menger" || value === "pythagoras";
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
  return (
    <LessonSteps step={step} max={max} onChange={onChange} label={name} duration={max * 1500} />
  );
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
                    style={{ animationDelay: `${index * 120}ms` }}
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
  const [forward, setForward] = useState(false);
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
    <figure
      className={`${base.demo} ${styles.lesson}`}
      data-detail-lesson="pythagoras"
      data-motion={forward}
    >
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
            <g key="triangle">
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
            <g key="children">
              {[fork.left, fork.right].map((square, index) => {
                const anchor = forkPoints([square[0]]).replace(",", " ");
                const dx = square[1].x - square[0].x;
                const dy = square[1].y - square[0].y;
                const size = Math.hypot(dx, dy) * 120;
                return (
                  <g
                    key={index === 0 ? "left" : "right"}
                    transform={`translate(${anchor}) rotate(${(-Math.atan2(dy, dx) * 180) / Math.PI})`}
                  >
                    <rect
                      x={0}
                      y={-size}
                      width={size}
                      height={size}
                      className={index === 0 ? styles.leftSquare : styles.rightSquare}
                      style={{ animationDelay: `${index * 180}ms` }}
                    />
                  </g>
                );
              })}
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
      <Steps
        key={angle}
        name={title}
        step={step}
        max={2}
        onChange={(next) => {
          setForward(next > step);
          setStep(next);
        }}
      />
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
          onChange={(event) => {
            setForward(false);
            setAngle(Number(event.target.value));
          }}
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

export default function ConstructionDetails({ kind }: { kind: DetailKind }) {
  if (kind === "menger") return <MengerLesson />;
  return <PythagorasLesson />;
}
