import { useState } from "react";
import common from "../../styles/lessons/Lesson.module.css";
import styles from "../../styles/lessons/PenroseLesson.module.css";
import {
  getPenroseLessonCut,
  getPenroseLessonSecondCut,
  getPenroseLessonStages,
  type PenroseLessonParent,
} from "../../utils/lessons/penroseLesson";
import { deflateP2, type RobinsonTriangle } from "../../utils/penroseTiling";
import { LessonFrame, LessonSteps } from "./LessonFrame";

const STAGES = {
  acute: getPenroseLessonStages("acute", deflateP2),
  obtuse: getPenroseLessonStages("obtuse", deflateP2),
};
// Past this many steps the lines would hide the triangles.
const THIN_LINES_FROM = 4;

function frame(parent: RobinsonTriangle) {
  const points = [parent.a, parent.b, parent.c];
  const minX = Math.min(...points.map(([x]) => x));
  const maxX = Math.max(...points.map(([x]) => x));
  const maxY = Math.max(...points.map(([, y]) => y));
  const scale = Math.min(460 / (maxX - minX), 290 / maxY);
  const left = (500 - (maxX - minX) * scale) / 2;
  return ([x, y]: [number, number]) => ({ x: left + (x - minX) * scale, y: 310 - y * scale });
}

const counts = (triangles: RobinsonTriangle[]) => {
  const narrow = triangles.filter(({ type }) => type === 0).length;
  return { narrow, wide: triangles.length - narrow };
};

export default function PenroseLesson() {
  const [kind, setKind] = useState<PenroseLessonParent>("acute");
  const [step, setStep] = useState(1);
  const stages = STAGES[kind];
  const parent = stages[0][0];
  const project = frame(parent);
  const polygon = ({ a, b, c }: RobinsonTriangle) =>
    [a, b, c]
      .map((point) => {
        const p = project(point);
        return `${p.x},${p.y}`;
      })
      .join(" ");
  const cuts = [getPenroseLessonCut(parent), getPenroseLessonSecondCut(parent)].flatMap((cut) =>
    cut ? [project(cut)] : [],
  );
  const lineWidth = step >= THIN_LINES_FROM ? 0.5 : 1.2;
  return (
    <LessonFrame title="Divide and count" kind="penrose">
      <fieldset className={common.options} aria-label="Starting triangle">
        <button type="button" aria-pressed={kind === "acute"} onClick={() => setKind("acute")}>
          Narrow triangle
        </button>
        <button type="button" aria-pressed={kind === "obtuse"} onClick={() => setKind("obtuse")}>
          Wide triangle
        </button>
      </fieldset>
      <div className={styles.layout}>
        <svg
          viewBox="0 0 500 330"
          role="img"
          aria-label={`${kind === "acute" ? "Narrow" : "Wide"} starting triangle after ${step} divisions.`}
        >
          {stages[step].map((triangle) => (
            <polygon
              key={`${triangle.type}:${triangle.a}:${triangle.b}:${triangle.c}`}
              points={polygon(triangle)}
              className={triangle.type === 0 ? styles.acute : styles.obtuse}
              style={{ strokeWidth: lineWidth }}
            />
          ))}
          <polygon points={polygon(parent)} className={styles.parent} />
          {step === 1 &&
            cuts.map(({ x, y }) => (
              <circle key={`${x},${y}`} cx={x} cy={y} r="4" className={common.point} />
            ))}
        </svg>
        <table className={styles.counts}>
          <thead>
            <tr>
              <th scope="col">Step</th>
              <th scope="col" className={styles.narrow}>
                Narrow
              </th>
              <th scope="col">Wide</th>
              <th scope="col">Narrow ÷ wide</th>
            </tr>
          </thead>
          <tbody data-penrose-counts>
            {stages.slice(0, step + 1).map((triangles, index) => {
              const { narrow, wide } = counts(triangles);
              return (
                // biome-ignore lint/suspicious/noArrayIndexKey: A row is one step, in order.
                <tr key={index} data-current={index === step || undefined}>
                  <td>{index}</td>
                  <td className={styles.narrow}>{narrow}</td>
                  <td>{wide}</td>
                  <td>{wide && narrow ? Number((narrow / wide).toFixed(4)) : "−"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <LessonSteps
        label="Penrose division"
        step={step}
        max={stages.length - 1}
        onChange={setStep}
      />
    </LessonFrame>
  );
}
