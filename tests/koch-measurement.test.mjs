import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import ts from "typescript";

const require = createRequire(import.meta.url);
require.extensions[".ts"] = (m, f) =>
  m._compile(
    ts.transpileModule(readFileSync(f, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
      },
    }).outputText,
    f,
  );
const {
  measuredKoch,
  straightenKoch,
  kochMeasurements,
  addedKochTriangles,
  polygonArea,
} = require("../utils/lessons/kochMeasurement.ts");
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} != ${b}`);
const distance = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]);

test("straightening preserves every actual Koch segment throughout the movement", () => {
  for (const inward of [false, true])
    for (let round = 0; round <= 3; round++) {
      const original = measuredKoch(round, inward);
      assert.equal(original.length, 4 ** round + 1);
      close(original.at(-1)[0], 1);
      close(original.at(-1)[1], 0);
      for (const amount of [0, 0.25, 0.5, 0.75, 1]) {
        const moved = straightenKoch(original, amount);
        for (let i = 1; i < moved.length; i++)
          close(distance(moved[i], moved[i - 1]), distance(original[i], original[i - 1]));
        if (amount === 0)
          moved.forEach((p, i) => {
            close(p[0], original[i][0]);
            close(p[1], original[i][1]);
          });
        if (amount === 1) {
          close(moved.at(-1)[0], (4 / 3) ** round);
          close(moved.at(-1)[1], 0);
        }
      }
    }
});

test("highlighted triangles account for the measured enclosed area at each round", () => {
  for (const inward of [false, true])
    for (let round = 1; round <= 3; round++) {
      const triangles = addedKochTriangles(round, inward);
      assert.equal(triangles.length, 3 * 4 ** (round - 1));
      const area = triangles.reduce((sum, t) => sum + polygonArea(t), 0);
      close(area / (Math.sqrt(3) / 4), (1 / 3) * (4 / 9) ** (round - 1));
      const previous = kochMeasurements(round - 1, inward),
        current = kochMeasurements(round, inward);
      close(current.area - previous.area, ((inward ? -1 : 1) * area) / (Math.sqrt(3) / 4));
      close(current.length / previous.length, 4 / 3);
    }
});
