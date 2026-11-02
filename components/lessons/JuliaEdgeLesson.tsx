import { useEffect, useRef, useState } from "react";
import styles from "../../styles/lessons/PaintPlane.module.css";
import { crossingJump, juliaEdge, type PlaneBounds, STAYED } from "../../utils/lessons/paintPlane";
import type { ComplexPoint } from "../../utils/orbitLesson";
import { LessonFrame } from "./LessonFrame";
import { coordinates, PaintPlane, planeHeight } from "./PaintPlane";

const ZERO = { real: 0, imaginary: 0 };
const C_BOUNDS: PlaneBounds = [-2.2, 1, -1.33, 1.33];
const EDGE_BOUNDS: PlaneBounds = [-2.1, 2.1, -1.75, 1.75];
const EDGE_COLUMNS = 560;
const EDGE_INK = [16, 21, 26];

function drawEdge(canvas: HTMLCanvasElement, c: ComplexPoint) {
  const context = canvas.getContext("2d");
  if (!context) return;
  const columns = canvas.width;
  const rows = canvas.height;
  const hits = juliaEdge(c, EDGE_BOUNDS, columns, rows);
  const image = context.createImageData(columns, rows);
  for (let cell = 0; cell < hits.length; cell++) {
    if (!hits[cell]) continue;
    image.data.set(EDGE_INK, cell * 4);
    image.data[cell * 4 + 3] = 255;
  }
  context.putImageData(image, 0, 0);
}

export default function JuliaEdgeLesson() {
  const [c, setC] = useState<ComplexPoint>(ZERO);
  const edge = useRef<HTMLCanvasElement>(null);
  const onePiece = crossingJump(c.real, c.imaginary, 0, 0) === STAYED;
  useEffect(() => {
    if (edge.current) drawEdge(edge.current, c);
  }, [c]);
  return (
    <LessonFrame title="Move c, watch the edge" kind="julia-edge">
      <div className={styles.pair}>
        <div>
          <h3>Choose c</h3>
          <PaintPlane bounds={C_BOUNDS} fixedC={null} value={c} onChange={setC} label="Number c" />
          <p data-selected-parameter={`${c.real},${c.imaginary}`}>c = {coordinates(c, 3)}</p>
        </div>
        <div>
          <h3>The edge for this c</h3>
          <canvas
            ref={edge}
            className={styles.edge}
            width={EDGE_COLUMNS}
            height={planeHeight(EDGE_BOUNDS, EDGE_COLUMNS)}
            role="img"
            aria-label={`The Julia set for c = ${coordinates(c, 3)}. ${onePiece ? "One piece." : "Dust."}`}
          />
          <p data-edge-state={onePiece ? "piece" : "dust"}>{onePiece ? "One piece" : "Dust"}</p>
        </div>
      </div>
    </LessonFrame>
  );
}
