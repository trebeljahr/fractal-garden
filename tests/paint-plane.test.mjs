import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createGrid,
  crossingJump,
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
