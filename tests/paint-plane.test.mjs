import assert from "node:assert/strict";
import { test } from "node:test";
import { crossingJump, STAYED } from "../utils/lessons/paintPlane.ts";
import { traceTeachingOrbit } from "../utils/orbitLesson.ts";

const ZERO = { real: 0, imaginary: 0 };
const RABBIT = { real: -0.12256, imaginary: 0.74486 };

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
