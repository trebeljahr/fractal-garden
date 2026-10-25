import assert from "node:assert/strict";
import test from "node:test";
import { require } from "./helpers/spatial-gpu-fixtures.mjs";

const { buildGpuShape, packChildBounds } = require("../../utils/spatialGpu/model.ts");
const { packGpuChildBounds } = require("../../utils/spatialGpu/childBounds.ts");

// Decode the IEEE binary16 fields independently of the packing algorithm.
function half(bits) {
  const sign = bits & 0x8000 ? -1 : 1,
    exponent = (bits >>> 10) & 31,
    fraction = bits & 1023;
  return sign * (exponent ? (1 + fraction / 1024) * 2 ** (exponent - 15) : fraction * 2 ** -24);
}

test("Packed GPU child bounds enclose every original BVH node with one texel", () => {
  const original = packChildBounds(buildGpuShape({ kind: "romanesco" }));
  const packed = packGpuChildBounds(original);
  assert.equal(packed.nodeCount, original.nodeCount);
  assert.equal(packed.data.byteLength, original.data.byteLength / 2);
  for (let row = 0; row < original.data.length / 8; row++) {
    for (let axis = 0; axis < 3; axis++) {
      const encoded = packed.data[row * 4 + axis];
      const low = half(encoded & 65535),
        high = half(encoded >>> 16);
      assert.ok(low <= original.data[row * 8 + axis], "lower bounds round down");
      assert.ok(high >= original.data[row * 8 + 4 + axis], "upper bounds round up");
      assert.ok(Number.isFinite(low) && Number.isFinite(high));
    }
    const metadata = packed.data[row * 4 + 3];
    assert.equal((metadata & 65535) - 1, original.data[row * 8 + 3]);
    assert.equal(metadata >>> 16, original.data[row * 8 + 7]);
  }
});

test("Packed bounds round outward across signs, exponent boundaries and subnormals", () => {
  const magnitudes = [0, 2 ** -30, 2 ** -24, 2 ** -14, 0.1, 0.5, 1, 2, 65504];
  for (const magnitude of magnitudes)
    for (const sign of [-1, 1])
      for (const delta of [-1e-7, 0, 1e-7]) {
        const value = Math.fround(sign * magnitude * (1 + delta));
        if (Math.abs(value) > 65504) continue;
        const data = new Float32Array([value, value, value, 17, value, value, value, 31]);
        const packed = packGpuChildBounds({ data, nodeCount: 1 }).data;
        const low = half(packed[0] & 65535),
          high = half(packed[0] >>> 16);
        assert.ok(low <= value && high >= value, `${low} <= ${value} <= ${high}`);
        const step = Math.abs(value) / 1024 + 2 ** -24;
        assert.ok(value - low <= step && high - value <= step);
        assert.equal(packed[3] & 65535, 18);
        assert.equal(packed[3] >>> 16, 31);
      }
});

test("Packed child bounds keep a valid empty texture and reject overflowing inputs", () => {
  const empty = packGpuChildBounds({ data: new Float32Array(8), nodeCount: 0 });
  assert.equal(empty.nodeCount, 0);
  assert.equal(empty.data.length, 4);
  for (const value of [Infinity, NaN, 70000]) {
    const data = new Float32Array([value, 0, 0, -1, 1, 1, 1, 1]);
    assert.throws(() => packGpuChildBounds({ data, nodeCount: 1 }), /coordinates/);
  }
  const data = new Float32Array([0, 0, 0, -1, 1, 1, 1, 65536]);
  assert.throws(() => packGpuChildBounds({ data, nodeCount: 1 }), /indices/);
});
