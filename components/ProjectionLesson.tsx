import { useId, useMemo, useState } from "react";
import styles from "../styles/ProjectionLesson.module.css";
import { encodeView } from "../utils/explorerShare";
import { type ProjectionKind, projectionPolygons } from "../utils/fractalProjections";

const COPY = {
  menger: {
    title: "A carpet shadow and a star-filled slice",
    modes: ["Face-on shadow", "Diagonal slice"],
    captions: [
      "Parallel rays look through the whole sponge. Overlapping cubes give the Sierpiński carpet.",
      "Only material on x + y + z = 0 remains in this central cut. The dark six-pointed stars are empty space.",
    ],
    path: "/menger-sponge",
  },
  vicsek: {
    title: "Seven cubes cast a five-square cross",
    modes: ["Face-on shadow"],
    captions: [
      "The front, centre and back cubes overlap in projection. Seven cubes become five visible squares at every level.",
    ],
    path: "/vicsek-fractal-3d",
  },
  tetrahedron: {
    title: "One tetrahedron, two different shadows",
    modes: ["Filled square", "Triangular gasket"],
    captions: [
      "Look through the midpoints of opposite edges. Four half-size shadows tile the square, leaving no holes.",
      "Look parallel to an edge. Two corner copies project to the same place, leaving three half-size triangular copies.",
    ],
    path: "/sierpinski-tetrahedron",
  },
} as const;
export function isProjectionKind(value: unknown): value is ProjectionKind {
  return value === "menger" || value === "vicsek" || value === "tetrahedron";
}

export default function ProjectionLesson({ kind }: { kind: ProjectionKind }) {
  const [depth, setDepth] = useState(2),
    [mode, setMode] = useState(0);
  const id = useId(),
    copy = COPY[kind];
  const polygons = useMemo(() => projectionPolygons(kind, depth, mode === 1), [kind, depth, mode]);
  const link = `${copy.path}${encodeView(copy.path, { config: { variant: kind === "tetrahedron" ? "tetrahedron" : "default", navigation: "orbit", iterations: depth, autoRotate: false, animateIterations: false, rotationX: 0, rotationY: 0, grab: [1, 0, 0, 0, 1, 0, 0, 0, 1], cameraDistance: 6 }, renderer: 0 })}`;
  return (
    <figure className={styles.lesson} aria-labelledby={`${id}-title`} data-projection-lesson={kind}>
      <figcaption id={`${id}-title`} className={styles.title}>
        {copy.title}
      </figcaption>
      <div className={styles.controls}>
        {copy.modes.length > 1 && (
          <fieldset aria-label="Projection or slice">
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
          Subdivisions <output>{depth}</output>
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
      <svg
        viewBox="-1.9 -1.7 3.8 3.4"
        role="img"
        aria-label={`${copy.modes[mode]} at ${depth} subdivisions`}
      >
        <g transform="scale(1,-1)" fill="currentColor">
          <path d={polygons.map((p) => `M${p.map((v) => v.join(",")).join("L")}Z`).join("")} />
        </g>
      </svg>
      <p aria-live="polite">{copy.captions[mode]}</p>
      <p className={styles.note}>
        This diagram uses{" "}
        {kind === "menger" && mode === 1
          ? "an exact plane intersection"
          : "orthographic projection with parallel rays"}
        . The full explorer uses perspective.
      </p>
      <a
        href={link}
        onClick={(event) => {
          if (
            event.button !== 0 ||
            event.metaKey ||
            event.ctrlKey ||
            event.shiftKey ||
            event.altKey
          )
            return;
          event.preventDefault();
          history.pushState(null, "", link);
          dispatchEvent(new HashChangeEvent("hashchange"));
          window.scrollTo(0, 0);
        }}
      >
        Open the {kind === "tetrahedron" ? "tetrahedron" : "cube"} explorer
      </a>
    </figure>
  );
}
