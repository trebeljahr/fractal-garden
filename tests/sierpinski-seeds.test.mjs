import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import ts from "typescript";

const require = createRequire(import.meta.url);
require.extensions[".ts"] = (m, f) =>
  m._compile(
    ts.transpileModule(readFileSync(f, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText,
    f,
  );
const {
  sierpinskiSeedCopies,
  seedPointInCopy,
  SEED_ANCHORS,
  MAX_SEED_STEP,
} = require("../utils/lessons/sierpinskiSeeds.ts");
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-12, `${a} != ${b}`);

test("the first step moves each seed point halfway to the three fixed corners", () => {
  const p = [0.17, 0.68],
    copies = sierpinskiSeedCopies(1);
  copies.forEach((copy, i) => {
    const q = seedPointInCopy(p, copy);
    near(q[0], (p[0] + SEED_ANCHORS[i][0]) / 2);
    near(q[1], (p[1] + SEED_ANCHORS[i][1]) / 2);
  });
});
test("different starting drawings use the same placements and lose seed displacement exponentially", () => {
  const a = [-3, 4],
    b = [7, -2],
    initial = Math.hypot(a[0] - b[0], a[1] - b[1]);
  for (let n = 0; n <= MAX_SEED_STEP; n++) {
    const copies = sierpinskiSeedCopies(n);
    assert.equal(copies.length, 3 ** n);
    for (const copy of copies) {
      const p = seedPointInCopy(a, copy),
        q = seedPointInCopy(b, copy);
      near(Math.hypot(p[0] - q[0], p[1] - q[1]), initial / 2 ** n);
    }
  }
});
test("finite seed copies retain detail and keep the fixed triangle invariant", () => {
  for (let n = 0; n <= MAX_SEED_STEP; n++) {
    const copies = sierpinskiSeedCopies(n);
    for (const copy of copies) {
      assert.ok(copy.scale > 0);
      for (const point of SEED_ANCHORS) {
        const [x, y] = seedPointInCopy(point, copy);
        assert.ok(x >= -1e-12 && x <= 1 + 1e-12 && y >= -1e-12 && y <= Math.sqrt(3) / 2 + 1e-12);
      }
    }
    for (const corner of SEED_ANCHORS)
      assert.ok(
        copies.some((copy) =>
          SEED_ANCHORS.some((p) => {
            const q = seedPointInCopy(p, copy);
            return Math.hypot(q[0] - corner[0], q[1] - corner[1]) < 1e-12;
          }),
        ),
      );
  }
});
test("invalid and excessive steps cannot allocate an unbounded number of copies", () => {
  for (const n of [-1, 0.5, NaN, Infinity, MAX_SEED_STEP + 1])
    assert.throws(() => sierpinskiSeedCopies(n));
});
