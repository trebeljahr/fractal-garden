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
  ROMANESCO_LEAD,
  ROMANESCO_ROW_STEPS,
  romanescoPeak,
  romanescoRows,
  romanescoRowTurn,
} = require("../utils/lessons/romanescoRows.ts");
const {
  ROMANESCO_SURFACE_MODEL: MODEL,
  romanescoSurfaceCell,
  romanescoSurfaceField,
} = require("../utils/romanescoSurface.ts");

const local = ([x, y, z]) => [x / 1.25, (y - 0.12) / 1.25, z / 1.25];

test("each marked peak is on the surface the figure draws, at the center of its cell", () => {
  for (let index = 0; index <= 150; index += 7) {
    const point = local(romanescoPeak(index));
    assert.ok(Math.abs(romanescoSurfaceField(point, { maxRank: 1 })) < 1e-6, `field ${index}`);
    const radius = Math.exp(-index * MODEL.spiralDecay);
    const angle = index * MODEL.tau * MODEL.goldenTurn;
    const [x, y] = romanescoSurfaceCell(radius, angle);
    assert.ok(Math.hypot(x, y) < 1e-6, `cell ${index}`);
  }
});

test("a peak's six neighboring cells are the peaks 8, 13 and 21 steps away", () => {
  // The lattice coordinates romanescoSurfaceCell rounds. Going once around adds (13, -8).
  const distance = (step) => {
    const a = MODEL.latticeA * step + 13 * step * MODEL.goldenTurn;
    const b = MODEL.latticeB * step - 8 * step * MODEL.goldenTurn;
    let best = Infinity;
    for (let wrap = -30; wrap <= 30; wrap++) {
      const da = a + 13 * wrap;
      const db = b - 8 * wrap;
      best = Math.min(best, da * da - da * db + db * db);
    }
    return best;
  };
  for (const step of [8, 13, 21]) assert.ok(Math.abs(distance(step) - 1) < 1e-9, `${step}`);
  for (const step of [5, 34]) assert.ok(Math.abs(distance(step) - 3) < 1e-9, `${step}`);
  for (const step of [1, 2, 3]) assert.ok(distance(step) > 3, `${step}`);
});

test("the turn left over after each row's peaks matches the readout", () => {
  const rounded = ROMANESCO_ROW_STEPS.map((step) => {
    const { turns, left } = romanescoRowTurn(step);
    return [step, turns, Math.round(left)];
  });
  assert.deepEqual(rounded, [
    [8, 3, 20],
    [13, 5, -12],
    [21, 8, 8],
  ]);
  assert.deepEqual(ROMANESCO_LEAD.readout({ rows: "13" }, 1), [
    { label: "13 × 137.5°", value: "5 turns − 12°" },
  ]);
  assert.deepEqual(ROMANESCO_LEAD.readout({ rows: "none" }, 1), []);
});

test("from above there are as many rows as the step, and 8 and 21 wind against 13", () => {
  const view = { rotationX: 90, rotationY: 0, cameraDistance: 6 };
  const center = [500, 400];
  const winding = (step) => {
    const rows = romanescoRows(step, view, 1000, 800);
    assert.equal(rows.length, step);
    let sign = 0;
    for (const lines of rows) {
      assert.equal(lines.length, 1, "from above no peak is hidden");
      const line = lines[0];
      assert.ok(line.length > 1);
      for (let i = 1; i < line.length; i++) {
        const [ax, ay] = [line[i - 1][0] - center[0], line[i - 1][1] - center[1]];
        const [bx, by] = [line[i][0] - center[0], line[i][1] - center[1]];
        const turn = Math.sign(ax * by - ay * bx);
        assert.ok(sign === 0 || turn === sign, "a row keeps winding one way");
        sign = turn;
        assert.ok(Math.hypot(bx, by) < Math.hypot(ax, ay), "each peak is closer to the tip");
      }
    }
    return sign;
  };
  assert.equal(winding(8), winding(21));
  assert.equal(winding(13), -winding(8));
});

test("from the side, rows keep to the near half of the cone", () => {
  const rows = romanescoRows(13, { rotationX: 0, rotationY: 0, cameraDistance: 6 }, 800, 800);
  const points = rows.flat(2);
  assert.ok(points.length > 0);
  assert.ok(points.length < rows.length * 12, "about half of the peaks are out of sight");
});
