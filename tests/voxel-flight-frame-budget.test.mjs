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
const { createFlightFrameBudget, MAX_FLIGHT_PIXELS } = require("../utils/voxelZoom/frameBudget.ts");

test("rendered frame cost reduces work, then recovers slowly without pumping", () => {
  const budget = createFlightFrameBudget();
  budget.sample(33, MAX_FLIGHT_PIXELS);
  assert.equal(budget.pixels, MAX_FLIGHT_PIXELS, "one missed refresh is tolerated");
  budget.sample(33, MAX_FLIGHT_PIXELS);
  const reduced = budget.pixels;
  assert.ok(reduced < MAX_FLIGHT_PIXELS * 0.6);
  for (let frame = 0; frame < 50; frame++) budget.sample(1000 / 60, reduced);
  assert.equal(budget.pixels, reduced);
  for (let frame = 0; frame < 15; frame++) budget.sample(1000 / 60, reduced);
  assert.equal(budget.pixels, reduced * 1.1);
  for (let frame = 0; frame < 100; frame++) budget.sample(20, reduced);
  assert.equal(budget.pixels, reduced * 1.1, "borderline cadence does not cause pumping");
});

test("a long stall cuts the actual rendered workload, including small displays", () => {
  const budget = createFlightFrameBudget();
  budget.sample(100, 800_000);
  assert.equal(budget.pixels, 200_000);
  for (let frame = 0; frame < 10; frame++) budget.sample(500, 200_000);
  assert.equal(budget.pixels, 160_000);
});

test("idle time cannot accumulate recovery or join unrelated slow frames", () => {
  const budget = createFlightFrameBudget();
  budget.sample(100, MAX_FLIGHT_PIXELS);
  const reduced = budget.pixels;
  for (let frame = 0; frame < 50; frame++) budget.sample(1000 / 60, reduced);
  budget.pause();
  for (let frame = 0; frame < 20; frame++) budget.sample(1000 / 60, reduced);
  assert.equal(budget.pixels, reduced);
  budget.sample(33, reduced);
  budget.pause();
  budget.sample(33, reduced);
  assert.equal(budget.pixels, reduced);
  for (const invalid of [NaN, Infinity, -1, 0]) budget.sample(invalid, reduced);
  assert.equal(budget.pixels, reduced);
});
