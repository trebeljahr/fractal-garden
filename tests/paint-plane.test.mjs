import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createGrid,
  crossingJump,
  outlineDab,
  outlineRow,
  outlineStroke,
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

test("a dab far from the edge inks nothing", () => {
  const grid = createGrid(BOUNDS, 280);
  assert.ok(grid.steps.every((step) => step === UNTESTED));
  assert.equal(outlineDab(grid, { real: -0.2, imaginary: 0 }, 0.1).length, 0);
  assert.equal(outlineDab(grid, { real: 1.5, imaginary: 1.5 }, 0.1).length, 0);
});

test("a dab across the edge inks only cells that stayed beside one that crossed", () => {
  const grid = createGrid(BOUNDS, 280);
  // The body's right tip is at 0.25.
  const changed = outlineDab(grid, { real: 0.25, imaginary: 0 }, 0.1);
  assert.ok(changed.length > 0);
  for (const cell of changed) {
    assert.equal(grid.steps[cell], STAYED);
    const beside = [cell - 1, cell + 1, cell - grid.columns, cell + grid.columns];
    assert.ok(beside.some((other) => grid.steps[other] !== STAYED));
  }
  assert.equal(outlineDab(grid, { real: 0.25, imaginary: 0 }, 0.1).length, 0);
});

test("a fast stroke inks the edge it crosses", () => {
  const grid = createGrid(BOUNDS, 280);
  const changed = outlineStroke(grid, { real: 0, imaginary: 0 }, { real: 2, imaginary: 0 }, 0.05);
  assert.ok(changed.length > 0);
});

test("drawing every row closes the edge around the Mandelbrot set's area", () => {
  const grid = createGrid(BOUNDS, 280);
  let inked = 0;
  for (let row = 0; row < grid.rows; row++) inked += outlineRow(grid, row).length;
  assert.ok(grid.steps.every((step) => step !== UNTESTED));
  let dark = 0;
  for (const step of grid.steps) if (step === STAYED) dark++;
  // 50 cells per unit, and the set's area is about 1.5066. A step limit counts a little extra.
  assert.ok(Math.abs(dark / (1.5066 * 2500) - 1) < 0.06, String(dark));
  assert.ok(inked > 0 && inked < dark, `${inked} of ${dark}`);
});
