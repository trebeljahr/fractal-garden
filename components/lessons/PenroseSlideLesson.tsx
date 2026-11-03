import { type PointerEvent, useEffect, useMemo, useRef, useState } from "react";
import common from "../../styles/lessons/Lesson.module.css";
import styles from "../../styles/lessons/PenroseSlide.module.css";
import { usePointPicker, useTriedPoint } from "../../utils/hooks/usePointPicker";
import {
  nearestToCenter,
  type SlideTile,
  slideCandidates,
  slideMatches,
  squareTiles,
  tileKeys,
  tilesFromHalves,
  tilesWithin,
} from "../../utils/lessons/penroseSlide";
import { getVisibleTriangles } from "../../utils/penroseTiling";
import { LessonFrame } from "./LessonFrame";

const HALF = 1;
// The tiles shown are compared with a larger patch, so every slide can be checked.
const COMPARED = 3;
const PENROSE_LEVEL = 5;
const SQUARES_PER_SIDE = 7;
// The explorer's kite and dart colors.
const COLORS = ["#f2b134", "#3d7ea6", "#eee8ce"];
const BACKGROUND = "#10151a";
const UNMATCHED_ALPHA = 0.2;

function build(all: SlideTile[]) {
  const tiles = tilesWithin(all, HALF);
  const present = tileKeys(all);
  const marked = nearestToCenter(tiles);
  const candidates = slideCandidates(tiles, present, marked);
  const best = candidates.reduce(
    (top, { hits }, index) => (hits > candidates[top].hits ? index : top),
    0,
  );
  // Open on the slide closest to the marked tile: a small move that doesn't line up.
  const nearest = nearestToCenter(candidates.map(({ tile }) => tile));
  return {
    tiles,
    present,
    marked,
    candidates,
    best,
    opening: candidates.findIndex(({ tile }) => tile === nearest),
  };
}

function SlideStage({
  tiles,
  present,
  marked,
  candidates,
  best,
  opening,
}: ReturnType<typeof build>) {
  const spot = useTriedPoint<number>(opening);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState(0);
  const under = (event: PointerEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = -HALF + ((event.clientX - rect.left) / rect.width) * 2 * HALF;
    const y = HALF - ((event.clientY - rect.top) / rect.height) * 2 * HALF;
    let nearest = 0;
    let distance = Number.POSITIVE_INFINITY;
    candidates.forEach(({ tile }, index) => {
      const next = Math.hypot(tile.center[0] - x, tile.center[1] - y);
      if (next < distance) {
        distance = next;
        nearest = index;
      }
    });
    return nearest;
  };
  const picker = usePointPicker({ under, onChange: spot.keep, onHover: spot.tryOut });
  const chosen = candidates[spot.value];
  const lit = useMemo(
    () =>
      slideMatches(
        tiles,
        present,
        chosen.tile.tip[0] - marked.tip[0],
        chosen.tile.tip[1] - marked.tip[1],
      ),
    [tiles, present, chosen, marked],
  );

  const stage = picker.ref;
  useEffect(() => {
    const element = stage.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setSize(entry.contentRect.width));
    observer.observe(element);
    return () => observer.disconnect();
  }, [stage]);
  useEffect(() => {
    const element = canvas.current;
    const context = element?.getContext("2d");
    if (!element || !context || !size) return;
    const ratio = window.devicePixelRatio || 1;
    element.width = Math.round(size * ratio);
    element.height = Math.round(size * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    const px = (x: number) => ((x + HALF) / (2 * HALF)) * size;
    const py = (y: number) => ((HALF - y) / (2 * HALF)) * size;
    context.fillStyle = BACKGROUND;
    context.fillRect(0, 0, size, size);
    context.lineWidth = 0.75;
    context.strokeStyle = BACKGROUND;
    for (const tile of tiles) {
      context.beginPath();
      tile.corners.forEach(([x, y], index) => {
        if (index) context.lineTo(px(x), py(y));
        else context.moveTo(px(x), py(y));
      });
      context.closePath();
      context.globalAlpha = lit.has(tile) ? 1 : UNMATCHED_ALPHA;
      context.fillStyle = COLORS[tile.kind];
      context.fill();
      context.globalAlpha = 1;
      context.stroke();
    }
    // The tiles the marked tile can land on.
    for (const { tile } of candidates) {
      context.beginPath();
      context.arc(px(tile.center[0]), py(tile.center[1]), 2.5, 0, Math.PI * 2);
      context.fillStyle = "#ffffff";
      context.fill();
      context.lineWidth = 1;
      context.stroke();
    }
    const from = marked.center;
    const to = chosen.tile.center;
    context.lineWidth = 4;
    context.strokeStyle = BACKGROUND;
    const arrow = () => {
      context.beginPath();
      context.moveTo(px(from[0]), py(from[1]));
      context.lineTo(px(to[0]), py(to[1]));
      context.stroke();
    };
    arrow();
    context.lineWidth = 2;
    context.strokeStyle = "#ffffff";
    arrow();
    for (const [x, y] of [from, to]) {
      context.beginPath();
      context.arc(px(x), py(y), 7, 0, Math.PI * 2);
      context.lineWidth = 5;
      context.strokeStyle = BACKGROUND;
      context.stroke();
      context.lineWidth = 2.5;
      context.strokeStyle = "#ffffff";
      context.stroke();
    }
  }, [tiles, candidates, marked, chosen, lit, size]);

  const percent = Math.round((100 * lit.size) / tiles.length);
  const outcome = `${lit.size} of ${tiles.length} tiles line up, ${percent}%.`;
  return (
    <>
      <button
        type="button"
        className={styles.stage}
        aria-label={`Slide ${spot.value + 1} of ${candidates.length}. ${outcome} Move the pointer or use the left and right arrow keys to try another slide.`}
        {...picker}
        onKeyDown={(event) => {
          const move = { ArrowLeft: -1, ArrowRight: 1 }[event.key];
          if (!move) return;
          event.preventDefault();
          spot.keep((spot.value + move + candidates.length) % candidates.length);
        }}
      >
        <canvas ref={canvas} />
      </button>
      <div>
        <p className={styles.readout} data-slide-readout>
          {outcome}
        </p>
        <button type="button" onClick={() => spot.keep(best)}>
          Best slide
        </button>
      </div>
    </>
  );
}

export default function PenroseSlideLesson() {
  const [shapes, setShapes] = useState<"kites" | "squares">("kites");
  const patterns = useMemo(
    () => ({
      kites: build(
        tilesFromHalves(
          getVisibleTriangles("p2", "sun", PENROSE_LEVEL, {
            minX: -COMPARED,
            minY: -COMPARED,
            maxX: COMPARED,
            maxY: COMPARED,
          }),
        ),
      ),
      squares: build(squareTiles(COMPARED, SQUARES_PER_SIDE * COMPARED)),
    }),
    [],
  );
  return (
    <LessonFrame title="Slide the pattern" kind="penrose-slide">
      <fieldset className={common.options} aria-label="Tiles">
        <button type="button" aria-pressed={shapes === "kites"} onClick={() => setShapes("kites")}>
          Kites and darts
        </button>
        <button
          type="button"
          aria-pressed={shapes === "squares"}
          onClick={() => setShapes("squares")}
        >
          Square tiles
        </button>
      </fieldset>
      <div className={styles.layout}>
        <SlideStage key={shapes} {...patterns[shapes]} />
      </div>
    </LessonFrame>
  );
}
