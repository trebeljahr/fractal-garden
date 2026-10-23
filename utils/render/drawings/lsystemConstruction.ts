import { expand, interpret } from "../../lsystem/engine";
import type { LSystemSpec } from "../../lsystem/spec";
import type { Context2D } from "../types";

/** The editor's current rules, drawn independently of its camera and worker. */
export function drawLSystemConstruction(
  ctx: Context2D,
  width: number,
  height: number,
  spec: LSystemSpec,
) {
  ctx.fillStyle = spec.background;
  ctx.fillRect(0, 0, width, height);
  const expansion = expand(spec, spec.iterations);
  const geometry = interpret(expansion.sentence, spec);
  if (!geometry.count) return 0;

  // Orthographic view keeps the entire construction visible at every step.
  const yaw = spec.dimension === "3d" ? 0.6 : 0;
  const pitch = spec.dimension === "3d" ? -0.35 : 0;
  const cy = Math.cos(yaw),
    sy = Math.sin(yaw);
  const cp = Math.cos(pitch),
    sp = Math.sin(pitch);
  const project = (index: number) => {
    const x = geometry.positions[index];
    const y = geometry.positions[index + 1];
    const z = geometry.positions[index + 2];
    return [cy * x + sy * z, -(sy * sp * x + cp * y - cy * sp * z)] as const;
  };
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (let i = 0; i < geometry.count * 6; i += 3) {
    const [x, y] = project(i);
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }
  const scale = Math.min(
    (width * 0.84) / Math.max(maxX - minX, 1e-6),
    (height * 0.84) / Math.max(maxY - minY, 1e-6),
  );
  const paths = new Map<number, Path2D>();
  for (let i = 0; i < geometry.count; i++) {
    const lineWidth = geometry.widths[i];
    let path = paths.get(lineWidth);
    if (!path) {
      path = new Path2D();
      paths.set(lineWidth, path);
    }
    const [x1, y1] = project(i * 6),
      [x2, y2] = project(i * 6 + 3);
    path.moveTo(
      width / 2 + (x1 - (minX + maxX) / 2) * scale,
      height / 2 + (y1 - (minY + maxY) / 2) * scale,
    );
    path.lineTo(
      width / 2 + (x2 - (minX + maxX) / 2) * scale,
      height / 2 + (y2 - (minY + maxY) / 2) * scale,
    );
  }
  ctx.strokeStyle = spec.color;
  ctx.lineCap = "round";
  paths.forEach((path, weight) => {
    ctx.lineWidth = Math.max(0.25, spec.lineWidth * weight);
    ctx.stroke(path);
  });
  return geometry.count;
}
