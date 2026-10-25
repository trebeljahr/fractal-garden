import assert from "node:assert/strict";
import test from "node:test";
import { require } from "./helpers/spatial-gpu-fixtures.mjs";

const {
  buildGpuShape,
  packOrderedChildren,
  packChildBounds,
} = require("../../utils/spatialGpu/model.ts");
const { packGpuChildBounds } = require("../../utils/spatialGpu/childBounds.ts");
const {
  ROMANESCO_UNIFORM_CHILD_CAPACITY,
  ROMANESCO_UNIFORM_BOUNDS_HALF_CAPACITY,
  packGpuRomanescoUniformGeometry,
} = require("../../utils/spatialGpu/uniformGeometry.ts");

test("Romanesco uniform blocks preserve every transform and BVH bit within portable limits", () => {
  const shape = buildGpuShape({ kind: "romanesco" });
  const children = packOrderedChildren(shape);
  const bounds = packGpuChildBounds(packChildBounds(shape));
  const packed = packGpuRomanescoUniformGeometry(children, bounds);
  for (const block of Object.values(packed)) assert.ok(block.byteLength <= 16384);
  assert.equal(packed.children.byteLength, 10752);
  assert.equal(packed.bounds0.byteLength, 14272);
  assert.equal(packed.bounds1.byteLength, 14272);
  const canonical = new Uint32Array(
    packed.children.buffer,
    0,
    ROMANESCO_UNIFORM_CHILD_CAPACITY * 16,
  );
  const order = new Uint32Array(packed.children.buffer, ROMANESCO_UNIFORM_CHILD_CAPACITY * 64);
  const original = new Uint32Array(children.buffer);
  for (let row = 0; row < shape.children.length * 8; row++)
    assert.deepEqual(
      canonical.subarray(order[row] * 16, order[row] * 16 + 16),
      original.subarray(row * 16, row * 16 + 16),
      `ordered child ${row}`,
    );
  for (let node = 0; node < bounds.nodeCount * 8; node++) {
    const source = node < ROMANESCO_UNIFORM_BOUNDS_HALF_CAPACITY ? packed.bounds0 : packed.bounds1;
    const at = (node % ROMANESCO_UNIFORM_BOUNDS_HALF_CAPACITY) * 4;
    assert.deepEqual(source.subarray(at, at + 4), bounds.data.subarray(node * 4, node * 4 + 4));
  }
});

test("Uniform geometry rejects mismatched order, capacity and record sizes", () => {
  const shape = buildGpuShape({ kind: "romanesco" });
  const children = packOrderedChildren(shape);
  const bounds = packGpuChildBounds(packChildBounds(shape));
  const wrongOrder = children.slice();
  wrongOrder[15] = shape.children.length;
  assert.throws(() => packGpuRomanescoUniformGeometry(wrongOrder, bounds), /canonical row/);
  const changedTransform = children.slice();
  changedTransform[shape.children.length * 16] += 0.01;
  assert.throws(() => packGpuRomanescoUniformGeometry(changedTransform, bounds), /match.*exactly/);
  assert.throws(() => packGpuRomanescoUniformGeometry(children.subarray(1), bounds), /capacity/);
  assert.throws(
    () => packGpuRomanescoUniformGeometry(children, { data: bounds.data, nodeCount: 224 }),
    /capacity/,
  );
});

test("One-child continuation fixtures use the same padded block layout", () => {
  const shape = buildGpuShape({ kind: "romanesco" });
  const tail = shape.children.find((child) => child.continuation);
  const children = packOrderedChildren({ ...shape, children: [tail] });
  const packed = packGpuRomanescoUniformGeometry(children, {
    data: new Uint32Array(4),
    nodeCount: 0,
  });
  const order = new Uint32Array(packed.children.buffer, ROMANESCO_UNIFORM_CHILD_CAPACITY * 64);
  assert.ok(order.every((index) => index === 0));
  assert.ok(packed.bounds0.every((value) => value === 0));
  assert.ok(packed.bounds1.every((value) => value === 0));
});
