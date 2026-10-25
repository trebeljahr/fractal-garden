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
  ROMANESCO_MESH,
  buildRomanescoScene,
} = require("../utils/romanesco.ts");

const dot = (a, b) => a.reduce((sum, value, axis) => sum + value * b[axis], 0);
const sub = (a, b) => a.map((value, axis) => value - b[axis]);
const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];

test("the Romanesco seed is closed, outward wound and nondegenerate", () => {
  const { vertices, faces } = ROMANESCO_MESH;
  const edges = new Map();
  for (const indices of faces) {
    const [a, b, c] = indices.map((index) => vertices[index]);
    const normal = cross(sub(b, a), sub(c, a));
    assert.ok(Math.hypot(...normal) > 1e-8);
    assert.ok(dot(normal, a) > 0, "origin is inside each outward face");
    for (let index = 0; index < indices.length; index++) {
      const from = indices[index];
      const to = indices[(index + 1) % indices.length];
      const key = [Math.min(from, to), Math.max(from, to)].join(":");
      const pair = edges.get(key) ?? [];
      pair.push([from, to]);
      edges.set(key, pair);
    }
  }
  for (const pair of edges.values()) {
    assert.equal(pair.length, 2, "each edge belongs to two faces");
    assert.deepEqual(pair[0], pair[1].toReversed());
  }
  assert.ok(faces.reduce((triangles, face) => triangles + face.length - 2, 0) * 3 <= 360);
});

test("every child shrinks, stays attached and fits the recursive culling bound", () => {
  assert.ok(ROMANESCO_CHILDREN.length > 0);
  assert.ok(ROMANESCO_GOLDEN_ANGLE > 2.39 && ROMANESCO_GOLDEN_ANGLE < 2.4);
  const { vertices, faces } = ROMANESCO_MESH;
  for (const point of vertices) assert.ok(Math.hypot(...point) <= ROMANESCO_BOUND);
  for (const child of ROMANESCO_CHILDREN) {
    assert.ok(child.scale > 0 && child.scale < 1);
    assert.ok(Math.hypot(...child.center) + child.scale * ROMANESCO_BOUND <= ROMANESCO_BOUND);
    // A point just above one inward base vertex lies strictly inside the
    // parent. This checks volume overlap even when the base centre is outside.
    const overlap = vertices.slice(0, 12).some((point) => {
      const sample = point.map((value, axis) => child.center[axis] + child.scale * value);
      sample[1] += 0.01 * child.scale;
      return faces.every((indices) => {
        const [a, b, c] = indices.map((index) => vertices[index]);
        const normal = cross(sub(b, a), sub(c, a));
        return dot(normal, sub(sample, a)) < -1e-10;
      });
    });
    assert.ok(overlap, "each child's base overlaps the parent's solid");
  }
});

test("finite levels retain their parent geometry and stay within the scene budget", () => {
  let count = 0;
  for (let level = 0; level <= 2; level++) {
    count += ROMANESCO_CHILDREN.length ** level;
    const scene = buildRomanescoScene(level);
    assert.equal(scene.vertexCount, count * ROMANESCO_MESH.vertices.length);
    assert.equal(scene.faceCount, count * ROMANESCO_MESH.faces.length);
    assert.ok(scene.faceCount <= 60000);
    assert.equal(scene.faceOffsets.at(-1), scene.faceIndices.length);
    assert.ok(scene.positions.every(Number.isFinite));
    assert.ok(scene.normals.every(Number.isFinite));
    assert.ok(scene.faceIndices.every((index) => index < scene.vertexCount));
    if (level > 0) {
      const previous = buildRomanescoScene(level - 1);
      assert.deepEqual(scene.positions.slice(0, previous.positions.length), previous.positions);
    }
  }
  assert.equal(buildRomanescoScene(100).faceCount, buildRomanescoScene(2).faceCount);
  for (const level of [-1, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.equal(buildRomanescoScene(level).faceCount, ROMANESCO_MESH.faces.length);
  }
});

test("construction motion grows only the newest buds from their bases", () => {
  const old = buildRomanescoScene(1);
  const start = buildRomanescoScene(2, 0);
  const middle = buildRomanescoScene(2, 0.5);
  const end = buildRomanescoScene(2, 1);
  assert.deepEqual(start.faceIndices, end.faceIndices);
  assert.deepEqual(start.faceOffsets, end.faceOffsets);
  assert.deepEqual(start.positions.slice(0, old.positions.length), old.positions);
  const stride = ROMANESCO_MESH.vertices.length * 3;
  for (let offset = old.positions.length; offset < start.positions.length; offset += stride) {
    const base = Array.from(start.positions.slice(offset, offset + 3));
    for (let vertex = 0; vertex < ROMANESCO_MESH.vertices.length; vertex++) {
      assert.deepEqual(
        Array.from(start.positions.slice(offset + vertex * 3, offset + vertex * 3 + 3)),
        base,
      );
    }
    for (let axis = 0; axis < stride; axis++) {
      const index = offset + axis;
      assert.ok(
        Math.abs(middle.positions[index] - (start.positions[index] + end.positions[index]) / 2) <
          1e-7,
      );
    }
  }
});
