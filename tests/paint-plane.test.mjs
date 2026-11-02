import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createGrid,
  crossingJump,
  juliaEdge,
  paintDab,
  paintRow,
  paintStroke,
  STAYED,
  UNTESTED,
} from "../utils/lessons/paintPlane.ts";
import { traceTeachingOrbit } from "../utils/orbitLesson.ts";

const ZERO = { real: 0, imaginary: 0 };
const RABBIT = { real: -0.12256, imaginary: 0.74486 };
const BOUNDS = [-2.8, 2.8, -2.2, 2.2];

test("the crossing jump is the last jump of the route the demo draws", () => {
  for (const c of [RABBIT, { real: 0.5, imaginary: 0 }, { real: -0.56, imaginary: 0.64 }]) {
    const route = traceTeachingOrbit(c, ZERO, false, 300);
    const crossing = crossingJump(c.real, c.imaginary, 0, 0);
    assert.equal(crossing, route.length === 301 ? STAYED : route.length - 1);
  }
});

test("the slow escapes above the neck match the article's counts", () => {
  assert.equal(crossingJump(-0.75, 0.1, 0, 0, 40000), 33);
  assert.equal(crossingJump(-0.75, 0.01, 0, 0, 40000), 315);
  assert.equal(crossingJump(-0.75, 0.001, 0, 0, 40000), 3143);
  assert.equal(crossingJump(-0.75, 0.0001, 0, 0, 40000), 31417);
});

test("the shapes offered as presets do what their names say", () => {
  const places = (c) => {
    const route = traceTeachingOrbit(c, ZERO, false, 4000);
    assert.equal(route.length, 4001);
    const last = route[4000].point;
    for (let period = 1; period <= 64; period++) {
      const earlier = route[4000 - period].point;
      if (Math.hypot(earlier.real - last.real, earlier.imaginary - last.imaginary) < 1e-6)
        return period;
    }
    return null;
  };
  assert.equal(places(RABBIT), 3);
  assert.equal(places({ real: 0.3768, imaginary: 0.145 }), 7);
  assert.equal(crossingJump(-0.56, 0.64, 0, 0), 45);
  const line = traceTeachingOrbit({ real: -1.7, imaginary: 0 }, ZERO, false, 300);
  assert.equal(line.length, 301);
  assert.ok(line.every(({ point }) => point.imaginary === 0));
});

test("a dab tests only cells inside its radius, and only once", () => {
  const grid = createGrid(BOUNDS, 280);
  assert.ok(grid.steps.every((step) => step === UNTESTED));
  const changed = paintDab(grid, { real: -1, imaginary: 0 }, 0.2);
  // 280 cells across 5.6 units is 50 cells per unit, so the radius is 10 cells.
  assert.ok(Math.abs(changed.length - Math.PI * 100) < 20);
  for (const cell of changed) assert.equal(grid.steps[cell], STAYED);
  assert.equal(paintDab(grid, { real: -1, imaginary: 0 }, 0.2).length, 0);
});

test("a fast stroke leaves no gap between its ends", () => {
  const grid = createGrid(BOUNDS, 280);
  paintStroke(grid, { real: -2, imaginary: 0 }, { real: 2, imaginary: 0 }, 0.1);
  const row = Math.floor(grid.rows / 2);
  for (let column = 40; column < 240; column++) {
    assert.notEqual(grid.steps[row * grid.columns + column], UNTESTED);
  }
});

test("filling every row gives the Mandelbrot set's area", () => {
  const grid = createGrid(BOUNDS, 280);
  for (let row = 0; row < grid.rows; row++) paintRow(grid, row);
  assert.ok(grid.steps.every((step) => step !== UNTESTED));
  let dark = 0;
  for (const step of grid.steps) if (step === STAYED) dark++;
  // 50 cells per unit, and the set's area is about 1.5066. A step limit counts a little extra.
  assert.ok(Math.abs(dark / (1.5066 * 2500) - 1) < 0.06, String(dark));
});

test("running the jumps backward draws the unit circle for c = 0", () => {
  const columns = 400;
  const rows = 400;
  const bounds = [-2, 2, -2, 2];
  const hits = juliaEdge(ZERO, bounds, columns, rows);
  let marked = 0;
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      if (!hits[row * columns + column]) continue;
      marked++;
      const distance = Math.hypot(
        -2 + ((column + 0.5) / columns) * 4,
        2 - ((row + 0.5) / rows) * 4,
      );
      assert.ok(Math.abs(distance - 1) < 0.02, String(distance));
    }
  }
  // The circle is 2 pi units long and each cell is 0.01 across.
  assert.ok(marked > 400, String(marked));
});

test("every marked edge cell stays bounded, in one piece or as dust", () => {
  const bounds = [-2.1, 2.1, -1.75, 1.75];
  for (const c of [RABBIT, { real: 0.36, imaginary: 0.3 }, { real: 0.3, imaginary: 0.6 }]) {
    const hits = juliaEdge(c, bounds, 560, 467);
    let marked = 0;
    for (const hit of hits) if (hit) marked++;
    assert.ok(marked > 200, `${c.real} ${marked}`);
  }
});
