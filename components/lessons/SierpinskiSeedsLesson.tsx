import { useEffect, useMemo, useRef, useState } from "react";
import common from "../../styles/lessons/Lesson.module.css";
import styles from "../../styles/lessons/SierpinskiSeedsLesson.module.css";
import {
  MAX_SEED_STEP,
  SEED_SHAPES,
  type SeedCopy,
  type SeedShape,
  sierpinskiSeedCopies,
  TRIANGLE_HEIGHT,
} from "../../utils/lessons/sierpinskiSeeds";
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
  guide,
}: {
  shape: SeedShape;
  copies: SeedCopy[];
  step: number;
  guide: boolean;
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
      ctx.fillStyle = "#10151a";
      ctx.fillRect(0, 0, width, width * 0.92);
      const size = width * 0.86,
        left = width * 0.07,
        top = (width * 0.92 - size * TRIANGLE_HEIGHT) / 2;
      ctx.translate(left, top);
      ctx.scale(size, size);
      if (guide) {
        ctx.strokeStyle = "#eee8ce66";
        ctx.lineWidth = 1 / size;
        ctx.setLineDash([4 / size, 5 / size]);
        ctx.beginPath();
        ctx.moveTo(0, TRIANGLE_HEIGHT);
        ctx.lineTo(1, TRIANGLE_HEIGHT);
        ctx.lineTo(0.5, 0);
        ctx.closePath();
        ctx.stroke();
        ctx.setLineDash([]);
      }
      const path = seedPath(shape);
      ctx.fillStyle = "#f5c56d";
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
  }, [shape, copies, guide]);
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
  const [step, setStep] = useState(0),
    [playing, setPlaying] = useState(false),
    [guide, setGuide] = useState(true);
  const copies = useMemo(() => sierpinskiSeedCopies(step), [step]);
  useEffect(() => {
    if (!playing) return;
    if (step === MAX_SEED_STEP) {
      setPlaying(false);
      return;
    }
    const timer = setTimeout(() => setStep((n) => n + 1), 900);
    return () => clearTimeout(timer);
  }, [playing, step]);
  const changeStep = (next: number) => {
    setPlaying(false);
    setStep(next);
  };
  return (
    <LessonFrame title="Different starting shapes, the same triangle" kind="sierpinski-seeds">
      <p>
        Each view uses the same three half-size copies, placed towards the same triangle corners.
        Only the starting drawing changes.
      </p>
      <LessonSteps step={step} max={MAX_SEED_STEP} onChange={changeStep} label="Starting shape" />
      <div className={common.options}>
        <button
          type="button"
          onClick={() => {
            if (step === MAX_SEED_STEP) setStep(0);
            setPlaying((p) => !p);
          }}
        >
          {playing ? "Pause" : "Play steps"}
        </button>
        <button type="button" disabled={step === 0 && !playing} onClick={() => changeStep(0)}>
          Reset shapes
        </button>
        <label className={styles.guide}>
          <input
            type="checkbox"
            checked={guide}
            onChange={(event) => setGuide(event.target.checked)}
          />{" "}
          Show triangle guide
        </label>
      </div>
      <div className={styles.comparison}>
        {SEED_SHAPES.map((shape) => (
          <SeedDrawing key={shape} shape={shape} copies={copies} step={step} guide={guide} />
        ))}
      </div>
      <p role="status">
        {step === 0
          ? "Step 0 shows the four starting drawings. Try Next step to make three smaller copies of each one."
          : `Step ${step}: ${copies.length.toLocaleString("en-US")} copies in each view. Each copy is 1/${2 ** step} of its starting width.`}
      </p>
      <p className={styles.note}>
        {step < 5
          ? "Compare all four views as the steps increase. The fish remain fish, but their arrangement approaches the triangle."
          : "Every finite step still contains tiny copies of the original drawing. The four results approach the same Sierpiński triangle as the steps continue without limit."}
      </p>
    </LessonFrame>
  );
}
