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
  buildSpatialGeometry,
  buildSpatialFrame,
  hilbertEnds,
} = require("../utils/spatial/geometry.ts");
const {
  INITIAL_SPATIAL_CAMERA,
  moveSpatialCamera,
  readSpatialCamera,
  reframeSpatialPoint,
  bigPoint,
} = require("../utils/spatial/camera.ts");
const { pickSpatialPoint } = require("../utils/spatial/picking.ts");
const { buildScene } = require("../utils/render/scene3d.ts");
const { viewRotation, IDENTITY } = require("../utils/orientation.ts");
const { AttractorDetail } = require("../utils/spatial/attractor.ts");
const { tetrahedronMesh } = require("../utils/polyhedronFractals.ts");
const style = {
  rotationX: 24,
  rotationY: 28,
  background: "#252424",
  fillColor: "#ff9900",
  strokeColor: "#ffffff",
  showFaces: true,
  showWireframe: true,
  lineWidth: 0.7,
  autoRotate: false,
  cameraDistance: 6,
};
const width = 320,
  height = 240;
function finiteTriangles(scene, rotation) {
  const out = [];
  for (let f = 0; f < scene.faceCount; f++) {
    const ids = Array.from(scene.faceIndices.slice(scene.faceOffsets[f], scene.faceOffsets[f + 1]));
    for (let i = 1; i < ids.length - 1; i++)
      for (const index of [ids[0], ids[i], ids[i + 1]]) {
        const p = Array.from(scene.positions.slice(index * 3, index * 3 + 3));
        const v = [0, 1, 2].map(
          (k) => rotation[k * 3] * p[0] + rotation[k * 3 + 1] * p[1] + rotation[k * 3 + 2] * p[2],
        );
        out.push(...v, 0, 0, 0, 0, 0, 0, 0, 0, 0);
      }
  }
  return Float32Array.from(out);
}
for (const spec of [
  { kind: "romanesco" },
  { kind: "flake", mesh: "tetrahedron", ratio: 0.5 },
  { kind: "flake", mesh: "squarePyramid", ratio: 0.5 },
  { kind: "flake", mesh: "octahedron", ratio: 0.5 },
  { kind: "flake", mesh: "dodecahedron", ratio: 1 / (2 + (1 + Math.sqrt(5)) / 2) },
  { kind: "flake", mesh: "icosahedron", ratio: 1 / (1 + (1 + Math.sqrt(5)) / 2) },
  { kind: "kochSurface", start: "triangle" },
  { kind: "kochSurface", start: "tetrahedron" },
  { kind: "quadraticKoch3d" },
])
  test(`adaptive ${JSON.stringify(spec)} agrees with independent finite geometry`, () => {
    const actual = buildSpatialGeometry({
      spec,
      camera: INITIAL_SPATIAL_CAMERA,
      style,
      width,
      height,
      maxDepth: 2,
      pixelSize: 0.01,
      maxVertices: 600000,
    });
    const expected = finiteTriangles(
      buildScene(spec, 2).scene,
      viewRotation(style.rotationX, style.rotationY),
    );
    assert.equal(actual.limited, false);
    assert.ok(actual.vertices.length > 0);
    let hits = 0;
    for (let y = 37; y < height; y += 17)
      for (let x = 47; x < width; x += 19) {
        const a = pickSpatialPoint(actual.vertices, x, y, width, height),
          b = pickSpatialPoint(expected, x, y, width, height);
        assert.equal(Boolean(a), Boolean(b), `hit mismatch at ${x},${y}`);
        if (a && b) {
          hits++;
          assert.ok(Math.hypot(...a.map((v, i) => v - b[i])) < 2e-5, `depth mismatch at ${x},${y}`);
        }
      }
    assert.ok(hits > 0);
  });
test("camera movement retains sub-double detail and share data validates precision", () => {
  let camera = moveSpatialCamera(INITIAL_SPATIAL_CAMERA, [1, 1, 1], 180);
  const before = BigInt(camera.target[0]);
  camera = moveSpatialCamera(camera, [0.25, 0, 0]);
  assert.ok(BigInt(camera.target[0]) > before);
  assert.equal(Number(BigInt(camera.target[0])) * 2 ** -camera.bits, 1);
  assert.deepEqual(readSpatialCamera(JSON.parse(JSON.stringify(camera))), camera);
  assert.throws(() => readSpatialCamera({ ...camera, bits: 160 }));
  assert.throws(() => readSpatialCamera({ ...camera, target: ["bad", "0", "0"] }));
});
test("a pending worker frame cannot move the picked world point", () => {
  const old = moveSpatialCamera(INITIAL_SPATIAL_CAMERA, [0.1, 0.2, 0.3], 4),
    next = moveSpatialCamera(old, [0.02, -0.1, 0.04], 7);
  const p = [0.5, -0.3, 1.2],
    q = reframeSpatialPoint(p, old, IDENTITY, next, viewRotation(13, 27));
  const restored = reframeSpatialPoint(q, next, viewRotation(13, 27), old, IDENTITY);
  assert.ok(Math.hypot(...restored.map((v, i) => v - p[i])) < 1e-12);
});
test("tetrahedron reveals descendants past floating-point camera resolution", () => {
  const zoom = 80,
    bits = zoom + 160,
    vertex = tetrahedronMesh().vertices[0],
    target = bigPoint(vertex, bits);
  const camera = { target: target.map(String), bits, zoom };
  const g = buildSpatialFrame({
    spec: { kind: "flake", mesh: "tetrahedron", ratio: 0.5 },
    camera,
    style: { ...style, rotationX: 0, rotationY: 0 },
    width: 200,
    height: 160,
  });
  assert.equal(g.limited, false);
  assert.ok(g.depth > 80);
  assert.ok(g.leaves > 0);
  assert.ok(g.vertices.every(Number.isFinite));
  assert.ok(g.vertices.length / 12 <= 120000);
});
test("work caps produce complete coarser frames and empty views stay empty", () => {
  const request = {
    spec: { kind: "jerusalem" },
    camera: INITIAL_SPATIAL_CAMERA,
    style,
    width,
    height,
    maxVertices: 18000,
  };
  const g = buildSpatialFrame(request);
  assert.equal(g.limited, false);
  assert.ok(g.vertices.length / 12 < 18000);
  const empty = buildSpatialFrame({
    ...request,
    camera: moveSpatialCamera(INITIAL_SPATIAL_CAMERA, [100, 100, 0], 12),
  });
  assert.equal(empty.vertices.length, 0);
});
test("Romanesco flight keeps a bounded collision shell and refines near its tip", () => {
  const request = {
    spec: { kind: "romanesco" },
    camera: INITIAL_SPATIAL_CAMERA,
    style: { ...style, rotationX: 0, rotationY: 0 },
    width: 240,
    height: 200,
    maxVertices: 36000,
    flight: true,
  };
  const opening = buildSpatialFrame(request);
  const closer = buildSpatialFrame({
    ...request,
    camera: moveSpatialCamera(INITIAL_SPATIAL_CAMERA, [0, 0.96, 0], 6),
  });
  for (const frame of [opening, closer]) {
    assert.equal(frame.limited, false);
    assert.ok(frame.vertices.length > 0 && frame.vertices.length / 12 <= 36000);
    assert.ok(frame.collision.length > 0 && frame.collision.length / 12 <= 36000);
    assert.ok(frame.vertices.every(Number.isFinite));
    assert.ok(frame.collision.every(Number.isFinite));
  }
  assert.ok(closer.depth > opening.depth);
});
test("solid detail omits tiny distant copies and still refines on approach", () => {
  const request = {
    spec: { kind: "flake", mesh: "tetrahedron", ratio: 0.5 },
    camera: INITIAL_SPATIAL_CAMERA,
    style,
    width,
    height,
  };
  const opening = buildSpatialFrame(request);
  const tiny = buildSpatialFrame({ ...request, pixelSize: 1.5 });
  assert.equal(opening.limited, false);
  assert.ok(opening.leaves < tiny.leaves / 2);
  assert.ok(opening.depth < tiny.depth);
  const closer = buildSpatialFrame({
    ...request,
    camera: { ...INITIAL_SPATIAL_CAMERA, zoom: 2 },
  });
  assert.ok(closer.depth > opening.depth);
});
test("Hilbert endpoints agree with adjacent recursive octants", () => {
  assert.deepEqual(hilbertEnds, [
    [-1, -1, -1],
    [1, -1, -1],
  ]);
  const g = buildSpatialFrame({
    spec: { kind: "hilbert3d" },
    camera: INITIAL_SPATIAL_CAMERA,
    style,
    width,
    height,
  });
  assert.ok(g.leaves > 8);
  assert.equal(g.limited, false);
  assert.ok(g.vertices.every(Number.isFinite));
});
for (const source of [
  { kind: "lorenz", sigma: 10, rho: 28, beta: 8 / 3, dt: 0.005, steps: 1000 },
  { kind: "rossler", a: 0.2, b: 0.2, c: 5.7, dt: 0.02, steps: 1000 },
])
  test(`${source.kind} adds real time coverage and refines visible curvature`, () => {
    const detail = new AttractorDetail(source),
      base = {
        ...style,
        nearColor: "#fff",
        farColor: "#888",
        farAlpha: 0.3,
        animateTrail: false,
        trailSpeed: 20,
        spatialCamera: INITIAL_SPATIAL_CAMERA,
      };
    const wide = detail.sample(base, width, height);
    const points = wide.points,
      point = Array.from(
        points.slice(Math.floor(wide.count / 2) * 3, Math.floor(wide.count / 2) * 3 + 3),
      );
    const camera = moveSpatialCamera(INITIAL_SPATIAL_CAMERA, point, 12),
      deep = detail.sample({ ...base, spatialCamera: camera }, width, height);
    assert.ok(deep.coverage > wide.coverage);
    assert.ok(deep.refinements > 0);
    assert.ok(deep.count > 0);
    assert.ok(deep.count <= 180000);
    assert.ok(deep.points instanceof Float64Array);
    assert.equal(deep.breaks.length, deep.count);
    assert.ok(deep.points.every(Number.isFinite));
  });

test("Jerusalem rank convention matches finite unequal box subdivisions", () => {
  const localStyle = { ...style, rotationX: 0, rotationY: 0 };
  const actual = buildSpatialGeometry({
    spec: { kind: "jerusalem" },
    camera: INITIAL_SPATIAL_CAMERA,
    style: localStyle,
    width,
    height,
    maxDepth: 3,
    pixelSize: 0.01,
    maxVertices: 600000,
  });
  const { boxes, firstChild } = buildScene({ kind: "jerusalem" }, 3).scene;
  for (let y = 51; y < 190; y += 23)
    for (let x = 61; x < 270; x += 23) {
      const d = [
          (x - width / 2) / (Math.min(width, height) * 1.8),
          -(y - height / 2) / (Math.min(width, height) * 1.8),
          -1,
        ],
        origin = [0, 0, 6];
      let nearest = Infinity;
      for (let box = 0; box < firstChild.length; box++) {
        if (firstChild[box] >= 0) continue;
        const half = boxes[box * 4 + 3] / 2;
        let enter = 0,
          exit = Infinity;
        for (let axis = 0; axis < 3; axis++) {
          const low = boxes[box * 4 + axis] - half,
            high = boxes[box * 4 + axis] + half;
          if (Math.abs(d[axis]) < 1e-12) {
            if (origin[axis] < low || origin[axis] > high) exit = -1;
            continue;
          }
          const a = (low - origin[axis]) / d[axis],
            b = (high - origin[axis]) / d[axis];
          enter = Math.max(enter, Math.min(a, b));
          exit = Math.min(exit, Math.max(a, b));
        }
        if (exit >= enter) nearest = Math.min(nearest, enter);
      }
      const hit = pickSpatialPoint(actual.vertices, x, y, width, height);
      assert.equal(Boolean(hit), Number.isFinite(nearest));
      if (hit) assert.ok(Math.abs(6 - hit[2] - nearest) < 2e-5);
    }
});
test("Hilbert adaptive leaves meet at their shared recursive endpoints", () => {
  const g = buildSpatialGeometry({
    spec: { kind: "hilbert3d" },
    camera: INITIAL_SPATIAL_CAMERA,
    style,
    width,
    height,
    maxDepth: 1,
    pixelSize: 0.01,
  });
  let previous = null;
  for (let i = 0; i < g.vertices.length; i += 72) {
    const a = [0, 1, 2].map((k) => (g.vertices[i + k] + g.vertices[i + 12 + k]) / 2),
      b = [0, 1, 2].map((k) => (g.vertices[i + 24 + k] + g.vertices[i + 60 + k]) / 2);
    if (previous) assert.ok(Math.hypot(...a.map((v, k) => v - previous[k])) < 2e-6);
    previous = b;
  }
});
test("polyline picking preserves perspective and respects gaps", () => {
  const { pickPolylinePoint } = require("../utils/spatial/polylinePicking.ts");
  const config = { ...style, rotationX: 0, rotationY: 0, spatialCamera: INITIAL_SPATIAL_CAMERA };
  const line = { points: Float64Array.from([-1, 0, 1, 1, 0, -1]), count: 2 };
  const p = pickPolylinePoint(line, config, width / 2, height / 2, width, height);
  assert.ok(p);
  assert.ok(Math.abs(p[0]) < 1e-12);
  assert.ok(Math.abs(p[1]) < 1e-12);
  assert.ok(Math.abs(p[2]) < 1e-12);
  assert.equal(
    pickPolylinePoint(
      { ...line, breaks: Uint8Array.from([1, 1]) },
      config,
      width / 2,
      height / 2,
      width,
      height,
    ),
    null,
  );
});
test("GPU frame transform agrees with exact camera reframing", () => {
  const { spatialFrameTransform, transformSpatialPoint } = require("../utils/spatial/camera.ts");
  const from = moveSpatialCamera(INITIAL_SPATIAL_CAMERA, [1, 0.2, -0.5], 80),
    to = moveSpatialCamera(from, [0.5, 0.2, -0.1], 82),
    r0 = viewRotation(12, 31),
    r1 = viewRotation(-25, 55),
    p = [0.2, 1.2, -0.6];
  const exact = reframeSpatialPoint(p, from, r0, to, r1),
    gpu = transformSpatialPoint(p, spatialFrameTransform(from, r0, to, r1));
  assert.ok(Math.hypot(...exact.map((v, i) => v - gpu[i])) < 1e-12);
});
test("Mandelbulb surface picking anchors the shader's camera", () => {
  const { pickBulbPoint, bulbDistance } = require("../utils/spatial/mandelbulb.ts");
  const view = {
    power: 8,
    detail: 14,
    cameraDistance: 3,
    offsetX: 0,
    offsetY: 0,
    rotationX: 18,
    rotationY: 32,
  };
  const p = pickBulbPoint(INITIAL_SPATIAL_CAMERA, view, 960, 540, 1920, 1080);
  assert.ok(p);
  assert.ok(p.every(Number.isFinite));
  const rotation = viewRotation(view.rotationX, view.rotationY),
    world = [0, 1, 2].map(
      (i) => (rotation[i] * p[0] + rotation[3 + i] * p[1] + rotation[6 + i] * p[2]) * 0.5,
    );
  assert.ok(bulbDistance(world, 8, 14) < 0.002);
});

test("flight look and precision changes preserve the eye even at deep fixed-point scales", () => {
  const { reframeSpatialEye } = require("../utils/spatial/flight.ts");
  const from = moveSpatialCamera(INITIAL_SPATIAL_CAMERA, [0.2, -0.3, 0.4], 180);
  const rotation = viewRotation(35, -70);
  const next = reframeSpatialEye(from, IDENTITY, rotation, 184);
  const eye = reframeSpatialPoint([0, 0, 6], from, IDENTITY, next, rotation);
  assert.ok(Math.hypot(eye[0], eye[1], eye[2] - 6) < 1e-10);
});

test("boosted flight cannot cross the collision shell and diagonal speed is normalized", () => {
  const { advanceSpatialFlight } = require("../utils/spatial/flight.ts");
  const advance = (motion, clearance = 0.01) =>
    advanceSpatialFlight({
      camera: INITIAL_SPATIAL_CAMERA,
      rotation: IDENTITY,
      clearance,
      motion,
      elapsed: 0.5,
      speed: 3,
      boost: true,
    }).camera;
  const origin = [0, 0, 6];
  const displacement = (next) => {
    const eye = reframeSpatialPoint([0, 0, 6], next, IDENTITY, INITIAL_SPATIAL_CAMERA, IDENTITY);
    return Math.hypot(...eye.map((v, i) => v - origin[i]));
  };
  assert.ok(displacement(advance([0, 0, -1])) <= 0.0020000001);
  assert.ok(
    Math.abs(displacement(advance([1, 1, -1])) - displacement(advance([0, 0, -1]))) < 1e-10,
  );
  assert.ok(displacement(advance([0, 0, -1], 0)) < 1e-10);
  assert.ok(advance([0, 0, -1]).zoom > 0);
});

test("collision distance includes triangle interiors, edges and corners", () => {
  const { closestTrianglePoint } = require("../utils/spatial/flight.ts");
  const a = [0, 0, 0],
    b = [1, 0, 0],
    c = [0, 1, 0];
  assert.deepEqual(closestTrianglePoint([0.25, 0.25, 1], a, b, c), [0.25, 0.25, 0]);
  assert.deepEqual(closestTrianglePoint([1, 1, 0], a, b, c), [0.5, 0.5, 0]);
  assert.deepEqual(closestTrianglePoint([-1, -1, 0], a, b, c), a);
});

test("flight collision retains nearby surfaces behind the eye independently of visible triangles", () => {
  const { meshClearance } = require("../utils/spatial/flight.ts");
  // Eye at z=1.1, looking away from the seed cube. It is still a nearby obstacle.
  const frame = buildSpatialFrame({
    spec: { kind: "jerusalem" },
    style: { ...style, rotationX: 0, rotationY: 180 },
    camera: moveSpatialCamera(INITIAL_SPATIAL_CAMERA, [0, 0, 7.1]),
    width: 160,
    height: 120,
    flight: true,
  });
  assert.ok(frame.collision?.length > 0);
  assert.ok(Number.isFinite(meshClearance(frame.collision)));
  assert.ok(frame.collision.length / 12 < 36000);
  assert.equal(frame.limited, false);
});

test("flight atmosphere eases independently of collision precision and round-trips through links", () => {
  const { advanceSpatialFlight } = require("../utils/spatial/flight.ts");
  const next = advanceSpatialFlight({
    camera: INITIAL_SPATIAL_CAMERA,
    rotation: IDENTITY,
    clearance: 0.00001,
    motion: [0, 0, -1],
    elapsed: 0.05,
    speed: 1,
  }).camera;
  assert.ok(next.atmosphereZoom >= 0 && next.atmosphereZoom < next.zoom);
  assert.ok(next.atmosphereVelocity > 0);
  assert.deepEqual(readSpatialCamera(JSON.parse(JSON.stringify(next))), next);
  assert.throws(() => readSpatialCamera({ ...next, atmosphereZoom: NaN }));
});

test("deep trajectory depth keeps separate colors after coordinates leave the seed bounds", () => {
  const { drawPolyline3D } = require("../utils/polyline3d.ts");
  const strokes = [];
  const context = {
    fillRect() {},
    beginPath() {},
    moveTo() {},
    lineTo() {},
    stroke() {
      strokes.push(this.strokeStyle);
    },
  };
  drawPolyline3D(
    context,
    320,
    240,
    {
      points: Float64Array.from([
        -0.1, -0.1, -0.3, 0.1, -0.1, -0.3, -0.1, 0.1, -0.6, 0.1, 0.1, -0.6,
      ]),
      count: 4,
      breaks: Uint8Array.from([0, 0, 1, 0]),
    },
    4,
    {
      ...style,
      rotationX: 0,
      rotationY: 0,
      spatialCamera: moveSpatialCamera(INITIAL_SPATIAL_CAMERA, [0, 0, 0], 4),
      nearColor: "#ff0000",
      farColor: "#0000ff",
      farAlpha: 0.3,
    },
  );
  assert.equal(strokes.length, 2);
  assert.notEqual(strokes[0], strokes[1]);
});

test("flight look stays upright and height keys move vertically while looking up", () => {
  const { advanceSpatialFlight, lookSpatialRotation } = require("../utils/spatial/flight.ts");
  const rotation = lookSpatialRotation(IDENTITY, 200, -400);
  assert.equal(rotation[1], 0);
  const next = advanceSpatialFlight({
    camera: INITIAL_SPATIAL_CAMERA,
    rotation,
    clearance: 2,
    motion: [0, 1, 0],
    elapsed: 0.1,
    speed: 1,
  }).camera;
  const eye = reframeSpatialPoint([0, 0, 6], INITIAL_SPATIAL_CAMERA, rotation, next, rotation);
  const moved = require("../utils/spatial/camera.ts").inverseRotate(
    [eye[0], eye[1], eye[2] - 6],
    rotation,
  );
  assert.ok(Math.abs(moved[0]) < 1e-10 && Math.abs(moved[2]) < 1e-10);
  assert.ok(moved[1] < 0);
});
