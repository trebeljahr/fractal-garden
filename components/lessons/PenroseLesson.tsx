import { useId, useState } from "react";
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

function frame(parent: RobinsonTriangle) {
  const points = [parent.a, parent.b, parent.c];
  const minX = Math.min(...points.map(([x]) => x));
  const maxX = Math.max(...points.map(([x]) => x));
  const maxY = Math.max(...points.map(([, y]) => y));
  const scale = Math.min(420 / (maxX - minX), 245 / maxY);
  const left = (500 - (maxX - minX) * scale) / 2;
  return ([x, y]: [number, number]) => ({ x: left + (x - minX) * scale, y: 292 - y * scale });
}

export default function PenroseLesson() {
  const [kind, setKind] = useState<PenroseLessonParent>("acute");
  const [step, setStep] = useState(0);
  const id = useId();
  const stages = STAGES[kind];
  const parent = stages[0][0];
  const triangles = stages[step];
  const acute = triangles.filter((triangle) => triangle.type === 0).length;
  const obtuse = triangles.length - acute;
  const project = frame(parent);
  const polygon = ({ a, b, c }: RobinsonTriangle) =>
    [a, b, c]
      .map((point) => {
        const p = project(point);
        return `${p.x},${p.y}`;
      })
      .join(" ");
  const cut = project(getPenroseLessonCut(parent));
  const secondCut = getPenroseLessonSecondCut(parent);
  const q = secondCut && project(secondCut);
  const centroid = project([
    (parent.a[0] + parent.b[0] + parent.c[0]) / 3,
    (parent.a[1] + parent.b[1] + parent.c[1]) / 3,
  ]);
  const labelPosition = (point: { x: number; y: number }) => {
    const length = Math.hypot(point.x - centroid.x, point.y - centroid.y);
    return {
      x: point.x + ((point.x - centroid.x) / length) * 15,
      y: point.y + ((point.y - centroid.y) / length) * 15 + 5,
    };
  };
  const cutLabel = labelPosition(cut);
  const qLabel = q && labelPosition(q);
  const summary =
    step === 0
      ? `Start with one ${kind === "acute" ? "narrow" : "wide"} triangle.`
      : `${acute} narrow ${acute === 1 ? "triangle" : "triangles"} and ${obtuse} wide ${obtuse === 1 ? "triangle" : "triangles"} fill the original triangle. Its outside edges stay in place.`;
  const choose = (next: PenroseLessonParent) => {
    setKind(next);
    setStep(0);
  };
  return (
    <LessonFrame title="Find the same two shapes inside" kind="penrose">
      <p>
        Take one step and look for smaller copies of the starting triangle. Then try the other
        shape.
      </p>
      <fieldset className={common.options} aria-label="Penrose parent triangle">
        <button type="button" aria-pressed={kind === "acute"} onClick={() => choose("acute")}>
          Narrow triangle
        </button>
        <button type="button" aria-pressed={kind === "obtuse"} onClick={() => choose("obtuse")}>
          Wide triangle
        </button>
      </fieldset>
      <div className={common.grid}>
        <svg viewBox="0 0 500 330" role="img" aria-labelledby={`${id}-title ${id}-summary`}>
          <title
            id={`${id}-title`}
          >{`Penrose triangle division, ${kind === "acute" ? "narrow" : "wide"} starting triangle, step ${step}`}</title>
          <g key={`${kind}:${step}`} className={common.reveal}>
            {triangles.map((triangle) => (
              <polygon
                key={`${triangle.type}:${triangle.a}:${triangle.b}:${triangle.c}`}
                points={polygon(triangle)}
                className={triangle.type === 0 ? styles.acute : styles.obtuse}
              />
            ))}
          </g>
          <polygon points={polygon(parent)} className={styles.parent} />
          {(["a", "b", "c"] as const).map((name) => {
            const label = labelPosition(project(parent[name]));
            return (
              <text key={name} x={label.x} y={label.y} textAnchor="middle" className={styles.label}>
                {name.toUpperCase()}
              </text>
            );
          })}
          {step > 0 && (
            <>
              {q && qLabel && (
                <>
                  <circle cx={q.x} cy={q.y} r="4" className={common.point} />
                  <text x={qLabel.x} y={qLabel.y} textAnchor="middle" className={styles.label}>
                    Q
                  </text>
                </>
              )}
              <circle cx={cut.x} cy={cut.y} r="4" className={common.point} />
              <text x={cutLabel.x} y={cutLabel.y} textAnchor="middle" className={styles.label}>
                P
              </text>
            </>
          )}
        </svg>
        <div>
          <p id={`${id}-summary`} aria-live="polite" aria-atomic="true">
            {summary}
          </p>
          <p className={styles.legend}>
            <span className={styles.acuteKey}>Amber: narrow</span>
            <span>Cream: wide</span>
            <span>Dashed line: original boundary</span>
          </p>
          {step > 0 && (
            <p>
              {kind === "acute"
                ? "The new edges run from C to P, then from P to Q. They divide the narrow triangle into three smaller triangles."
                : "The line from A to P divides the wide triangle into two smaller triangles."}{" "}
              {step > 1 && "The marked points still show the first division."}
            </p>
          )}
        </div>
      </div>
      <LessonSteps label="Penrose subdivision" step={step} max={3} onChange={setStep} />
      <p>
        Both starting shapes produce the same two kinds of smaller triangle. Each kind has its own
        rule, so the next division depends on which shape it is.
      </p>
    </LessonFrame>
  );
}
