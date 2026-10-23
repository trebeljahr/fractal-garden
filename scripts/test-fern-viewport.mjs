import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import ts from "typescript";

const require = createRequire(import.meta.url);
require.extensions[".ts"] = (module, filename) => {
  module._compile(
    ts.transpileModule(readFileSync(filename, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText,
    filename,
  );
};
const { createViewport, createViewportAtLog } = require("../utils/deepZoom/math.ts");
const { FERN_PRESETS } = require("../utils/fernPresets.ts");
const {
  createFernWalker,
  fernBounds,
  fernOpeningSpan,
  fernGeneration,
} = require("../utils/fernViewport.ts");

function render(matrix, view, method, limit = 2_000_000) {
  const walker = createFernWalker(matrix, view, 800, 600, method);
  let count = 0;
  for (let n = 0; n < limit; n += 4000) {
    const points = walker.step(4000);
    assert(points.every(Number.isFinite));
    count += points.length / 2;
    if (!walker.pending) return { walker, count };
  }
  assert.fail(
    `${method} exceeded traversal budget: ${walker.visited} visits, ${walker.pending} pending`,
  );
}

test("all preset enclosures contain every transformed corner", () => {
  for (const { matrix } of Object.values(FERN_PRESETS)) {
    const box = fernBounds(matrix);
    for (const [a, b, c, d, e, f] of matrix)
      for (const sx of [-1, 1])
        for (const sy of [-1, 1]) {
          const x = box.x + sx * box.rx,
            y = box.y + sy * box.ry;
          assert(Math.abs(a * x + b * y + e - box.x) <= box.rx + 1e-10);
          assert(Math.abs(c * x + d * y + f - box.y) <= box.ry + 1e-10);
        }
  }
});

test("both methods draw every style and finish visible traversal", () => {
  for (const [name, { matrix }] of Object.entries(FERN_PRESETS)) {
    const b = fernBounds(matrix);
    const view = createViewport([b.x, b.y], fernOpeningSpan(b, 800, 600));
    for (const method of ["chaos", "deterministic"]) {
      const { walker, count } = render(matrix, view, method);
      console.log(name, method, walker.visited, count);
      assert(count > 1000, `${name} ${method}: missing fern`);
    }
  }
});

test("singular stem survives deep zoom beyond double precision and float exponent range", () => {
  for (const log of [-60, -1000, -2000]) {
    const matrix = FERN_PRESETS.barnsley.matrix;
    // (0, 1) lies on f1(F), whose image covers the continuous stem interval.
    const view = createViewportAtLog([0, 1], log);
    for (const method of ["chaos", "deterministic"]) {
      const { walker, count } = render(matrix, view, method);
      console.log(log, method, walker.visited, count);
      assert(count > 0, `${log} ${method}: lost stem`);
      if (method === "chaos") {
        assert(walker.step(4000).length > 0, "refinement must add new visible dots");
      }
    }
  }
});

test("a viewport outside the attractor finishes empty", () => {
  for (const method of ["chaos", "deterministic"]) {
    const { count, walker } = render(
      FERN_PRESETS.barnsley.matrix,
      createViewport([100, 100], 0.001),
      method,
    );
    assert.equal(count, 0);
    assert.equal(walker.pending, 0);
  }
});

test("deterministic levels replace the prior set, retaining all four map addresses", () => {
  const matrix = FERN_PRESETS.barnsley.matrix;
  assert.deepEqual(fernGeneration(matrix, 0), [{ x: 0, y: 0 }]);
  assert.deepEqual(fernGeneration(matrix, 1), [
    { x: 0, y: 0 },
    { x: 0, y: 1.6 },
    { x: 0, y: 1.6 },
    { x: 0, y: 0.44 },
  ]);
  assert.equal(fernGeneration(matrix, 8).length, 65536);
});

test("deep off-axis leaflets retain new geometry with exact rational camera centers", () => {
  for (const log of [-60, -2000]) {
    const matrix = FERN_PRESETS.barnsley.matrix;
    const view = createViewportAtLog([0, 0], log);
    const one = BigInt(1) << BigInt(view.bits);
    // f3 applied to the exact fixed point (640/241, 2400/241) of f2.
    view.x = (-BigInt(496) * one) / BigInt(241);
    view.y = (BigInt(5304) * one) / BigInt(1205);
    for (const method of ["chaos", "deterministic"]) {
      const { count, walker } = render(matrix, view, method);
      console.log("leaflet", log, method, walker.visited, count);
      assert(count > 0);
    }
  }
});
