import { useEffect, useMemo, useRef, useState } from "react";
import extra from "../../styles/lessons/Investigations.module.css";
import styles from "../../styles/lessons/Lesson.module.css";
import { GEOMETRY_LESSONS, type GeometryLessonKind } from "../../utils/lessons/geometryLessons";
import {
  buildFlakeScene,
  buildKochSurfaceScene,
  dodecahedronMesh,
  drawPolyhedronScene,
  icosahedronMesh,
  octahedronMesh,
  quadsToScene,
  tetrahedronMesh,
} from "../../utils/polyhedronFractals";
import { drawHTree } from "../../utils/render/drawings/hTree";
import { drawNFlake } from "../../utils/render/drawings/nFlake";
import { drawTSquare } from "../../utils/render/drawings/tSquare";
import { drawVicsekFractal2D } from "../../utils/render/drawings/vicsekFractal2D";
import {
  drawBoxScene,
  exposedCubeFaces,
  generateJerusalemCube,
  generateMoselySnowflake,
  generateQuadraticKochSurface,
  generateVicsekFractal3D,
} from "../../utils/voxelFractals";
import { LessonFrame, LessonSteps } from "./LessonFrame";

export default function GeometryLesson({ kind }: { kind: GeometryLessonKind }) {
  const info = GEOMETRY_LESSONS[kind];
  const [step, setStep] = useState(0);
  const [variant, setVariant] = useState(0);
  const [rotation, setRotation] = useState(30);
  const [ratio, setRatio] = useState(kind === "h-tree" ? Math.SQRT1_2 : 0.5);
  const [sides, setSides] = useState(5);
  const canvas = useRef<HTMLCanvasElement>(null);
  const flat = ["h-tree", "t-square-fractal", "n-flake", "vicsek-fractal-2d"].includes(kind);
  const scene = useMemo(() => {
    if (kind === "koch-surface") return buildKochSurfaceScene("triangle", step);
    if (kind === "quadratic-koch-3d") return quadsToScene(generateQuadraticKochSurface(step));
    if (kind === "sierpinski-tetrahedron") return buildFlakeScene(tetrahedronMesh(), 0.5, step);
    if (kind === "polyhedron-flake") {
      const phi = (1 + Math.sqrt(5)) / 2;
      return buildFlakeScene(
        [octahedronMesh, dodecahedronMesh, icosahedronMesh][variant](),
        [0.5, 1 / (2 + phi), 1 / (1 + phi)][variant],
        step,
      );
    }
    if (kind === "mosely-snowflake" || kind === "vicsek-fractal-3d") {
      const cubes =
        kind === "mosely-snowflake"
          ? generateMoselySnowflake(step, variant ? "heavier" : "lighter")
          : generateVicsekFractal3D(step);
      return quadsToScene(exposedCubeFaces(cubes));
    }
    return null;
  }, [kind, step, variant]);
  const boxes = useMemo(
    () => (kind === "jerusalem-cube" ? generateJerusalemCube(step) : null),
    [kind, step],
  );
  useEffect(() => {
    const ctx = canvas.current?.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(2, 0, 0, 2, 0, 0);
    const common = { iterations: step, background: "#10151a", color: "#eee8ce", lineWidth: 1 };
    if (kind === "h-tree")
      drawHTree(ctx, 480, 310, {
        ...common,
        ratio,
        rootWidth: 2,
        widthFactor: 0.8,
        rootColor: "#eee8ce",
        tipColor: "#f5c56d",
      });
    if (kind === "t-square-fractal")
      drawTSquare(ctx, 480, 310, { ...common, ratio, fillSquares: false, strokeSquares: true });
    if (kind === "vicsek-fractal-2d")
      drawVicsekFractal2D(ctx, 480, 310, {
        ...common,
        variant: variant ? "cross" : "saltire",
        fillSquares: true,
        strokeSquares: false,
      });
    if (kind === "n-flake")
      drawNFlake(ctx, 480, 310, {
        ...common,
        sides,
        rotation: 0,
        includeCenter: !!variant,
        fillPolygons: true,
        strokePolygons: false,
      });
    const options = {
      rotationX: 24,
      rotationY: rotation,
      cameraDistance: 6,
      background: common.background,
      fillColor: "#b7c9bd",
      strokeColor: "#f5c56d",
      lineWidth: 0.55,
      showFaces: true,
      showWireframe: true,
    };
    if (scene) drawPolyhedronScene(ctx, 480, 310, scene, options);
    if (boxes) drawBoxScene(ctx, 480, 310, boxes, options);
  }, [kind, step, variant, rotation, ratio, sides, scene, boxes]);
  const choices =
    kind === "vicsek-fractal-2d"
      ? ["Diagonal cross", "Greek cross"]
      : kind === "mosely-snowflake"
        ? ["18 cubes", "19 cubes"]
        : kind === "polyhedron-flake"
          ? ["Octahedron", "Dodecahedron", "Icosahedron"]
          : kind === "n-flake" && [4, 5, 6].includes(sides)
            ? ["Corners only", "Keep the center"]
            : [];
  const summary =
    kind === "h-tree"
      ? `${2 ** step} newest segments · newest total length ${(2 * ratio) ** step < 100 ? ((2 * ratio) ** step).toFixed(2) : ((2 * ratio) ** step).toFixed(0)} × root length`
      : kind === "t-square-fractal"
        ? `${4 ** step} newest squares · child side ${ratio.toFixed(2)} × parent`
        : kind === "vicsek-fractal-2d"
          ? `${5 ** step} squares · ${(100 * (5 / 9) ** step).toFixed(1)}% area remains`
          : kind === "mosely-snowflake"
            ? `${(variant ? 19 : 18) ** step} cubes · ${(100 * ((variant ? 19 : 18) / 27) ** step).toFixed(1)}% volume remains`
            : kind === "vicsek-fractal-3d"
              ? `${7 ** step} cubes · ${(100 * (7 / 27) ** step).toFixed(1)}% volume remains`
              : kind === "sierpinski-tetrahedron"
                ? `${4 ** step} tetrahedra · ${(100 * 0.5 ** step).toFixed(1)}% volume remains`
                : kind === "koch-surface"
                  ? `${6 ** step} triangles · ${(1.5 ** step).toFixed(2)} × starting area`
                  : kind === "quadratic-koch-3d"
                    ? `${6 * 13 ** step} square faces · ${((13 / 9) ** step).toFixed(2)} × starting area`
                    : kind === "jerusalem-cube"
                      ? `${boxes ? Array.from(boxes.firstChild).filter((child) => child < 0).length : 1} cubes · rank ${step} · two child scales`
                      : kind === "polyhedron-flake"
                        ? `${[6, 20, 12][variant] ** step} copies`
                        : `${(sides + ([4, 5, 6].includes(sides) && variant ? 1 : 0)) ** step} polygons`;
  return (
    <LessonFrame title={info.title} kind={`geometry-${kind}`}>
      <p>{info.idea}</p>
      <div className={extra.surface}>
        <canvas
          key={step}
          ref={canvas}
          width={960}
          height={620}
          role="img"
          aria-label={`${info.title}. ${summary}`}
          className={styles.reveal}
        />
      </div>
      <div className={extra.readout} aria-live="polite">
        {summary}
      </div>
      <LessonSteps
        key={`${variant}-${ratio}-${sides}`}
        step={step}
        max={info.max}
        onChange={setStep}
        label={info.title}
      />
      {choices.length > 0 && (
        <div className={styles.options}>
          {choices.map((label, index) => (
            <button
              key={label}
              type="button"
              aria-pressed={variant === index}
              onClick={() => setVariant(index)}
            >
              {label}
            </button>
          ))}
        </div>
      )}
      {!flat && (
        <label className={styles.parameter}>
          <span>
            View angle <output>{rotation}°</output>
          </span>
          <input
            type="range"
            aria-label="View angle"
            min={0}
            max={180}
            value={rotation}
            onChange={(e) => setRotation(Number(e.target.value))}
          />
        </label>
      )}
      {["h-tree", "t-square-fractal"].includes(kind) && (
        <label className={styles.parameter}>
          <span>
            Child scale <output>{ratio.toFixed(2)}</output>
          </span>
          <input
            type="range"
            aria-label="Child scale"
            min={0.3}
            max={0.8}
            step={0.01}
            value={ratio}
            onChange={(e) => setRatio(Number(e.target.value))}
          />
        </label>
      )}
      {kind === "n-flake" && (
        <label className={styles.parameter}>
          <span>
            Sides <output>{sides}</output>
          </span>
          <input
            type="range"
            aria-label="Sides"
            min={3}
            max={8}
            value={sides}
            onChange={(e) => {
              setSides(Number(e.target.value));
              setVariant(0);
            }}
          />
        </label>
      )}
      <p>{info.detail}</p>
      <p>{info.takeaway}</p>
    </LessonFrame>
  );
}
