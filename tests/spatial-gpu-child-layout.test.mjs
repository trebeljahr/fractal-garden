import assert from "node:assert/strict";
import test from "node:test";
import { require, specs } from "./helpers/spatial-gpu-fixtures.mjs";

const { buildGpuShape, packOrderedChildren } = require("../../utils/spatialGpu/model.ts");

for (const spec of [...specs, { kind: "romanesco" }])
  test(`${spec.kind}/${spec.mesh ?? spec.start ?? "default"} child identifiers preserve every transform across octants`, () => {
    const shape = buildGpuShape(spec),
      packed = packOrderedChildren(shape),
      count = shape.children.length;
    for (let octant = 0; octant < 8; octant++) {
      const identifiers = new Set();
      for (let index = 0; index < count; index++) {
        const offset = (octant * count + index) * 16,
          canonical = packed[offset + 15];
        assert.ok(Number.isInteger(canonical) && canonical >= 0 && canonical < count);
        identifiers.add(canonical);
        assert.deepEqual(
          packed.slice(offset, offset + 15),
          packed.slice(canonical * 16, canonical * 16 + 15),
        );
      }
      assert.equal(identifiers.size, count);
    }
  });
