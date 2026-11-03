import assert from "node:assert/strict";
import test from "node:test";
import {
  NEWTON_JUMP_LIMIT,
  NEWTON_ROOTS,
  nearestNewtonRoot,
  newtonDestination,
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
  const unstable = traceNewton({ real: 2e12, imaginary: 0 });
  assert.equal(unstable.length, 1);
  assert.equal(unstable[0].reason, "unstable");
});

const destination = (point) => {
  const last = traceNewton(point, NEWTON_JUMP_LIMIT).at(-1);
  return last.reason === "root" ? last.root : null;
};

test("the picture's fast calculation agrees with the traced guesses", () => {
  for (let i = 0; i < 400; i++) {
    const real = -2.2 + 4.4 * ((i * 0.6180339887) % 1);
    const imaginary = -2.2 + 4.4 * ((i * 0.7548776662) % 1);
    assert.equal(newtonDestination(real, imaginary).root, destination({ real, imaginary }));
  }
  assert.equal(newtonDestination(0, 0).root, null);
});

test("a start near zero lands far away, at minus twice its angle", () => {
  close(newtonStep({ real: 0.1, imaginary: 0 }).point.real, 33.4);
  for (const degrees of [10, 30, 60, 100]) {
    const angle = (degrees * Math.PI) / 180;
    const { point } = newtonStep({
      real: 0.001 * Math.cos(angle),
      imaginary: 0.001 * Math.sin(angle),
    });
    assert.ok(Math.hypot(point.real, point.imaginary) > 300000);
    close(
      Math.atan2(point.imaginary, point.real),
      Math.atan2(Math.sin(-2 * angle), Math.cos(-2 * angle)),
      1e-6,
    );
  }
});

test("a ring around zero meets each root twice, at any size", () => {
  for (const radius of [0.22, 0.055, 0.00086, 0.000054]) {
    const runs = [];
    for (let i = 0; i < 24; i++) {
      const angle = (2 * Math.PI * (i + 0.5)) / 24;
      const { root } = newtonDestination(radius * Math.cos(angle), radius * Math.sin(angle));
      assert.notEqual(root, null, `radius ${radius}`);
      if (runs.at(-1) !== root) runs.push(root);
    }
    for (const root of [0, 1, 2]) assert.ok(runs.filter((run) => run === root).length >= 2);
  }
});

test("the start beside the ring's opening spot lands on zero in one jump", () => {
  const { point } = newtonStep({
    real: Math.cbrt(0.5) * Math.cos(Math.PI / 3),
    imaginary: Math.cbrt(0.5) * Math.sin(Math.PI / 3),
  });
  assert.ok(Math.hypot(point.real, point.imaginary) < 1e-9);
  close(Math.cbrt(0.5) * Math.cos(Math.PI / 3), 0.39685, 1e-5);
  close(Math.cbrt(0.5) * Math.sin(Math.PI / 3), 0.68736, 1e-5);
});
