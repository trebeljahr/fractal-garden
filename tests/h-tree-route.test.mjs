import assert from "node:assert/strict";
import test from "node:test";
import {
  H_TREE_BOX,
  H_TREE_RATIO,
  hTreeFarthestSpot,
  hTreeRoute,
  hTreeTips,
} from "../utils/lessons/hTreeRoute.ts";

const close = (a, b, tolerance = 1e-9) =>
  assert.ok(Math.abs(a - b) < tolerance, `${a} is not close to ${b}`);

// The same lines drawHTree draws, with a first line of length 1.
function lines(round) {
  const list = [];
  const grow = (x, y, length, horizontal, depth) => {
    const half = length / 2;
    const [x0, y0, x1, y1] = horizontal ? [x - half, y, x + half, y] : [x, y - half, x, y + half];
    list.push({ x0, y0, x1, y1, depth });
    if (depth === round) return;
    grow(x0, y0, length * H_TREE_RATIO, !horizontal, depth + 1);
    grow(x1, y1, length * H_TREE_RATIO, !horizontal, depth + 1);
  };
  grow(0, 0, 1, true, 0);
  return list;
}
function tips(round) {
  return lines(round)
    .filter(({ depth }) => depth === round)
    .flatMap(({ x0, y0, x1, y1 }) => [
      [x0, y0],
      [x1, y1],
    ]);
}

test("the route follows the tree's own lines to the tip nearest the point", () => {
  for (const round of [0, 1, 4, 7]) {
    const all = tips(round);
    assert.equal(all.length, hTreeTips(round));
    for (const tip of all) {
      const route = hTreeRoute(tip, round);
      const end = route.points.at(-1);
      close(end[0], tip[0]);
      close(end[1], tip[1]);
      route.points.slice(1).forEach(([x, y], index) => {
        const [fromX, fromY] = route.points[index];
        // Half of a line runs from its center to an endpoint.
        const piece = H_TREE_RATIO ** index / 2;
        close(Math.hypot(x - fromX, y - fromY), piece);
        assert.ok(index % 2 === 0 ? y === fromY : x === fromX);
      });
    }
  }
});

test("every route in a round has the same length, whatever the straight line", () => {
  for (const round of [0, 1, 2, 5, 9]) {
    const routes = tips(round).map((tip) => hTreeRoute(tip, round));
    const expected = (1 - H_TREE_RATIO ** (round + 1)) / (2 * (1 - H_TREE_RATIO));
    for (const { length } of routes) close(length, expected);
    if (round >= 2) {
      const straight = routes.map((route) => route.straight);
      assert.ok(Math.max(...straight) > 1.5 * Math.min(...straight));
    }
  }
});

test("each tip is the center of a rectangle the same shape as the box", () => {
  for (const round of [0, 1, 2, 3, 6]) {
    const { halfWidth, halfHeight } = hTreeRoute([0.3, 0.2], round);
    const ratio = Math.max(halfWidth, halfHeight) / Math.min(halfWidth, halfHeight);
    close(ratio, Math.SQRT2);
    close(
      4 * halfWidth * halfHeight * hTreeTips(round),
      4 * H_TREE_BOX.halfWidth * H_TREE_BOX.halfHeight,
    );
  }
});

test("the box has sides in the ratio of the square root of 2, and holds every line", () => {
  close(H_TREE_BOX.halfWidth / H_TREE_BOX.halfHeight, Math.SQRT2);
  for (const { x0, y0, x1, y1 } of lines(12)) {
    assert.ok(Math.max(Math.abs(x0), Math.abs(x1)) < H_TREE_BOX.halfWidth);
    assert.ok(Math.max(Math.abs(y0), Math.abs(y1)) < H_TREE_BOX.halfHeight);
  }
});

test("no spot in the box is farther from a tip than half the small diagonal", () => {
  for (const round of [0, 1, 2, 5, 7]) {
    const all = tips(round);
    const farthest = hTreeFarthestSpot(round);
    const { halfWidth: w, halfHeight: h } = H_TREE_BOX;
    let largest = 0;
    for (let i = 0; i <= 60; i++)
      for (let j = 0; j <= 60; j++) {
        const x = -w + (2 * w * i) / 60;
        const y = -h + (2 * h * j) / 60;
        const nearest = Math.min(...all.map(([a, b]) => Math.hypot(a - x, b - y)));
        assert.ok(nearest <= farthest + 1e-9);
        largest = Math.max(largest, nearest);
      }
    // The box's own corners are that far away.
    close(largest, farthest);
    if (round >= 2) close(hTreeFarthestSpot(round), hTreeFarthestSpot(round - 2) / 2);
  }
});

test("the upright line through the center meets the tree only at the center", () => {
  for (const { x0, x1, depth } of lines(14)) {
    if (depth === 0) continue;
    assert.ok(x0 * x1 > 0, "every later line stays on one side");
  }
});
