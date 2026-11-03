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
  buildKochFaceScene,
  buildKochSurfaceScene,
  kochFacePyramids,
  projectScenePoint,
  tetrahedronMesh,
} = require("../utils/polyhedronFractals.ts");
const {
  cubeAroundTetrahedron,
  cubeEdges,
  cubeOrientation,
  KOCH_CUBE_ROUNDS,
  kochCubeEmpty,
  kochSurfaceOverCube,
} = require("../utils/lessons/kochCube.ts");
const { viewRotation } = require("../utils/orientation.ts");

const close = (a, b, tolerance = 1e-4) =>
  assert.ok(Math.abs(a - b) < tolerance, `${a} is not close to ${b}`);
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const minus = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];

const frame = cubeAroundTetrahedron(tetrahedronMesh(1.3).vertices);
const inCube = (point) =>
  frame.axes.map((axis) => dot(minus(point, frame.center), axis) / frame.half);
const cubeVolume = (2 * frame.half) ** 3;
const cubeArea = 6 * (2 * frame.half) ** 2;

function triangles({ positions, faceCount }) {
  const list = [];
  for (let face = 0; face < faceCount; face++) {
    const corner = (index) =>
      Array.from(positions.subarray(face * 9 + index * 3, face * 9 + index * 3 + 3));
    list.push([corner(0), corner(1), corner(2)]);
  }
  return list;
}
// Sum of signed tetrahedra to a far point: a closed surface's enclosed volume.
const enclosed = (list) =>
  list.reduce(
    (sum, [a, b, c]) =>
      sum + dot(minus(a, frame.center), cross(minus(b, frame.center), minus(c, frame.center))) / 6,
    0,
  );
const area = (list) =>
  list.reduce((sum, [a, b, c]) => sum + Math.hypot(...cross(minus(b, a), minus(c, a))) / 2, 0);

test("the cube's axes are square and its edges all have the same length", () => {
  for (const [i, a] of frame.axes.entries())
    for (const [j, b] of frame.axes.entries()) close(dot(a, b), i === j ? 1 : 0, 1e-9);
  close(dot(cross(frame.axes[0], frame.axes[1]), frame.axes[2]), 1, 1e-9);
  const edges = cubeEdges(frame, viewRotation(20, 30), 5);
  assert.equal(edges.length, 12);
  for (const { from, to } of edges) close(Math.hypot(...minus(to, from)), 2 * frame.half, 1e-9);
});

test("the tetrahedron has four cube corners, and round 1 reaches the other four", () => {
  const corners = (round) =>
    new Set(
      triangles(buildKochSurfaceScene("tetrahedron", round))
        .flat()
        .map(inCube)
        .filter((signs) => signs.every((value) => Math.abs(Math.abs(value) - 1) < 1e-4))
        .map((signs) => signs.map(Math.round).join()),
    );
  assert.equal(corners(0).size, 4);
  assert.equal(corners(1).size, 8);
});

test("no round leaves the cube, and volume and surface area follow the readout", () => {
  for (let round = 0; round <= KOCH_CUBE_ROUNDS; round++) {
    const list = triangles(buildKochSurfaceScene("tetrahedron", round));
    for (const point of list.flat())
      for (const value of inCube(point)) assert.ok(Math.abs(value) < 1 + 1e-4);
    close(enclosed(list) / cubeVolume, 1 - kochCubeEmpty(round));
    close(area(list) / cubeArea, kochSurfaceOverCube(round));
  }
  assert.ok(kochSurfaceOverCube(1) < 1 && kochSurfaceOverCube(2) > 1);
});

const determinant = (a, b, c) => dot(a, cross(b, c));
const pyramidVolume = ({ base: [a, b, c], tip }) =>
  Math.abs(determinant(minus(b, a), minus(c, a), minus(tip, a))) / 6;

test("the pyramids over all four faces hold exactly the empty part of the cube", () => {
  for (let round = 0; round <= 3; round++) {
    let total = 0;
    for (let face = 0; face < 4; face++) {
      const pyramids = kochFacePyramids(face, round);
      assert.equal(pyramids.length, 6 ** round);
      total += pyramids.reduce((sum, pyramid) => sum + pyramidVolume(pyramid), 0);
    }
    close(total / cubeVolume, kochCubeEmpty(round));
  }
});

test("a first pyramid's tip is an empty corner of the cube", () => {
  const vertices = tetrahedronMesh(1.3).vertices;
  for (let face = 0; face < 4; face++) {
    const [{ tip }] = kochFacePyramids(face, 0);
    for (const value of inCube(tip)) close(Math.abs(value), 1);
    for (const vertex of vertices) assert.ok(Math.hypot(...minus(tip, vertex)) > frame.half);
  }
});

test("each bump takes a quarter of its pyramid, and six smaller pyramids fill the rest", () => {
  const contains = ({ base: [a, b, c], tip }, point) => {
    const [u, v, w] = [minus(b, a), minus(c, a), minus(tip, a)];
    const p = minus(point, a);
    const volume = determinant(u, v, w);
    const x = determinant(p, v, w) / volume;
    const y = determinant(u, p, w) / volume;
    const z = determinant(u, v, p) / volume;
    return [x, y, z, 1 - x - y - z].every((value) => value > -1e-4);
  };
  for (let round = 0; round <= 2; round++) {
    const parents = kochFacePyramids(0, round);
    const children = kochFacePyramids(0, round + 1);
    parents.forEach((parent, index) => {
      const six = children.slice(index * 6, index * 6 + 6);
      close(pyramidVolume(six[0]), pyramidVolume(parent) / 8);
      for (const child of six)
        for (const corner of [...child.base, child.tip]) assert.ok(contains(parent, corner));
      const childVolume = six.reduce((sum, child) => sum + pyramidVolume(child), 0);
      close(childVolume / pyramidVolume(parent), 3 / 4);
    });
  }
});

test("one face's triangles are the ones the whole solid grows from it", () => {
  for (let round = 0; round <= 3; round++) {
    const whole = triangles(buildKochSurfaceScene("tetrahedron", round));
    const count = 6 ** round;
    for (let face = 0; face < 4; face++) {
      const part = triangles(buildKochFaceScene(face, round));
      assert.deepEqual(part, whole.slice(face * count, (face + 1) * count));
    }
  }
});

test("every triangle stays tilted against every face of the cube", () => {
  const tilt = 1 / Math.sqrt(3);
  for (let round = 0; round <= 3; round++)
    for (const [a, b, c] of triangles(buildKochSurfaceScene("tetrahedron", round))) {
      const normal = cross(minus(b, a), minus(c, a));
      const length = Math.hypot(...normal);
      for (const axis of frame.axes) close(Math.abs(dot(normal, axis)) / length, tilt, 1e-3);
    }
});

test("only the edges between two faces turned away count as hidden", () => {
  const facing = (orientation) => {
    const hidden = cubeEdges(frame, orientation, 5).filter((edge) => edge.hidden);
    return hidden.length;
  };
  assert.equal(facing(cubeOrientation(frame, 22, -32)), 3);
  assert.equal(facing(cubeOrientation(frame, 0, 0)), 8);
});

test("the cube is drawn with the scene's camera", () => {
  const camera = {
    rotationX: 0,
    rotationY: 0,
    grab: cubeOrientation(frame, 22, -32),
    cameraDistance: 5,
  };
  const { x, y } = projectScenePoint([0, 0, 0], camera, 400, 400);
  close(x, 200);
  close(y, 200);
  for (const { from } of cubeEdges(frame, camera.grab, 5)) {
    const point = projectScenePoint(from, camera, 400, 400);
    assert.ok(point.x > 0 && point.x < 400 && point.y > 0 && point.y < 400);
  }
});
