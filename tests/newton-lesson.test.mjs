import assert from "node:assert/strict";
import test from "node:test";
import {
  NEWTON_ROOTS,
  nearestNewtonRoot,
  newtonFunction,
  newtonStep,
  realNewtonTangent,
  traceNewton,
} from "../utils/lessons/newtonLesson.ts";

const close = (a, b, tolerance = 1e-10) => assert.ok(Math.abs(a - b) < tolerance, `${a} != ${b}`);

test("a real Newton step reaches the tangent's x-intercept", () => {
  for (const x of [0.5, 1.5, 2]) {
    const tangent = realNewtonTangent(x);
    const next = newtonStep({ real: x, imaginary: 0 });
    close(next.point.real, tangent.intercept);
    close(next.point.imaginary, 0);
    close(tangent.value + tangent.slope * (tangent.intercept - x), 0);
  }
  close(newtonStep({ real: 2, imaginary: 0 }).point.real, 17 / 12);
});

test("the three cubic roots are fixed and have zero residual", () => {
  NEWTON_ROOTS.forEach((root, index) => {
    const residual = newtonFunction(root);
    close(residual.real, 0);
    close(residual.imaginary, 0);
    assert.equal(nearestNewtonRoot(root).root, index);
    const next = newtonStep(root);
    assert.equal(next.reason, "root");
    assert.deepEqual(next.point, root);
  });
});

test("complex Newton updates respect conjugate symmetry", () => {
  const upper = traceNewton({ real: -0.7, imaginary: 0.6 });
  const lower = traceNewton({ real: -0.7, imaginary: -0.6 });
  assert.equal(upper.length, lower.length);
  upper.forEach((state, index) => {
    close(state.point.real, lower[index].point.real);
    close(state.point.imaginary, -lower[index].point.imaginary);
    assert.equal(state.reason, lower[index].reason);
  });
  assert.equal(upper.at(-1).root, 1);
  assert.equal(lower.at(-1).root, 2);
  assert.equal(upper.at(-1).reason, "root");
  assert.equal(lower.at(-1).reason, "root");
  assert.equal(traceNewton({ real: 1.2, imaginary: 0.2 }).at(-1).root, 0);
});

test("zero slope stops without division and finite traces preserve their limit state", () => {
  const zero = traceNewton({ real: 0, imaginary: 0 });
  assert.equal(zero.length, 1);
  assert.equal(zero[0].reason, "slope");
  assert.deepEqual(zero[0].point, { real: 0, imaginary: 0 });
  assert.equal(realNewtonTangent(0).intercept, null);
  const short = traceNewton({ real: 2, imaginary: 0 }, 1);
  assert.equal(short.length, 2);
  assert.equal(short.at(-1).reason, "limit");
  const unstable = traceNewton({ real: 2_000_000, imaginary: 0 });
  assert.equal(unstable.length, 1);
  assert.equal(unstable[0].reason, "unstable");
});
