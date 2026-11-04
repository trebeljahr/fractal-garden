import { useMemo } from "react";
import styles from "../styles/FractalConstruction.module.css";
import type { ConstructionFlatProps } from "../utils/constructionLead";
import { shadowArea, shadowPaths } from "../utils/lessons/quadraticShadow";

// Amber already marks the newest cubes in the solid, so what is still empty gets its own tint.
const PALE = "#f5f1d1";
const DIAMOND = "M0 -1L1 0L0 1L-1 0Z";

/** The shadow of the surface on a wall, straight behind one face, inside the diamond it fills. */
export function QuadraticShadow({ view, level }: ConstructionFlatProps) {
  const { outline, gaps } = useMemo(() => shadowPaths(level), [level]);
  const steps = 3 ** level;
  const toFaceWidths = `scale(${1 / steps}) translate(${-steps / 2} ${-steps / 2})`;
  const background = view.background as string;
  return (
    <svg
      className={styles.overlay}
      viewBox="-1.06 -1.06 2.12 2.12"
      role="img"
      aria-label={`The shadow at level ${level}, covering ${shadowArea(level).toFixed(2)} times the area of a face, inside a diamond of exactly twice a face's area.`}
      data-quadratic-shadow={level}
    >
      <path d={DIAMOND} fill={PALE} fillOpacity={0.24} />
      <g transform={toFaceWidths}>
        {gaps && (
          <path
            d={gaps}
            fill="none"
            stroke={background}
            strokeOpacity={0.7}
            vectorEffect="non-scaling-stroke"
          />
        )}
        <path d={outline} fill={view.fillColor as string} />
      </g>
      <rect
        x={-0.5}
        y={-0.5}
        width={1}
        height={1}
        fill="none"
        stroke={background}
        strokeOpacity={0.55}
        vectorEffect="non-scaling-stroke"
      />
      <path d={DIAMOND} fill="none" stroke={PALE} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
