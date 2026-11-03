import { useEffect, useRef, useState } from "react";
import styles from "../../styles/lessons/BuddhabrotAccumulation.module.css";
import {
  LongRoutes,
  PICTURE_HEIGHT,
  PICTURE_WIDTH,
  paintCounts,
  STEPS_SHOWN,
} from "../../utils/lessons/buddhabrotAccumulation";
import { LessonFrame, LessonSteps } from "./LessonFrame";

const MS_PER_FRAME = 8;
const MS_PER_PAINT = 150;
const MS_FOR_ALL_STEPS = 12_000;

export default function BuddhabrotOutlineLesson() {
  // Positions 0 to 19 of the slider are steps 1 to 20. The last position shows every step.
  const [position, setPosition] = useState(0);
  const canvas = useRef<HTMLCanvasElement>(null);
  const routes = useRef<LongRoutes | null>(null);
  const counts = useRef<Uint32Array>(new Uint32Array(0));
  const image = useRef<ImageData | null>(null);
  const shown = useRef(position);
  shown.current = position;

  const paint = useRef(() => {});
  paint.current = () => {
    const context = canvas.current?.getContext("2d");
    const found = routes.current;
    if (!context || !found) return;
    image.current ??= context.createImageData(PICTURE_WIDTH, PICTURE_HEIGHT);
    const pixels = new Uint32Array(image.current.data.buffer);
    if (shown.current === STEPS_SHOWN) paintCounts(pixels, found.allSteps, 0.28);
    else {
      if (counts.current.length === 0) counts.current = new Uint32Array(pixels.length);
      found.stepCounts(shown.current + 1, counts.current);
      paintCounts(pixels, counts.current, 0.6);
    }
    context.putImageData(image.current, 0, 0);
    if (canvas.current) canvas.current.dataset.found = String(found.found);
  };

  // Look for long routes when the reader approaches. The search is finite and finishes off screen.
  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    let frame = 0;
    let painted = 0;
    const tick = (now: number) => {
      const found = routes.current;
      if (!found) return;
      found.run(performance.now() + MS_PER_FRAME);
      if (found.finished) {
        paint.current();
        return;
      }
      if (now - painted >= MS_PER_PAINT) {
        paint.current();
        painted = now;
      }
      frame = requestAnimationFrame(tick);
    };
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        routes.current = new LongRoutes();
        frame = requestAnimationFrame(tick);
      },
      { rootMargin: "300px" },
    );
    observer.observe(element);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: the position is read through a ref
  useEffect(() => paint.current(), [position]);

  const description =
    position < STEPS_SHOWN ? `Step ${position + 1} of every long route` : "Every step";
  return (
    <LessonFrame title="Long routes, one step at a time" kind="buddhabrot-outline">
      <div className={styles.stage}>
        <canvas
          ref={canvas}
          className={styles.picture}
          width={PICTURE_WIDTH}
          height={PICTURE_HEIGHT}
          role="img"
          aria-label={description}
        />
      </div>
      <LessonSteps
        step={position}
        max={STEPS_SHOWN}
        onChange={setPosition}
        label="Long route steps"
        duration={MS_FOR_ALL_STEPS}
        stepDescription={description}
      />
    </LessonFrame>
  );
}
