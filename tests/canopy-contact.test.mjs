import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import ts from "typescript";

const require = createRequire(import.meta.url);
require.extensions[".ts"] = (module, filename) =>
  module._compile(
    ts.transpileModule(readFileSync(filename, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText,
    filename,
  );
const { canopyBranches } = require("../utils/constructionDiagrams.ts");
const {
  CANOPY_STEPS,
  canopyClosestRoute,
  canopyGap,
  canopyTouchRatio,
} = require("../utils/lessons/canopyContact.ts");

const between = (a, b) => {
  const orient = (p, q, r) => (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);
  if (
    orient(a.start, a.end, b.start) * orient(a.start, a.end, b.end) < 0 &&
    orient(b.start, b.end, a.start) * orient(b.start, b.end, a.end) < 0
  )
    return 0;
  const toSegment = (p, { start, end }) => {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const length = dx * dx + dy * dy;
    const u = length ? ((p.x - start.x) * dx + (p.y - start.y) * dy) / length : 0;
    const along = Math.max(0, Math.min(1, u));
    return Math.hypot(p.x - start.x - along * dx, p.y - start.y - along * dy);
  };
  return Math.min(
    toSegment(a.start, b),
    toSegment(a.end, b),
    toSegment(b.start, a),
    toSegment(b.end, a),
  );
};

/** Every left piece against every right piece of what the figure draws. */
function measuredGap(angle, ratio, step) {
  const branches = canopyBranches(step, angle, ratio);
  const half = 2 ** step - 1;
  // Depth first: the left child's whole subtree, then the right child's.
  const left = branches.slice(1, 1 + half);
  const right = branches.slice(1 + half);
  assert.ok(left[0].end.x < 0 && right[0].end.x > 0);
  // The two first branches meet at the fork by construction, so they count from their tips only.
  const tip = (branch) => ({ start: branch.end, end: branch.end });
  left[0] = tip(left[0]);
  right[0] = tip(right[0]);
  let closest = Infinity;
  for (const a of left) for (const b of right) closest = Math.min(closest, between(a, b));
  return closest;
}

/** Riddle's formula for 0 < θ < 90°. His θ is the angle from the parent's direction to one child. */
function publishedRatio(angle) {
  const theta = angle / 2;
  const cos = (degrees) => Math.cos((degrees * Math.PI) / 180);
  let N = 1;
  while (N * theta < 90) N++;
  const f = (r) =>
    (r ** 2 *
      (r ** (N + 1) * cos((N - 1) * theta) - r ** N * cos(N * theta) - r * cos(theta) + 1)) /
    (r ** 2 + 1 - 2 * r * cos(theta));
  let low = 0.4;
  let high = 0.75;
  for (let i = 0; i < 60; i++) {
    const middle = (low + high) / 2;
    if (f(middle) < 0.5) low = middle;
    else high = middle;
  }
  return (low + high) / 2;
}

test("the readout is the real smallest distance between the drawn halves", () => {
  for (const [angle, ratio] of [
    [120, 0.5],
    [120, 0.6],
    [60, 0.5],
    [90, 0.55],
    [180, 0.65],
    [180, 0.7],
    [40, 0.5],
    [20, 0.48],
  ]) {
    for (const step of [2, 5, 8]) {
      const gap = canopyGap(angle, ratio, step);
      assert.ok(gap > 0, `${angle} ${ratio} ${step} should be apart`);
      assert.ok(
        Math.abs(measuredGap(angle, ratio, step) - gap) < 1e-9,
        `${angle} ${ratio} ${step}`,
      );
    }
  }
});

test("a negative gap means the drawn halves really cross", () => {
  for (const [angle, ratio] of [
    [120, 0.7],
    [60, 0.65],
    [180, 0.75],
    [40, 0.65],
  ]) {
    assert.ok(canopyGap(angle, ratio, 8) < 0, `${angle} ${ratio}`);
    assert.equal(measuredGap(angle, ratio, 8), 0, `${angle} ${ratio}`);
  }
});

test("the touching ratio matches the published formula once the angles are converted", () => {
  for (let angle = 20; angle <= 180; angle += 1) {
    const touch = canopyTouchRatio(angle);
    assert.ok(Math.abs(touch - publishedRatio(angle)) < 1e-7, `${angle}: ${touch}`);
  }
});

test("each angle has one touching ratio: apart below it, crossing above it", () => {
  for (let angle = 20; angle <= 180; angle += 4) {
    const touch = canopyTouchRatio(angle);
    for (let ratio = 0.3; ratio < 0.95; ratio += 0.005) {
      if (Math.abs(ratio - touch) < 1e-4) continue;
      assert.equal(canopyGap(angle, ratio) > 0, ratio < touch, `${angle} ${ratio}`);
    }
  }
});

test("the article's numbers", () => {
  const golden = (Math.sqrt(5) - 1) / 2;
  assert.ok(Math.abs(canopyTouchRatio(120) - golden) < 1e-7);
  assert.ok(Math.abs(canopyTouchRatio(180) - Math.SQRT1_2) < 1e-7);
  assert.equal((canopyTouchRatio(20) * 100).toFixed(1), "50.8");

  // Gaps at the touching ratio, step by step.
  assert.equal(canopyGap(120, golden, 5).toFixed(3), "0.253");
  assert.equal(canopyGap(120, golden, CANOPY_STEPS).toFixed(3), "0.009");
  assert.ok(Math.abs(canopyGap(120, golden)) < 1e-9);
  for (let step = 3; step < 30; step++)
    assert.ok(canopyGap(120, golden, step + 1) < canopyGap(120, golden, step));
});

test("the 120-degree route leans right once, goes straight up, then only leans left", () => {
  const golden = (Math.sqrt(5) - 1) / 2;
  const route = canopyClosestRoute(120, golden);
  const lean = Math.sin(Math.PI / 3);
  const moves = route.slice(1).map((point, i) => ({
    x: point.x - route[i].x,
    length: Math.hypot(point.x - route[i].x, point.y - route[i].y),
  }));
  assert.ok(Math.abs(moves[0].length - golden) < 1e-12);
  assert.ok(Math.abs(moves[0].x - lean * golden) < 1e-12);
  assert.ok(Math.abs(moves[1].length - golden ** 2) < 1e-12);
  assert.ok(Math.abs(moves[1].x) < 1e-12);
  for (const [i, move] of moves.slice(2).entries()) {
    assert.ok(Math.abs(move.length - golden ** (i + 3)) < 1e-12);
    assert.ok(Math.abs(move.x + lean * move.length) < 1e-12);
  }
  // It ends on the line through the trunk.
  assert.ok(Math.abs(route[route.length - 1].x) < 1e-9);
  // The left-leaning lengths the article lists add up to the first branch.
  const leftward = moves.slice(2).reduce((sum, move) => sum + move.length, 0);
  assert.ok(Math.abs(leftward - golden) < 1e-9);
});

test("where routes tie, the 180-degree route climbs to the line instead of curling back to the fork", () => {
  const route = canopyClosestRoute(180, Math.SQRT1_2);
  const end = route[route.length - 1];
  assert.ok(Math.abs(end.x) < 1e-9);
  assert.ok(Math.abs(end.y + 2) < 1e-6, `${end.y}`);
});

test("the closest route ends where the gap says, on branches the figure draws", () => {
  for (const [angle, ratio, step] of [
    [120, 0.55, 12],
    [120, 0.7, 12],
    [60, 0.5, 9],
    [180, 0.72, 12],
    [33, 0.52, 11],
  ]) {
    const route = canopyClosestRoute(angle, ratio, step);
    const end = route[route.length - 1];
    assert.ok(Math.abs(2 * end.x - canopyGap(angle, ratio, step)) < 1e-9, `${angle} ${ratio}`);
    const branches = canopyBranches(step, angle, ratio);
    for (const [i, point] of route.slice(1).entries()) {
      const start = route[i];
      assert.ok(
        branches.some(
          (b) =>
            Math.hypot(b.start.x - start.x, b.start.y - start.y) < 1e-9 &&
            Math.hypot(b.end.x - point.x, b.end.y - point.y) < 1e-9,
        ),
        `${angle} ${ratio} piece ${i}`,
      );
    }
  }
});
