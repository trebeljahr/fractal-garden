import assert from "node:assert/strict";
import test from "node:test";
import {
  cobwebSegments,
  LOGISTIC_LESSON_STEPS,
  logisticNext,
  logisticOrbit,
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

test("cobweb curve and diagonal legs carry exactly the time-series values", () => {
  const values = logisticOrbit(3.9, 0.5, 8);
  const segments = cobwebSegments(values);
  assert.equal(segments.length, 16);
  for (let n = 1; n < values.length; n++) {
    const curve = segments[(n - 1) * 2];
    const diagonal = segments[(n - 1) * 2 + 1];
    assert.deepEqual(curve.to, { x: values[n - 1], y: values[n] });
    assert.deepEqual(diagonal.from, curve.to);
    assert.deepEqual(diagonal.to, { x: values[n], y: values[n] });
    assert.equal(curve.iteration, n);
    if (n > 1) assert.deepEqual(curve.from, segments[(n - 2) * 2 + 1].to);
  }
  assert.deepEqual(segments[0].from, { x: values[0], y: 0 });
  assert.deepEqual(cobwebSegments([0.5]), []);
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
