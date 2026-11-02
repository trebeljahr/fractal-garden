import { useId, useMemo, useState } from "react";
import common from "../../styles/lessons/Lesson.module.css";
import styles from "../../styles/lessons/PaintPlane.module.css";
import { JULIA_PRESETS } from "../../utils/escapeTimePlaces";
import { PAINT_JUMPS, type PlaneBounds, STAYED } from "../../utils/lessons/paintPlane";
import { type ComplexPoint, isOutside, traceTeachingOrbit } from "../../utils/orbitLesson";
import { ToggleSwitch } from "../PanelPickers";
import { LessonFrame } from "./LessonFrame";
import { coordinates, cssColor, DistanceChart, markColor, PaintPlane } from "./PaintPlane";

export type PaintKind = "paint-squaring" | "paint-julia" | "paint-mandelbrot";

const ZERO = { real: 0, imaginary: 0 };
const RABBIT = { real: JULIA_PRESETS.Rabbit.cReal, imaginary: JULIA_PRESETS.Rabbit.cImag };
// Each plane shows its whole escape circle.
const BOUNDS: PlaneBounds = [-2.8, 2.8, -2.2, 2.2];
const ROUTE_SHAPES: { name: string; c: ComplexPoint }[] = [
  { name: "Three arms", c: RABBIT },
  { name: "Seven arms", c: { real: 0.3768, imaginary: 0.145 } },
  { name: "Spiral", c: { real: -0.3782, imaginary: 0.5619 } },
  { name: "Ring", c: { real: -0.391, imaginary: 0.587 } },
  { name: "On a line", c: { real: -1.7, imaginary: 0 } },
  { name: "Leaves late", c: { real: -0.56, imaginary: 0.64 } },
];
const LESSONS: Record<
  PaintKind,
  { fixedC: ComplexPoint | null; first: ComplexPoint; shapes?: boolean; steps?: boolean }
> = {
  "paint-squaring": { fixedC: ZERO, first: { real: 0.8, imaginary: 0.55 } },
  "paint-julia": { fixedC: RABBIT, first: { real: 0.3, imaginary: 0.45 } },
  "paint-mandelbrot": { fixedC: null, first: RABBIT, shapes: true, steps: true },
};

export default function PaintLesson({ kind }: { kind: PaintKind }) {
  const { fixedC, first, shapes, steps } = LESSONS[kind];
  const [value, setValue] = useState(first);
  const [stepColors, setStepColors] = useState(false);
  const id = useId();
  const route = useMemo(
    () =>
      fixedC
        ? traceTeachingOrbit(fixedC, value, false, PAINT_JUMPS)
        : traceTeachingOrbit(value, ZERO, false, PAINT_JUMPS),
    [fixedC, value],
  );
  const end = route[route.length - 1];
  const crossed = isOutside(end.point);
  const mark = markColor(crossed ? end.iteration : STAYED, stepColors);
  return (
    <LessonFrame title="Color in the plane" kind={kind}>
      <div className={styles.lesson}>
        {shapes && (
          <div className={common.options} data-paint-shapes>
            {ROUTE_SHAPES.map(({ name, c }) => (
              <button
                type="button"
                key={name}
                aria-pressed={value === c}
                onClick={() => setValue(c)}
              >
                {name}
              </button>
            ))}
          </div>
        )}
        <PaintPlane
          bounds={BOUNDS}
          fixedC={fixedC}
          value={value}
          onChange={setValue}
          route={route}
          circle
          stepColors={stepColors}
          label={fixedC ? "Starting point" : "Number c"}
        >
          {steps && (
            <label className={styles.mode} htmlFor={`${id}-switch`}>
              <span className={stepColors ? undefined : styles.active}>Two colors</span>
              <ToggleSwitch
                id={`${id}-switch`}
                checked={stepColors}
                labelledBy={`${id}-label`}
                onChange={setStepColors}
              />
              <span id={`${id}-label`} className={stepColors ? styles.active : undefined}>
                Step colors
              </span>
            </label>
          )}
        </PaintPlane>
        <p className={styles.readout} data-paint-outcome>
          <span className={styles.swatch} style={{ background: cssColor(mark) }} />
          {fixedC ? "Start" : "c"} = {coordinates(value)}.{" "}
          {crossed
            ? end.iteration === 0
              ? "Already outside the dashed circle."
              : `Crossed the dashed circle on jump ${end.iteration}.`
            : `Still inside the dashed circle after ${PAINT_JUMPS} jumps.`}
        </p>
        <DistanceChart route={route} />
      </div>
    </LessonFrame>
  );
}
