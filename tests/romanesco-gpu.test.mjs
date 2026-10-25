import assert from "node:assert/strict";
import test from "node:test";
import { finiteConeTree, finiteConeUnionExit } from "./helpers/romanesco-cone-union.mjs";
import { oracleRays, require, style } from "./helpers/spatial-gpu-fixtures.mjs";

const {
  buildGpuShape,
  buildGpuFrame,
  packTransforms,
  packChildBounds,
  packOrderedChildren,
  inversePoint,
  inverseVector,
} = require("../../utils/spatialGpu/model.ts");
const {
  traceGpuFrame,
  intersectGpuCone,
  intersectAncestorCone,
  intersectGpuBound,
} = require("../../utils/spatialGpu/query.ts");
const {
  ROMANESCO_CHILDREN,
  ROMANESCO_RADIUS,
  ROMANESCO_PLACEMENT_RADIUS,
  ROMANESCO_ROOT,
  ROMANESCO_BOUND,
  ROMANESCO_BOUND_BASE,
  ROMANESCO_BOUND_CYLINDER_RADIUS,
} = require("../../utils/romanesco.ts");
const { INITIAL_SPATIAL_CAMERA, moveSpatialCamera } = require("../../utils/spatial/camera.ts");
const { fixedFromNumber } = require("../../utils/deepZoom/math.ts");

const slope = ROMANESCO_RADIUS / 2;
const dot = (a, b) => a.reduce((sum, x, i) => sum + x * b[i], 0);
const subtract = (a, b) => a.map((x, i) => x - b[i]);
const apply = (axes, p) =>
  [0, 1, 2].map((i) => axes[0][i] * p[0] + axes[1][i] * p[1] + axes[2][i] * p[2]);
const normalize = (p) => p.map((x) => x / Math.hypot(...p));
const minimumScale = 0.001;
const finiteOptions = (shape) => ({
  pixelAngle: 0,
  nearFootprint: shape.featureSize * minimumScale,
  detailScale: 1,
});
const envelopeHit = (shape, origin, ray) => {
  const yScale = 2 / (1 - shape.boundConeBase),
    o = [origin[0], 1 - (1 - origin[1]) * yScale, origin[2]],
    d = [ray[0], ray[1] * yScale, ray[2]],
    k = shape.boundConeSlope / yScale;
  const first = intersectGpuCone(o, d, k, Infinity, -Infinity),
    last = intersectGpuCone(o, d, k, Infinity, -Infinity, true);
  if (!first || !last) return null;
  let near = first.distance,
    far = last.distance;
  const a = ray[0] ** 2 + ray[2] ** 2,
    b = 2 * (origin[0] * ray[0] + origin[2] * ray[2]),
    c = origin[0] ** 2 + origin[2] ** 2 - shape.boundCylinderRadius ** 2;
  if (a < 1e-20) {
    if (c > 0) return null;
  } else {
    const discriminant = b * b - 4 * a * c;
    if (discriminant < 0) return null;
    near = Math.max(near, (-b - Math.sqrt(discriminant)) / (2 * a));
    far = Math.min(far, (-b + Math.sqrt(discriminant)) / (2 * a));
  }
  return far >= Math.max(0, near) ? { distance: near >= 0 ? near : far } : null;
};

// Independent finite union, built directly from the construction catalogue.
// Deliberately uses direct quadratic roots rather than the production solver.
function finiteCones(level, growth = 1) {
  return finiteConeTree(ROMANESCO_CHILDREN, level, ROMANESCO_ROOT, growth, minimumScale);
}
function finiteHit(nodes, eye, ray) {
  let nearest = Infinity;
  for (const node of nodes) {
    const sizeSquared = dot(node.axes[0], node.axes[0]);
    const o = node.axes.map((a) => dot(a, subtract(eye, node.center)) / sizeSquared);
    const d = node.axes.map((a) => dot(a, ray) / sizeSquared);
    const a = d[0] ** 2 + d[2] ** 2 - slope ** 2 * d[1] ** 2;
    const b = 2 * (o[0] * d[0] + o[2] * d[2] + slope ** 2 * (1 - o[1]) * d[1]);
    const c = o[0] ** 2 + o[2] ** 2 - slope ** 2 * (1 - o[1]) ** 2;
    const discriminant = b * b - 4 * a * c;
    if (discriminant >= 0) {
      for (const t of [
        (-b - Math.sqrt(discriminant)) / (2 * a),
        (-b + Math.sqrt(discriminant)) / (2 * a),
      ]) {
        const y = o[1] + t * d[1];
        if (t >= 0 && t < nearest && y >= -1 && y <= 1) nearest = t;
      }
    }
    if (Math.abs(d[1]) > 1e-14) {
      const t = (-1 - o[1]) / d[1],
        x = o[0] + t * d[0],
        z = o[2] + t * d[2];
      if (t >= 0 && t < nearest && x * x + z * z <= ROMANESCO_RADIUS ** 2) nearest = t;
    }
  }
  return Number.isFinite(nearest) ? nearest : null;
}

test("Romanesco circular cone has smooth sides, an exact base and a finite apex normal", () => {
  const side = intersectGpuCone([0, 0, 3], [0, 0, -1], slope);
  assert.ok(Math.abs(side.distance - (3 - slope)) < 1e-12);
  assert.ok(side.normal[1] > 0 && side.normal[2] > 0);
  const base = intersectGpuCone([0, -2, 0], [0, 1, 0], slope);
  assert.equal(base.distance, 1);
  assert.deepEqual(base.normal, [0, -1, 0]);
  const tip = intersectGpuCone([0, 2, 0], [0, -1, 0], slope);
  assert.equal(tip.distance, 1);
  assert.deepEqual(tip.normal, [0, 1, 0]);
  assert.equal(intersectGpuCone([2, 0, 3], [0, 0, -1], slope), null);
});

test("Romanesco GPU transforms preserve the complete spiral and its descendant bound", () => {
  const shape = buildGpuShape({ kind: "romanesco" });
  assert.equal(shape.kind, 3);
  assert.equal(shape.children.length, ROMANESCO_CHILDREN.length);
  assert.ok(shape.children.length > 64, "the transform texture must not truncate the spiral");
  assert.equal(shape.radius, ROMANESCO_BOUND);
  for (let i = 0; i < shape.children.length; i++) {
    const child = shape.children[i],
      expected = ROMANESCO_CHILDREN[i];
    assert.deepEqual(child.center, expected.center);
    assert.deepEqual(child.axes, expected.axes);
    assert.equal(child.rank, expected.rank ?? 1);
    assert.equal(child.continuation, expected.continuation);
    assert.equal(child.baseCover, expected.baseCover);
    assert.ok(Math.hypot(...child.center) + expected.scale * shape.radius <= shape.radius + 1e-9);
  }
  assert.ok(
    shape.featureSize >=
      2 * ROMANESCO_RADIUS * Math.max(...ROMANESCO_CHILDREN.map((c) => c.scale)) - 1e-12,
  );
});

test("Romanesco tapered GPU bounds contain each complete child envelope", () => {
  const shape = buildGpuShape({ kind: "romanesco" });
  assert.equal(shape.hull.length, 13);
  for (const child of shape.children) {
    for (const plane of shape.hull) {
      const n = plane.slice(0, 3);
      const localNormal = child.axes.map((axis) => dot(axis, n));
      // Exact support of a round cone: either apex, or the extreme base point.
      const support = Math.max(
        localNormal[1],
        ROMANESCO_BOUND_BASE * localNormal[1] +
          ((ROMANESCO_PLACEMENT_RADIUS * (1 - ROMANESCO_BOUND_BASE)) / 2) *
            Math.hypot(localNormal[0], localNormal[2]),
      );
      assert.ok(dot(n, child.center) + support <= plane[3] + 1e-12);
    }
    for (let i = 0; i < 96; i++) {
      const angle = (i * Math.PI) / 48;
      const p = apply(child.axes, [
        ((ROMANESCO_PLACEMENT_RADIUS * (1 - ROMANESCO_BOUND_BASE)) / 2) * Math.cos(angle),
        ROMANESCO_BOUND_BASE,
        ((ROMANESCO_PLACEMENT_RADIUS * (1 - ROMANESCO_BOUND_BASE)) / 2) * Math.sin(angle),
      ]).map((v, axis) => v + child.center[axis]);
      assert.ok(Math.hypot(p[0], p[2]) <= (ROMANESCO_PLACEMENT_RADIUS * (1 - p[1])) / 2 + 1e-12);
      assert.ok(p[1] >= ROMANESCO_BOUND_BASE - 1e-12);
    }
  }
});

test("Romanesco analytic envelope keeps side, base, apex and distant ray intersections", () => {
  const shape = buildGpuShape({ kind: "romanesco" });
  assert.equal(shape.boundConeSlope, ROMANESCO_PLACEMENT_RADIUS / 2);
  assert.equal(shape.boundConeBase, ROMANESCO_BOUND_BASE);
  assert.equal(shape.boundCylinderRadius, ROMANESCO_BOUND_CYLINDER_RADIUS);
  for (const origin of [
    [0, 0, 4],
    [4, 0, 0],
    [0, 4, 0],
    [-2, -4, 0],
    [0, -0.8, 0],
    [1000000, 0, 0],
  ]) {
    for (const target of [
      [0, 0, 0],
      [0, 1, 0],
      [0, -1, 0],
      [0, ROMANESCO_BOUND_BASE, 0],
      [0.1, -0.8, 0.1],
    ]) {
      const ray = normalize(subtract(target, origin));
      const surface = envelopeHit(shape, origin, ray);
      if (!surface) continue;
      const bound = intersectGpuBound(shape, origin, ray);
      assert.ok(bound, "the analytic envelope cannot reject a real cone intersection");
      assert.ok(bound.near <= surface.distance + 1e-8);
      assert.ok(bound.far >= surface.distance - 1e-8);
    }
  }
});

test("Romanesco child BVH keeps every rotated cone in all eight complete threaded orders", () => {
  const shape = buildGpuShape({ kind: "romanesco" });
  const { data, nodeCount } = packChildBounds(shape),
    transforms = packOrderedChildren(shape);
  assert.equal(nodeCount, shape.children.length * 2 - 1);
  assert.equal(data.length, nodeCount * 8 * 8);
  assert.ok(Array.from(data).every(Number.isFinite));
  for (let octant = 0; octant < 8; octant++) {
    const seen = new Set();
    for (let i = 0; i < nodeCount; i++) {
      const at = (octant * nodeCount + i) * 8;
      const low = Array.from(data.slice(at, at + 3)),
        high = Array.from(data.slice(at + 4, at + 7));
      const index = data[at + 3],
        next = data[at + 7];
      assert.ok(next > i && next <= nodeCount, "every escape advances within its layout");
      if (i === 0) assert.equal(next, nodeCount);
      if (index < 0) continue;
      assert.equal(next, i + 1);
      assert.ok(!seen.has(index));
      seen.add(index);
      const offset = (octant * shape.children.length + index) * 16;
      const center = Array.from(transforms.slice(offset, offset + 3));
      const axes = [4, 8, 12].map((n) => Array.from(transforms.slice(offset + n, offset + n + 3)));
      for (let axis = 0; axis < 3; axis++) {
        const x = axes[0][axis],
          y = axes[1][axis],
          z = axes[2][axis],
          radial = ROMANESCO_BOUND_CYLINDER_RADIUS * Math.hypot(x, z),
          join = 1 - (2 * ROMANESCO_BOUND_CYLINDER_RADIUS) / ROMANESCO_PLACEMENT_RADIUS;
        assert.ok(
          low[axis] <=
            center[axis] + Math.min(y, join * y - radial, ROMANESCO_BOUND_BASE * y - radial),
        );
        assert.ok(
          high[axis] >=
            center[axis] + Math.max(y, join * y + radial, ROMANESCO_BOUND_BASE * y + radial),
        );
      }
    }
    assert.deepEqual(
      [...seen].sort((a, b) => a - b),
      Array.from({ length: shape.children.length }, (_, i) => i),
    );
  }
  for (const { origin, ray } of oracleRays()) {
    const octant = (ray[0] >= 0 ? 1 : 0) + (ray[1] >= 0 ? 2 : 0) + (ray[2] >= 0 ? 4 : 0);
    const direction = [octant & 1 ? 1 : -1, octant & 2 ? 1 : -1, octant & 4 ? 1 : -1];
    const ordered = shape.children
      .slice()
      .sort((a, b) => dot(a.center, direction) - dot(b.center, direction));
    const candidates = new Set();
    let cursor = 0;
    while (cursor < nodeCount) {
      const at = (octant * nodeCount + cursor) * 8;
      let near = 0,
        far = Infinity;
      for (let axis = 0; axis < 3; axis++) {
        const a = (data[at + axis] - origin[axis]) / ray[axis],
          b = (data[at + 4 + axis] - origin[axis]) / ray[axis];
        near = Math.max(near, Math.min(a, b));
        far = Math.min(far, Math.max(a, b));
      }
      if (far < near) {
        cursor = data[at + 7];
        continue;
      }
      if (data[at + 3] >= 0) {
        candidates.add(data[at + 3]);
        cursor = data[at + 7];
      } else cursor++;
    }
    for (let i = 0; i < ordered.length; i++) {
      const child = ordered[i];
      const hit = envelopeHit(shape, inversePoint(child, origin), inverseVector(child, ray));
      if (hit) assert.ok(candidates.has(i), "BVH cannot omit an intersected full child envelope");
    }
  }
});

for (const level of [0, 1, 2])
  test(`Romanesco rank ${level} GPU reference intersects the full retained cone union`, () => {
    const shape = buildGpuShape({ kind: "romanesco" }),
      frame = buildGpuFrame(shape, INITIAL_SPATIAL_CAMERA, style),
      cones = finiteCones(level);
    for (const { origin, ray } of oracleRays().filter((_, i) => level < 2 || i % 3 === 0)) {
      const expected = finiteHit(cones, origin, ray);
      const actual = traceGpuFrame(frame, ray, { maxRank: level, ...finiteOptions(shape) });
      assert.equal(Boolean(actual), expected !== null);
      if (expected !== null)
        assert.ok(
          Math.abs(actual.distance - expected) < 2e-9,
          `expected ${expected}, got ${actual.distance}`,
        );
    }
  });

for (const level of [1, 2])
  for (const growth of [0, 0.25, 0.65])
    test(`Romanesco GPU growth rank ${level} at ${growth} matches the independent base-anchored union`, () => {
      const shape = buildGpuShape({ kind: "romanesco" });
      const frame = buildGpuFrame(shape, INITIAL_SPATIAL_CAMERA, style);
      const cones = finiteCones(level, growth);
      for (const { origin, ray } of oracleRays().filter((_, i) => i % 5 === 0)) {
        const expected = finiteHit(cones, origin, ray);
        const actual = traceGpuFrame(frame, ray, {
          maxRank: level,
          growth,
          ...finiteOptions(shape),
        });
        assert.equal(Boolean(actual), expected !== null);
        if (actual) assert.ok(Math.abs(actual.distance - expected) < 2e-9);
      }
    });

for (const zoom of [24, 80, 240])
  test(`Romanesco retains an ancestor core at zoom ${zoom} without centre/scale cancellation`, () => {
    const bits = zoom + 160,
      shape = buildGpuShape({ kind: "romanesco" });
    // The apex is the sum of the two input coordinates in the actual fixed-point construction.
    const target = ROMANESCO_ROOT.center.map((x) => fixedFromNumber(x, bits));
    target[1] += fixedFromNumber(ROMANESCO_ROOT.scale, bits);
    const camera = { target: target.map(String), bits, zoom },
      view = { ...style, rotationX: 0, rotationY: 0 };
    const frame = buildGpuFrame(shape, camera, view);
    assert.ok(
      frame.roots.some((r) => r.cone),
      "splitting must keep the ancestor solid",
    );
    assert.ok(Array.from(frame.rootData).every(Number.isFinite));
    const cone = frame.roots.find((r) => r.cone && r.rank === 0).cone;
    for (const ray of [
      [0, -0.05, -1],
      [0.03, -0.1, -1],
    ].map(normalize)) {
      const actual = intersectAncestorCone(cone, ray, slope);
      // At the root apex, local coordinates are (0,1,6 / 2^zoom / scale).
      // After scaling out the ancestor size, the conical side remains exact.
      const a = ray[0] ** 2 + ray[2] ** 2 - slope ** 2 * ray[1] ** 2;
      const b = 12 * ray[2],
        c = 36;
      const expected = (-b - Math.sqrt(b * b - 4 * a * c)) / (2 * a);
      assert.ok(actual && Math.abs(actual.distance - expected) < 1e-8);
    }
    const packed = packTransforms(frame.roots);
    assert.ok(
      packed.some((x, i) => i % 16 === 15 && x === 1),
      "retained cores use analytic root records",
    );
  });

for (const level of [0, 1, 2])
  for (const growth of [0, 0.5, 1])
    test(`Romanesco inside-origin rank ${level} growth ${growth} returns the connected union exit`, () => {
      const shape = buildGpuShape({ kind: "romanesco" });
      const root = {
        center: [0, 0.8, 0],
        axes: [
          [1, 0, 0],
          [0, 1, 0],
          [0, 0, 1],
        ],
        rank: 0,
      };
      const frame = { shape, roots: [root], horizon: 128 };
      const cones = finiteConeTree(ROMANESCO_CHILDREN, level, root, growth);
      for (const ray of [
        [1, 0, 0],
        [0, 1, 0],
        [0.6, 0.2, -0.7],
      ].map(normalize)) {
        const expected = finiteConeUnionExit(cones, [0, 0, 0], ray, ROMANESCO_RADIUS);
        const actual = traceGpuFrame(frame, ray, {
          maxRank: level,
          growth,
          ...finiteOptions(shape),
        });
        assert.ok(actual && expected !== null);
        assert.ok(
          Math.abs(actual.distance - expected) < 2e-9,
          `expected union exit ${expected}, got ${actual.distance}`,
        );
      }
    });

test("Romanesco union exit revisits overlapping roots without bridging a gap", () => {
  const shape = { ...buildGpuShape({ kind: "romanesco" }), children: [] };
  const axes = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ];
  const halfWidth = ROMANESCO_RADIUS / 2;
  const first = { center: [0, 0, 0], axes, rank: 0 };
  const overlap = { center: [halfWidth * 1.8, 0, 0], axes, rank: 0 };
  const extension = { center: [halfWidth * 3.6, 0, 0], axes, rank: 0 };
  const beyondGap = { center: [halfWidth * 5.6 + 0.001, 0, 0], axes, rank: 0 };
  for (const roots of [
    [extension, overlap, first, beyondGap],
    [first, overlap, extension, beyondGap],
  ]) {
    const actual = traceGpuFrame({ shape, roots, horizon: 128 }, [1, 0, 0], { maxRank: 0 });
    assert.ok(Math.abs(actual.distance - halfWidth * 4.6) < 1e-12);
  }
});

test("Romanesco generator rays reach the apex of ordinary and retained ancestor cones", () => {
  const shape = buildGpuShape({ kind: "romanesco" });
  const axes = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ];
  const root = { center: [-slope, 0, 0], axes, rank: 0 };
  const ancestor = {
    ...root,
    cone: {
      linear: [2 * slope, 2 * slope * slope, 0],
      constant: 0,
      axis: [0, 1, 0],
      quadraticScale: 1,
      baseDistance: 1,
      tipDistance: 1,
      clearance: 0,
    },
  };
  for (const node of [root, ancestor]) {
    const hit = traceGpuFrame({ shape, roots: [node], horizon: 128 }, normalize([-slope, 1, 0]), {
      maxRank: 0,
      pixelAngle: 0,
      nearFootprint: 0,
    });
    assert.ok(hit);
    assert.ok(Math.abs(hit.distance - Math.hypot(slope, 1)) < 1e-12);
    assert.ok(hit.normal.every(Number.isFinite));
  }
});

test("Romanesco cached GPU frontiers rebase retained cones as accurately as fresh frontiers", () => {
  const bits = 240,
    shape = buildGpuShape({ kind: "romanesco" }),
    target = ROMANESCO_ROOT.center.map((x) => fixedFromNumber(x, bits));
  target[1] += fixedFromNumber(ROMANESCO_ROOT.scale, bits);
  const camera = { target: target.map(String), bits, zoom: 80 },
    view = { ...style, rotationX: 0, rotationY: 0 };
  const previous = buildGpuFrame(shape, camera, view),
    moved = moveSpatialCamera(camera, [0.02, -0.03, -0.05], 80.1);
  const cached = buildGpuFrame(shape, moved, view, { previous }),
    fresh = buildGpuFrame(shape, moved, view);
  assert.equal(cached.visited, 0);
  for (const ray of [
    [0, -0.05, -1],
    [0.03, -0.1, -1],
  ].map(normalize)) {
    const a = traceGpuFrame(cached, ray),
      b = traceGpuFrame(fresh, ray);
    assert.equal(Boolean(a), Boolean(b));
    if (a) assert.ok(Math.abs(a.distance - b.distance) < 1e-7);
  }
});
