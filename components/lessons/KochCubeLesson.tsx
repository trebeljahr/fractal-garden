import { type PointerEvent, useEffect, useMemo, useRef, useState } from "react";
import common from "../../styles/lessons/Lesson.module.css";
import styles from "../../styles/lessons/ReadoutStage.module.css";
import {
  CONSTRUCTION_MOTION_MS,
  createSceneMotion,
  type SceneMotion,
  setSceneProgress,
} from "../../utils/constructionMotion";
import { usePointPicker } from "../../utils/hooks/usePointPicker";
import { useReducedMotion } from "../../utils/hooks/useReducedMotion";
import {
  cubeAroundTetrahedron,
  cubeEdges,
  cubeOrientation,
  frontFace,
  KOCH_CUBE_ROUNDS,
  kochCubeEmpty,
  kochSurfaceOverCube,
} from "../../utils/lessons/kochCube";
import { dragRotation } from "../../utils/orientation";
import {
  buildKochFaceScene,
  buildKochSurfaceScene,
  drawPolyhedronScene,
  kochFacePyramids,
  projectScenePoint,
  tetrahedronMesh,
} from "../../utils/polyhedronFractals";
import { LessonFrame, LessonSteps } from "./LessonFrame";

type Vec3 = [number, number, number];

// The explorer draws its tetrahedron from the same mesh.
const FRAME = cubeAroundTetrahedron(tetrahedronMesh(1.3).vertices);
const SPEC = { kind: "kochSurface", start: "tetrahedron" } as const;
const CAMERA_DISTANCE = 5;
const BACKGROUND = "#252424";
const FILL = "#6fc3ff";
const STROKE = "#d8f0ff";
const PYRAMID = "#f5c56d";
const LAST_ROUND_WITH_PYRAMIDS = 3;
const CUBE = "#eee8ce";
const KEY_TURN = Math.PI / 18;

const OPENING = cubeOrientation(FRAME, 22, -32);
// The face turned most towards the viewer at the opening view.
const SHOWN_FACE = frontFace(tetrahedronMesh(1.3), OPENING);

// The scene turns around the origin, so the tetrahedron has to sit on it to stay in the frame.
function centerPositions(positions: Float32Array) {
  const { center } = FRAME;
  for (let i = 0; i < positions.length; i += 3) {
    positions[i] -= center[0];
    positions[i + 1] -= center[1];
    positions[i + 2] -= center[2];
  }
}

function growingScene(round: number) {
  const motion = createSceneMotion(SPEC, round);
  if (motion?.type !== "faces") return null;
  centerPositions(motion.start);
  centerPositions(motion.end);
  return motion;
}

export default function KochCubeLesson() {
  const [round, setRound] = useState(0);
  const [oneFace, setOneFace] = useState(false);
  const [grab, setGrab] = useState(OPENING);
  const [size, setSize] = useState(0);
  const canvas = useRef<HTMLCanvasElement>(null);
  const held = useRef<{ x: number; y: number } | null>(null);
  const reduced = useReducedMotion();
  // Up-and-down swipes scroll the page. Any other drag turns the solid by the distance moved.
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

  const solid = useMemo(() => {
    const scene = buildKochSurfaceScene("tetrahedron", round);
    centerPositions(scene.positions);
    return scene;
  }, [round]);
  const face = useMemo(() => {
    if (!oneFace) return null;
    const scene = buildKochFaceScene(SHOWN_FACE, round);
    centerPositions(scene.positions);
    return scene;
  }, [round, oneFace]);
  // The first pyramid always shows. Past a few rounds the smaller ones would hide the surface.
  const pyramids = useMemo(() => {
    if (!oneFace) return [];
    const first = kochFacePyramids(SHOWN_FACE, 0);
    return round > 0 && round <= LAST_ROUND_WITH_PYRAMIDS
      ? [...first, ...kochFacePyramids(SHOWN_FACE, round)]
      : first;
  }, [round, oneFace]);

  // A step forward grows the new bumps out of their triangles.
  const growth = useRef<{ motion: SceneMotion; began: number } | null>(null);
  const shownRound = useRef(round);
  useEffect(() => {
    const next = round === shownRound.current + 1 && !reduced ? growingScene(round) : null;
    growth.current = next ? { motion: next, began: performance.now() } : null;
    shownRound.current = round;
  }, [round, reduced]);

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
    const { center } = FRAME;
    const camera = { rotationX: 0, rotationY: 0, grab, cameraDistance: CAMERA_DISTANCE };
    const edges = cubeEdges(FRAME, grab, CAMERA_DISTANCE);
    const strokeEdges = (hidden: boolean) => {
      context.beginPath();
      for (const edge of edges) {
        if (edge.hidden !== hidden) continue;
        const from = projectScenePoint(edge.from, camera, size, size);
        const to = projectScenePoint(edge.to, camera, size, size);
        context.moveTo(from.x, from.y);
        context.lineTo(to.x, to.y);
      }
      context.lineCap = "round";
      context.lineWidth = 1.5;
      context.strokeStyle = CUBE;
      context.globalAlpha = hidden ? 0.45 : 0.9;
      context.stroke();
      context.globalAlpha = 1;
    };
    const strokePyramids = () => {
      if (pyramids.length === 0) return;
      const at = (point: Vec3) => {
        const { x, y } = projectScenePoint(
          [point[0] - center[0], point[1] - center[1], point[2] - center[2]],
          camera,
          size,
          size,
        );
        return [x, y] as const;
      };
      context.beginPath();
      for (const { base, tip } of pyramids) {
        const [tipX, tipY] = at(tip);
        for (const corner of base) {
          const [x, y] = at(corner);
          context.moveTo(x, y);
          context.lineTo(tipX, tipY);
        }
      }
      context.lineWidth = pyramids.length > 7 ? 0.75 : 1.5;
      context.strokeStyle = PYRAMID;
      context.stroke();
    };
    let frame = 0;
    const draw = () => {
      const running = growth.current;
      const progress =
        running && !oneFace
          ? Math.min(1, (performance.now() - running.began) / CONSTRUCTION_MOTION_MS)
          : 1;
      const moving = running?.motion.type === "faces" && progress < 1 ? running.motion : null;
      if (moving) setSceneProgress(moving, progress);
      context.fillStyle = BACKGROUND;
      context.fillRect(0, 0, size, size);
      strokeEdges(true);
      const drawn = face ?? moving?.scene ?? solid;
      drawPolyhedronScene(context, size, size, drawn, {
        ...camera,
        background: "transparent",
        fillColor: FILL,
        strokeColor: STROKE,
        highlightColor: PYRAMID,
        doubleSided: oneFace,
        lineWidth: 0.7,
        showFaces: true,
        showWireframe: !moving,
      });
      strokeEdges(false);
      strokePyramids();
      if (moving) frame = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(frame);
  }, [solid, face, pyramids, oneFace, grab, size]);

  const filled = (100 * (1 - kochCubeEmpty(round))).toFixed(1);
  const left = (100 * kochCubeEmpty(round)).toFixed(1);
  const surface = kochSurfaceOverCube(round).toFixed(2);

  return (
    <LessonFrame title="Fill the cube" kind="koch-cube">
      <div className={styles.layout}>
        <button
          type="button"
          className={styles.stage}
          aria-label={`Round ${round}: the solid fills ${filled}% of the cube. Drag or use the arrow keys to turn it.`}
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
          <dl className={styles.readout} data-koch-readout>
            <div>
              <dt>Filled</dt>
              <dd>{filled}% of the cube</dd>
            </div>
            <div>
              <dt>Empty</dt>
              <dd>{left}%</dd>
            </div>
            <div>
              <dt>Surface area</dt>
              <dd>{surface} × the cube's</dd>
            </div>
          </dl>
          <fieldset className={common.options} aria-label="What to show">
            <button type="button" aria-pressed={!oneFace} onClick={() => setOneFace(false)}>
              Whole solid
            </button>
            <button type="button" aria-pressed={oneFace} onClick={() => setOneFace(true)}>
              One face
            </button>
          </fieldset>
        </div>
      </div>
      <LessonSteps
        step={round}
        max={KOCH_CUBE_ROUNDS}
        onChange={setRound}
        label="Koch surface"
        stepDescription={`Round ${round} of ${KOCH_CUBE_ROUNDS}`}
        duration={KOCH_CUBE_ROUNDS * 1600}
      />
    </LessonFrame>
  );
}
