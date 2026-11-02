import { useEffect, useRef, useState } from "react";
import motion from "../../styles/lessons/Investigations.module.css";
import styles from "../../styles/lessons/Lesson.module.css";
import { circleValue, ghostSpacing } from "../../utils/circlesAndSquares";
import { LessonFrame } from "./LessonFrame";

const SIZE = 360;
const DOTS = 90;
const CLOSE_DOTS = 16;
const MODULUS = 2;
const DARK = 0xff1a1510;
const LIGHT = 0xffcee8ee;
const INK = "#f5c56d";

function fill(canvas: HTMLCanvasElement | null, sample: (x: number, y: number) => number) {
  const context = canvas?.getContext("2d");
  if (!context) return null;
  const image = context.createImageData(SIZE, SIZE);
  const pixels = new Uint32Array(image.data.buffer);
  for (let row = 0; row < SIZE; row++)
    for (let column = 0; column < SIZE; column++)
      pixels[row * SIZE + column] = sample(column, row) < 0.5 ? LIGHT : DARK;
  context.putImageData(image, 0, 0);
  return context;
}

export default function CircleGhostLesson() {
  const [step, setStep] = useState(0.29);
  const [atGhost, setAtGhost] = useState(true);
  const rings = useRef<HTMLCanvasElement>(null);
  const dots = useRef<HTMLCanvasElement>(null);
  const spacing = ghostSpacing(step, MODULUS);
  // Whole dots, so the close-up always sits on a dot of the grid.
  const ghost = Number.isFinite(spacing) ? Math.round(spacing) : 0;
  const look = atGhost ? ghost : 0;
  useEffect(() => {
    const dot = SIZE / DOTS;
    const worldPerPixel = (CLOSE_DOTS * step) / SIZE;
    const context = fill(rings.current, (x, y) =>
      circleValue(
        look * step + (x - SIZE / 2) * worldPerPixel,
        (y - SIZE / 2) * worldPerPixel,
        MODULUS,
        1,
      ),
    );
    if (context) {
      const gap = SIZE / CLOSE_DOTS;
      for (let i = 0; i <= CLOSE_DOTS; i++) {
        for (let j = 0; j <= CLOSE_DOTS; j++) {
          const value = circleValue(
            (look + i - CLOSE_DOTS / 2) * step,
            (j - CLOSE_DOTS / 2) * step,
            MODULUS,
            1,
          );
          context.beginPath();
          context.arc(i * gap, j * gap, 4.5, 0, 2 * Math.PI);
          context.fillStyle = value < 0.5 ? "#eee8ce" : "#10151a";
          context.fill();
          context.lineWidth = 1.2;
          context.strokeStyle = INK;
          context.stroke();
        }
      }
    }
    const picture = fill(dots.current, (x, y) =>
      circleValue(
        (Math.floor(x / dot) - DOTS / 2) * step,
        (Math.floor(y / dot) - DOTS / 2) * step,
        MODULUS,
        1,
      ),
    );
    if (picture) {
      picture.lineWidth = 2;
      picture.strokeStyle = INK;
      picture.strokeRect(
        ((look + DOTS / 2 - CLOSE_DOTS / 2) * SIZE) / DOTS,
        ((DOTS / 2 - CLOSE_DOTS / 2) * SIZE) / DOTS,
        (CLOSE_DOTS * SIZE) / DOTS,
        (CLOSE_DOTS * SIZE) / DOTS,
      );
    }
  }, [step, look]);
  return (
    <LessonFrame title="Check the same rings at fewer places" kind="circle-ghosts">
      <p>
        Right: 90 by 90 dots. Left: a close-up of the marked part, with the true rings behind its
        dots.
      </p>
      <div className={styles.grid} style={{ gridTemplateColumns: "1fr 1fr", gap: "0.6rem" }}>
        <div className={motion.surface}>
          <canvas ref={rings} width={SIZE} height={SIZE} aria-label="Close-up of rings and dots" />
        </div>
        <div className={motion.surface}>
          <canvas ref={dots} width={SIZE} height={SIZE} aria-label="The rings at 90 by 90 dots" />
        </div>
      </div>
      <div className={motion.readout} aria-live="polite">
        A ghost center every {spacing > 999 ? "1,000 or more" : spacing.toFixed(1)} dots
      </div>
      <fieldset className={styles.options} aria-label="Where the close-up looks">
        <button type="button" aria-pressed={!atGhost} onClick={() => setAtGhost(false)}>
          True center
        </button>
        <button type="button" aria-pressed={atGhost} onClick={() => setAtGhost(true)}>
          First ghost center
        </button>
      </fieldset>
      <label className={styles.parameter}>
        <span>
          Step between dots
          <output>{step.toFixed(3)}</output>
        </span>
        <input
          type="range"
          aria-label="Step between dots"
          min={0.02}
          max={1.42}
          step={0.002}
          value={step}
          onChange={(event) => setStep(Number(event.target.value))}
        />
      </label>
    </LessonFrame>
  );
}
