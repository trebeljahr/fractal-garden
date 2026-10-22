import assert from "node:assert/strict";
import test from "node:test";
import { canopyBranches, carpetHoles, kochEdge } from "../utils/constructionDiagrams.ts";
import { traceTeachingOrbit } from "../utils/orbitLesson.ts";
import { buildApollonianGasket } from "../utils/render/drawings/apollonianGasket.ts";

const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} != ${b}`);

test("carpet holes do not overlap and preserve the expected remaining area", () => {
  for (let step = 0; step <= 3; step++) {
    const holes = carpetHoles(step);
    close(1 - holes.reduce((sum, h) => sum + h.size ** 2, 0), (8 / 9) ** step);
    for (const a of holes) {
      assert.ok(a.x > 0 && a.y > 0 && a.x + a.size < 1 && a.y + a.size < 1);
      for (const b of holes) {
        if (a === b) continue;
        assert.ok(
          a.x + a.size <= b.x + 1e-12 ||
            b.x + b.size <= a.x + 1e-12 ||
            a.y + a.size <= b.y + 1e-12 ||
            b.y + b.size <= a.y + 1e-12,
        );
      }
    }
  }
});
test("Koch replacements preserve endpoints and increase length by four thirds", () => {
  for (let step = 0; step <= 4; step++) {
    const points = kochEdge(step);
    assert.equal(points.length, 4 ** step + 1);
    assert.deepEqual(points[0], { x: 0, y: 0 });
    assert.deepEqual(points.at(-1), { x: 1, y: 0 });
    let length = 0;
    for (let i = 1; i < points.length; i++)
      length += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
    close(length, (4 / 3) ** step);
  }
});
test("canopy children join existing tips and shrink consistently across angle choices", () => {
  for (const angle of [20, 50, 100]) {
    const branches = canopyBranches(5, angle);
    assert.equal(branches.length, 63);
    for (const b of branches) {
      close(Math.hypot(b.end.x - b.start.x, b.end.y - b.start.y), 0.62 ** b.depth);
      if (b.depth)
        assert.ok(
          branches.some(
            (p) => p.depth === b.depth - 1 && p.end.x === b.start.x && p.end.y === b.start.y,
          ),
        );
    }
  }
});
test("new Apollonian circles stay enclosed and touch at least three older circles", () => {
  const circles = buildApollonianGasket(3);
  assert.equal(circles.length, 56);
  for (const c of circles.filter((c) => c.depth > 0)) {
    assert.ok(Math.hypot(c.x, c.y) + c.radius <= 1 + 1e-9);
    const touches = circles.filter(
      (p) =>
        p.depth < c.depth &&
        Math.abs(
          Math.hypot(p.x - c.x, p.y - c.y) -
            (p.bend < 0 ? p.radius - c.radius : p.radius + c.radius),
        ) < 1e-8,
    );
    assert.ok(touches.length >= 3);
  }
});
test("orbit lesson shows bounded cycles and stops after an escaping iterate", () => {
  const zero = { real: 0, imaginary: 0 };
  assert.ok(
    traceTeachingOrbit(zero, zero).every((s) => s.point.real === 0 && s.point.imaginary === 0),
  );
  assert.deepEqual(
    traceTeachingOrbit({ real: 1, imaginary: 0 }, zero).map((s) => s.point.real),
    [0, 1, 2, 5],
  );
  assert.deepEqual(
    traceTeachingOrbit({ real: -1, imaginary: 0 }, zero)
      .slice(0, 5)
      .map((s) => s.point.real),
    [0, -1, 0, -1, 0],
  );
});
test("Julia changes the starting point while Burning Ship folds both components before the square", () => {
  const c = { real: -0.8, imaginary: 0.156 };
  const start = { real: -0.5, imaginary: 0.3 };
  const plain = traceTeachingOrbit(c, start, false, 1)[1];
  const folded = traceTeachingOrbit(c, start, true, 1)[1];
  close(plain.point.real, folded.point.real);
  close(plain.point.imaginary, -0.144);
  close(folded.point.imaginary, 0.456);
  assert.deepEqual(folded.folded, { real: 0.5, imaginary: 0.3 });
  assert.deepEqual(traceTeachingOrbit(c, start)[0].point, start);
});
