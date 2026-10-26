import assert from "node:assert/strict";
import test from "node:test";
import { finiteConeTree } from "./helpers/romanesco-cone-union.mjs";
import { require, style } from "./helpers/spatial-gpu-fixtures.mjs";

const {
  romanescoCpuClearance,
  solidConeDistance,
} = require("../../utils/spatialGpu/cpuClearance.ts");
const M = require("../../utils/spatialGpu/model.ts");
const C = require("../../utils/spatial/camera.ts");
const R = require("../../utils/romanesco.ts");
const D = require("../../utils/deepZoom/math.ts");
const shape = M.buildGpuShape({ kind: "romanesco" });
const identity = [
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1],
];
const root = { center: [0, 0, 0], axes: identity, rank: 0 };
const canonicalFrame = (point, rootOverrides = {}) => ({
  shape,
  roots: [{ ...root, center: point.map((v) => -v), ...rootOverrides }],
  horizon: 128,
});

// Independent generic point-to-polygon distance in a radial cross-section.
// The triangle includes the axis edge; its inside test uses oriented edges.
function triangleDistance(point, radius) {
  const p = [Math.hypot(point[0], point[2]), point[1]];
  const triangle = [
    [0, 1],
    [radius, -1],
    [0, -1],
  ];
  let positive = false,
    negative = false,
    nearest = Infinity;
  for (let i = 0; i < 3; i++) {
    const a = triangle[i],
      b = triangle[(i + 1) % 3];
    const v = [b[0] - a[0], b[1] - a[1]],
      w = [p[0] - a[0], p[1] - a[1]];
    const cross = v[0] * w[1] - v[1] * w[0];
    positive ||= cross > 0;
    negative ||= cross < 0;
    const t = Math.max(0, Math.min(1, (w[0] * v[0] + w[1] * v[1]) / (v[0] * v[0] + v[1] * v[1])));
    nearest = Math.min(nearest, Math.hypot(w[0] - t * v[0], w[1] - t * v[1]));
  }
  return positive && negative ? nearest : 0;
}
function finiteDistance(nodes, point) {
  let nearest = Infinity;
  for (const node of nodes)
    nearest = Math.min(
      nearest,
      triangleDistance(M.inversePoint(node, point), R.ROMANESCO_RADIUS) * M.transformSize(node),
    );
  return nearest;
}

test("CPU collision bounds preserve finite cones, unfinished branches and deep roots", () => {
  assert.equal(solidConeDistance([0, 3, 0], shape.coneSlope), 2);
  assert.equal(solidConeDistance([0, -3, 0], shape.coneSlope), 2);
  assert.equal(solidConeDistance([0, 0, 0], shape.coneSlope), 0);
  const points = [
    [0, 3, 0],
    [0, -3, 0],
    [2, 0, 0],
    [0.9, -1.1, 0.2],
    [0.3, 0.7, 0.2],
    [0.7, -0.4, 0.2],
    ...[0, 8, 89, 90, 111].map((i) => shape.children[i].center),
  ];
  for (const point of points)
    assert.ok(
      Math.abs(
        solidConeDistance(point, shape.coneSlope) - triangleDistance(point, R.ROMANESCO_RADIUS),
      ) < 1e-12,
    );

  let comparisons = 0;
  const finiteResults = [];
  for (const [maxRank, growth] of [
    [0, 1],
    [1, 0],
    [1, 0.25],
    [1, 1],
  ]) {
    const nodes = finiteConeTree(R.ROMANESCO_CHILDREN, maxRank, root, growth, 0.0001);
    let worstGap = 0;
    for (const point of points) {
      const exact = finiteDistance(nodes, point);
      let previous = -Infinity;
      for (const budget of [0, 112, 2048]) {
        const result = romanescoCpuClearance(canonicalFrame(point), {
          maxRank,
          growth,
          maxChildEvaluations: budget,
        });
        assert.ok(
          result.distance >= 0 && result.distance <= exact + 1e-10,
          JSON.stringify({ maxRank, growth, point, budget, exact, result }),
        );
        assert.ok(
          result.distance + 1e-12 >= previous,
          "A larger budget weakened the same frontier certificate",
        );
        assert.ok(result.evaluated <= budget);
        previous = result.distance;
        worstGap = Math.max(worstGap, exact - result.distance);
        comparisons++;
      }
    }
    finiteResults.push({ maxRank, growth, cones: nodes.length, worstGap });
  }

  // A rank-terminal continuation has no retained core or children.
  assert.equal(
    romanescoCpuClearance(canonicalFrame([0, 0, 0], { continuation: true }), { maxRank: 0 })
      .distance,
    128 - 128e-8,
  );
  // An ancestor's precomputed fixed-point certificate remains part of the minimum.
  const ancestor = { ...root, cone: { clearance: 0.125 } };
  const ancestorResult = romanescoCpuClearance({ shape, roots: [ancestor], horizon: 128 });
  assert.ok(ancestorResult.distance > 0 && ancestorResult.distance <= 0.125);

  const rebasing = [];
  for (const zoom of [0, 80, 240]) {
    const bits = 160 + zoom;
    const target = R.ROMANESCO_ROOT.center.map((v) => D.fixedFromNumber(v, bits));
    target[1] += D.fixedFromNumber(R.ROMANESCO_ROOT.scale, bits);
    const frame = M.buildGpuFrame(
      shape,
      { ...C.INITIAL_SPATIAL_CAMERA, bits, zoom, target: target.map(String) },
      { ...style, rotationX: 0, rotationY: 0 },
    );
    const result = romanescoCpuClearance(frame);
    assert.ok(
      Number.isFinite(result.distance) && result.distance > 0 && result.distance <= frame.horizon,
    );
    const rootsBound = romanescoCpuClearance(frame, { maxChildEvaluations: 0 });
    assert.ok(result.distance + 1e-12 >= rootsBound.distance);
    rebasing.push({ zoom, roots: frame.roots.length, ...result });
  }
  assert.equal(comparisons, 132);
});
