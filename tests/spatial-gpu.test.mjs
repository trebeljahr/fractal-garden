import assert from "node:assert/strict";
import test from "node:test";
import {
  finiteTriangles,
  intersectTriangles,
  oracleRays,
  require,
  specs,
  style,
} from "./helpers/spatial-gpu-fixtures.mjs";

const {
  buildGpuShape,
  buildGpuFrame,
  applyPoint,
  inversePoint,
  packChildFrames,
  packChildHulls,
} = require("../../utils/spatialGpu/model.ts");
const { fixedFromNumber } = require("../../utils/deepZoom/math.ts");
const meshes = require("../../utils/polyhedronFractals.ts");
const { INITIAL_SPATIAL_CAMERA, moveSpatialCamera } = require("../../utils/spatial/camera.ts");
const { traceGpuFrame } = require("../../utils/spatialGpu/query.ts");
const dot = (a, b) => a.reduce((sum, v, i) => sum + v * b[i], 0);

function seedVertices(spec) {
  if (spec.kind === "flake") return meshes[spec.mesh + "Mesh"]().vertices;
  if (spec.kind === "jerusalem")
    return [
      [1, 1, 1],
      [-1, -1, -1],
    ];
  if (spec.kind === "quadraticKoch3d")
    return [
      [0.5, 0.5, 0.5],
      [-0.5, -0.5, -0.5],
    ];
  if (spec.start === "tetrahedron") return meshes.tetrahedronMesh(1.3).vertices;
  return [90, 330, 210].map((angle) => [
    1.6 * Math.cos((angle * Math.PI) / 180),
    -0.35,
    1.6 * Math.sin((angle * Math.PI) / 180),
  ]);
}

for (const spec of specs) {
  const name = `${spec.kind}/${spec.mesh ?? spec.start ?? "default"}`;
  test(`${name} recursive ray traversal matches the independent finite surface`, () => {
    const shape = buildGpuShape(spec),
      frame = buildGpuFrame(shape, INITIAL_SPATIAL_CAMERA, style);
    const triangles = finiteTriangles(spec, 2);
    for (const { origin, ray } of oracleRays()) {
      const expected = intersectTriangles(triangles, origin, ray);
      const actual = traceGpuFrame(frame, ray, { maxRank: 2, pixelAngle: 0, nearFootprint: 0 });
      assert.equal(Boolean(actual), Boolean(expected));
      if (expected) assert.ok(Math.abs(actual.distance - expected.distance) < 0.00002);
    }
  });
  test(`${name} descendant bounds contain each child hull`, () => {
    const shape = buildGpuShape(spec);
    let vertices;
    if (shape.kind === 1) {
      vertices = [
        [-0.5, -Math.sqrt(3) / 6, 0],
        [0.5, -Math.sqrt(3) / 6, 0],
        [0, Math.sqrt(3) / 3, 0],
        [0, 0, Math.sqrt(2 / 3) / 2],
      ];
    } else if (spec.kind === "flake") {
      vertices = meshes[spec.mesh + "Mesh"]().vertices;
    } else {
      vertices = Array.from({ length: 8 }, (_, mask) =>
        shape.low.map((v, axis) => (mask & (1 << axis) ? shape.high[axis] : v)),
      );
    }
    for (const child of shape.children) {
      for (const vertex of vertices) {
        const p = applyPoint(child, vertex);
        for (const plane of shape.hull) {
          assert.ok(
            dot(plane.slice(0, 3), p) <= plane[3] + 1e-12,
            `child escapes descendant hull at ${p}`,
          );
        }
      }
    }
  });
  for (const zoom of [24, 80, 240]) {
    test(`${name} retains seed vertices at zoom ${zoom}`, () => {
      const shape = buildGpuShape(spec);
      const bits = zoom + 160;
      for (const point of seedVertices(spec).slice(0, 2)) {
        const camera = {
          target: point.map((v) => fixedFromNumber(v, bits).toString()),
          bits,
          zoom,
        };
        const frame = buildGpuFrame(shape, camera, { ...style, rotationX: 0, rotationY: 0 });
        assert.ok(frame.roots.length > 0, "a retained seed vertex must not disappear");
        assert.ok(Array.from(frame.rootData).every(Number.isFinite));
        assert.ok(
          frame.roots.some((root) => {
            const p = inversePoint(root, [0, 0, -6]);
            return shape.hull.every((plane) => dot(plane.slice(0, 3), p) <= plane[3] + 1e-4);
          }),
          "local roots must still enclose the original seed vertex",
        );
      }
    });
  }
}

test("Jerusalem preserves the two size ranks", () => {
  const shape = buildGpuShape({ kind: "jerusalem" });
  const r = Math.SQRT2 - 1;
  for (const child of shape.children) {
    const middle = child.center.filter((v) => v === 0).length;
    const expected = middle ? r * r : r;
    assert.equal(child.rank, middle ? 2 : 1);
    assert.ok(Math.abs(Math.hypot(...child.axes[0]) - expected) < 1e-14);
  }
});

test("moving inside a cached frontier preserves the same rays as a fresh frontier", () => {
  const shape = buildGpuShape({ kind: "jerusalem" });
  const camera = {
    target: ["1", "1", "1"].map(() => (1n << 320n).toString()),
    bits: 320,
    zoom: 160,
  };
  const view = { ...style, rotationX: 0, rotationY: 0 };
  const previous = buildGpuFrame(shape, camera, view);
  const moved = moveSpatialCamera(camera, [0.2, -0.1, -0.3], 160.2);
  const cached = buildGpuFrame(shape, moved, view, { previous });
  const fresh = buildGpuFrame(shape, moved, view);
  assert.equal(cached.visited, 0, "small moves should only rebase the fixed-point roots");
  for (const ray of [
    [0, 0, -1],
    [-0.1, -0.2, -1],
    [0.2, 0.1, -1],
  ]) {
    const a = traceGpuFrame(cached, ray),
      b = traceGpuFrame(fresh, ray);
    assert.equal(Boolean(a), Boolean(b));
    if (a) assert.ok(Math.abs(a.distance - b.distance) < 1e-8);
  }
});

test("Koch child hull planes match each child's hull in its own frame", () => {
  const shape = buildGpuShape({ kind: "kochSurface", start: "triangle" });
  const planes = packChildHulls(shape),
    { centers, axes } = packChildFrames(shape);
  const point = [0.13, -0.21, 0.37];
  for (let child = 0; child < 6; child++) {
    const center = centers.slice(child * 3, child * 3 + 3),
      frame = axes.slice(child * 9, child * 9 + 9);
    const size = Math.hypot(frame[0], frame[1], frame[2]);
    assert.ok(Math.abs(size - 0.5) < 1e-6);
    const delta = point.map((v, i) => v - center[i]);
    const local = [0, 3, 6].map(
      (at) =>
        (frame[at] * delta[0] + frame[at + 1] * delta[1] + frame[at + 2] * delta[2]) /
        (size * size),
    );
    shape.hull.forEach((plane, at) => {
      const packed = planes.slice((child * 4 + at) * 4, (child * 4 + at + 1) * 4);
      const inParent =
        packed[3] - (packed[0] * point[0] + packed[1] * point[1] + packed[2] * point[2]);
      const inChild = plane[3] - (plane[0] * local[0] + plane[1] * local[1] + plane[2] * local[2]);
      assert.ok(Math.abs(inParent - inChild) < 1e-5);
    });
  }
});
