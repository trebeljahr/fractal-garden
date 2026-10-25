import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import ts from "typescript";

const require = createRequire(import.meta.url);
require.extensions[".ts"] = (module, filename) =>
  module._compile(
    ts.transpileModule(readFileSync(filename, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText,
    filename,
  );
const {
  ROMANESCO_BOUND,
  ROMANESCO_CHILDREN,
  ROMANESCO_GOLDEN_ANGLE,
  ROMANESCO_CHILD_TILT,
  ROMANESCO_CHILD_RATIO,
  ROMANESCO_RADIUS,
  ROMANESCO_PLACEMENT_RADIUS,
  ROMANESCO_SPIRAL_DECAY,
  romanescoPoint,
} = require("../utils/romanesco.ts");

const dot = (a, b) => a.reduce((sum, value, axis) => sum + value * b[axis], 0);
test("every child shrinks and fits the recursive culling bound", () => {
  assert.ok(Math.hypot(ROMANESCO_RADIUS, 1) <= ROMANESCO_BOUND);
  for (const child of ROMANESCO_CHILDREN) {
    assert.ok(child.scale > 0 && child.scale < 1);
    assert.ok(Math.hypot(...child.center) + child.scale * ROMANESCO_BOUND <= ROMANESCO_BOUND);
  }
});

test("the two closest conical neighbour chains form eight and thirteen spirals", () => {
  const q = Math.exp(-ROMANESCO_SPIRAL_DECAY);
  const distances = Array.from({ length: 21 }, (_, i) => {
    const k = i + 1,
      r = q ** k;
    return {
      k,
      distance:
        Math.sqrt(
          1 +
            r * r -
            2 * r * Math.cos(k * ROMANESCO_GOLDEN_ANGLE) +
            (2 / ROMANESCO_PLACEMENT_RADIUS) ** 2 * (1 - r) ** 2,
        ) /
        (1 + r),
    };
  }).sort((a, b) => a.distance - b.distance);
  assert.deepEqual(
    distances
      .slice(0, 2)
      .map(({ k }) => k)
      .sort((a, b) => a - b),
    [8, 13],
  );
  const signed = (k) =>
    Math.atan2(Math.sin(k * ROMANESCO_GOLDEN_ANGLE), Math.cos(k * ROMANESCO_GOLDEN_ANGLE));
  assert.ok(signed(13) < 0 && signed(8) > 0, "the two families wind in opposite directions");
  for (const child of ROMANESCO_CHILDREN) {
    for (let a = 0; a < 3; a++) {
      assert.ok(Math.abs(Math.hypot(...child.axes[a]) - child.scale) < 1e-12);
      for (let b = a + 1; b < 3; b++)
        assert.ok(Math.abs(dot(child.axes[a], child.axes[b])) < 1e-12);
    }
    const inside = Array.from({ length: 96 }, (_, i) => {
      const angle = (i * Math.PI * 2) / 96;
      return romanescoPoint(child, [
        ROMANESCO_RADIUS * 0.98 * Math.cos(angle),
        -0.98,
        ROMANESCO_RADIUS * 0.98 * Math.sin(angle),
      ]);
    }).some(([x, y, z]) => y > -1 && y < 1 && Math.hypot(x, z) < (ROMANESCO_RADIUS * (1 - y)) / 2);
    assert.ok(inside, "child has positive-volume overlap with the round parent solid");
  }
});

test("tilted floret envelopes stay inside their parent and overlap its core", () => {
  const e = ROMANESCO_PLACEMENT_RADIUS,
    r = ROMANESCO_CHILD_RATIO;
  const c = Math.cos(ROMANESCO_CHILD_TILT),
    s = Math.sin(ROMANESCO_CHILD_TILT);
  assert.ok(e - 2 * r * s > 0, "the base centre stays on the same side of the axis");
  assert.ok(
    e * (c - 1) + (2 - (e * e) / 2) * s > 0,
    "the entire base disk fits inside the parent envelope",
  );
  assert.ok(
    ROMANESCO_RADIUS * (1 + r * c) - (e - 2 * r * s) > 0,
    "the base centre lies strictly inside the retained core",
  );
  for (const child of ROMANESCO_CHILDREN) {
    const tip = romanescoPoint(child, [0, 1, 0]);
    assert.ok(Math.abs(Math.hypot(tip[0], tip[2]) - (e * (1 - tip[1])) / 2) < 1e-12);
    for (let i = 0; i < 96; i++) {
      const angle = (i * 2 * Math.PI) / 96;
      const [x, y, z] = romanescoPoint(child, [e * Math.cos(angle), -1, e * Math.sin(angle)]);
      assert.ok(y >= -1 - 1e-12 && y <= 1);
      assert.ok(Math.hypot(x, z) <= (e * (1 - y)) / 2 + 1e-12);
    }
  }
});
