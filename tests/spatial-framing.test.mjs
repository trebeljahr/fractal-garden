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
const { spatialProjection } = require("../utils/spatial/projection.ts");
const { pickSpatialPoint } = require("../utils/spatial/picking.ts");
const { pickPolylinePoint } = require("../utils/spatial/polylinePicking.ts");
const { drawPolyline3D } = require("../utils/polyline3d.ts");
const { buildSpatialGeometry } = require("../utils/spatial/geometry.ts");
const { INITIAL_SPATIAL_CAMERA, moveSpatialCamera } = require("../utils/spatial/camera.ts");
const {
  flightBasis,
  initialFlightCamera,
  flightRootBounds,
} = require("../utils/voxelZoom/camera.ts");
const { flightProjection } = require("../utils/voxelZoom/view.ts");

const style = {
  rotationX: 0,
  rotationY: 0,
  cameraDistance: 6,
  background: "#252424",
  fillColor: "#ff9900",
  strokeColor: "#ffffff",
  nearColor: "#ffffff",
  farColor: "#aaaaaa",
  farAlpha: 1,
  showFaces: true,
  showWireframe: false,
  lineWidth: 1,
  autoRotate: false,
};

test("spatial geometry remains visible and pickable in the area reserved for opening controls", () => {
  const width = 800,
    height = 500;
  const frame = { width, height, top: 24, bottom: 350 };
  const camera = moveSpatialCamera(INITIAL_SPATIAL_CAMERA, [0, 8, 0]);
  const geometry = buildSpatialGeometry({
    spec: { kind: "jerusalem" },
    camera,
    style,
    width,
    height,
    frame,
    maxDepth: 0,
  });
  assert.ok(geometry.vertices.length > 0, "opening fit margins must not cull explored geometry");
  const view = spatialProjection(width, height, frame);
  const y = view.centerY + (8 * view.focal) / 5;
  assert.ok(y > height - frame.bottom && y < height);
  const point = pickSpatialPoint(geometry.vertices, width / 2, y, width, height, undefined, frame);
  assert.ok(point, "picking must use the same shifted projection as the mesh");
  assert.ok(Math.abs(point[0]) < 1e-6);
});

test("polyline drawing and picking agree below the opening fit rectangle", () => {
  const width = 800,
    height = 500;
  const framing = { width, height, top: 24, bottom: 350 };
  const points = { points: new Float64Array([-1, -8, 0, 1, -8, 0]), count: 2 };
  const options = { ...style, spatialCamera: INITIAL_SPATIAL_CAMERA, framing };
  const strokes = [];
  const fills = [];
  const ctx = {
    fillRect: (...args) => fills.push(args),
    beginPath() {},
    stroke() {},
    moveTo: (x, y) => strokes.push([x, y]),
    lineTo: (x, y) => strokes.push([x, y]),
  };
  drawPolyline3D(ctx, width, height, points, 2, options);
  assert.deepEqual(fills, [[0, 0, width, height]], "background still covers the full surface");
  const x = (strokes[0][0] + strokes[1][0]) / 2;
  const y = (strokes[0][1] + strokes[1][1]) / 2;
  assert.ok(y > height - framing.bottom && y < height);
  const picked = pickPolylinePoint(points, options, x, y, width, height);
  assert.ok(picked);
  assert.ok(Math.abs(picked[0]) < 1e-6 && Math.abs(picked[1] + 8) < 1e-6);
});

test("voxel opening cameras fit above controls on wide, tall and short surfaces", () => {
  for (const pattern of ["menger", "vicsek", "mosely-light", "mosely-heavy"]) {
    const camera = initialFlightCamera(pattern);
    const basis = flightBasis(camera),
      bounds = flightRootBounds(camera, true);
    for (const [width, height] of [
      [1440, 848],
      [390, 688],
      [844, 286],
    ]) {
      const frame = { width, height, top: 24, bottom: 108 };
      const view = flightProjection(width, height, frame);
      const centers = pattern.startsWith("mosely") ? [0, 1, 2] : [-1];
      for (const insetAxis of centers)
        for (let index = 0; index < 8; index++) {
          const center = bounds.low.map((v, axis) => (v + bounds.high[axis]) / 2);
          const p = center.map(
            (v, axis) => v + (index & (1 << axis) ? 1 : -1) * (axis === insetAxis ? 1 / 6 : 0.5),
          );
          const dot = (direction) => p.reduce((sum, v, axis) => sum + v * direction[axis], 0);
          const depth = dot(basis.forward);
          const x = view.centerX + ((view.side / 1.16) * dot(basis.right)) / depth;
          const y = height - (view.centerY + ((view.side / 1.16) * dot(basis.up)) / depth);
          assert.ok(x >= 0 && x <= width, `${pattern} horizontal fit`);
          assert.ok(y >= frame.top && y <= height - frame.bottom, `${pattern} vertical fit`);
        }
    }
  }
});
