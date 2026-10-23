import { type PointerEvent, useCallback, useEffect, useRef } from "react";
import styles from "../styles/VoxelFlight.module.css";

export type FlightTouchInput = {
  move: [number, number];
  look: [number, number];
  up: boolean;
  down: boolean;
  boost: boolean;
};
export const resetFlightTouch = (input: FlightTouchInput) => {
  input.move = [0, 0];
  input.look = [0, 0];
  input.up = input.down = input.boost = false;
};

/** Two independently captured sticks, following the gallery's move/look layout. */
function FlightStick({
  input,
  axis,
  label,
}: {
  input: FlightTouchInput;
  axis: "move" | "look";
  label: string;
}) {
  const knob = useRef<HTMLSpanElement>(null);
  const pointer = useRef<number | null>(null);
  const reset = useCallback(() => {
    pointer.current = null;
    input[axis] = [0, 0];
    if (knob.current) knob.current.style.transform = "translate(0, 0)";
  }, [input, axis]);
  useEffect(() => {
    window.addEventListener("blur", reset);
    document.addEventListener("visibilitychange", reset);
    return () => {
      window.removeEventListener("blur", reset);
      document.removeEventListener("visibilitychange", reset);
      reset();
    };
  }, [reset]);
  const update = (event: PointerEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const reach = rect.width * 0.3;
    let x = (event.clientX - rect.left - rect.width / 2) / reach;
    let y = (event.clientY - rect.top - rect.height / 2) / reach;
    const magnitude = Math.hypot(x, y);
    const divisor = Math.max(1, magnitude);
    x /= divisor;
    y /= divisor;
    // Proportional travel after the gallery's small center deadzone.
    const strength = Math.max(0, (Math.min(1, magnitude) - 0.15) / 0.85);
    input[axis] =
      magnitude > 0
        ? [(x / Math.min(1, magnitude)) * strength, (y / Math.min(1, magnitude)) * strength]
        : [0, 0];
    if (knob.current) knob.current.style.transform = `translate(${x * reach}px, ${y * reach}px)`;
  };
  return (
    <button
      type="button"
      className={styles.stick}
      aria-label={`${label} stick`}
      onPointerDown={(event) => {
        if (pointer.current !== null) return;
        event.preventDefault();
        pointer.current = event.pointerId;
        event.currentTarget.setPointerCapture(event.pointerId);
        update(event);
      }}
      onPointerMove={(event) => {
        if (pointer.current === event.pointerId) update(event);
      }}
      onPointerUp={(event) => {
        if (pointer.current === event.pointerId) reset();
      }}
      onPointerCancel={(event) => {
        if (pointer.current === event.pointerId) reset();
      }}
      onLostPointerCapture={(event) => {
        if (pointer.current === event.pointerId) reset();
      }}
      onBlur={reset}
      onContextMenu={(event) => event.preventDefault()}
    >
      <span className={styles.stickKnob} ref={knob} aria-hidden="true" />
      <span className={styles.stickLabel}>{label}</span>
    </button>
  );
}

export function FlightTouchControls({ input }: { input: FlightTouchInput }) {
  useEffect(() => () => resetFlightTouch(input), [input]);
  return (
    <div className={styles.touchControls} data-fractal-chrome>
      <FlightStick input={input} axis="move" label="Move" />
      <fieldset className={styles.flightButtons} aria-label="Flight height and speed">
        {(
          [
            ["up", "Up"],
            ["down", "Down"],
            ["boost", "Fast"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            aria-label={key === "boost" ? "Fly faster" : `Fly ${key}`}
            onPointerDown={(event) => {
              event.preventDefault();
              event.currentTarget.setPointerCapture(event.pointerId);
              input[key] = true;
            }}
            onPointerUp={() => {
              input[key] = false;
            }}
            onPointerCancel={() => {
              input[key] = false;
            }}
            onLostPointerCapture={() => {
              input[key] = false;
            }}
            onBlur={() => {
              input[key] = false;
            }}
            onContextMenu={(event) => event.preventDefault()}
          >
            {label}
          </button>
        ))}
      </fieldset>
      <FlightStick input={input} axis="look" label="Look" />
    </div>
  );
}
