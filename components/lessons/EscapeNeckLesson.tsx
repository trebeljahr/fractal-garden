import { useEffect, useMemo, useRef, useState } from "react";
import common from "../../styles/lessons/Lesson.module.css";
import styles from "../../styles/lessons/PaintPlane.module.css";
import { useReducedMotion } from "../../utils/hooks/useReducedMotion";
import type { PlaneBounds } from "../../utils/lessons/paintPlane";
import { traceTeachingOrbit } from "../../utils/orbitLesson";
import { LessonFrame } from "./LessonFrame";
import { DistanceChart, drawPlane, number, planeHeight } from "./PaintPlane";

const ZERO = { real: 0, imaginary: 0 };
const BOUNDS: PlaneBounds = [-2.8, 2.8, -2.2, 2.2];
const DISTANCES = [0.1, 0.01, 0.001, 0.0001];
const MOST_JUMPS = 40000;
const PLAY_MS = 5000;

export default function EscapeNeckLesson() {
  const [distance, setDistance] = useState(DISTANCES[0]);
  const [run, setRun] = useState(0);
  const [shown, setShown] = useState(0);
  const plane = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();
  const route = useMemo(
    () => traceTeachingOrbit({ real: -0.75, imaginary: distance }, ZERO, false, MOST_JUMPS),
    [distance],
  );
  // biome-ignore lint/correctness/useExhaustiveDependencies: a new run plays the route again
  useEffect(() => {
    if (reduced) {
      setShown(route.length);
      return;
    }
    const begun = performance.now();
    let frame = requestAnimationFrame(function tick(now) {
      const t = Math.min(1, (now - begun) / PLAY_MS);
      setShown(Math.max(2, Math.ceil(t * route.length)));
      if (t < 1) frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [route, run, reduced]);
  useEffect(() => {
    const canvas = plane.current;
    if (!canvas) return;
    const draw = () => drawPlane(canvas, BOUNDS, { route, shown, circle: true });
    draw();
    const resized = new ResizeObserver(draw);
    resized.observe(canvas);
    return () => resized.disconnect();
  }, [route, shown]);
  const jumps = route.length - 1;
  const finished = shown >= route.length;
  return (
    <LessonFrame title="How long until it leaves" kind="escape-neck">
      <div className={common.options}>
        {DISTANCES.map((option) => (
          <button
            type="button"
            key={option}
            aria-pressed={option === distance}
            onClick={() => {
              setDistance(option);
              setRun(run + 1);
            }}
          >
            {option}
          </button>
        ))}
      </div>
      <div className={styles.neck}>
        <canvas
          ref={plane}
          className={styles.overlay}
          width={900}
          height={planeHeight(BOUNDS, 900)}
          role="img"
          aria-label={`The route of a point ${distance} above −0.75. It crosses the dashed circle on jump ${jumps}.`}
        />
      </div>
      <p className={styles.readout} data-escape-jumps={jumps}>
        {finished
          ? `Crossed the dashed circle on jump ${jumps}. ${jumps} × ${distance} = ${number(jumps * distance, 4)}.`
          : `Jump ${Math.max(0, shown - 1)}`}
      </p>
      <DistanceChart route={route} shown={shown} />
    </LessonFrame>
  );
}
