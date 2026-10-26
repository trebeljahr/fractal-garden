import assert from "node:assert/strict";
import test from "node:test";
import {
  boundedOrbit,
  buildConnectionCloud,
  CONNECTION_KEEP,
  connectionProjection,
  logisticParameter,
  logisticValue,
  quadraticParameter,
} from "../utils/lessons/buddhabrotConnection.ts";

const close = (actual, expected, tolerance = 1e-12) =>
  assert.ok(Math.abs(actual - expected) < tolerance, `${actual} != ${expected}`);

test("changing coordinates carries one quadratic step to one logistic step", () => {
  for (const r of [0.25, 0.5, 1, 1.5, 2, 2.8, 3, 3.2, 3.57, 3.9, 4]) {
    const c = quadraticParameter(r);
    for (const x of [0, 0.01, 0.123, 0.5, 0.789, 0.99, 1]) {
      const z = r * (0.5 - x);
      close(logisticValue(r, z), x);
      close(logisticValue(r, z * z + c), r * x * (1 - x));
    }
    close(logisticValue(r, 0), 0.5);
  }
});

test("the real parameter slice uses the r >= 1 branch of the coordinate change", () => {
  for (const [r, c] of [
    [1, 0.25],
    [2, 0],
    [3, -0.75],
    [4, -2],
  ]) {
    close(quadraticParameter(r), c);
    close(logisticParameter(c), r);
  }
  for (const c of [-1.99, -1.4, -0.96, -0.2, 0.1, 0.249]) {
    const r = logisticParameter(c);
    assert.ok(r > 1 && r < 4);
    close(quadraticParameter(r), c);
  }
  assert.ok(logisticParameter(-1.5) > logisticParameter(-0.5));
});

test("retained critical orbits recover a fixed point and a superstable two-cycle", () => {
  assert.deepEqual(boundedOrbit(0, 0, 0, 4), [0, 0, 0, 0]);
  assert.deepEqual(boundedOrbit(-1, 0, 0, 6), [-1, 0, -1, 0, -1, 0]);
  assert.deepEqual(boundedOrbit(-1, 0, 1, 4), [0, -1, 0, -1]);

  const r = 2.8;
  const values = boundedOrbit(quadraticParameter(r), 0);
  assert.ok(values);
  assert.equal(values.length, CONNECTION_KEEP);
  for (const z of values) {
    close(z, 1 - r / 2);
    close(logisticValue(r, z), 1 - 1 / r);
  }
});

test("the r=3.2 slice alternates between the two analytic cycle values", () => {
  const r = 3.2;
  const c = quadraticParameter(r);
  const values = boundedOrbit(c, 0);
  assert.ok(values);
  const lower = (-1 - Math.sqrt(-3 - 4 * c)) / 2;
  const upper = (-1 + Math.sqrt(-3 - 4 * c)) / 2;
  for (let i = 0; i < values.length; i++) {
    assert.ok(Math.min(Math.abs(values[i] - lower), Math.abs(values[i] - upper)) < 1e-12);
    if (i > 0) {
      assert.ok(Math.abs(values[i] - values[i - 1]) > 0.5);
      close(values[i], values[i - 1] ** 2 + c);
    }
    if (i > 1) close(values[i], values[i - 2]);
  }
});

test("a late escape rejects the whole route, including earlier retained visits", () => {
  // The critical orbit for c=1 is 1, 2, 5: radius 2 itself does not escape.
  assert.deepEqual(boundedOrbit(1, 0, 0, 2), [1, 2]);
  assert.equal(boundedOrbit(1, 0, 0, 3), null);
  assert.equal(boundedOrbit(1, 0, 1, 2), null);
  assert.equal(boundedOrbit(1, 0, 3, 1), null);
  assert.equal(boundedOrbit(1, 1, 0, 2), null);
  assert.equal(boundedOrbit(Infinity, 0, 0, 1), null);
  assert.equal(boundedOrbit(NaN, 0, 0, 1), null);
});

test("complex critical orbits retain the real coordinate of each step", () => {
  // At c=i the orbit is i, -1+i, -i, -1+i, -i, ... .
  assert.deepEqual(boundedOrbit(0, 1, 0, 5), [0, -1, 0, -1, 0]);
  assert.deepEqual(boundedOrbit(0, -1, 0, 5), [0, -1, 0, -1, 0]);
});

test("rotation preserves the chosen real parameter and gives the three intended projections", () => {
  for (const point of [
    { cr: -0.6, ci: 0.8, zr: -1.1 },
    { cr: -1.2, ci: 0, zr: 0.4 },
  ]) {
    const original = { ...point };
    for (const degrees of [0, 30, 45, 90, 135, 180]) {
      assert.equal(connectionProjection(degrees)(point).x, point.cr);
    }
    close(connectionProjection(0)(point).y, point.ci);
    close(connectionProjection(90)(point).y, point.zr);
    close(connectionProjection(180)(point).y, -point.ci);
    close(connectionProjection(45)(point).y, (point.ci + point.zr) / Math.sqrt(2));
    assert.deepEqual(point, original);
  }
});

test("the explicitly sampled real slice stays bounded and retains the logistic unit interval", () => {
  const { cloud, slice } = buildConnectionCloud();
  assert.ok(cloud.length > 0);
  assert.ok(slice.length > 0);
  for (const point of slice) {
    assert.equal(point.ci, 0);
    assert.ok(point.cr > -2 && point.cr < 0.25);
    assert.ok(Number.isFinite(point.zr) && Math.abs(point.zr) <= 2);
    const x = logisticValue(logisticParameter(point.cr), point.zr);
    assert.ok(x >= -1e-12 && x <= 1 + 1e-12);
  }
  for (const point of cloud) {
    assert.ok(point.cr > -2 && point.cr < 0.5);
    assert.ok(point.ci > -1.15 && point.ci < 1.15);
    assert.ok(Number.isFinite(point.zr) && Math.abs(point.zr) <= 2);
  }
  // Off-axis bounded parameters extend right of the real-axis cusp at c=1/4.
  assert.ok(cloud.some((point) => point.cr > 0.25 && point.ci > 0));
  assert.ok(cloud.some((point) => point.cr > 0.25 && point.ci < 0));
});
