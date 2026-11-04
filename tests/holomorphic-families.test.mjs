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
  COPY_GALLERY,
  FAMILY_RULES,
  familyJump,
  familyStart,
  flightView,
  MOST_ZOOMED_HALF,
  startOutcome,
  zoomViewAbout,
} = require("../utils/lessons/holomorphicFamilies.ts");

const article = readFileSync(
  new URL("../fractal-descriptions/mandelbrot.md", import.meta.url),
  "utf8",
);

test("Newton's method traps the guess 0 for z³ − 2z + 2, as the article says", () => {
  const step = (z) => z - (z ** 3 - 2 * z + 2) / (3 * z ** 2 - 2);
  assert.equal(step(0), 1);
  assert.equal(step(1), 0);
  assert.match(article, /z\^3-2z\+2/);
});

test("every listed copy has a route trapped in a repeat", () => {
  FAMILY_RULES.forEach((rule, index) => {
    for (const place of rule.places) {
      const outcome = startOutcome(index, place.at);
      assert.equal(outcome.kind, "repeat", `${rule.name} ${place.name}: ${outcome.kind}`);
    }
  });
});

test("Newton's Copy A has a repeat of 2 in its heart and 4 in its bulb, as the article says", () => {
  assert.deepEqual(startOutcome(0, FAMILY_RULES[0].places[0].at), { kind: "repeat", length: 2 });
  assert.deepEqual(startOutcome(0, { real: 0.81785, imaginary: 0.8325 }), {
    kind: "repeat",
    length: 4,
  });
});

test("Newton's other copies have repeats of their own lengths", () => {
  const lengths = FAMILY_RULES[0].places.map(({ at }) => startOutcome(0, at).length);
  assert.deepEqual(lengths, [2, 3, 3, 4, 4, 5]);
});

test("each start is a place where the rule's slope is zero", () => {
  FAMILY_RULES.forEach((rule, index) => {
    const c = rule.places[0].at;
    const { real, imaginary } = familyStart(index, c);
    const h = 1e-4;
    const moved = (dx, dy) => familyJump(index, c, real + dx, imaginary + dy);
    const at = moved(0, 0);
    const near = moved(h, 0);
    // A slope of zero moves the result far less than the step that caused it.
    assert.ok(Math.hypot(near[0] - at[0], near[1] - at[1]) / h < 0.02, rule.name);
  });
});

test("outside the copies the route ends some other way", () => {
  assert.equal(startOutcome(0, { real: 2, imaginary: 0.5 }).kind, "root");
  assert.equal(startOutcome(1, { real: 1, imaginary: 1 }).kind, "escape");
  assert.equal(startOutcome(2, { real: 1.5, imaginary: 1.5 }).kind, "escape");
  assert.equal(FAMILY_RULES.length, 3);
});

test("the gallery names real places, and the article holds each demo once", () => {
  for (const [rule, place] of COPY_GALLERY) assert.ok(FAMILY_RULES[rule].places[place]);
  for (const kind of ["family-explorer", "family-copies"])
    assert.equal(article.split(`data-lesson="${kind}"`).length, 2, kind);
  for (const removed of [
    "repeat-stretch",
    "all-repeats",
    "tiny-patch",
    "newton-copy",
    "newton-family",
  ])
    assert.ok(!article.includes(removed), removed);
});

test("zooming keeps the point under the pointer still and stops at the deepest view", () => {
  const view = { center: { real: 1, imaginary: 2 }, half: 1 };
  const at = { real: 1.5, imaginary: 1.5 };
  const next = zoomViewAbout(view, at, 0.5, 10);
  assert.equal(next.half, 0.5);
  assert.equal((at.real - next.center.real) / next.half, (at.real - view.center.real) / view.half);
  assert.equal(zoomViewAbout(view, at, 1e-9, 10).half, MOST_ZOOMED_HALF);
});

test("a flight starts and ends on its views", () => {
  const from = { center: { real: 0, imaginary: 0 }, half: 4 };
  const to = { center: { real: 1, imaginary: 1 }, half: 0.01 };
  assert.deepEqual(flightView(from, to, 0), from);
  const end = flightView(from, to, 1);
  assert.ok(Math.abs(end.half - to.half) < 1e-12 && Math.abs(end.center.real - 1) < 1e-12);
});
