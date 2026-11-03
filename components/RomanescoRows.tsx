import styles from "../styles/FractalConstruction.module.css";
import type { ConstructionOverlayProps } from "../utils/constructionLead";
import type { ConstructionView } from "../utils/constructionView";
import { romanescoRows } from "../utils/lessons/romanescoRows";

const toPath = (line: number[][]) =>
  line.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join("");

/** The spiral rows of peaks, drawn over the figure so they follow its camera. */
export function RomanescoRows({ view, level, width, height }: ConstructionOverlayProps) {
  const step = Number(view.rows);
  if (!step || level < 1 || view.autoRotate) return null;
  const rows = romanescoRows(step, view as ConstructionView, width, height);
  const paths = rows.map((lines) => lines.map(toPath).join(""));
  return (
    <svg
      className={styles.overlay}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden="true"
      data-romanesco-rows={rows.length}
    >
      {paths.map((path, row) => (
        <path key={`halo:${row}`} d={path} className={styles.rowHalo} />
      ))}
      {paths.map((path, row) => (
        <path key={`row:${row}`} d={path} className={styles.row} />
      ))}
      {rows.map(
        (lines, row) =>
          lines[0]?.[0] && (
            <circle
              key={`end:${row}`}
              cx={lines[0][0][0]}
              cy={lines[0][0][1]}
              r={3.5}
              className={styles.rowEnd}
            />
          ),
      )}
    </svg>
  );
}
