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
  BLACK_AND_WHITE,
  colorKeyGradient,
  colorRepeatSteps,
  escapeStepColor,
  STEP_LIMIT_VIEWS,
  stepStops,
} = require("../utils/lessons/stepLimit.ts");
const { JULIA_COLORING, MANDELBROT_COLORING, PALETTES } = require("../utils/escapeTimeColoring.ts");
const { traceTeachingOrbit } = require("../utils/orbitLesson.ts");

const article = (name) =>
  readFileSync(new URL(`../fractal-descriptions/${name}.md`, import.meta.url), "utf8");
const ZERO = { real: 0, imaginary: 0 };
const [juliaView] = STEP_LIMIT_VIEWS.julia;

test("slider stops rise from the minimum to the maximum and keep the steps the articles name", () => {
  const stops = stepStops(30, 5000, [50, 500]);
  assert.equal(stops[0], 30);
  assert.equal(stops.at(-1), 5000);
  assert.ok(stops.includes(50) && stops.includes(200) && stops.includes(500));
  assert.ok(stops.every((step, index) => index === 0 || step > stops[index - 1]));
  assert.ok(juliaView.stops.includes(320) && juliaView.stops.includes(650));
  assert.ok(juliaView.stops.includes(1000));
  for (const view of [...STEP_LIMIT_VIEWS.mandelbrot, ...STEP_LIMIT_VIEWS.julia]) {
    assert.ok(view.stops.includes(view.start), view.name);
    assert.ok(view.stops.every(Number.isInteger), view.name);
    // The shader's loop bound.
    assert.ok(view.stops.at(-1) <= 8192, view.name);
  }
});

test("a round black dot in the spiral looks inside at 200 steps and later escapes", () => {
  const orbit = traceTeachingOrbit({ real: -0.74523, imaginary: 0.13027 }, ZERO, false, 1000, 256);
  const { iteration, point } = orbit.at(-1);
  assert.ok(Math.hypot(point.real, point.imaginary) > 256, "escapes within 1000 steps");
  assert.ok(iteration > 200, `escapes at ${iteration}`);
});

test("the dark band in the spiral has escaped at about step 40 and is not black", () => {
  const orbit = traceTeachingOrbit({ real: -0.7443, imaginary: 0.1319 }, ZERO, false, 200, 256);
  const { iteration, point } = orbit.at(-1);
  assert.ok(Math.hypot(point.real, point.imaginary) > 256);
  assert.equal(iteration, 40);
  assert.notDeepEqual(escapeStepColor(iteration, MANDELBROT_COLORING), [0, 0, 0]);
});

test("black and white gives every escaped pixel one near-white gray over a black interior", () => {
  const { palette, colorDensity, colorOffset, interior } = BLACK_AND_WHITE;
  assert.ok(PALETTES.includes(palette));
  assert.equal(colorDensity, 0);
  // The shader takes the fractional part, so 1 would wrap around to black.
  assert.ok(colorOffset > 0.99 && colorOffset < 1);
  assert.equal(interior, "#000000");
  assert.match(article("mandelbrot"), /\*\*Black and white\*\*/);
  assert.match(article("julia-set"), /\*\*Black and white\*\*/);
});

test("the color key repeats where the article says it does", () => {
  assert.equal(colorRepeatSteps(MANDELBROT_COLORING), 40);
  assert.equal(Math.round(colorRepeatSteps(JULIA_COLORING)), 89);
  assert.deepEqual(
    escapeStepColor(30, MANDELBROT_COLORING),
    escapeStepColor(70, MANDELBROT_COLORING),
  );
  assert.match(article("mandelbrot"), /repeat every 40 steps/);
  const colors = colorKeyGradient(JULIA_COLORING).match(/rgb\([^)]*\)/g);
  assert.equal(colors.length, 33);
  assert.equal(colors[0], colors.at(-1));
});

test("the center of the Julia picture and the article agree on the slow trip past 0.5", () => {
  const orbit = traceTeachingOrbit(juliaView.c, ZERO, false, 315, 256);
  assert.equal(orbit.at(-1).iteration, 315);
  assert.ok(Math.hypot(orbit.at(-1).point.real, orbit.at(-1).point.imaginary) > 256);
  const near = orbit.filter(
    ({ point }) => Math.hypot(point.real - 0.5, point.imaginary) < 0.05,
  ).length;
  assert.equal(near, 274);
  assert.match(article("julia-set"), /274 of its 315 steps/);
});

test("the dark Julia shape barely changes to 300 steps, then mostly clears by 330", () => {
  const counts = [];
  for (let y = 0; y < 200; y++) {
    for (let x = 0; x < 300; x++) {
      const start = {
        real: ((2 * (x + 0.5) - 300) / 200) * 1.1,
        imaginary: ((200 - 2 * (y + 0.5)) / 200) * 1.1,
      };
      const orbit = traceTeachingOrbit(juliaView.c, start, false, 1000, 256);
      const end = orbit.at(-1);
      counts.push(Math.hypot(end.point.real, end.point.imaginary) > 256 ? end.iteration : Infinity);
    }
  }
  const dark = (limit) => counts.filter((count) => count > limit).length / counts.length;
  assert.ok(dark(100) - dark(300) < 0.002, `${dark(100)} to ${dark(300)}`);
  assert.ok(dark(310) > 0.4 && dark(330) < 0.06, `${dark(310)} to ${dark(330)}`);
  assert.ok(dark(600) - dark(650) > 0.02 && dark(800) - dark(1000) > 0.005);
});

test("the neck counts in the article cross the dashed circle at the stated steps", () => {
  for (const [above, steps] of [
    [0.1, 33],
    [0.01, 315],
    [0.001, 3143],
    [0.0001, 31417],
  ]) {
    const orbit = traceTeachingOrbit(
      { real: -0.75, imaginary: above },
      { real: 0, imaginary: 0 },
      false,
      steps + 1,
      2,
    );
    assert.equal(orbit.at(-1).iteration, steps, `${above} above the neck`);
    assert.match(article("mandelbrot"), new RegExp(`\\b${steps}\\b`));
  }
});

test("both articles place the lesson", () => {
  assert.match(article("mandelbrot"), /data-lesson="step-limit-mandelbrot"/);
  assert.match(article("julia-set"), /data-lesson="step-limit-julia"/);
});
