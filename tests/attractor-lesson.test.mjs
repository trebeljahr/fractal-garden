import assert from "node:assert/strict";
import test from "node:test";
import {
  APART_DISTANCE,
  ATTRACTOR_LESSONS,
  attractorFlow,
  LORENZ_ROUNDING_NOTCH,
  MAX_ATTRACTOR_STEPS,
  NEARBY_START_OFFSET,
  pointSeparation,
  RESTART_NOTCHES,
  RESTART_STEPS,
  restartDifference,
  restartDifferenceLabel,
  restartRuns,
  restartStartLabel,
  rk4Step,
  sampleTrace,
  traceAttractor,
} from "../utils/lessons/attractorLesson.ts";

const close = (a, b, tolerance = 1e-10) => assert.ok(Math.abs(a - b) < tolerance, `${a} != ${b}`);

test("the lesson uses the explorer's Lorenz and Rossler flow equations", () => {
  assert.deepEqual(attractorFlow("lorenz", [1, 2, 3]), [10, 23, -6]);
  const rossler = attractorFlow("rossler", [1, 2, 3]);
  close(rossler[0], -5);
  close(rossler[1], 1.4);
  close(rossler[2], -13.9);
  assert.deepEqual(
    rk4Step((point) => attractorFlow("lorenz", point), [0, 0, 0], 0.005),
    [0, 0, 0],
  );
});

test("RK4 integrates constant flow and improves toward an exponential when dt halves", () => {
  assert.deepEqual(
    rk4Step(() => [2, -1, 3], [1, 2, 3], 0.25),
    [1.5, 1.75, 3.75],
  );
  const integrate = (dt) => {
    let point = [1, 0, 0];
    for (let i = 0; i < Math.round(1 / dt); i++) point = rk4Step(([x]) => [x, 0, 0], point, dt);
    return point[0];
  };
  const coarseError = Math.abs(integrate(0.2) - Math.E);
  const fineError = Math.abs(integrate(0.1) - Math.E);
  assert.ok(fineError < coarseError / 12);
  assert.ok(fineError < 0.000003);
});

test("both configured traces stay finite, deterministic and bounded for every lesson batch", () => {
  for (const system of ["lorenz", "rossler"]) {
    const config = ATTRACTOR_LESSONS[system];
    const steps = config.batchSteps * config.batches;
    const path = traceAttractor(system, config.start, steps, config.dt);
    assert.equal(path.length, steps + 1);
    assert.deepEqual(path[0], config.start);
    assert.deepEqual(path, traceAttractor(system, config.start, steps, config.dt));
    assert.ok(path.flat().every(Number.isFinite));
    assert.ok(path.every((point) => Math.hypot(...point) < 100));
    assert.deepEqual(
      path[1],
      rk4Step((point) => attractorFlow(system, point), config.start, config.dt),
    );
    const nearbyStart = [...config.start];
    nearbyStart[0] += NEARBY_START_OFFSET;
    const nearby = traceAttractor(system, nearbyStart, steps, config.dt);
    close(pointSeparation(path[0], nearby[0]), 0.001);
    assert.equal(nearby.length, path.length);
    assert.notDeepEqual(nearby.at(-1), path.at(-1));
  }
});

test("render sampling retains the current point without changing the numerical path", () => {
  const config = ATTRACTOR_LESSONS.lorenz;
  const path = traceAttractor("lorenz", config.start, 31, config.dt);
  const original = structuredClone(path);
  assert.deepEqual(sampleTrace(path, 19, 8), [path[0], path[8], path[16], path[19]]);
  assert.deepEqual(path, original);
  assert.deepEqual(sampleTrace(path, 0), [path[0]]);
  assert.deepEqual(sampleTrace(path, 900).at(-1), path.at(-1));
  assert.equal(
    traceAttractor("lorenz", [0, 0, 0], MAX_ATTRACTOR_STEPS + 10, config.dt).length,
    MAX_ATTRACTOR_STEPS + 1,
  );
});

test("the rounding Lorenz made is one notch of the restart, and every notch separates", () => {
  assert.equal(restartDifferenceLabel(LORENZ_ROUNDING_NOTCH), "0.000127");
  assert.equal(restartStartLabel(LORENZ_ROUNDING_NOTCH), "0.506");
  assert.equal(restartStartLabel(0), "0.379127");
  assert.equal(restartStartLabel(RESTART_NOTCHES - 1), "0.50612699999873");
  assert.equal(restartDifferenceLabel(RESTART_NOTCHES - 1), "0.00000000000127");
  assert.equal(RESTART_STEPS <= MAX_ATTRACTOR_STEPS, true);
  const { original, restarts } = restartRuns();
  assert.equal(original.length, RESTART_STEPS + 1);
  close(restarts[LORENZ_ROUNDING_NOTCH].gaps[0], 0.000127, 1e-12);
  const times = restarts.map(({ apartTime }) => apartTime);
  assert.ok(times.every((time) => time !== null));
  for (let i = 1; i < times.length; i++) assert.ok(times[i] > times[i - 1]);
  // Each tenfold adds a steady amount here, which is what the article tells the reader to check.
  const perTenfold = (times.at(-1) - times[0]) / (times.length - 1);
  assert.ok(perTenfold > 2.2 && perTenfold < 2.7, `${perTenfold}`);
  // The numbers the article quotes.
  close(times[LORENZ_ROUNDING_NOTCH], 10.79, 0.01);
  close(times[LORENZ_ROUNDING_NOTCH + 1], 13.1, 0.01);
  close(times[LORENZ_ROUNDING_NOTCH + 2], 15.44, 0.01);
  close(times[LORENZ_ROUNDING_NOTCH + 6], 25.29, 0.01);
});

test("across many restart points, a tenfold smaller difference buys about 2.5 time units", () => {
  const { dt } = ATTRACTOR_LESSONS.lorenz;
  let point = traceAttractor("lorenz", [0.1, 0, 0], MAX_ATTRACTOR_STEPS, dt).at(-1);
  const notches = [2, 5, 8, 11];
  const totals = notches.map(() => 0);
  const restarts = 200;
  for (let k = 0; k < restarts; k++) {
    point = traceAttractor("lorenz", point, 1000, dt).at(-1);
    const original = traceAttractor("lorenz", point, MAX_ATTRACTOR_STEPS, dt);
    notches.forEach((notch, slot) => {
      const start = [point[0] - restartDifference(notch), point[1], point[2]];
      const run = traceAttractor("lorenz", start, MAX_ATTRACTOR_STEPS, dt);
      const apart = run.findIndex(
        (value, i) => pointSeparation(value, original[i]) > APART_DISTANCE,
      );
      assert.ok(apart > 0);
      totals[slot] += apart * dt;
    });
  }
  const means = totals.map((total) => total / restarts);
  const perTenfold = (means.at(-1) - means[0]) / (notches.at(-1) - notches[0]);
  assert.ok(perTenfold > 2.4 && perTenfold < 2.7, `${perTenfold}`);
});
