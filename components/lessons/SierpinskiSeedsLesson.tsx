import { useEffect, useMemo, useRef, useState } from "react";
import styles from "../../styles/lessons/SierpinskiSeedsLesson.module.css";
import {
  MAX_SEED_STEP,
  SEED_SHAPES,
  type SeedCopy,
  type SeedShape,
  sierpinskiSeedCopies,
  TRIANGLE_HEIGHT,
} from "../../utils/lessons/sierpinskiSeeds";
import { useFractalPalette } from "../FractalPalette";
import { LessonFrame, LessonSteps } from "./LessonFrame";

function seedPath(shape: SeedShape) {
  const path = new Path2D();
  if (shape === "Triangle") {
    path.moveTo(0, TRIANGLE_HEIGHT);
    path.lineTo(1, TRIANGLE_HEIGHT);
    path.lineTo(0.5, 0);
    path.closePath();
  } else if (shape === "Square") {
    path.rect(0.1, (TRIANGLE_HEIGHT - 0.8) / 2, 0.8, 0.8);
  } else if (shape === "Circle") {
    path.arc(0.5, TRIANGLE_HEIGHT / 2, 0.4, 0, Math.PI * 2);
  } else {
    // Original vector fish: an oval body, triangular tail and a small eye hole.
    path.moveTo(0.25, 0.433);
    path.bezierCurveTo(0.42, 0.12, 0.78, 0.12, 0.96, 0.433);
    path.bezierCurveTo(0.78, 0.746, 0.42, 0.746, 0.25, 0.433);
    path.lineTo(0.04, 0.15);
    path.lineTo(0.04, 0.716);
    path.closePath();
    path.moveTo(0.808, 0.36);
    path.arc(0.78, 0.36, 0.028, 0, Math.PI * 2);
  }
  return path;
}

function SeedDrawing({
  shape,
  copies,
  step,
  color,
  background,
}: {
  shape: SeedShape;
  copies: SeedCopy[];
  step: number;
  color: string;
  background: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const render = () => {
      const width = canvas.getBoundingClientRect().width;
      if (!width) return;
      const ratio = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(width * 0.92 * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, width, width * 0.92);
      const size = width * 0.86,
        left = width * 0.07,
        top = (width * 0.92 - size * TRIANGLE_HEIGHT) / 2;
      ctx.translate(left, top);
      ctx.scale(size, size);
      const path = seedPath(shape);
      ctx.fillStyle = color;
      for (const copy of copies) {
        ctx.save();
        ctx.translate(copy.x, copy.y);
        ctx.scale(copy.scale, copy.scale);
        ctx.fill(path, "evenodd");
        ctx.restore();
      }
    };
    const observer = new ResizeObserver(render);
    observer.observe(canvas);
    render();
    return () => observer.disconnect();
  }, [shape, copies, color, background]);
  return (
    <figure className={styles.seed}>
      <figcaption>{shape}</figcaption>
      <canvas
        ref={ref}
        role="img"
        aria-label={`${shape} starting shape after ${step} steps: ${copies.length} copies`}
      />
    </figure>
  );
}

export default function SierpinskiSeedsLesson() {
  const [step, setStep] = useState(0);
  const { color, background } = useFractalPalette();
  const copies = useMemo(() => sierpinskiSeedCopies(step), [step]);
  return (
    <LessonFrame
      title="Different starting shapes, the same triangle"
      kind="sierpinski-seeds"
      className={styles.wide}
    >
      <LessonSteps step={step} max={MAX_SEED_STEP} onChange={setStep} label="Starting shape" />
      <div className={styles.comparison}>
        {SEED_SHAPES.map((shape) => (
          <SeedDrawing
            key={shape}
            shape={shape}
            copies={copies}
            step={step}
            color={color}
            background={background}
          />
        ))}
      </div>
      <p role="status">
        {step === 0
          ? "Starting drawings"
          : `${copies.length.toLocaleString("en-US")} copies, each 1/${2 ** step} of its starting width`}
      </p>
    </LessonFrame>
  );
}
