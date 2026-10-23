import { useId, useMemo, useState } from "react";
import styles from "../styles/ProjectionLesson.module.css";
import { type ProjectionKind, projectionPolygons } from "../utils/fractalProjections";
import TetrahedronShadows from "./TetrahedronShadows";

const COPY = {
  menger: {
    title: "Menger shadow and cross-section",
    modes: ["Shadow", "Cross-section"],
  },
  vicsek: {
    title: "Cross-shaped shadow",
    modes: ["Shadow"],
  },
} as const;
export function isProjectionKind(value: unknown): value is ProjectionKind {
  return value === "menger" || value === "vicsek" || value === "tetrahedron";
}

export default function ProjectionLesson({ kind }: { kind: ProjectionKind }) {
  return kind === "tetrahedron" ? <TetrahedronShadows /> : <CubeProjectionLesson kind={kind} />;
}

function CubeProjectionLesson({ kind }: { kind: "menger" | "vicsek" }) {
  const [depth, setDepth] = useState(2),
    [mode, setMode] = useState(0);
  const id = useId(),
    copy = COPY[kind];
  const polygons = useMemo(() => projectionPolygons(kind, depth, mode === 1), [kind, depth, mode]);

  return (
    <figure className={styles.lesson} aria-labelledby={`${id}-title`} data-projection-lesson={kind}>
      <figcaption id={`${id}-title`} className={styles.title}>
        {copy.title}
      </figcaption>
      <div className={styles.controls}>
        {copy.modes.length > 1 && (
          <fieldset aria-label="View">
            {copy.modes.map((label, i) => (
              <button
                key={label}
                type="button"
                aria-pressed={mode === i}
                onClick={() => setMode(i)}
              >
                {label}
              </button>
            ))}
          </fieldset>
        )}
        <label htmlFor={`${id}-depth`}>
          Step <output>{depth}</output>
        </label>
        <input
          id={`${id}-depth`}
          type="range"
          min="0"
          max="3"
          step="1"
          value={depth}
          onChange={(e) => setDepth(Number(e.target.value))}
        />
      </div>
      <svg viewBox="-1.9 -1.7 3.8 3.4" role="img" aria-label={`${copy.modes[mode]}, step ${depth}`}>
        <g transform="scale(1,-1)" fill="currentColor">
          <path d={polygons.map((p) => `M${p.map((v) => v.join(",")).join("L")}Z`).join("")} />
        </g>
      </svg>
    </figure>
  );
}
