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
const { nextStepLimit, probeStepLimit } = require("../utils/deepZoom/autoSteps.ts");
const { createViewport } = require("../utils/deepZoom/math.ts");
const { MANDELBROT_PLACES } = require("../utils/escapeTimePlaces.ts");
const {
  MANDELBROT_COLORING,
  updateColoring,
  usesAutoSteps,
} = require("../utils/escapeTimeColoring.ts");

const measure = (center, zoomSize, colorDensity = 1, width = 960, height = 600) =>
  probeStepLimit({ view: createViewport(center, zoomSize), width, height, colorDensity });
const place = (id) => MANDELBROT_PLACES.find((view) => view.id === id);

test("views without noise keep the 150 step minimum", () => {
  assert.equal(measure(place("whole").center, place("whole").zoomSize), 150);
  assert.equal(measure(place("mini").center, place("mini").zoomSize), 150);
});

test("sharper screens keep the opening view cheap", () => {
  const { center, zoomSize } = place("whole");
  assert.equal(measure(center, zoomSize, 1, 1600, 1200), 150);
  assert.equal(measure(center, zoomSize, 1, 3024, 1964), 150);
});

test("each ordinary place opens within the hold range of its measured limit", () => {
  for (const view of MANDELBROT_PLACES.filter((entry) => !entry.preciseCenter)) {
    const measured = measure(view.center, view.zoomSize);
    assert.equal(nextStepLimit(view.iterations, measured), view.iterations, view.id);
  }
});

test("views with more slow pixels get a higher limit than the seahorse tail", () => {
  const tail = measure(place("seahorse-tail").center, place("seahorse-tail").zoomSize);
  const double = measure(place("double").center, place("double").zoomSize);
  assert.ok(double > tail);
});

test("the limit climbs with depth, so deep views do not turn black", () => {
  const { center } = place("seahorse-deep");
  assert.ok(measure(center, 2 ** -25) > 500);
  assert.ok(measure(center, 2 ** -30) > measure(center, 2 ** -13));
});

test("denser colors repeat sooner, so noise starts no later", () => {
  const { center, zoomSize } = place("double");
  assert.ok(measure(center, zoomSize, 4) <= measure(center, zoomSize, 1));
});

test("small changes hold the current limit and large ones replace it", () => {
  assert.equal(nextStepLimit(200, 238), 200);
  assert.equal(nextStepLimit(238, 168), 238);
  assert.equal(nextStepLimit(200, 300), 300);
  assert.equal(nextStepLimit(951, 200), 200);
});

test("typing a step count turns the measurement off and picking a look does not", () => {
  const auto = { ...MANDELBROT_COLORING, autoSteps: true };
  assert.equal(usesAutoSteps(auto), true);
  assert.equal(updateColoring(auto, { ...auto, iterations: 500 }).autoSteps, false);
  assert.equal(updateColoring(auto, { ...auto, colorDensity: 2 }).autoSteps, true);
  assert.equal(updateColoring(auto, { ...auto, look: "inferno" }).autoSteps, true);
});

test("only colors drawn from the escape count use the measurement", () => {
  const auto = { ...MANDELBROT_COLORING, autoSteps: true };
  assert.equal(usesAutoSteps({ ...auto, colorMode: "banded" }), true);
  assert.equal(usesAutoSteps({ ...auto, colorMode: "log" }), false);
  assert.equal(usesAutoSteps(MANDELBROT_COLORING), false);
});
