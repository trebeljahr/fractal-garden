import { type PointerEvent, useId, useState } from "react";
import styles from "../../styles/lessons/OrbitPlane.module.css";
import { usePointPicker } from "../../utils/hooks/usePointPicker";
import { squaringChain, squaringFate } from "../../utils/lessons/orbitPlane";
import { LessonFrame } from "./LessonFrame";

const LEFT = -2.5;
const RIGHT = 2.5;
const WIDTH = 720;
const HEIGHT = 170;
const AXIS = 125;
const STAYS = "#f5c56d";
const GROWS = "#9fb3c8";
const INK = "#eee8ce";
// A hop shorter than this would be only an arrowhead.
const SHORTEST_HOP = 3;

const px = (x: number) => ((x - LEFT) / (RIGHT - LEFT)) * WIDTH;
const snap = (x: number) => Number(Math.max(LEFT, Math.min(RIGHT, x)).toFixed(2));

function answer(value: number) {
  const shown =
    Number.isInteger(value) && Math.abs(value) < 1e12 ? value : Number(value.toPrecision(3));
  return String(shown).replace("-", "−");
}

function hopPath(from: number, to: number) {
  const x0 = px(from);
  const x1 = px(Math.min(to, RIGHT));
  const rise = Math.min(90, 14 + Math.abs(x1 - x0) * 0.4);
  return `M${x0} ${AXIS}Q${(x0 + x1) / 2} ${AXIS - rise * 2} ${x1} ${to > RIGHT ? AXIS - rise : AXIS}`;
}

export default function SquareLineLesson() {
  const [value, setValue] = useState(0.5);
  const id = useId().replace(/:/g, "");
  const chain = squaringChain(value);
  const fate = squaringFate(value);
  const color = Math.abs(value) > 1 ? GROWS : STAYS;
  const picker = usePointPicker({
    under: (event: PointerEvent<HTMLButtonElement>) => {
      const rect = event.currentTarget.getBoundingClientRect();
      return snap(LEFT + ((event.clientX - rect.left) / rect.width) * (RIGHT - LEFT));
    },
    onChange: setValue,
  });
  const hops = chain.slice(1).flatMap((to, index) => {
    const from = chain[index];
    if (from > RIGHT || Math.abs(px(Math.min(to, RIGHT)) - px(from)) < SHORTEST_HOP) return [];
    return [{ from, to }];
  });
  return (
    <LessonFrame title="Keep squaring a number" kind="square-line">
      <button
        type="button"
        className={styles.line}
        aria-label={`Starting number ${answer(value)}. ${fate}. Drag or use the arrow keys.`}
        data-square-line
        {...picker}
        onPointerDownCapture={(event) => event.currentTarget.focus({ preventScroll: true })}
        onKeyDown={(event) => {
          if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
          event.preventDefault();
          const step = event.shiftKey ? 0.1 : 0.01;
          setValue(snap(value + (event.key === "ArrowLeft" ? -step : step)));
        }}
      >
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} aria-hidden="true">
          <defs>
            <marker
              id={`${id}-arrow`}
              markerWidth="8"
              markerHeight="8"
              refX="6"
              refY="3"
              orient="auto"
              markerUnits="strokeWidth"
            >
              <path d="M0 0L6 3L0 6Z" fill={color} />
            </marker>
          </defs>
          <path d={`M0 ${AXIS}H${WIDTH}`} stroke={`${INK}80`} />
          {[-2, -1, 0, 1, 2].map((tick) => (
            <g key={tick}>
              <path d={`M${px(tick)} ${AXIS - 6}V${AXIS + 6}`} stroke={`${INK}80`} />
              <text x={px(tick)} y={AXIS + 26} textAnchor="middle" className={styles.tick}>
                {String(tick).replace("-", "−")}
              </text>
            </g>
          ))}
          {hops.map(({ from, to }) => (
            <path
              key={`${from}:${to}`}
              d={hopPath(from, to)}
              fill="none"
              stroke={color}
              strokeWidth="2"
              markerEnd={`url(#${id}-arrow)`}
            />
          ))}
          <circle cx={px(value)} cy={AXIS} r="10" fill="none" stroke="#10151a" strokeWidth="5" />
          <circle cx={px(value)} cy={AXIS} r="10" fill="none" stroke={INK} strokeWidth="2.5" />
        </svg>
      </button>
      <p className={styles.chain} data-line-chain>
        {chain.map(answer).join(" → ")} → …
      </p>
      <p className={styles.fate} data-line-fate>
        {fate}
      </p>
    </LessonFrame>
  );
}
