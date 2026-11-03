import assert from "node:assert/strict";
import test from "node:test";
import {
  centerOf,
  fillEveryGap,
  fillGap,
  formatCurvature,
  formatRadius,
  gapOutline,
  LARGEST_CURVATURE,
  locate,
  openGaps,
  radiusOf,
  readSpot,
  startPacking,
  subtracted,
  touchPoint,
} from "../utils/lessons/apollonianCurvatures.ts";

const close = (a, b, tolerance = 1e-9) => assert.ok(Math.abs(a - b) < tolerance, `${a} != ${b}`);

function touching(a, b) {
  const p = centerOf(a);
  const q = centerOf(b);
  const distance = Math.hypot(p.x - q.x, p.y - q.y);
  const inside = a.curvature < 0 || b.curvature < 0;
  return (
    Math.abs(
      distance - (inside ? Math.abs(radiusOf(a) - radiusOf(b)) : radiusOf(a) + radiusOf(b)),
    ) < 1e-9
  );
}
const descartes = (...k) =>
  k.reduce((sum, value) => sum + value, 0) ** 2 -
  2 * k.reduce((sum, value) => sum + value * value, 0);
const rounds = (packing, count) =>
  Array.from({ length: count }).reduce((current) => fillEveryGap(current), packing);

test("the start is four touching circles with curvatures -1, 2, 2, 3", () => {
  const { circles } = startPacking("whole");
  assert.deepEqual(
    circles.map((disc) => disc.curvature),
    [-1, 2, 2, 3],
  );
  for (const a of circles) for (const b of circles) if (a !== b) assert.ok(touching(a, b));
  assert.deepEqual(
    openGaps(startPacking("whole")).map((gap) => startPacking("whole").gaps[gap].next.curvature),
    [3, 6, 6, 15],
  );
});

test("every circle is whole and touches the three around its gap", () => {
  const packing = rounds(startPacking("whole"), 6);
  for (const disc of packing.circles) {
    assert.ok(Number.isInteger(disc.curvature));
    assert.ok(Number.isInteger(disc.weightedX));
    assert.ok(Number.isInteger(disc.weightedY));
  }
  packing.gaps.forEach(({ around, known, next }) => {
    const three = around.map((index) => packing.circles[index]);
    for (const disc of three) {
      assert.ok(touching(next, disc));
      assert.ok(touching(packing.circles[known], disc));
    }
    assert.equal(descartes(...three.map((disc) => disc.curvature), next.curvature), 0);
    const center = centerOf(next);
    assert.ok(Math.hypot(center.x, center.y) + radiusOf(next) <= 1 + 1e-9);
  });
});

test("the counts in the article come from pressing Fill every gap", () => {
  const after = (count) => {
    const { circles } = rounds(startPacking("whole"), count);
    return [circles.length, Math.max(...circles.map((disc) => disc.curvature))];
  };
  assert.deepEqual(after(1), [8, 15]);
  assert.deepEqual(after(5), [488, 927]);
});

test("filling stops at the smallest circle a reader could see", () => {
  let packing = startPacking("whole");
  while (openGaps(packing).length) packing = fillEveryGap(packing);
  assert.equal(packing.circles.length, 3329);
  assert.ok(packing.circles.every((disc) => disc.curvature <= LARGEST_CURVATURE));
});

test("the rule moves between the two circles that touch the same three", () => {
  const start = startPacking("whole");
  const middle = start.gaps.findIndex(({ next }) => next.curvature === 15);
  const filled = fillGap(start, middle);
  const fifteen = filled.circles.length - 1;
  const forward = readSpot(filled, { gap: middle, circle: fifteen });
  assert.deepEqual(
    forward.around.map((disc) => disc.curvature),
    [2, 2, 3],
  );
  assert.equal(forward.result.curvature, 15);
  assert.equal(forward.other.curvature, -1);
  const back = readSpot(filled, locate(filled, 2, 2));
  assert.equal(back.result.curvature, -1);
  assert.equal(back.other.curvature, 15);
  assert.equal(back.ghost, null);
  const sum = forward.around.reduce((total, disc) => total + disc.curvature, 0);
  assert.equal(2 * sum - forward.other.curvature, forward.result.curvature);
  assert.equal(2 * sum - forward.result.curvature, forward.other.curvature);
});

test("a point finds the gap or circle under it, even where the three points lie on a line", () => {
  const start = startPacking("whole");
  const bottom = locate(start, 0, -0.67);
  assert.equal(bottom.circle, null);
  assert.equal(start.gaps[bottom.gap].next.curvature, 3);
  assert.equal(start.gaps[bottom.gap].next.weightedY, -2);
  const top = locate(start, 0, 0.67);
  assert.equal(top.circle, 3);

  const packing = rounds(start, 4);
  for (const gap of openGaps(packing)) {
    const { x, y } = centerOf(packing.gaps[gap].next);
    assert.deepEqual(locate(packing, x, y), { gap, circle: null });
  }
  packing.circles.forEach((disc, circle) => {
    if (circle === 0) return;
    const { x, y } = centerOf(disc);
    assert.equal(locate(packing, x, y).circle, circle);
  });
});

test("a gap's outline runs along its three circles and through their touching points", () => {
  const packing = rounds(startPacking("whole"), 2);
  for (const gap of openGaps(packing)) {
    const { around, next } = packing.gaps[gap];
    const three = around.map((index) => packing.circles[index]);
    const outline = gapOutline(packing, gap);
    for (const { x, y } of outline) {
      assert.ok(
        three.some((disc) => {
          const center = centerOf(disc);
          return Math.abs(Math.hypot(x - center.x, y - center.y) - radiusOf(disc)) < 1e-9;
        }),
      );
      // The arc never crosses the circle that fills the gap.
      const center = centerOf(next);
      assert.ok(Math.hypot(x - center.x, y - center.y) >= radiusOf(next) - 1e-9);
    }
    const first = touchPoint(three[0], three[1]);
    close(outline[0].x, first.x);
    close(outline[0].y, first.y);
  }
  // The outer circle's half of the first gap is the half below the two circles.
  const start = startPacking("whole");
  const bottom = start.gaps.findIndex(({ next }) => next.curvature === 3);
  assert.ok(gapOutline(start, bottom).every(({ y }) => y <= 1e-9));
});

test("three equal circles never give a whole curvature after the -1", () => {
  const packing = rounds(startPacking("equal"), 6);
  close(packing.circles[1].curvature, 1 + 2 / Math.sqrt(3));
  for (const disc of packing.circles.slice(1))
    assert.ok(Math.abs(disc.curvature - Math.round(disc.curvature)) > 1e-6, `${disc.curvature}`);
  const curvatures = openGaps(startPacking("equal")).map(
    (gap) => startPacking("equal").gaps[gap].next.curvature,
  );
  close(curvatures[0], 4.4641016, 1e-6);
  close(curvatures[3], 13.9282032, 1e-6);
  packing.gaps.forEach(({ around, next }) => {
    for (const index of around) assert.ok(touching(next, packing.circles[index]));
  });
});

test("numbers are written the way the picture writes them", () => {
  assert.equal(formatCurvature(-1), "−1");
  assert.equal(formatCurvature(15), "15");
  assert.equal(formatCurvature(2.1547005), "2.15");
  assert.equal(subtracted(-1), "(−1)");
  assert.equal(subtracted(3), "3");
  assert.equal(formatRadius({ curvature: 15, weightedX: 0, weightedY: 0 }), "1/15");
  assert.equal(formatRadius({ curvature: -1, weightedX: 0, weightedY: 0 }), "1");
});
