import { type PointerEvent, useEffect, useMemo, useRef, useState } from "react";
import styles from "../../styles/lessons/ReadoutStage.module.css";
import { usePointPicker, useTriedPoint } from "../../utils/hooks/usePointPicker";
import {
  H_TREE_BOX,
  H_TREE_RATIO,
  type HTreePoint,
  type HTreeRoute,
  hTreeFarthestSpot,
  hTreeRoute,
  hTreeTips,
} from "../../utils/lessons/hTreeRoute";
import { drawHTree, hTreeRootLength } from "../../utils/render/drawings/hTree";
import { LessonFrame, LessonSteps } from "./LessonFrame";

const ROUNDS = 9;
const FIRST_ROUND = 6;
const START: HTreePoint = [0.62, 0.42];
// The explorer's colors.
const BACKGROUND = "#252424";
const ROOT = "#f5b971";
const TIP = "#7fd8e8";
const BOX = "#eee8ce";
const ROUTE = "#ffffff";

function clampToBox([x, y]: HTreePoint): HTreePoint {
  return [
    Math.max(-H_TREE_BOX.halfWidth, Math.min(H_TREE_BOX.halfWidth, x)),
    Math.max(-H_TREE_BOX.halfHeight, Math.min(H_TREE_BOX.halfHeight, y)),
  ];
}

export default function HTreeRouteLesson() {
  const [round, setRound] = useState(FIRST_ROUND);
  const [width, setWidth] = useState(0);
  const height = width / Math.SQRT2;
  const spot = useTriedPoint<HTreePoint>(START);
  const canvas = useRef<HTMLCanvasElement>(null);
  const route = useMemo(() => hTreeRoute(spot.value, round), [spot.value, round]);
  const keptRoute = useMemo(() => hTreeRoute(spot.kept, round), [spot.kept, round]);
  const showKept = spot.tried !== null;

  const under = (event: PointerEvent<HTMLButtonElement>): HTreePoint => {
    const rect = event.currentTarget.getBoundingClientRect();
    const unit = hTreeRootLength(rect.width, rect.height, H_TREE_RATIO);
    return clampToBox([
      (event.clientX - rect.left - rect.width / 2) / unit,
      (rect.height / 2 - (event.clientY - rect.top)) / unit,
    ]);
  };
  const picker = usePointPicker({ under, onChange: spot.keep, onHover: spot.tryOut });
  const stage = picker.ref;

  useEffect(() => {
    const element = stage.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(element);
    return () => observer.disconnect();
  }, [stage]);

  useEffect(() => {
    const element = canvas.current;
    const context = element?.getContext("2d");
    if (!element || !context || !width) return;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    element.width = Math.round(width * ratio);
    element.height = Math.round(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    drawHTree(context, width, height, {
      iterations: round,
      ratio: H_TREE_RATIO,
      rootWidth: Math.max(3, width / 110),
      widthFactor: 0.78,
      background: BACKGROUND,
      rootColor: ROOT,
      tipColor: TIP,
    });
    const unit = hTreeRootLength(width, height, H_TREE_RATIO);
    const px = (x: number) => width / 2 + x * unit;
    const py = (y: number) => height / 2 - y * unit;
    const box = (x: number, y: number, halfWidth: number, halfHeight: number) =>
      context.strokeRect(
        px(x - halfWidth),
        py(y + halfHeight),
        2 * halfWidth * unit,
        2 * halfHeight * unit,
      );
    context.strokeStyle = BOX;
    context.lineWidth = 1.5;
    box(0, 0, H_TREE_BOX.halfWidth, H_TREE_BOX.halfHeight);
    const path = ({ points }: HTreeRoute) => {
      context.beginPath();
      points.forEach(([x, y], index) => {
        if (index) context.lineTo(px(x), py(y));
        else context.moveTo(px(x), py(y));
      });
    };
    const tipOf = ({ points }: HTreeRoute) => points[points.length - 1];
    context.lineCap = "round";
    context.lineJoin = "round";
    if (showKept) {
      path(keptRoute);
      context.globalAlpha = 0.55;
      context.lineWidth = 2;
      context.strokeStyle = ROUTE;
      context.stroke();
      context.globalAlpha = 1;
    }
    const [tipX, tipY] = tipOf(route);
    context.lineWidth = 1;
    context.strokeStyle = BOX;
    box(tipX, tipY, route.halfWidth, route.halfHeight);
    path(route);
    context.lineWidth = 6;
    context.strokeStyle = BACKGROUND;
    context.stroke();
    context.lineWidth = 3;
    context.strokeStyle = ROUTE;
    context.stroke();
    for (const [x, y, radius] of [
      [0, 0, 4],
      [tipX, tipY, 5],
    ]) {
      context.beginPath();
      context.arc(px(x), py(y), radius, 0, Math.PI * 2);
      context.fillStyle = ROUTE;
      context.fill();
      context.lineWidth = 2;
      context.strokeStyle = BACKGROUND;
      context.stroke();
    }
  }, [route, keptRoute, showKept, round, width, height]);

  const length = route.length.toFixed(2);
  return (
    <LessonFrame title="Trace a route" kind="h-tree-route">
      <div className={`${styles.layout} ${styles.wideLayout}`}>
        <button
          type="button"
          className={`${styles.stage} ${styles.wide}`}
          aria-label={`The route to this tip is ${length} first lines long, and the straight line to it is ${route.straight.toFixed(2)}. Move the pointer or use the arrow keys to choose another tip.`}
          {...picker}
          onKeyDown={(event) => {
            const move = {
              ArrowLeft: [-1, 0],
              ArrowRight: [1, 0],
              ArrowUp: [0, 1],
              ArrowDown: [0, -1],
            }[event.key];
            if (!move) return;
            event.preventDefault();
            const [x, y] = route.points[route.points.length - 1];
            spot.keep(
              clampToBox([x + move[0] * 2 * route.halfWidth, y + move[1] * 2 * route.halfHeight]),
            );
          }}
        >
          <canvas ref={canvas} />
        </button>
        <div className={styles.side}>
          <dl className={styles.readout} data-h-tree-readout>
            <div>
              <dt>Route</dt>
              <dd>{length} × first line</dd>
            </div>
            <div>
              <dt>Straight line</dt>
              <dd>{route.straight.toFixed(2)} × first line</dd>
            </div>
            <div>
              <dt>Tips</dt>
              <dd>{hTreeTips(round)}</dd>
            </div>
            <div>
              <dt>Largest gap</dt>
              <dd>{hTreeFarthestSpot(round).toFixed(2)} × first line</dd>
            </div>
          </dl>
          <p className={styles.sum} data-h-tree-pieces>
            Route: {route.pieces.map((piece) => piece.toFixed(2)).join(" + ")}
          </p>
        </div>
      </div>
      <LessonSteps
        step={round}
        max={ROUNDS}
        onChange={setRound}
        label="H tree"
        stepDescription={`Round ${round} of ${ROUNDS}`}
        duration={ROUNDS * 1000}
      />
    </LessonFrame>
  );
}
