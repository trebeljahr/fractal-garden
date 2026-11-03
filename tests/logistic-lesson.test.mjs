import assert from "node:assert/strict";
import test from "node:test";
import {
  acrossToR,
  KEPT_ANSWERS,
  LOGISTIC_LESSON_STEPS,
  logisticColumn,
  logisticNext,
  logisticOrbit,
  mandelbrotNumber,
  repeatLength,
  rToAcross,
  SECOND_START_GAP,
} from "../utils/lessons/logisticLesson.ts";

const close = (a, b, tolerance = 1e-12) => assert.ok(Math.abs(a - b) < tolerance, `${a} != ${b}`);

test("the logistic lesson stays inside the unit interval across its parameter range", () => {
  for (const r of [0, 0.5, 1, 2, 2.8, 3.2, 3.9, 4]) {
    for (const start of [0, 0.01, 0.2, 0.5, 0.73, 0.99, 1]) {
      const values = logisticOrbit(r, start);
      assert.equal(values.length, LOGISTIC_LESSON_STEPS + 1);
      assert.ok(values.every((value) => Number.isFinite(value) && value >= 0 && value <= 1));
    }
  }
});

test("known logistic iterates and fixed points follow the recurrence", () => {
  const values = logisticOrbit(4, 0.2, 3);
  [0.2, 0.64, 0.9216, 0.28901376].forEach((value, index) => {
    close(values[index], value);
  });
  for (const r of [1.5, 2.8, 3.2, 4]) {
    close(logisticNext(r, 0), 0);
    const fixed = 1 - 1 / r;
    close(logisticNext(r, fixed), fixed);
  }
});

test("the r=3.2 preset approaches its two-cycle from the chosen start", () => {
  const values = logisticOrbit(3.2, 0.5);
  close(values.at(-1), values.at(-3), 1e-9);
  close(values.at(-2), values.at(-4), 1e-9);
  assert.ok(Math.abs(values.at(-1) - values.at(-2)) > 0.1);
  close(logisticNext(3.2, values.at(-1)), values.at(-2), 1e-9);
});

test("a column holds exactly the answers after the settling steps", () => {
  const column = logisticColumn(3.2, 40, 6);
  let x = 0.5;
  for (let i = 0; i < 40; i++) x = logisticNext(3.2, x);
  column.forEach((answer) => {
    x = logisticNext(3.2, x);
    assert.equal(answer, x);
  });
  assert.equal(logisticColumn(3.2).length, KEPT_ANSWERS);
});

test("each step multiplies the gap from the settling number by 2 - r", () => {
  for (const r of [1.5, 2.8, 3, 3.2]) {
    const settled = 1 - 1 / r;
    const small = 1e-7;
    close((logisticNext(r, settled + small) - settled) / small, 2 - r, 1e-5);
  }
});

test("the logistic map and the Mandelbrot axis are one calculation under new names", () => {
  for (const r of [1.5, 2.8, 3.2, 3.5, 3.7, 3.9]) {
    const c = mandelbrotNumber(r);
    let x = 0.5;
    let z = 0;
    for (let step = 0; step < 30; step++) {
      close(z, r * (0.5 - x), 1e-8);
      x = logisticNext(r, x);
      z = z * z + c;
    }
  }
});

test("repeats split at the Mandelbrot set's joints and the window starts at its little copy", () => {
  close(mandelbrotNumber(3), -3 / 4);
  close(mandelbrotNumber(1 + Math.sqrt(6)), -5 / 4);
  close(mandelbrotNumber(1 + Math.sqrt(8)), -7 / 4);
  const repeat = (r) => repeatLength(logisticColumn(r));
  assert.equal(repeat(2.99), 1);
  assert.equal(repeat(3.01), 2);
  assert.equal(repeat(3.44), 2);
  assert.equal(repeat(3.46), 4);
  assert.equal(repeat(3.55), 8);
  assert.equal(repeat(3.82), null);
  assert.equal(repeat(3.83), 3);
  assert.equal(repeat(3.9), null);
});

test("the picture's position and r convert both ways", () => {
  close(rToAcross(1), 0);
  close(rToAcross(4), 1);
  close(acrossToR(0), 1);
  close(acrossToR(1), 4);
  for (const r of [1, 2, 3, 3.45, 3.83, 4]) close(acrossToR(rToAcross(r)), r, 1e-9);
});

test("a second start stays close at r = 3.2 and separates at r = 3.9", () => {
  const gap = (r, step) =>
    Math.abs(logisticOrbit(r, 0.5)[step] - logisticOrbit(r, 0.5 + SECOND_START_GAP)[step]);
  assert.ok(gap(3.2, 32) < 0.001);
  assert.ok(gap(3.9, 20) > 0.1);
});

test("the lesson rejects unbounded parameter or iteration requests", () => {
  for (const args of [
    [4.1, 0.5, 10],
    [-1, 0.5, 10],
    [3, 1.1, 10],
    [3, 0.5, 33],
    [3, 0.5, -1],
    [NaN, 0.5, 1],
  ]) {
    assert.throws(() => logisticOrbit(...args), RangeError);
  }
});
