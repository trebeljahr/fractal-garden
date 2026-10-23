import { useId, useMemo, useState } from "react";
import styles from "../styles/ProjectionLesson.module.css";
import {
  type Point2,
  type Point3,
  TETRA_VERTICES,
  tetrahedronPieces,
  tetrahedronProjection,
} from "../utils/fractalProjections";

const COLORS = ["#e6ae58", "#78b8ab", "#d18fa1", "#99aade"];
const FACES = [
  [0, 1, 2],
  [0, 1, 3],
  [0, 2, 3],
  [1, 2, 3],
];
const yaw = 0.65;
const tilt = 0.4;
const sourcePoint = ([x, y, z]: Point3): Point2 => [
  160 + 59 * (Math.cos(yaw) * x - Math.sin(yaw) * y),
  156 +
    59 *
      (Math.sin(yaw) * Math.sin(tilt) * x +
        Math.cos(yaw) * Math.sin(tilt) * y -
        Math.cos(tilt) * z),
];
const cameraDepth = ([x, y, z]: Point3) =>
  Math.sin(yaw) * Math.cos(tilt) * x + Math.cos(yaw) * Math.cos(tilt) * y + Math.sin(tilt) * z;
const shadowPoint = ([x, y]: Point2): Point2 => [160 + 79 * x, 150 - 79 * y];
const points = (vertices: Point2[]) => vertices.map((point) => point.join(",")).join(" ");
const half = (point: Point3) => point.map((value) => value / 2) as Point3;

export default function TetrahedronShadows() {
  const [triangular, setTriangular] = useState(false);
  const [depth, setDepth] = useState(1);
  const [selected, setSelected] = useState<number | null>(null);
  const id = useId().replace(/:/g, "");
  const pieces = useMemo(() => tetrahedronPieces(depth, triangular), [depth, triangular]);
  const faces = useMemo(
    () =>
      pieces
        .flatMap((piece) =>
          FACES.map((face) => {
            const vertices = face.map((vertex) => piece.vertices[vertex]);
            const center = vertices.reduce(
              (sum, point) => sum.map((value, axis) => value + point[axis] / 3) as Point3,
              [0, 0, 0] as Point3,
            );
            return { vertices, corner: piece.corner, distance: cameraDepth(center) };
          }),
        )
        .sort((a, b) => a.distance - b.distance),
    [pieces],
  );
  const direction: Point3 = triangular ? [0, Math.SQRT1_2, Math.SQRT1_2] : [0, 0, 1];
  const arrowStart = sourcePoint(direction.map((value) => value * 2.25) as Point3);
  const arrowEnd = sourcePoint(direction.map((value) => value * 1.4) as Point3);
  const dim = (corner: number) => (selected === null || selected === corner ? 1 : 0.13);
  const description =
    depth === 0
      ? "Step 0 shows the solid tetrahedron before any smaller copies are made."
      : triangular
        ? "Copies 1 and 2 have the same shadow. The four copies therefore appear in only three positions, leaving the triangular hole between them."
        : "Each copy casts one square shadow. The four squares meet without a gap, so the holes in the solid do not appear in this shadow.";
  return (
    <figure
      className={styles.lesson}
      data-projection-lesson="tetrahedron"
      aria-labelledby={`${id}-title`}
    >
      <figcaption id={`${id}-title`} className={styles.title}>
        Compare the shadows
      </figcaption>
      <div className={styles.controls}>
        <fieldset aria-label="Viewing direction">
          <button type="button" aria-pressed={!triangular} onClick={() => setTriangular(false)}>
            Square view
          </button>
          <button type="button" aria-pressed={triangular} onClick={() => setTriangular(true)}>
            Triangle view
          </button>
        </fieldset>
        <label htmlFor={`${id}-depth`}>
          Step <output>{depth}</output>
        </label>
        <input
          id={`${id}-depth`}
          type="range"
          min="0"
          max="3"
          value={depth}
          onChange={(event) => {
            setDepth(Number(event.target.value));
            setSelected(null);
          }}
        />
      </div>
      <div className={styles.views}>
        <div>
          <div className={styles.viewLabel}>Tetrahedron</div>
          <svg
            viewBox="0 0 320 300"
            role="img"
            aria-label={`Tetrahedron at step ${depth}. The arrow shows the direction used for the shadow.`}
          >
            <defs>
              <marker
                id={`${id}-arrow`}
                viewBox="0 0 10 10"
                refX="9"
                refY="5"
                markerWidth="7"
                markerHeight="7"
                orient="auto-start-reverse"
              >
                <path d="M0 0L10 5L0 10Z" fill="#eee8ce" />
              </marker>
            </defs>
            {faces.map((face) => (
              <polygon
                key={`${face.corner}:${face.vertices.map((point) => point.join(",")).join(";")}`}
                points={points(face.vertices.map(sourcePoint))}
                fill={COLORS[face.corner]}
                stroke="#10151a"
                strokeWidth="0.7"
                opacity={dim(face.corner)}
              />
            ))}
            <path
              d={`M${arrowStart.join(",")}L${arrowEnd.join(",")}`}
              stroke="#eee8ce"
              strokeWidth="2"
              markerEnd={`url(#${id}-arrow)`}
            />
            <text x={arrowStart[0] + 10} y={arrowStart[1] + 4} className={styles.diagramLabel}>
              View
            </text>
            {depth > 0 &&
              TETRA_VERTICES.map((vertex, corner) => {
                const center = sourcePoint(half(vertex));
                return (
                  <text
                    key={vertex.join(",")}
                    x={center[0]}
                    y={center[1]}
                    className={styles.copyLabel}
                    opacity={dim(corner)}
                  >
                    {corner + 1}
                  </text>
                );
              })}
          </svg>
        </div>
        <div>
          <div className={styles.viewLabel}>Shadow</div>
          <svg
            viewBox="0 0 320 300"
            role="img"
            aria-label={`${triangular ? "Triangular" : "Square"} shadow at step ${depth}. Matching colors identify the same copies in both drawings.`}
          >
            {COLORS.slice(0, depth === 0 ? 1 : 4).map((color, corner) => (
              <path
                key={color}
                d={pieces
                  .filter((piece) => piece.corner === corner)
                  .map(
                    (piece) =>
                      `M${piece.shadow.map((point) => shadowPoint(point).join(",")).join("L")}Z`,
                  )
                  .join(" ")}
                fill={color}
                fillOpacity="0.75"
                opacity={dim(corner)}
              />
            ))}
            {depth > 0 &&
              (triangular ? [0, 2, 3] : [0, 1, 2, 3]).map((corner) => {
                const center = shadowPoint(
                  tetrahedronProjection(half(TETRA_VERTICES[corner]), triangular),
                );
                const label = triangular && corner === 0 ? "1 + 2" : String(corner + 1);
                const opacity = triangular && corner === 0 && selected === 1 ? 1 : dim(corner);
                return (
                  <text
                    key={corner}
                    x={center[0]}
                    y={center[1]}
                    className={styles.copyLabel}
                    opacity={opacity}
                  >
                    {label}
                  </text>
                );
              })}
          </svg>
        </div>
      </div>
      {depth > 0 && (
        <fieldset className={styles.copyControls} aria-label="Highlight a copy">
          {COLORS.map((color, corner) => (
            <button
              key={color}
              type="button"
              aria-pressed={selected === corner}
              onClick={() => setSelected(selected === corner ? null : corner)}
            >
              <span className={styles.swatch} style={{ background: color }} />
              Copy {corner + 1}
            </button>
          ))}
        </fieldset>
      )}
      <p aria-live="polite">{description}</p>
    </figure>
  );
}
