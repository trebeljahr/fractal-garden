import { type PointerEvent, useEffect, useMemo, useRef, useState } from "react";
import styles from "../../styles/lessons/ReadoutStage.module.css";
import { usePointPicker } from "../../utils/hooks/usePointPicker";
import {
  type GridPoint3,
  hilbertMirrorRoute,
  MIRROR_LEVEL,
  routeCheck,
  SMALL_CUBES,
  SMALL_PATH_POINTS,
  smallCubeShape,
  smallPath,
} from "../../utils/lessons/hilbertMirror";
import { dragRotation, viewRotation } from "../../utils/orientation";
import { projectScenePoint } from "../../utils/polyhedronFractals";
import { LessonFrame } from "./LessonFrame";

const CAMERA_DISTANCE = 7.5;
const BACKGROUND = "#252424";
const ROUTE = "#eee8ce";
const CHOSEN = "#f5c56d";
const KEY_TURN = Math.PI / 18;
// From most angles one small cube's mirror plane is seen edge-on. From here all eight show.
const OPENING = viewRotation(33, 14);
const GRID_MIDDLE = (2 ** MIRROR_LEVEL - 1) / 2;
const CUBE_NUMBERS = Array.from({ length: SMALL_CUBES }, (_, cube) => cube);

const scene = (point: GridPoint3) =>
  point.map((value) => (value - GRID_MIDDLE) / GRID_MIDDLE) as GridPoint3;

export default function HilbertMirrorLesson() {
  const [mirrored, setMirrored] = useState(0);
  const [cube, setCube] = useState(0);
  const [grab, setGrab] = useState(OPENING);
  const [size, setSize] = useState(0);
  const canvas = useRef<HTMLCanvasElement>(null);
  const held = useRef<{ x: number; y: number } | null>(null);
  // Up-and-down swipes scroll the page. Any other drag turns the cube by the distance moved.
  const picker = usePointPicker({
    under: (event: PointerEvent<HTMLButtonElement>) => ({ x: event.clientX, y: event.clientY }),
    onChange: (point) => {
      const from = held.current;
      held.current = point;
      if (!from) return;
      const dx = point.x - from.x;
      const dy = point.y - from.y;
      const angle = (Math.hypot(dx, dy) / Math.max(1, size)) * Math.PI;
      setGrab((old) => dragRotation(old, dx, dy, angle));
    },
    onRelease: () => {
      held.current = null;
    },
  });
  const stage = picker.ref;

  const route = useMemo(() => hilbertMirrorRoute(MIRROR_LEVEL, mirrored), [mirrored]);
  const check = useMemo(() => routeCheck(route), [route]);

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
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    element.width = Math.round(size * ratio);
    element.height = Math.round(size * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.fillStyle = BACKGROUND;
    context.fillRect(0, 0, size, size);
    context.lineJoin = "round";
    context.lineCap = "round";

    const camera = { rotationX: 0, rotationY: 0, grab, cameraDistance: CAMERA_DISTANCE };
    const place = (point: GridPoint3) => projectScenePoint(scene(point), camera, size, size);
    const depth = (point: GridPoint3) => {
      const [x, y, z] = scene(point);
      return grab[6] * x + grab[7] * y + grab[8] * z;
    };
    const line = (from: GridPoint3, to: GridPoint3) => {
      const a = place(from);
      const b = place(to);
      context.beginPath();
      context.moveTo(a.x, a.y);
      context.lineTo(b.x, b.y);
      context.stroke();
    };

    // The other small paths and the joins, far ones first and fainter.
    const first = cube * SMALL_PATH_POINTS;
    const last = first + SMALL_PATH_POINTS - 1;
    const segments = route
      .slice(1)
      .map((to, i) => ({ from: route[i], to, depth: depth(route[i]) + depth(to) }))
      .filter((_, i) => i < first || i >= last)
      .sort((a, b) => a.depth - b.depth);
    context.strokeStyle = ROUTE;
    context.lineWidth = 1.5;
    for (const segment of segments) {
      context.globalAlpha = 0.3 + 0.6 * ((segment.depth + 3.5) / 7);
      line(segment.from, segment.to);
    }
    context.globalAlpha = 1;

    // The chosen small cube, its mirror, and its path.
    const path = smallPath(route, cube);
    const { corners, plane } = smallCubeShape(path);
    context.strokeStyle = CHOSEN;
    context.lineWidth = 1;
    context.globalAlpha = 0.45;
    corners.forEach((corner, a) => {
      corners.forEach((other, b) => {
        const differing = corner.filter((value, axis) => value !== other[axis]).length;
        if (a < b && differing === 1) line(corner, other);
      });
    });
    context.globalAlpha = 1;

    context.beginPath();
    plane.forEach((corner, i) => {
      const { x, y } = place(corner);
      if (i === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    });
    context.closePath();
    context.fillStyle = "#f5c56d38";
    context.fill();

    context.lineWidth = 3;
    context.beginPath();
    path.forEach((point, i) => {
      const { x, y } = place(point);
      if (i === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    });
    context.stroke();

    const start = place(path[0]);
    const end = place(path[path.length - 1]);
    context.lineWidth = 2;
    context.beginPath();
    context.arc(start.x, start.y, 5, 0, Math.PI * 2);
    context.fillStyle = BACKGROUND;
    context.fill();
    context.stroke();
    context.beginPath();
    context.arc(end.x, end.y, 5, 0, Math.PI * 2);
    context.fillStyle = CHOSEN;
    context.fill();
  }, [route, cube, grab, size]);

  const count = CUBE_NUMBERS.filter((number) => mirrored & (1 << number)).length;
  return (
    <LessonFrame title="Mirror one small path" kind="hilbert-mirror">
      <div className={styles.layout}>
        <button
          type="button"
          className={styles.stage}
          aria-label={`Level ${MIRROR_LEVEL} of the 3D Hilbert curve with small cube ${cube + 1} highlighted and ${count} small paths mirrored. Drag or use the arrow keys to turn it.`}
          {...picker}
          onPointerDown={(event) => {
            held.current = null;
            picker.onPointerDown(event);
          }}
          onKeyDown={(event) => {
            const move = {
              ArrowLeft: [-1, 0],
              ArrowRight: [1, 0],
              ArrowUp: [0, -1],
              ArrowDown: [0, 1],
            }[event.key];
            if (!move) return;
            event.preventDefault();
            setGrab((old) => dragRotation(old, move[0], move[1], KEY_TURN));
          }}
        >
          <canvas ref={canvas} />
        </button>
        <div className={styles.side}>
          <dl className={styles.readout} data-hilbert-mirror-readout>
            <div>
              <dt>Mirrored</dt>
              <dd>
                {count} of {SMALL_CUBES}
              </dd>
            </div>
            <div>
              <dt>Positions visited</dt>
              <dd>
                {check.visited} of {route.length}
              </dd>
            </div>
            <div>
              <dt>Longest move</dt>
              <dd>
                {check.longestMove} grid step{check.longestMove === 1 ? "" : "s"}
              </dd>
            </div>
          </dl>
          <fieldset className={styles.cubeRow}>
            <legend>Mirror small cube</legend>
            {CUBE_NUMBERS.map((number) => (
              <button
                key={number}
                type="button"
                aria-pressed={Boolean(mirrored & (1 << number))}
                aria-label={`Mirror small cube ${number + 1}`}
                onPointerEnter={() => setCube(number)}
                onFocus={() => setCube(number)}
                onClick={() => {
                  setCube(number);
                  setMirrored((old) => old ^ (1 << number));
                }}
              >
                {number + 1}
              </button>
            ))}
          </fieldset>
        </div>
      </div>
    </LessonFrame>
  );
}
