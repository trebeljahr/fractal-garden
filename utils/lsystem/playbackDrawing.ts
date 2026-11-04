import type { ConstructionView } from "../constructionView";
import { untouchedCorner } from "../lessons/arrowheadChain";
import { fibonacciParts } from "../lessons/fibonacciPieces";
import { GOSPER_COPY_TINTS } from "../lessons/gosperCopies";
import { ADDED_TINT, detourRuns, HALF_TURN_RULES, REMOVED_TINT } from "../lessons/halfTurnArea";
import { notchTriangleTip } from "../lessons/quadraticStart";
import {
  LOOP_INSIDE_TINT,
  LOOP_OUTSIDE_TINT,
  staircaseDiamond,
} from "../lessons/sierpinskiCurveLoop";
import { TERDRAGON_COPY_TINTS, terdragonCensus } from "../lessons/terdragonCopies";
import { strokePasses, TIMES_DRAWN_TINTS, timesDrawnTint } from "../lessons/timesDrawn";
import { viewRotation } from "../orientation";
import type { Playback } from "./playback";

const OLD_LINES_TO_LEVEL = 3;

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
  for (let i = 0; i < geometry.positions.length; i += 3) {
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
  // The path's two ends, which every level of the arrowhead keeps.
  const ends = [
    geometry.positions[0],
    geometry.positions[1],
    geometry.positions[geometry.count * 6 - 3],
    geometry.positions[geometry.count * 6 - 2],
  ] as const;
  if (view.smallTriangles !== undefined) {
    // Fit the arrowhead's whole triangle at every level, not just the path's part of it.
    const [x, y] = project(...untouchedCorner(...ends, 0, 0), 0);
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
  // The twin dragons' two paths, for the copies in the tiling.
  const halves = [new Path2D(), new Path2D()];
  for (let i = 0; i < geometry.count; i++) {
    const a = point(i * 6),
      b = point(i * 6 + 3);
    projected.set([a[0], a[1], b[0], b[1]], i * 4);
    ghost.moveTo(a[0], a[1]);
    ghost.lineTo(b[0], b[1]);
    if (model.repeat === 2) {
      const half = halves[i < geometry.count / 2 ? 0 : 1];
      half.moveTo(a[0], a[1]);
      half.lineTo(b[0], b[1]);
    }
  }
  let notchRoom: Path2D | null = null;
  // Past this the triangles are smaller than the line's width, and filling them stalls the page.
  if (view.notchRoom && geometry.count <= 5000) {
    notchRoom = new Path2D();
    for (let i = 0; i < geometry.count; i++) {
      const [ax, ay, bx, by] = [
        projected[i * 4],
        projected[i * 4 + 1],
        projected[i * 4 + 2],
        projected[i * 4 + 3],
      ];
      const [tipX, tipY] = notchTriangleTip(ax, ay, bx, by);
      notchRoom.moveTo(ax, ay);
      notchRoom.lineTo(bx, by);
      notchRoom.lineTo(tipX, tipY);
      notchRoom.closePath();
    }
  }
  // The area each replacement takes from one side of its old line and adds to the other.
  const detours: { path: Path2D; until: number; tint: string }[] = [];
  const detourRule = HALF_TURN_RULES[view.detours as string];
  // Past this the detours are smaller than the line's width, and filling them stalls the page.
  if (detourRule && geometry.count <= 5000)
    for (const { from, to, effect } of detourRuns(geometry.count, detourRule)) {
      const path = new Path2D();
      path.moveTo(projected[from * 4], projected[from * 4 + 1]);
      for (let i = from; i < to; i++) path.lineTo(projected[i * 4 + 2], projected[i * 4 + 3]);
      path.closePath();
      detours.push({ path, until: to, tint: effect === "added" ? ADDED_TINT : REMOVED_TINT });
    }
  // A closed line: what it encloses, and the rest of the staircase diamond around it.
  let loopInside: Path2D | null = null;
  let loopOutside: Path2D | null = null;
  let loopDiamond: Path2D | null = null;
  let widestLine = Infinity;
  // At level 3 a normal line would cover the tints.
  if (detours.length)
    widestLine = Math.hypot(projected[2] - projected[0], projected[3] - projected[1]) / 4;
  if (view.loopRegions && geometry.count) {
    loopInside = new Path2D();
    loopInside.moveTo(projected[0], projected[1]);
    let [left, right, top, bottom] = [Infinity, -Infinity, Infinity, -Infinity];
    for (let i = 0; i < geometry.count; i++) {
      const [x, y] = [projected[i * 4 + 2], projected[i * 4 + 3]];
      loopInside.lineTo(x, y);
      left = Math.min(left, x);
      right = Math.max(right, x);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
    }
    loopInside.closePath();
    // The line's steps are all one length, so the box around it is a whole number of them wide.
    const stepsWide = Math.round(
      (right - left) / Math.hypot(projected[2] - projected[0], projected[3] - projected[1]),
    );
    const pixels = (right - left) / stepsWide;
    // At the top levels a normal line would cover both tints.
    widestLine = pixels / 4;
    loopDiamond = new Path2D();
    for (const [x, y] of staircaseDiamond(stepsWide))
      loopDiamond.lineTo((left + right) / 2 + x * pixels, (top + bottom) / 2 + y * pixels);
    loopDiamond.closePath();
    loopOutside = new Path2D(loopDiamond);
    loopOutside.addPath(loopInside);
  }
  // Each line of the arrowhead is one side of a small triangle.
  const smallTriangles = view.smallTriangles && geometry.count <= 5000;
  const tips = new Float32Array(smallTriangles ? geometry.count * 2 : 0);
  const addTriangle = (path: Path2D, line: number) => {
    path.moveTo(projected[line * 4], projected[line * 4 + 1]);
    path.lineTo(projected[line * 4 + 2], projected[line * 4 + 3]);
    path.lineTo(tips[line * 2], tips[line * 2 + 1]);
    path.closePath();
  };
  const triangles = new Path2D();
  if (smallTriangles)
    for (let i = 0; i < geometry.count; i++) {
      const [x, y] = untouchedCorner(
        geometry.positions[i * 6],
        geometry.positions[i * 6 + 1],
        geometry.positions[i * 6 + 3],
        geometry.positions[i * 6 + 4],
        i,
        model.generation,
      );
      tips.set(screen(x, y, 0), i * 2);
      addTriangle(triangles, i);
    }
  // Cache finished chunks. Each animation frame builds at most one small tail.
  const chunkSize = 256;
  const chunks = new Map<number, Map<number, Path2D>>();
  const passes =
    view.timesDrawn === "tint" ? strokePasses(geometry.positions, geometry.count) : null;
  const parts = fibonacciParts(view.parts, model.generation);
  const tints = passes
    ? TIMES_DRAWN_TINTS
    : parts
      ? parts.tints
      : view.copies === "seven"
        ? GOSPER_COPY_TINTS
        : model.copies > 1
          ? TERDRAGON_COPY_TINTS.slice(0, model.copies)
          : null;
  // At the first levels, the level before shows dim under this one. Three strokes replaced each of
  // its lines, so that line joins the first stroke's start to the third stroke's end.
  const oldLines =
    view.showOldLines && model.generation <= OLD_LINES_TO_LEVEL ? new Path2D() : null;
  if (oldLines)
    for (let i = 0; i < geometry.count; i += 3) {
      oldLines.moveTo(projected[i * 4], projected[i * 4 + 1]);
      oldLines.lineTo(projected[(i + 2) * 4 + 2], projected[(i + 2) * 4 + 3]);
    }
  const tintSlot = (line: number) =>
    passes
      ? timesDrawnTint(passes[line])
      : parts
        ? parts.ends.findIndex((end) => line < end)
        : Math.floor((line * (tints as string[]).length) / geometry.count);
  const tintOf = (line: number) => (tints ? tints[tintSlot(line)] : view.color);
  const lines = (start: number, end: number) => {
    const paths = new Map<number, Path2D>();
    for (let i = start; i < end; i++) {
      // Lines that share a weight and a tint are stroked together.
      const weight = tints
        ? 1 + tintSlot(i)
        : geometry.widths[i] * (model.repeat === 2 && i >= geometry.count / 2 ? -1 : 1);
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
    if (notchRoom) {
      ctx.globalAlpha = 0.28;
      ctx.fillStyle = view.color;
      ctx.fill(notchRoom);
      ctx.globalAlpha = 0.6;
      ctx.strokeStyle = view.background;
      ctx.lineWidth = 1;
      ctx.stroke(notchRoom);
      ctx.globalAlpha = 1;
    }
    if (loopInside && loopOutside && loopDiamond) {
      ctx.globalAlpha = 0.45;
      ctx.fillStyle = LOOP_INSIDE_TINT;
      ctx.fill(loopInside);
      ctx.fillStyle = LOOP_OUTSIDE_TINT;
      ctx.fill(loopOutside, "evenodd");
      ctx.globalAlpha = 1;
      ctx.strokeStyle = "#eee8ce";
      ctx.lineWidth = 1;
      ctx.stroke(loopDiamond);
    }
    const count = drawing ? drawn[consumed] : 0;
    const before = consumed > 0 ? drawn[consumed - 1] : 0;
    if (detours.length) {
      // A detour tints once the pen has drawn it.
      ctx.globalAlpha = 0.6;
      for (const { path, until, tint } of detours)
        if (count >= until) {
          ctx.fillStyle = tint;
          ctx.fill(path);
        }
      ctx.globalAlpha = 1;
    }
    if (smallTriangles) {
      // Triangles the pen has reached fill in, and the one it is in stands out.
      const reached = new Path2D();
      for (let i = 0; i < count; i++) addTriangle(reached, i);
      ctx.fillStyle = view.color;
      ctx.globalAlpha = 0.1;
      ctx.fill(triangles);
      ctx.globalAlpha = 0.22;
      ctx.fill(reached);
      if (count > 0 && consumed < model.instructionLength) {
        const inside = new Path2D();
        addTriangle(inside, count - 1);
        ctx.globalAlpha = 0.5;
        ctx.fill(inside);
      }
      ctx.globalAlpha = 1;
    }
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
      ctx.setLineDash([]);
      ctx.globalAlpha = 0.35;
      for (let a = -range; a <= range; a++)
        for (let b = -range; b <= range; b++) {
          if (!a && !b) continue;
          ctx.save();
          ctx.translate(a * dx - b * dy, a * dy + b * dx);
          ctx.strokeStyle = String(view.firstDragon ?? view.color);
          ctx.stroke(halves[0]);
          ctx.strokeStyle = String(view.secondDragon ?? view.color);
          ctx.stroke(halves[1]);
          ctx.restore();
        }
      ctx.restore();
    }
    ctx.setLineDash([]);
    if (oldLines) {
      ctx.strokeStyle = "#eee8ce40";
      ctx.lineWidth = 1;
      ctx.stroke(oldLines);
    }
    ctx.strokeStyle = view.color;
    ctx.lineCap = "round";
    const stroke = (path: Path2D, weight: number) => {
      ctx.strokeStyle = tints
        ? tints[weight - 1]
        : model.repeat === 2
          ? String(
              weight < 0 ? (view.secondDragon ?? view.color) : (view.firstDragon ?? view.color),
            )
          : view.color;
      ctx.lineWidth = Math.min(
        widestLine,
        Math.max(0.5, view.lineWidth * (tints ? 1 : Math.abs(weight))),
      );
      ctx.stroke(path);
    };
    const settled = Math.min(before, count);
    const whole = Math.floor(settled / chunkSize) * chunkSize;
    const batches: Map<number, Path2D>[] = [];
    for (let start = 0; start < whole; start += chunkSize) {
      let chunk = chunks.get(start);
      if (!chunk) {
        chunk = lines(start, start + chunkSize);
        chunks.set(start, chunk);
      }
      batches.push(chunk);
    }
    batches.push(lines(whole, settled));
    if (count > before) batches.push(lines(before, count - 1));
    if (passes) {
      // Most-drawn lines go on top, so a neighbor the pen drew later can't hide them.
      TIMES_DRAWN_TINTS.forEach((_, slot) => {
        for (const paths of batches) {
          const path = paths.get(slot + 1);
          if (path) stroke(path, slot + 1);
        }
      });
    } else for (const paths of batches) paths.forEach(stroke);
    if (count > before) {
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
          : tintOf(i);
      ctx.lineWidth = Math.max(0.5, view.lineWidth * geometry.widths[i]);
      ctx.stroke();
    }
    if (view.smallTriangles && geometry.count > 1) {
      // Halfway along the first line, where the pen's first triangle meets its last.
      const [x, y] = screen((ends[0] + ends[2]) / 2, (ends[1] + ends[3]) / 2, 0);
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.fill();
      ctx.strokeStyle = view.background;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    // A finished level is just the picture.
    if (!drawing || consumed >= model.instructionLength) {
      if (drawing && parts?.ends.length === 5) {
        // The straight distance the readout measures.
        const last = (geometry.count - 1) * 4;
        ctx.beginPath();
        ctx.moveTo(projected[0], projected[1]);
        ctx.lineTo(projected[last + 2], projected[last + 3]);
        ctx.strokeStyle = "#eee8ce";
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 6]);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      if (drawing && model.copies === TERDRAGON_COPY_TINTS.length) {
        // The part where no line of the grid is missing. Its corners lie along the six first lines.
        const { hexagonSide } = terdragonCensus(model.generation, model.copies);
        ctx.beginPath();
        for (let copy = 0; copy < model.copies; copy++) {
          const o = copy * (geometry.count / model.copies) * 6;
          const [x, y] = screen(
            geometry.positions[o + 3] * hexagonSide,
            geometry.positions[o + 4] * hexagonSide,
            0,
          );
          ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1.25;
        ctx.stroke();
      }
      return;
    }
    // The pen lifts between copies.
    const lifted = model.copies > 1 && consumed > 1 && (consumed - 1) % model.word.length === 0;
    const current = consumed * 6,
      prev = lifted ? current : Math.max(0, consumed - 1) * 6;
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
