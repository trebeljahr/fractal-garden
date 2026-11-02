import { useEffect, useRef, useState } from "react";
import styles from "../../styles/lessons/HandJump.module.css";
import { JULIA_PRESETS } from "../../utils/escapeTimePlaces";
import { useReducedMotion } from "../../utils/hooks/useReducedMotion";
import { traceHandJumps } from "../../utils/orbitLesson";
import { LessonFrame } from "./LessonFrame";

const C = { real: JULIA_PRESETS.Rabbit.cReal, imaginary: JULIA_PRESETS.Rabbit.cImag };
// The orbit lesson's ring starts here too.
const START = { real: 0.3, imaginary: 0 };
const { jumps, repeats } = traceHandJumps(C, START);
const GLIDE_MS = 700;
const REVEAL_MS = 500;

type Phase = "rest" | "glide" | "square" | "add";

function write(value: number) {
  return String(value).replace("-", "−");
}
// A negative number needs brackets before it is squared or multiplied.
function factor(value: number) {
  return value < 0 ? `(${write(value)})` : write(value);
}
function plus(value: number) {
  return value < 0 ? `− ${write(-value)}` : `+ ${write(value)}`;
}

export default function HandJumpLesson() {
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("rest");
  const reduced = useReducedMotion();
  const inputs = useRef<(HTMLSpanElement | null)[]>([]);
  const outputs = useRef<(HTMLSpanElement | null)[]>([]);
  const glides = useRef<Animation[]>([]);
  const jump = jumps[index];
  const last = index === jumps.length - 1;

  useEffect(() => {
    if (phase !== "square" && phase !== "add") return;
    const timer = window.setTimeout(() => setPhase(phase === "square" ? "add" : "rest"), REVEAL_MS);
    return () => window.clearTimeout(timer);
  }, [phase]);
  useEffect(
    () => () => {
      for (const glide of glides.current) glide.cancel();
    },
    [],
  );

  // The two new numbers travel up into the row they will be used from.
  const next = () => {
    if (phase !== "rest") return;
    if (last) {
      setIndex(0);
      return;
    }
    if (reduced) {
      setIndex(index + 1);
      return;
    }
    setPhase("glide");
    glides.current = outputs.current.flatMap((output, axis) => {
      const input = inputs.current[axis];
      if (!output || !input) return [];
      const from = output.getBoundingClientRect();
      const to = input.getBoundingClientRect();
      return output.animate(
        [
          { transform: "none" },
          { transform: `translate(${to.left - from.left}px, ${to.top - from.top}px)` },
        ],
        { duration: GLIDE_MS, easing: "cubic-bezier(0.45, 0, 0.2, 1)", fill: "forwards" },
      );
    });
    Promise.all(glides.current.map((glide) => glide.finished))
      .then(() => {
        setIndex(index + 1);
        setPhase("square");
        for (const glide of glides.current) glide.cancel();
      })
      .catch(() => {});
  };

  const { point, squared, next: result } = jump;
  return (
    <LessonFrame title="One jump by hand" kind="julia-by-hand" className={styles.lesson}>
      <div className={styles.sums} data-phase={phase}>
        <div className={styles.backArrow} aria-hidden="true" />
        <table>
          <thead>
            <tr>
              <td />
              <th scope="col">x² − y² + a</th>
              <th scope="col">2xy + b</th>
            </tr>
          </thead>
          <tbody>
            <tr className={styles.input}>
              <th scope="row">Point</th>
              <td>
                x ={" "}
                <span
                  ref={(element) => {
                    inputs.current[0] = element;
                  }}
                >
                  {write(point.real)}
                </span>
              </td>
              <td>
                y ={" "}
                <span
                  ref={(element) => {
                    inputs.current[1] = element;
                  }}
                >
                  {write(point.imaginary)}
                </span>
              </td>
            </tr>
            <tr className={styles.square}>
              <th scope="row">Square</th>
              <td>
                <span>
                  {factor(point.real)}² − {factor(point.imaginary)}²
                </span>{" "}
                <span>= {write(squared.real)}</span>
              </td>
              <td>
                <span>
                  2 × {factor(point.real)} × {factor(point.imaginary)}
                </span>{" "}
                <span>= {write(squared.imaginary)}</span>
              </td>
            </tr>
            <tr className={styles.add}>
              <th scope="row">Add c</th>
              <td>
                <span>
                  {write(squared.real)} {plus(C.real)}
                </span>{" "}
                <span>= {write(result.real)}</span>
              </td>
              <td>
                <span>
                  {write(squared.imaginary)} {plus(C.imaginary)}
                </span>{" "}
                <span>= {write(result.imaginary)}</span>
              </td>
            </tr>
            <tr className={styles.output}>
              <th scope="row">New point</th>
              <td>
                new x ={" "}
                <span
                  ref={(element) => {
                    outputs.current[0] = element;
                  }}
                >
                  {write(result.real)}
                </span>
              </td>
              <td>
                new y ={" "}
                <span
                  ref={(element) => {
                    outputs.current[1] = element;
                  }}
                >
                  {write(result.imaginary)}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className={styles.footer}>
        <button type="button" onClick={next}>
          {last ? "Start over" : "Next jump"}
        </button>
        <span aria-live="polite">
          Jump {index + 1}
          {last && repeats !== null ? ` lands on the same point as jump ${repeats}.` : ""}
        </span>
      </div>
    </LessonFrame>
  );
}
