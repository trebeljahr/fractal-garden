import assert from "node:assert/strict";
import test from "node:test";
import { require, style } from "./helpers/spatial-gpu-fixtures.mjs";

const {
  buildGpuFrame,
  buildGpuShape,
  packTransforms,
  selectGpuStackDepth,
  transformSize,
} = require("../../utils/spatialGpu/model.ts");
const { spatialShaderStackDepth } = require("../../utils/spatialGpu/shader.ts");
const { INITIAL_SPATIAL_CAMERA } = require("../../utils/spatial/camera.ts");

const shape = buildGpuShape({ kind: "romanesco" });
const opening = buildGpuFrame(shape, INITIAL_SPATIAL_CAMERA, style);
const node = (size, rank = 0) => ({
  center: [0, 0, 0],
  axes: [
    [size, 0, 0],
    [0, size, 0],
    [0, 0, size],
  ],
  rank,
});
const frameWith = (roots, nextShape = shape) => ({
  ...opening,
  shape: nextShape,
  roots,
  rootData: packTransforms(roots),
});
const halfShape = {
  ...shape,
  children: [node(0.5, 1)],
  featureSize: 1,
  radius: 1,
};

// Simulate the shader's stopping rule on the largest possible branch.
// Smaller children can only terminate sooner.
function naturalDepth(frame, root, options, growth = 1) {
  const ratio = Math.max(...frame.shape.children.map(transformSize));
  const feature = options.clearance ? frame.shape.radius : frame.shape.featureSize;
  const floor = options.clearance ? 0.00002 : options.minimumFootprint;
  const maxRank = options.maxRank ?? Infinity;
  const rankStep = Math.min(...frame.shape.children.map((child) => child.rank));
  let size = transformSize(root);
  for (let depth = 0; depth <= 40; depth++) {
    if (root.rank + depth * rankStep >= maxRank || size * feature <= floor) return depth;
    if (rankStep && root.rank + depth * rankStep + rankStep === maxRank && growth === 0)
      return depth;
    size *= ratio;
    if (rankStep && root.rank + depth * rankStep + rankStep === maxRank) size *= growth;
  }
  return Infinity;
}

function assertSafe(frame, options, growth = 1) {
  const stack = selectGpuStackDepth(frame, options);
  assert.ok([8, 12, 16, 24, 40].includes(stack));
  for (const root of frame.roots) {
    if (root.cone) continue;
    const depth = naturalDepth(frame, root, options, growth);
    // The original 40-slot path already caps traversal at index 39. A smaller
    // specialization must never force termination before the natural stop.
    if (stack < 40)
      assert.ok(depth <= stack - 1, `natural depth ${depth} must fit inside ${stack} slots`);
  }
  return stack;
}

test("Romanesco stack selection preserves the opening and worst retained-root detail", () => {
  assert.equal(assertSafe(opening, { minimumFootprint: 1e-5 }), 12);
  // buildGpuFrame allows 12 root-size attempts, beginning at 64. Each axis
  // component fits that threshold, so its vector norm is at most sqrt(3) times it.
  const maximumRootNorm = Math.sqrt(3) * 64 * 2 ** 11;
  const worst = frameWith([node(maximumRootNorm, 0)]);
  assert.equal(assertSafe(worst, { minimumFootprint: 1e-5 }), 24);
  assert.equal(assertSafe(worst, { clearance: true }), 24);
  assert.equal(assertSafe(worst, { minimumFootprint: 1e-10 }), 40);
});

test("16 and 24 slot boundaries leave room for the natural stopping depth", () => {
  const frame = frameWith([node(1)], halfShape);
  assert.equal(assertSafe(frame, { minimumFootprint: 2 ** -13.5 }), 16);
  // A stop at index 15 fits, but the rounding margin requires another slot.
  assert.equal(assertSafe(frame, { minimumFootprint: 2 ** -15 }), 24);
  // This branch needs 16 descents, so a 16-slot traversal would stop early.
  assert.equal(assertSafe(frame, { minimumFootprint: 2 ** -15.5 }), 24);
  assert.equal(assertSafe(frame, { minimumFootprint: 2 ** -21.5 }), 24);
  assert.equal(assertSafe(frame, { minimumFootprint: 2 ** -23 }), 40);
  // Likewise, 24 slots must not replace a branch that needs 24 descents.
  assert.equal(assertSafe(frame, { minimumFootprint: 2 ** -23.5 }), 40);
});

test("8 and 12 slot specializations preserve the stopping and rounding levels", () => {
  const frame = frameWith([node(1)], halfShape);
  assert.equal(assertSafe(frame, { minimumFootprint: 2 ** -6 }), 8);
  assert.equal(assertSafe(frame, { minimumFootprint: 2 ** -7 }), 12);
  assert.equal(assertSafe(frame, { minimumFootprint: 2 ** -10 }), 12);
  assert.equal(assertSafe(frame, { minimumFootprint: 2 ** -11 }), 16);
});

test("selection accounts for every root and for the largest child contraction", () => {
  for (const ratio of [0.12, 0.298, 0.5, 0.82]) {
    const nextShape = {
      ...halfShape,
      children: [node(ratio / 4, 1), node(ratio, 1), node(ratio / 2, 1)],
    };
    for (const size of [0.001, 1, 64, 200000]) {
      const roots = [node(0.001, 20), node(size, 0), node(0.5, 12)];
      const forward = frameWith(roots, nextShape);
      const reverse = frameWith(roots.toReversed(), nextShape);
      const options = { minimumFootprint: 0.00002 };
      assert.equal(assertSafe(forward, options), assertSafe(reverse, options));
    }
  }
});

test("finite ranks bound traversal even when no positive footprint is available", () => {
  for (const rank of [0, 12, 200]) {
    const frame = frameWith([node(1e12, rank)], halfShape);
    assert.equal(assertSafe(frame, { minimumFootprint: 0, maxRank: rank }), 8);
    assert.equal(assertSafe(frame, { minimumFootprint: 0, maxRank: rank + 2 }), 8);
    // Rank is exact, so its stop can use the final stack slot.
    assert.equal(assertSafe(frame, { minimumFootprint: 0, maxRank: rank + 15 }), 16);
    assert.equal(assertSafe(frame, { minimumFootprint: 0, maxRank: rank + 16 }), 24);
    assert.equal(assertSafe(frame, { minimumFootprint: 0, maxRank: rank + 23 }), 24);
    assert.equal(assertSafe(frame, { minimumFootprint: 0, maxRank: rank + 24 }), 40);
  }
  const frame = frameWith([node(1)], halfShape);
  for (const floor of [0, -1, Number.NaN, Infinity])
    assert.equal(selectGpuStackDepth(frame, { minimumFootprint: floor }), 40);
});

test("retained ancestor quadratics do not consume descendant stack capacity", () => {
  const ancestor = {
    ...node(1e20, 0),
    cone: {
      linear: [0, 0, 0],
      constant: 0,
      axis: [0, 1, 0],
      quadraticScale: 1e-20,
      baseDistance: 1e20,
      tipDistance: 1e20,
      clearance: 0,
    },
  };
  const options = { minimumFootprint: 1e-5 };
  assert.equal(selectGpuStackDepth(frameWith([ancestor]), options), 8);
  assert.equal(spatialShaderStackDepth(frameWith([ancestor]), options), 8);
  assert.equal(spatialShaderStackDepth(opening, options), selectGpuStackDepth(opening, options));
  assert.equal(
    assertSafe(frameWith([ancestor, ...opening.roots]), options),
    assertSafe(opening, options),
  );
});

test("rank-zero spiral continuations require a spatial stop even at finite construction ranks", () => {
  const frame = frameWith([node(1)], {
    ...halfShape,
    children: [node(0.5, 1), node(0.4, 0)],
  });
  assert.equal(selectGpuStackDepth(frame, { minimumFootprint: 0, maxRank: 1 }), 40);
  assert.equal(assertSafe(frame, { minimumFootprint: 2 ** -10, maxRank: 1 }), 12);
  assert.equal(selectGpuStackDepth(frame, { minimumFootprint: 0, maxRank: 0 }), 8);
});

test("distance to the enclosing hull can prove a smaller stack without changing detail", () => {
  const cube = {
    ...halfShape,
    hull: [
      [1, 0, 0, 1],
      [-1, 0, 0, 1],
      [0, 1, 0, 1],
      [0, -1, 0, 1],
      [0, 0, 1, 1],
      [0, 0, -1, 1],
    ],
  };
  const far = frameWith([{ ...node(1), center: [0, 0, -11] }], cube);
  assert.equal(selectGpuStackDepth(far, { minimumFootprint: 1e-8 }), 40);
  assert.equal(selectGpuStackDepth(far, { minimumFootprint: 1e-8, pixelFootprint: 0.01 }), 8);
  // The closest point is ten units away. The float safety margin lowers that
  // bound slightly, but it must not cross the six-descent 8-slot cutoff.
  assert.ok(2 ** -6 < (10 - 1e-5 * 12) * 0.01);
  const near = frameWith([{ ...node(1), center: [0, 0, -1.0000001] }], cube);
  assert.equal(selectGpuStackDepth(near, { minimumFootprint: 1e-8, pixelFootprint: 1 }), 40);
  assert.equal(
    selectGpuStackDepth(far, { clearance: true, pixelFootprint: 1 }),
    selectGpuStackDepth(far, { clearance: true }),
  );
});

test("newest-rank growth cannot exceed the full-size stack requirement", () => {
  const frame = frameWith([node(1)], halfShape);
  const options = { minimumFootprint: 0, maxRank: 22 };
  const stack = assertSafe(frame, options);
  assert.equal(stack, 24);
  for (const growth of [0, 0.01, 0.25, 0.5, 1])
    assert.equal(assertSafe(frame, options, growth), stack);
});

test("other recursive surfaces retain their existing 40-slot traversal", () => {
  const otherShape = buildGpuShape({ kind: "jerusalem" });
  assert.equal(
    selectGpuStackDepth(frameWith([node(1)], otherShape), { minimumFootprint: 1e-5 }),
    40,
  );
});
