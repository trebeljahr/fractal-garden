import { useMemo, useState } from "react";
import styles from "../../styles/lessons/ReadoutStage.module.css";
import { useReducedMotion } from "../../utils/hooks/useReducedMotion";
import {
  ADDED_TINT,
  HALF_TURN_RULES,
  REMOVED_TINT,
  replacementPoints,
} from "../../utils/lessons/halfTurnArea";
import { LessonFrame } from "./LessonFrame";

// The explorer's colors.
const BACKGROUND = "#252424";
const GUIDE = "#eee8ce";

const polyline = (points: number[][]) =>
  points.map(([x, y], i) => `${i ? "L" : "M"}${x} ${-y}`).join("");

export default function HalfTurnLesson({ rule: name }: { rule: string }) {
  const rule = HALF_TURN_RULES[name];
  const [turns, setTurns] = useState(0);
  const reduced = useReducedMotion();
  const points = useMemo(() => replacementPoints(rule), [rule]);
  const middle = (points.length - 1) / 2;
  const [first, second] = [points.slice(0, middle + 1), points.slice(middle)];
  const [firstTint, secondTint] =
    rule.firstDetour === "removed" ? [REMOVED_TINT, ADDED_TINT] : [ADDED_TINT, REMOVED_TINT];
  // Tall enough that the line stays in the frame all the way around.
  const reach = rule.shrink / 2 + 0.5;
  const gridLines = Array.from({ length: 2 * reach }, (_, i) => i - reach + 0.5);
  const squares = `${rule.detourSquares} small ${rule.detourSquares === 1 ? "square" : "squares"}`;
  return (
    <LessonFrame title="Turn one replacement" kind={`half-turn-${name}`}>
      <div className={styles.layout}>
        <svg
          viewBox={`${-reach} ${-reach} ${2 * reach} ${2 * reach}`}
          role="img"
          data-half-turns={turns}
          aria-label={`One replacement and the old line it replaces, turned ${turns} half turns around its middle point.`}
        >
          <rect x={-reach} y={-reach} width={2 * reach} height={2 * reach} fill={BACKGROUND} />
          {gridLines.map((at) => (
            <g key={at} stroke={GUIDE} strokeOpacity="0.12" strokeWidth="0.015">
              <line x1={at} x2={at} y1={-reach} y2={reach} />
              <line x1={-reach} x2={reach} y1={at} y2={at} />
            </g>
          ))}
          <line
            x1={-rule.shrink / 2}
            x2={rule.shrink / 2}
            stroke={GUIDE}
            strokeOpacity="0.4"
            strokeWidth="0.03"
          />
          <path
            d={polyline(points)}
            fill="none"
            stroke={GUIDE}
            strokeOpacity="0.45"
            strokeWidth="0.03"
            strokeDasharray="0.12 0.12"
          />
          <g
            style={{
              transform: `rotate(${turns * 180}deg)`,
              transition: reduced ? "none" : "transform 0.9s ease-in-out",
            }}
          >
            <path d={`${polyline(first)}Z`} fill={firstTint} fillOpacity="0.6" />
            <path d={`${polyline(second)}Z`} fill={secondTint} fillOpacity="0.6" />
            <path
              d={polyline(points)}
              fill="none"
              stroke={rule.color}
              strokeWidth="0.05"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </g>
          <circle r="0.12" fill={BACKGROUND} stroke={GUIDE} strokeWidth="0.04" />
        </svg>
        <div className={styles.side}>
          <dl className={styles.readout}>
            <div>
              <dt>Removed</dt>
              <dd style={{ color: REMOVED_TINT }}>{squares}</dd>
            </div>
            <div>
              <dt>Added</dt>
              <dd style={{ color: ADDED_TINT }}>{squares}</dd>
            </div>
          </dl>
          <button type="button" onClick={() => setTurns(turns + 1)}>
            Half turn
          </button>
        </div>
      </div>
    </LessonFrame>
  );
}
