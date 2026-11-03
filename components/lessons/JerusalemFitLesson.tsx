import { useMemo, useState } from "react";
import common from "../../styles/lessons/Lesson.module.css";
import styles from "../../styles/lessons/ReadoutStage.module.css";
import {
  edgeCube,
  edgeMisfits,
  edgeTotal,
  JERUSALEM_FIT,
  jerusalemFace,
  snapToFit,
} from "../../utils/lessons/jerusalemFit";
import { LessonFrame } from "./LessonFrame";

// The explorer's colors.
const BACKGROUND = "#252424";
const FILL = "#b994f2";
const STROKE = "#efe4ff";
const MISFIT = "#f5c56d";
const FRAME = "#eee8ce";
const MARGIN = 7;
const UNIT = 100 - 2 * MARGIN;
const at = (value: number) => MARGIN + value * UNIT;

export default function JerusalemFitLesson() {
  const [k, setK] = useState(0.36);
  const face = useMemo(() => jerusalemFace(k), [k]);
  const { depth, stretches } = edgeMisfits(k);
  const total = edgeTotal(k);
  const fits = k === JERUSALEM_FIT;
  const square = ({ x, y, size }: { x: number; y: number; size: number }) => ({
    x: at(x),
    y: at(y),
    width: size * UNIT,
    height: size * UNIT,
  });
  const leftOver = Math.abs(1 - total).toFixed(3);
  return (
    <LessonFrame title="Fit one edge" kind="jerusalem-fit">
      <div className={styles.layout}>
        <svg
          viewBox="0 0 100 100"
          role="img"
          aria-label={`One face of the cube. Corner cubes ${k.toFixed(3)} wide and edge cubes ${edgeCube(k).toFixed(3)} wide add up to ${total.toFixed(3)} along an edge.`}
        >
          <rect width="100" height="100" fill={BACKGROUND} />
          <rect
            x={at(0)}
            y={at(0)}
            width={UNIT}
            height={UNIT}
            fill="none"
            stroke={FRAME}
            strokeWidth="0.4"
          />
          {[...face.corners, ...face.edges].map((piece) => (
            <rect
              key={`${piece.x}:${piece.y}:${piece.size}`}
              {...square(piece)}
              fill={FILL}
              fillOpacity="0.85"
              stroke={STROKE}
              strokeWidth="0.25"
            />
          ))}
          {face.next.map((piece) => (
            <rect
              key={`${piece.x}:${piece.y}`}
              {...square(piece)}
              fill="none"
              stroke={STROKE}
              strokeOpacity="0.6"
              strokeWidth="0.2"
            />
          ))}
          {stretches.flatMap(([from, to]) => {
            const length = to - from;
            return [
              { x: from, y: 0, width: length, height: depth },
              { x: from, y: 1 - depth, width: length, height: depth },
              { x: 0, y: from, width: depth, height: length },
              { x: 1 - depth, y: from, width: depth, height: length },
            ].map((mark) => (
              <rect
                key={`${mark.x}:${mark.y}`}
                data-jerusalem-misfit
                x={at(mark.x)}
                y={at(mark.y)}
                width={mark.width * UNIT}
                height={mark.height * UNIT}
                fill={MISFIT}
              />
            ));
          })}
        </svg>
        <div className={styles.side}>
          <dl className={styles.readout} data-jerusalem-readout>
            <div>
              <dt>Corner cube</dt>
              <dd>{k.toFixed(3)}</dd>
            </div>
            <div>
              <dt>Edge cube</dt>
              <dd>{edgeCube(k).toFixed(3)}</dd>
            </div>
            <div>
              <dt>Corner + edge + corner</dt>
              <dd>{total.toFixed(3)}</dd>
            </div>
            <div>
              <dt>Along each edge</dt>
              <dd>{fits ? "Fits" : total < 1 ? `${leftOver} gap` : `${leftOver} overlap`}</dd>
            </div>
          </dl>
          <label className={common.parameter}>
            <span>
              Corner cube width
              <output>{k.toFixed(3)}</output>
            </span>
            <input
              type="range"
              aria-label="Corner cube width"
              min={0.3}
              max={0.5}
              step={0.001}
              value={k}
              onChange={(event) => setK(snapToFit(Number(event.target.value)))}
            />
          </label>
        </div>
      </div>
    </LessonFrame>
  );
}
