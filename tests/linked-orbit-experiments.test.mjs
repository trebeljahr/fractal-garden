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
  accumulateOrbits,
  visitBin,
  visitOpacity,
} = require("../utils/lessons/buddhabrotAccumulation.ts");
const { histogramOrbit } = require("../utils/lessons/specialLessons.ts");
const { juliaExplorerLink } = require("../utils/lessons/linkedJulia.ts");
const { decodeView, restoreConfig } = require("../utils/explorerShare.ts");
const { traceTeachingOrbit, traceUntilLoop } = require("../utils/orbitLesson.ts");

test("linked Julia routes end when they land back on an earlier point", () => {
  const trace = (c, start) => traceUntilLoop(c, start, false, 96, 4);
  const spiral = trace({ real: -0.132, imaginary: 0.785 }, { real: 0.107, imaginary: 0.103 });
  assert.deepEqual(spiral.loop, { from: 19, period: 3 });
  assert.equal(spiral.orbit.length, 23);
  const twoJumps = trace({ real: -1, imaginary: 0 }, { real: 0.5, imaginary: 0 });
  assert.equal(twoJumps.loop.period, 2);
  // This lesson's wider circle still applies: 2 and 4 stay inside it, 16 does not.
  const zero = { real: 0, imaginary: 0 };
  const leaving = trace(zero, { real: 2, imaginary: 0 });
  assert.equal(leaving.loop, null);
  assert.equal(leaving.orbit.at(-1).iteration, 2);
});

test("only escaped routes contribute their in-window visits", () => {
  const escaped = histogramOrbit({ x: 0.3, y: 0.6 });
  assert.equal(escaped.escaped, true);
  const still = [histogramOrbit({ x: 0, y: 0 }), histogramOrbit({ x: -1, y: 0 })];
  assert.equal(accumulateOrbits(still).visits, 0);
  const single = accumulateOrbits([escaped]);
  const expected = escaped.points.filter((p) => visitBin(p) >= 0).length;
  assert.equal(single.visits, expected);
  assert.equal(
    single.cells.reduce((a, b) => a + b),
    expected,
  );
  const twice = accumulateOrbits([escaped, ...still, escaped]);
  single.cells.forEach((n, i) => {
    assert.equal(twice.cells[i], 2 * n);
  });
  assert.equal(twice.escaped, 2);
});

test("each recorded position maps to one correct pixel, with repeated visits retained", () => {
  assert.equal(visitBin({ x: -2, y: 1.5 }), 0);
  assert.equal(visitBin({ x: 0, y: 0 }), 30 * 80 + 40);
  assert.equal(visitBin({ x: 2, y: 0 }), -1);
  assert.equal(visitBin({ x: 0, y: -1.5 }), -1);
  const { cells } = accumulateOrbits([
    {
      escaped: true,
      points: [
        { x: 0, y: 0 },
        { x: 0, y: 0 },
        { x: 20, y: 0 },
      ],
    },
  ]);
  assert.equal(cells[2440], 2);
});

test("fixed exposure never dims an occupied bin when more visits are recorded", () => {
  assert.equal(visitOpacity(0), 0);
  for (let n = 1; n < 100; n++) {
    assert.ok(visitOpacity(n) >= visitOpacity(n - 1));
    assert.ok(visitOpacity(n) <= 1);
  }
});

test("displayed Julia traces square and add the chosen parameter from the chosen start", () => {
  for (const c of [
    { real: 0, imaginary: 0 },
    { real: -1, imaginary: 0 },
    { real: 0.3, imaginary: 0.6 },
    { real: -1.8, imaginary: 0.2 },
  ]) {
    for (const start of [
      { real: 0, imaginary: 0 },
      { real: 0.5, imaginary: 0 },
      { real: 1.4, imaginary: 0.8 },
    ]) {
      const orbit = traceTeachingOrbit(c, start, false, 96, 4);
      for (let i = 1; i < orbit.length; i++) {
        const p = orbit[i - 1].point,
          next = orbit[i].point;
        assert.equal(next.real, p.real * p.real - p.imaginary * p.imaginary + c.real);
        assert.equal(next.imaginary, 2 * p.real * p.imaginary + c.imaginary);
      }
    }
  }
  const zero = { real: 0, imaginary: 0 };
  assert.equal(traceTeachingOrbit(zero, { real: 1, imaginary: 0 }, false, 96, 4).length, 97);
  assert.equal(
    traceTeachingOrbit(zero, { real: 2, imaginary: 0 }, false, 96, 4).at(-1).iteration,
    2,
  );
});

test("full Julia explorer links retain off-center parameters without clipping", () => {
  const c = { real: -1.75, imaginary: 1.2 };
  const link = juliaExplorerLink(c);
  const saved = decodeView(link.slice(link.indexOf("#")), "/julia-set");
  const config = restoreConfig({ cReal: 0, cImag: 0 }, saved.parts.config, [
    { path: "cReal", kind: "number", min: -2, max: 2 },
    { path: "cImag", kind: "number", min: -2, max: 2 },
  ]);
  assert.deepEqual(config, { cReal: c.real, cImag: c.imaginary });
  // No saved camera, so the page opens at its own framing for this window size.
  assert.equal(saved.parts.viewport, undefined);
});
