import assert from "node:assert/strict";
import test from "node:test";
import {
  ATTRACTOR_LESSONS,
  attractorFlow,
  MAX_ATTRACTOR_STEPS,
  NEARBY_START_OFFSET,
  pointSeparation,
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
