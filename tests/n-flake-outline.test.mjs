import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import ts from "typescript";
import {
  hexagonKochOutline,
  outlineLineLength,
  outlineLines,
} from "../utils/lessons/nFlakeOutline.ts";

const require = createRequire(import.meta.url);
require.extensions[".ts"] = (module, filename) =>
  module._compile(
    ts.transpileModule(readFileSync(filename, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText,
    filename,
  );
const { drawNFlake, getScaleFactor, nFlakeRadius } = require("../utils/render/drawings/nFlake.ts");

// Run the explorer's own generator and collect the polygons it draws.
function drawnPolygons(sides, iterations, includeCenter) {
  const polygons = [];
  globalThis.Path2D = class {
    moveTo(x, y) {
      polygons.push([[x, y]]);
    }
    lineTo(x, y) {
      polygons.at(-1).push([x, y]);
    }
    closePath() {}
  };
  const context = { fillRect() {}, fill() {}, stroke() {} };
  drawNFlake(context, 2, 2, {
    sides,
    iterations,
    includeCenter,
    rotation: 0,
    background: "",
    color: "",
    fillPolygons: true,
    strokePolygons: true,
    lineWidth: 1,
  });
  const unit = nFlakeRadius(2, 2);
  return polygons.map((polygon) => polygon.map(([x, y]) => [(x - 1) / unit, (y - 1) / unit]));
}

const near = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]) < 1e-9;

function inside([x, y], polygon) {
  let hit = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

function matches(polygons, round) {
  const outline = hexagonKochOutline(round);
  assert.equal(outline.length - 1, outlineLines(round));
  assert.ok(near(outline[0], outline.at(-1)), "the outline closes");
  const closed = outline.slice(0, -1);
  for (let i = 0; i < closed.length; i++) {
    const a = closed[i];
    const b = closed[(i + 1) % closed.length];
    // Every line of the Koch rule is an edge of a hexagon the generator drew.
    const edge = polygons.some((polygon) =>
      polygon.some((p, k) => {
        const q = polygon[(k + 1) % polygon.length];
        return (near(p, a) && near(q, b)) || (near(p, b) && near(q, a));
      }),
    );
    assert.ok(edge, `line ${i} of round ${round} lies on a drawn edge`);
    assert.ok(Math.abs(Math.hypot(a[0] - b[0], a[1] - b[1]) - outlineLineLength(round)) < 1e-9);
    // Just across that line, on the side away from the middle, nothing is drawn.
    const [mx, my] = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const [nx, ny] = [-(b[1] - a[1]), b[0] - a[0]];
    const step = 1e-3;
    const onCurve = inside([mx + nx * step, my + ny * step], closed);
    const across = onCurve ? [mx - nx * step, my - ny * step] : [mx + nx * step, my + ny * step];
    assert.ok(
      polygons.every((polygon) => !inside(across, polygon)),
      `the outer side of line ${i} of round ${round} is empty`,
    );
  }
  // And every hexagon lies inside the curve.
  for (const polygon of polygons) {
    const middle = polygon
      .reduce((sum, p) => [sum[0] + p[0], sum[1] + p[1]], [0, 0])
      .map((v) => v / polygon.length);
    assert.ok(inside(middle, closed));
  }
}

test("the Koch rule alone traces the outline of the hexagon flake", () => {
  for (let round = 0; round <= 3; round++) matches(drawnPolygons(6, round, true), round);
});

test("the center copy changes nothing on the outline", () => {
  for (let round = 0; round <= 3; round++) matches(drawnPolygons(6, round, false), round);
});

test("hexagon copies are one third as wide, and no two share an edge", () => {
  assert.ok(Math.abs(getScaleFactor(6) - 1 / 3) < 1e-12);
  const edges = new Map();
  const key = (p) => p.map((v) => v.toFixed(6)).join(",");
  for (const polygon of drawnPolygons(6, 3, true))
    polygon.forEach((p, k) => {
      const id = [key(p), key(polygon[(k + 1) % 6])].sort().join("|");
      edges.set(id, (edges.get(id) ?? 0) + 1);
    });
  assert.ok([...edges.values()].every((count) => count === 1));
});
