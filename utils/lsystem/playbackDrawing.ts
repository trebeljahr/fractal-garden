import type { ConstructionView } from "../constructionView";
import { viewRotation } from "../orientation";
import type { Playback } from "./playback";

export function preparePlaybackDrawing(
  width: number,
  height: number,
  model: Playback,
  scene: boolean,
  view: ConstructionView,
) {
  const { geometry, poses, drawn } = model;
  const rotation = viewRotation(
    scene ? view.rotationX : 0,
    scene ? view.rotationY : 0,
    scene ? view.grab : undefined,
  );
  const project = (x: number, y: number, z: number) => [
    rotation[0] * x + rotation[1] * y + rotation[2] * z,
    -(rotation[3] * x + rotation[4] * y + rotation[5] * z),
  ];
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  // Fit to the whole path so the camera stays still while the turtle walks.
  for (let i = 0; i < geometry.count * 6; i += 3) {
    const [x, y] = project(
      geometry.positions[i],
      geometry.positions[i + 1],
      geometry.positions[i + 2],
    );
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }
  if (!Number.isFinite(minX)) minX = minY = maxX = maxY = 0;
  const span = Math.max(maxX - minX, maxY - minY, 1);
  const scale =
    Math.min(
      (width * 0.8) / Math.max(maxX - minX, span * 0.1),
      (height * 0.75) / Math.max(maxY - minY, span * 0.1),
    ) * (scene ? 7.5 / view.cameraDistance : view.zoom);
  const screen = (x: number, y: number, z: number) => {
    const [px, py] = project(x, y, z);
    return [
      width / 2 +
        (px - (minX + maxX) / 2) * scale +
        (scene ? 0 : -view.x * Math.min(width, height) * view.zoom),
      height / 2 +
        (py - (minY + maxY) / 2) * scale +
        (scene ? 0 : -view.y * Math.min(width, height) * view.zoom),
    ];
  };
  const point = (offset: number) =>
    screen(
      geometry.positions[offset],
      geometry.positions[offset + 1],
      geometry.positions[offset + 2],
    );
  const projected = new Float32Array(geometry.count * 4);
  const ghost = new Path2D();
  for (let i = 0; i < geometry.count; i++) {
    const a = point(i * 6),
      b = point(i * 6 + 3);
    projected.set([a[0], a[1], b[0], b[1]], i * 4);
    ghost.moveTo(a[0], a[1]);
    ghost.lineTo(b[0], b[1]);
  }
  // Cache finished chunks. Each animation frame builds at most one small tail.
  const chunkSize = 256;
  const chunks = new Map<number, Map<number, Path2D>>();
  const lines = (start: number, end: number) => {
    const paths = new Map<number, Path2D>();
    for (let i = start; i < end; i++) {
      const weight = geometry.widths[i] * (model.repeat === 2 && i >= geometry.count / 2 ? -1 : 1);
      let path = paths.get(weight);
      if (!path) {
        path = new Path2D();
        paths.set(weight, path);
      }
      path.moveTo(projected[i * 4], projected[i * 4 + 1]);
      path.lineTo(projected[i * 4 + 2], projected[i * 4 + 3]);
    }
    return paths;
  };
  return (ctx: CanvasRenderingContext2D, consumed: number, progress: number, drawing: boolean) => {
    ctx.fillStyle = view.background;
    ctx.fillRect(0, 0, width, height);
    const count = drawing ? drawn[consumed] : 0;
    const before = consumed > 0 ? drawn[consumed - 1] : 0;
    ctx.strokeStyle = "#eee8ce30";
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 5]);
    ctx.stroke(ghost);
    if (model.repeat === 2 && view.showTiling && model.word.length) {
      const start = screen(poses[0], poses[1], poses[2]);
      const end = screen(
        poses[model.word.length * 6],
        poses[model.word.length * 6 + 1],
        poses[model.word.length * 6 + 2],
      );
      const dx = end[0] - start[0],
        dy = end[1] - start[1];
      const range = Math.min(
        8,
        Math.ceil(Math.max(width, height) / Math.max(1, Math.hypot(dx, dy))) + 1,
      );
      ctx.save();
      ctx.globalAlpha = 0.4;
      for (let a = -range; a <= range; a++)
        for (let b = -range; b <= range; b++) {
          if (!a && !b) continue;
          ctx.save();
          ctx.translate(a * dx - b * dy, a * dy + b * dx);
          ctx.stroke(ghost);
          ctx.restore();
        }
      ctx.restore();
    }
    ctx.setLineDash([]);
    ctx.strokeStyle = view.color;
    ctx.lineCap = "round";
    const stroke = (paths: Map<number, Path2D>) =>
      paths.forEach((path, weight) => {
        ctx.strokeStyle =
          model.repeat === 2
            ? String(
                weight < 0 ? (view.secondDragon ?? view.color) : (view.firstDragon ?? view.color),
              )
            : view.color;
        ctx.lineWidth = Math.max(0.5, view.lineWidth * Math.abs(weight));
        ctx.stroke(path);
      });
    const settled = Math.min(before, count);
    const whole = Math.floor(settled / chunkSize) * chunkSize;
    for (let start = 0; start < whole; start += chunkSize) {
      let chunk = chunks.get(start);
      if (!chunk) {
        chunk = lines(start, start + chunkSize);
        chunks.set(start, chunk);
      }
      stroke(chunk);
    }
    stroke(lines(whole, settled));
    if (count > before) {
      stroke(lines(before, count - 1));
      const i = count - 1;
      ctx.beginPath();
      ctx.moveTo(projected[i * 4], projected[i * 4 + 1]);
      ctx.lineTo(
        projected[i * 4] + (projected[i * 4 + 2] - projected[i * 4]) * progress,
        projected[i * 4 + 1] + (projected[i * 4 + 3] - projected[i * 4 + 1]) * progress,
      );
      ctx.strokeStyle =
        model.repeat === 2
          ? String(
              i >= geometry.count / 2
                ? (view.secondDragon ?? view.color)
                : (view.firstDragon ?? view.color),
            )
          : view.color;
      ctx.lineWidth = Math.max(0.5, view.lineWidth * geometry.widths[i]);
      ctx.stroke();
    }
    if (!drawing) return;
    const current = consumed * 6,
      prev = Math.max(0, consumed - 1) * 6;
    const head = screen(
      poses[prev] + (poses[current] - poses[prev]) * progress,
      poses[prev + 1] + (poses[current + 1] - poses[prev + 1]) * progress,
      poses[prev + 2] + (poses[current + 2] - poses[prev + 2]) * progress,
    );
    const from = screen(poses[prev], poses[prev + 1], poses[prev + 2]);
    ctx.strokeStyle = "#f5c56d";
    ctx.lineWidth = 2.5;
    if (consumed > 0 && (from[0] !== head[0] || from[1] !== head[1])) {
      ctx.beginPath();
      ctx.moveTo(from[0], from[1]);
      ctx.lineTo(head[0], head[1]);
      if (count === before) ctx.setLineDash([5, 5]);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    const start = screen(poses[0], poses[1], poses[2]);
    ctx.beginPath();
    ctx.arc(start[0], start[1], 5, 0, Math.PI * 2);
    ctx.fillStyle = view.background;
    ctx.fill();
    ctx.strokeStyle = "#eee8ce";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    const h0 = project(poses[prev + 3], poses[prev + 4], poses[prev + 5]);
    const h1 = project(poses[current + 3], poses[current + 4], poses[current + 5]);
    const a0 = Math.atan2(h0[1], h0[0]);
    const delta = Math.atan2(
      Math.sin(Math.atan2(h1[1], h1[0]) - a0),
      Math.cos(Math.atan2(h1[1], h1[0]) - a0),
    );
    ctx.save();
    ctx.translate(head[0], head[1]);
    ctx.rotate(a0 + delta * progress);
    ctx.beginPath();
    ctx.moveTo(12, 0);
    ctx.lineTo(-8, -7);
    ctx.lineTo(-4, 0);
    ctx.lineTo(-8, 7);
    ctx.closePath();
    ctx.fillStyle = "#f5c56d";
    ctx.fill();
    ctx.strokeStyle = view.background;
    ctx.stroke();
    ctx.restore();
  };
}
