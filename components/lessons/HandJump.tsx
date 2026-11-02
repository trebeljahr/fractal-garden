import { type CSSProperties, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import styles from "../../styles/lessons/HandJump.module.css";
import { type ComplexPoint, type OrbitStep, squarePoint } from "../../utils/orbitLesson";

type Phase = "rest" | "wipe" | "square" | "add" | "result";
// When each phase starts and how long its strokes take, as shares of one jump's time.
// The point lands in the picture at about 0.68, as the new point is written.
const PHASES: [share: number, phase: Phase][] = [
  [0.3, "square"],
  [0.5, "add"],
  [0.65, "result"],
  [0.8, "rest"],
];
const WIPE_SHARE = 0.18;
const GLIDE_SHARE = 0.3;
const WRITE_SHARE = 0.15;

function fixed(value: number) {
  return Number(value.toFixed(5));
}
function write(value: number) {
  return String(fixed(value)).replace("-", "−");
}
// A negative number needs brackets before it is squared or multiplied.
function factor(value: number) {
  return fixed(value) < 0 ? `(${write(value)})` : write(value);
}
function plus(value: number) {
  return value < 0 ? `− ${write(-value)}` : `+ ${write(value)}`;
}

export function HandJump({
  orbit,
  c,
  jump,
  animate,
  duration,
  announce,
  onNext,
}: {
  orbit: OrbitStep[];
  c: ComplexPoint;
  jump: number;
  animate: boolean;
  duration: number;
  announce: boolean;
  onNext: () => void;
}) {
  const [view, setView] = useState<{ jump: number; phase: Phase }>({ jump, phase: "rest" });
  const previous = useRef({ orbit, jump });
  const inputs = useRef<(HTMLSpanElement | null)[]>([]);
  const outputs = useRef<(HTMLSpanElement | null)[]>([]);

  useEffect(() => {
    const stepped =
      animate && previous.current.orbit === orbit && jump === previous.current.jump + 1;
    previous.current = { orbit, jump };
    if (!stepped) {
      setView({ jump, phase: "rest" });
      return;
    }
    setView({ jump: jump - 1, phase: "wipe" });
    // The two new numbers travel up into the row they will be used from.
    const glides = outputs.current.flatMap((output, axis) => {
      const input = inputs.current[axis];
      if (!output || !input) return [];
      const from = output.getBoundingClientRect();
      const to = input.getBoundingClientRect();
      return output.animate(
        [
          { transform: "none" },
          { transform: `translate(${to.left - from.left}px, ${to.top - from.top}px)` },
        ],
        {
          duration: duration * GLIDE_SHARE,
          easing: "cubic-bezier(0.45, 0, 0.2, 1)",
          fill: "forwards",
        },
      );
    });
    const timers = PHASES.map(([share, phase]) =>
      window.setTimeout(() => {
        // The numbers must change before their glide ends, or they flash back to the lower row.
        flushSync(() => setView({ jump, phase }));
        if (phase === "square") for (const glide of glides) glide.cancel();
      }, duration * share),
    );
    return () => {
      for (const timer of timers) window.clearTimeout(timer);
      for (const glide of glides) glide.cancel();
    };
  }, [jump, orbit, animate, duration]);

  const index = Math.min(view.jump, orbit.length - 1);
  const point = orbit[Math.max(0, index - 1)].point;
  const squared = squarePoint(point);
  const result = orbit[index].point;
  const worked = index > 0;
  const atEnd = orbit.length > 1 && jump === orbit.length - 1;
  const timing = {
    "--wipe": `${duration * WIPE_SHARE}ms`,
    "--write": `${duration * WRITE_SHARE}ms`,
  } as CSSProperties;

  return (
    <div className={styles.panel} data-hand-jump style={timing}>
      <div className={styles.sums} data-phase={view.phase}>
        <div className={styles.backArrow} aria-hidden="true" />
        <table>
          <thead>
            <tr>
              <td className={styles.jump} aria-live={announce ? "polite" : "off"}>
                Jump {index}
              </td>
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
                  className={styles.numbers}
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
                  className={styles.numbers}
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
                {worked && (
                  <span className={styles.numbers}>
                    <span>
                      {factor(point.real)}² − {factor(point.imaginary)}²
                    </span>{" "}
                    <span>= {write(squared.real)}</span>
                  </span>
                )}
              </td>
              <td>
                {worked && (
                  <span className={styles.numbers}>
                    <span>
                      2 × {factor(point.real)} × {factor(point.imaginary)}
                    </span>{" "}
                    <span>= {write(squared.imaginary)}</span>
                  </span>
                )}
              </td>
            </tr>
            <tr className={styles.add}>
              <th scope="row">Add c</th>
              <td>
                {worked && (
                  <span className={styles.numbers}>
                    <span>
                      {write(squared.real)} {plus(c.real)}
                    </span>{" "}
                    <span>= {write(result.real)}</span>
                  </span>
                )}
              </td>
              <td>
                {worked && (
                  <span className={styles.numbers}>
                    <span>
                      {write(squared.imaginary)} {plus(c.imaginary)}
                    </span>{" "}
                    <span>= {write(result.imaginary)}</span>
                  </span>
                )}
              </td>
            </tr>
            <tr className={styles.output}>
              <th scope="row">New point</th>
              <td>
                new x ={" "}
                {worked && (
                  <span
                    className={styles.numbers}
                    ref={(element) => {
                      outputs.current[0] = element;
                    }}
                  >
                    {write(result.real)}
                  </span>
                )}
              </td>
              <td>
                new y ={" "}
                {worked && (
                  <span
                    className={styles.numbers}
                    ref={(element) => {
                      outputs.current[1] = element;
                    }}
                  >
                    {write(result.imaginary)}
                  </span>
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <button type="button" className={styles.next} disabled={orbit.length === 1} onClick={onNext}>
        {atEnd ? "Start over" : "Next jump"}
      </button>
    </div>
  );
}
