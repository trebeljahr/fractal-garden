import { useMemo, useState } from "react";
import styles from "../../styles/lessons/PaintPlane.module.css";
import type { PlaneBounds } from "../../utils/lessons/paintPlane";
import {
  type ComplexPoint,
  isOutside,
  traceTeachingOrbit,
  traceUntilLoop,
} from "../../utils/orbitLesson";
import { LessonFrame } from "./LessonFrame";
import { coordinates, DistanceChart, OrbitPlane, PaintPlane } from "./PaintPlane";

const ZERO = { real: 0, imaginary: 0 };
// Opens on a spiral with many arms, so the dots show what a route is.
const OPENING = { real: -0.38, imaginary: 0.56 };
// Shows the whole escape circle.
const BOUNDS: PlaneBounds = [-2.8, 2.8, -2.2, 2.2];
// Close enough around the set that its shape fills the plane.
const SET_BOUNDS: PlaneBounds = [-2.25, 0.85, -1.2, 1.2];
// Enough for a spiral's arms to show. More dots only pile up on the ones already drawn.
const ORBIT_JUMPS = 100;

function outcome(jumps: number, crossed: boolean, period: number | undefined) {
  if (crossed) return `Crossed the dashed circle on jump ${jumps}.`;
  if (period === 1) return "Settles on one spot.";
  if (period) return `Repeats every ${period} jumps.`;
  return `Still inside the dashed circle after ${jumps} jumps.`;
}

/** One number's whole route on a plain plane, for hovering from shape to shape. */
export function OrbitShapesLesson() {
  const [value, setValue] = useState<ComplexPoint>(OPENING);
  const { orbit, loop } = useMemo(() => traceUntilLoop(value, ZERO, false, ORBIT_JUMPS), [value]);
  // The route ends at its first repeat. The chart keeps going, so the repeat can be read.
  const chart = useMemo(() => traceTeachingOrbit(value, ZERO, false, ORBIT_JUMPS), [value]);
  const end = orbit[orbit.length - 1];
  return (
    <LessonFrame title="One number's route" kind="orbit-shapes">
      <div className={styles.lesson}>
        <OrbitPlane
          bounds={BOUNDS}
          value={value}
          onChange={setValue}
          route={orbit}
          label="Number c"
        />
        <p className={styles.readout} data-orbit-outcome>
          c = {coordinates(value)}. {outcome(orbit.length - 1, isOutside(end.point), loop?.period)}
        </p>
        <DistanceChart route={chart} />
      </div>
    </LessonFrame>
  );
}

export default function PaintLesson() {
  const [value, setValue] = useState<ComplexPoint>(OPENING);
  const { orbit } = useMemo(() => traceUntilLoop(value, ZERO, false, ORBIT_JUMPS), [value]);
  return (
    <LessonFrame title="Color in the plane" kind="paint-mandelbrot">
      <PaintPlane
        bounds={SET_BOUNDS}
        value={value}
        onChange={setValue}
        route={orbit}
        label="Number c"
      />
    </LessonFrame>
  );
}
