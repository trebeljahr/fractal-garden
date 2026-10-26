// biome-ignore-all lint/suspicious/noArrayIndexKey: Face indices are stable positions in the generated geometry.
import { useId, useMemo, useState } from "react";
import styles from "../styles/ProjectionLesson.module.css";
import { type Point2, type Point3, projectionPolygons } from "../utils/fractalProjections";
import {
  liftSlice,
  mengerSliceGeometry,
  sliceDepth,
  sliceView,
  tunnelCorners,
  tunnelSection,
} from "../utils/lessons/mengerSlice";

const path = (points: Point2[]) =>
  points.length ? `M${points.map((p) => p.join(",")).join("L")}Z` : "";
const flat = ([x, y]: Point2): Point2 => [200 + 100 * x, 180 - 100 * y];
const names = ["Left to right", "Front to back", "Bottom to top"];

export default function MengerSliceLesson() {
  const id = useId();
  const [depth, setDepth] = useState(1);
  const [offset, setOffset] = useState(0);
  const [shadow, setShadow] = useState(false);
  const [tunnel, setTunnel] = useState(-1);
  const geometry = useMemo(() => mengerSliceGeometry(depth, offset), [depth, offset]);
  const shadowPolys = useMemo(() => projectionPolygons("menger", depth, false), [depth]);
  const selected = depth > 0 && tunnel >= 0 ? tunnelSection(tunnel, offset) : [];
  const faces = geometry.faces
    .map((points) => ({ points, section: false }))
    .concat(
      geometry.sections.map((points) => ({
        points: points.map((p) => liftSlice(p, offset)),
        section: true,
      })),
    )
    .sort((a, b) => sliceDepth(a.points) - sliceDepth(b.points));
  const corners = tunnel >= 0 ? tunnelCorners(tunnel) : [];
  const tunnelEdges: Point3[][] = [];
  for (let i = 0; i < corners.length; i++)
    for (const bit of [1, 2, 4])
      if ((i ^ bit) > i) tunnelEdges.push([corners[i], corners[i ^ bit]]);

  return (
    <figure
      className={styles.lesson}
      aria-labelledby={`${id}-title`}
      data-projection-lesson="menger"
    >
      <figcaption id={`${id}-title`} className={styles.title}>
        A slice through square tunnels
      </figcaption>
      <p>
        Move the slice and watch the holes change. The amber faces show where the sponge meets it;
        the front part of the sponge is hidden. Highlight a tunnel to see its opening in teal.
      </p>
      <div className={styles.controls}>
        <label htmlFor={`${id}-depth`}>
          Round <output>{depth}</output>
        </label>
        <input
          id={`${id}-depth`}
          aria-label="Menger slice round"
          type="range"
          min={0}
          max={2}
          value={depth}
          onChange={(e) => setDepth(Number(e.target.value))}
        />
        <button type="button" onClick={() => setOffset(0)} disabled={offset === 0}>
          Center the slice
        </button>
      </div>
      <label className={styles.planeControl}>
        <span>
          Slice position{" "}
          <output>
            {offset === 0
              ? "Center"
              : offset < 0
                ? "Toward the far corner"
                : "Toward the near corner"}
          </output>
        </span>
        <input
          aria-label="Slice position"
          type="range"
          min={-2.8}
          max={2.8}
          step={0.02}
          value={offset}
          onChange={(e) => setOffset(Number(e.target.value))}
        />
      </label>
      <div className={styles.views}>
        <div>
          <div className={styles.viewLabel}>Sponge and slice</div>
          <svg
            viewBox="0 0 400 360"
            role="img"
            aria-label={`Menger sponge round ${depth}, opened at diagonal plane ${offset.toFixed(2)}`}
          >
            {faces.map(({ points, section }, i) => (
              <path
                key={`${section}-${i}`}
                d={path(points.map(sliceView))}
                fill={section ? "#f5c56d" : "#697b83"}
                stroke={section ? "#f5c56d" : "#10151a"}
                strokeWidth={0.45}
              />
            ))}
            <path
              d={path(geometry.boundary.map((p) => sliceView(liftSlice(p, offset))))}
              fill="none"
              stroke="#f5c56d"
              strokeWidth={1.5}
              strokeDasharray="6 4"
            />
            {depth > 0 && tunnel >= 0 && (
              <g stroke="#69c8c0" strokeWidth={1.5} fill="none">
                {tunnelEdges.map((points, i) => (
                  <path
                    key={i}
                    d={`M${points
                      .map(sliceView)
                      .map((p) => p.join(","))
                      .join("L")}`}
                    strokeDasharray="4 4"
                  />
                ))}
                <path
                  d={path(selected.map((p) => sliceView(liftSlice(p, offset))))}
                  fill="#69c8c055"
                  strokeDasharray="none"
                />
              </g>
            )}
          </svg>
        </div>
        <div>
          <div className={styles.viewLabel}>
            {shadow ? "Shadow from straight in front" : "The same slice, seen flat"}
          </div>
          <svg
            viewBox="0 0 400 360"
            role="img"
            aria-label={`${shadow ? "Front shadow" : "Matching diagonal cross-section"}, round ${depth}, plane ${offset.toFixed(2)}`}
          >
            <path
              d={(shadow ? shadowPolys : geometry.sections).map((p) => path(p.map(flat))).join("")}
              fill="#f5c56d"
            />
            {!shadow && (
              <path
                d={path(geometry.boundary.map(flat))}
                fill="none"
                stroke="#eee8ce66"
                strokeWidth={1}
              />
            )}
            {!shadow && (
              <path
                d={path(selected.map(flat))}
                fill="#69c8c055"
                stroke="#69c8c0"
                strokeWidth={1.5}
              />
            )}
          </svg>
        </div>
      </div>
      <div className={styles.controls}>
        <fieldset aria-label="Flat view">
          <button type="button" aria-pressed={!shadow} onClick={() => setShadow(false)}>
            Cross-section
          </button>
          <button type="button" aria-pressed={shadow} onClick={() => setShadow(true)}>
            Shadow
          </button>
        </fieldset>
      </div>
      {depth > 0 && (
        <fieldset className={styles.copyControls} aria-label="Highlight a first-round tunnel">
          <legend>Highlight a tunnel</legend>
          <button type="button" aria-pressed={tunnel === -1} onClick={() => setTunnel(-1)}>
            None
          </button>
          {names.map((name, axis) => (
            <button
              key={name}
              type="button"
              aria-pressed={tunnel === axis}
              onClick={() => {
                setTunnel(axis);
                setShadow(false);
              }}
            >
              {name}
            </button>
          ))}
        </fieldset>
      )}
      <p aria-live="polite">
        {shadow
          ? "The shadow includes cubes at every depth. Moving the slice changes which cubes it meets, but leaves this shadow unchanged."
          : depth === 0
            ? "No tunnels yet. Move the slice to the center to see a solid six-sided shape."
            : Math.abs(offset) < 0.001
              ? "At the center, the three tunnel openings overlap to make the star-shaped hole."
              : "The slice now meets a different part of each tunnel. Center the slice to find the star-shaped hole again."}
      </p>
    </figure>
  );
}
