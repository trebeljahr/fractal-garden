import { useId, useMemo, useState } from "react";
import styles from "../../styles/lessons/AttractorLesson.module.css";
import shared from "../../styles/lessons/Lesson.module.css";
import {
  ATTRACTOR_LESSONS,
  type AttractorPoint,
  type AttractorProjection,
  type AttractorSystem,
  NEARBY_START_OFFSET,
  pointSeparation,
  sampleTrace,
  traceAttractor,
} from "../../utils/lessons/attractorLesson";
import { LessonFrame, LessonSteps } from "./LessonFrame";

function projectionFit(paths: AttractorPoint[][], projection: AttractorProjection) {
  const vertical = projection === "xz" ? 2 : 1;
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const points of paths) {
    for (const point of points) {
      minX = Math.min(minX, point[0]);
      maxX = Math.max(maxX, point[0]);
      minY = Math.min(minY, point[vertical]);
      maxY = Math.max(maxY, point[vertical]);
    }
  }
  const scale = Math.min(420 / Math.max(1, maxX - minX), 230 / Math.max(1, maxY - minY));
  const center = [(minX + maxX) / 2, (minY + maxY) / 2];
  const project = (point: AttractorPoint) => ({
    x: 260 + (point[0] - center[0]) * scale,
    y: 150 - (point[vertical] - center[1]) * scale,
  });
  return { project, minX, maxX, minY, maxY, vertical };
}

const coordinates = (point: AttractorPoint) => point.map((value) => value.toFixed(3)).join(", ");
const distanceLabel = (value: number) => (value < 0.01 ? value.toExponential(2) : value.toFixed(3));

export default function AttractorLesson({ system }: { system: AttractorSystem }) {
  const config = ATTRACTOR_LESSONS[system];
  const [step, setStep] = useState(0);
  const [compare, setCompare] = useState(false);
  const [projection, setProjection] = useState<AttractorProjection>(config.projection);
  const id = useId();
  const traces = useMemo(() => {
    const nextStart: AttractorPoint = [...config.start];
    nextStart[0] += NEARBY_START_OFFSET;
    const count = config.batchSteps * config.batches;
    return {
      reference: traceAttractor(system, config.start, count, config.dt),
      nearby: traceAttractor(system, nextStart, count, config.dt),
    };
  }, [system, config]);
  const fit = useMemo(
    () => projectionFit([traces.reference, traces.nearby], projection),
    [traces, projection],
  );
  const index = Math.min(
    step * config.batchSteps,
    traces.reference.length - 1,
    traces.nearby.length - 1,
  );
  const current = traces.reference[index];
  const nearby = traces.nearby[index];
  const head = fit.project(current);
  const otherHead = fit.project(nearby);
  const batchStart = Math.max(0, index - config.batchSteps);
  const tracePath = (points: AttractorPoint[], start = 0) =>
    sampleTrace(points.slice(start, index + 1), index - start, config.pathStride)
      .map((point, order) => {
        const p = fit.project(point);
        return `${order ? "L" : "M"}${p.x.toFixed(2)},${p.y.toFixed(2)}`;
      })
      .join(" ");
  const xStart = fit.project([fit.minX, 0, 0]);
  const xEnd = fit.project([fit.maxX, 0, 0]);
  const yStartPoint: AttractorPoint = [0, 0, 0];
  const yEndPoint: AttractorPoint = [0, 0, 0];
  yStartPoint[fit.vertical] = fit.minY;
  yEndPoint[fit.vertical] = fit.maxY;
  const yStart = fit.project(yStartPoint);
  const yEnd = fit.project(yEndPoint);
  return (
    <LessonFrame
      title={
        system === "lorenz"
          ? "How long do nearby starts stay together?"
          : "A spiral seen from two sides"
      }
      kind={system}
      className={system === "lorenz" ? styles.lorenz : styles.rossler}
    >
      <fieldset className={shared.options} aria-label="View">
        <button
          type="button"
          aria-pressed={projection === "xz"}
          onClick={() => setProjection("xz")}
        >
          x–z view
        </button>
        <button
          type="button"
          aria-pressed={projection === "xy"}
          onClick={() => setProjection("xy")}
        >
          x–y view
        </button>
      </fieldset>
      <div className={shared.grid}>
        <svg viewBox="0 0 520 320" role="img" aria-labelledby={`${id}-plot ${id}-summary`}>
          <title
            id={`${id}-plot`}
          >{`${config.name} trajectory, ${projection === "xz" ? "x–z" : "x–y"} projection at model time ${(index * config.dt).toFixed(2)}`}</title>
          <path
            d={`M${xStart.x},${xStart.y}L${xEnd.x},${xEnd.y}M${yStart.x},${yStart.y}L${yEnd.x},${yEnd.y}`}
            className={shared.axis}
          />
          <text x={xEnd.x + 10} y={xEnd.y + 5} className={shared.label}>
            x
          </text>
          <text x={yEnd.x + 8} y={yEnd.y - 8} className={shared.label}>
            {projection === "xz" ? "z" : "y"}
          </text>
          <path d={tracePath(traces.reference)} className={styles.history} />
          {compare && <path d={tracePath(traces.nearby)} className={styles.nearbyHistory} />}
          <path d={tracePath(traces.reference, batchStart)} className={styles.current} />
          {compare && <path d={tracePath(traces.nearby, batchStart)} className={styles.nearby} />}
          <circle cx={head.x} cy={head.y} r="4.5" className={styles.head} />
          {compare && (
            <circle cx={otherHead.x} cy={otherHead.y} r="6" className={styles.nearbyHead} />
          )}
        </svg>
        <div id={`${id}-summary`} aria-live="polite" aria-atomic="true">
          <p>Time {(index * config.dt).toFixed(2)}</p>
          <p>Point ({coordinates(current)})</p>
          {compare && <p>Distance {distanceLabel(pointSeparation(current, nearby))}</p>}
        </div>
      </div>
      <LessonSteps
        label={`${config.name} trajectory batch`}
        step={step}
        max={config.batches}
        onChange={setStep}
      />
      <label className={styles.compare}>
        <input
          type="checkbox"
          checked={compare}
          onChange={(event) => setCompare(event.target.checked)}
        />
        Compare a nearby start
      </label>
    </LessonFrame>
  );
}
