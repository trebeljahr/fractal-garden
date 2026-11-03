import assert from "node:assert/strict";
import { test } from "node:test";
import {
  clampToDisk,
  juliaEdge,
  LARGEST_C,
  OFF_PLANE_RADIUS,
  ORBIT_JUMPS,
  squaringChain,
  squaringFate,
} from "../utils/lessons/orbitPlane.ts";
import { crossingJump, STAYED } from "../utils/lessons/paintPlane.ts";
import { isOutside, traceTeachingOrbit } from "../utils/orbitLesson.ts";

const ZERO = { real: 0, imaginary: 0 };
const RABBIT = { real: -0.12256, imaginary: 0.74486 };

test("squaring a number shows the article's opening examples", () => {
  assert.deepEqual(squaringChain(0.5).slice(0, 3), [0.5, 0.25, 0.0625]);
  assert.deepEqual(squaringChain(2).slice(0, 4), [2, 4, 16, 256]);
  assert.deepEqual(squaringChain(1), [1, 1, 1, 1, 1, 1]);
  assert.deepEqual(squaringChain(-1), [-1, 1, 1, 1, 1, 1]);
  assert.deepEqual(squaringChain(0), [0, 0, 0, 0, 0, 0]);
});

test("the list of answers stops before a number needs an exponent", () => {
  for (const start of [0.01, 0.2, 0.9, -0.5, 1.1, 2.5, -2.5]) {
    for (const value of squaringChain(start)) {
      assert.ok(!String(value).includes("e"), `${start} ${value}`);
    }
  }
});

test("one and minus one split the line", () => {
  for (const start of [0.99, -0.99, 0.5, -0.5]) assert.equal(squaringFate(start), "Heads toward 0");
  for (const start of [1.01, -1.01, 2, -2.5]) {
    assert.equal(squaringFate(start), "Grows without limit");
  }
  assert.equal(squaringFate(1), "Stays on 1");
  assert.equal(squaringFate(-1), "Lands on 1 and stays");
  assert.equal(squaringFate(0), "Stays on 0");
});

test("squaring alone splits the plane at the unit circle", () => {
  const leaves = (real, imaginary) => crossingJump(0, 0, real, imaginary, ORBIT_JUMPS) !== STAYED;
  for (let angle = 0; angle < 6.2; angle += 0.3) {
    assert.equal(leaves(0.99 * Math.cos(angle), 0.99 * Math.sin(angle)), false, String(angle));
    assert.equal(leaves(1.01 * Math.cos(angle), 1.01 * Math.sin(angle)), true, String(angle));
  }
});

test("points close to the circle take longer to leave", () => {
  const jump = (start) => crossingJump(0, 0, start, 0, ORBIT_JUMPS);
  assert.ok(jump(1.5) < jump(1.1));
  assert.ok(jump(1.1) < jump(1.01));
  assert.ok(jump(1.01) < jump(1.001));
});

test("with this c the old circle no longer separates the points", () => {
  const { real, imaginary } = RABBIT;
  const nearby = (x, y) =>
    Array.from({ length: 16 }, (_, turn) => [
      x + 0.05 * Math.cos((turn * Math.PI) / 8),
      y + 0.05 * Math.sin((turn * Math.PI) / 8),
    ]);
  // The article sends the reader to these two points. A mouse can land a little off them.
  assert.ok(Math.hypot(0.45, 0.05) < 1);
  for (const [x, y] of [[0.45, 0.05], ...nearby(0.45, 0.05)]) {
    assert.notEqual(crossingJump(real, imaginary, x, y), STAYED, `${x} ${y}`);
  }
  assert.ok(Math.hypot(1.1, -0.6) > 1);
  for (const [x, y] of [[1.1, -0.6], ...nearby(1.1, -0.6)]) {
    assert.equal(crossingJump(real, imaginary, x, y), STAYED, `${x} ${y}`);
  }
});

test("an orbit that leaves keeps drawing until it is off the plane", () => {
  const start = { real: 0.25, imaginary: 0.3 };
  const route = traceTeachingOrbit(RABBIT, start, false, ORBIT_JUMPS, OFF_PLANE_RADIUS);
  assert.ok(isOutside(route.at(-1).point, OFF_PLANE_RADIUS));
  assert.ok(route.length - 1 > crossingJump(RABBIT.real, RABBIT.imaginary, 0.25, 0.3));
});

test("c stays where a point past radius 2 cannot come back", () => {
  const inside = { real: 0.5, imaginary: 0.5 };
  assert.deepEqual(clampToDisk(inside, LARGEST_C), inside);
  const clamped = clampToDisk({ real: 2.2, imaginary: 1.75 }, LARGEST_C);
  assert.ok(Math.abs(Math.hypot(clamped.real, clamped.imaginary) - LARGEST_C) < 1e-12);
});

test("running the jumps backward draws the unit circle for c = 0", () => {
  const columns = 400;
  const rows = 400;
  const hits = juliaEdge(ZERO, [-2, 2, -2, 2], columns, rows);
  let marked = 0;
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      if (!hits[row * columns + column]) continue;
      marked++;
      const x = -2 + ((column + 0.5) / columns) * 4;
      const y = 2 - ((row + 0.5) / rows) * 4;
      assert.ok(Math.abs(Math.hypot(x, y) - 1) < 0.02, `${x} ${y}`);
    }
  }
  // The circle is 2 pi units long and each cell is 0.01 across.
  assert.ok(marked > 400, String(marked));
});

test("the edge lies between points that stay and points that leave", () => {
  const columns = 440;
  const rows = 350;
  const hits = juliaEdge(RABBIT, [-2.2, 2.2, -1.75, 1.75], columns, rows);
  let checked = 0;
  for (let row = 2; row < rows - 2; row += 3) {
    for (let column = 2; column < columns - 2; column += 3) {
      if (!hits[row * columns + column]) continue;
      // A point on the edge can't escape quickly: it sits next to points that never do.
      const x = -2.2 + ((column + 0.5) / columns) * 4.4;
      const y = 1.75 - ((row + 0.5) / rows) * 3.5;
      const jump = crossingJump(RABBIT.real, RABBIT.imaginary, x, y, ORBIT_JUMPS);
      assert.ok(jump === STAYED || jump > 3, `${x} ${y} ${jump}`);
      checked++;
    }
  }
  assert.ok(checked > 50, String(checked));
});
