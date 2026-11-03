import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import ts from "typescript";

const require = createRequire(import.meta.url);
require.extensions[".ts"] = (module, filename) => {
  const { outputText } = ts.transpileModule(readFileSync(filename, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  });
  module._compile(outputText, filename);
};
const { lessonSegments, PATH_LESSONS } = require("../utils/lessons/pathLessons.ts");
const { GEOMETRY_LESSONS } = require("../utils/lessons/geometryLessons.ts");
const {
  histogramOrbit,
  buddhaSamples,
  bulbPower,
  bulbRoute,
  turnAroundAxis,
} = require("../utils/lessons/specialLessons.ts");
const { tribonacciWord, contractingProjection } = require("../utils/rauzy.ts");
const { generateJerusalemCube } = require("../utils/voxelFractals.ts");
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-6, `${a} != ${b}`);

test("every article has a resolved interactive teaching figure", () => {
  const known = new Set([
    ...Object.keys(PATH_LESSONS),
    ...Object.keys(GEOMETRY_LESSONS),
    "buddhabrot",
    "buddhabrot-connection",
    "rauzy",
  ]);
  for (const file of readdirSync(new URL("../fractal-descriptions", import.meta.url))) {
    const text = readFileSync(new URL(`../fractal-descriptions/${file}`, import.meta.url), "utf8");
    assert.match(
      text,
      /<figure data-(investigation|lesson|construction|construction-player|orbit|projection)=/,
      file,
    );
    for (const [, kind] of text.matchAll(/data-investigation="([^"]+)"/g))
      assert.ok(known.has(kind), `${file}: ${kind}`);
  }
});

test("all path investigations stay within an interactive geometry budget", () => {
  for (const [kind, info] of Object.entries(PATH_LESSONS))
    for (let level = 0; level <= info.max; level++) {
      const segments = lessonSegments(kind, level);
      assert.ok(segments.length < 6000, `${kind} ${level}`);
      for (const segment of segments)
        assert.ok([...segment.a, ...segment.b].every(Number.isFinite));
    }
});

test("replacement counts and endpoint lengths support the article's scaling claims", () => {
  for (const [kind, copies, span] of [
    ["board", 7, 3],
    ["crystal", 5, 3],
    ["levy-curve", 2, Math.SQRT2],
    ["minkowski-sausage", 8, 4],
    ["terdragon", 3, Math.sqrt(3)],
  ]) {
    const s = lessonSegments(kind, 1);
    // Board and Crystal begin on all four sides of a square.
    const first = kind === "board" || kind === "crystal" ? s.slice(0, copies) : s;
    assert.equal(first.length, copies);
    close(Math.hypot(...first.at(-1).b.map((v, i) => v - first[0].a[i])), span);
  }
  assert.equal(lessonSegments("fern-3", 1).length, 9);
  assert.equal(lessonSegments("quadratic-koch-island", 1).length, 4 * 18);
  for (const angle of [60, 75, 85, 89]) {
    const first = lessonSegments("cesaro-fractal", 1, angle).slice(0, 4);
    close(
      Math.hypot(first.at(-1).b[0] - first[0].a[0], first.at(-1).b[1] - first[0].a[1]),
      2 * (1 + Math.cos((angle * Math.PI) / 180)),
    );
  }
});

test("twindragon halves exchange endpoints, and 3D Hilbert steps join face neighbors", () => {
  for (let level = 1; level <= 7; level++) {
    const s = lessonSegments("twindragon", level),
      first = s.filter((s) => s.group === 0),
      second = s.filter((s) => s.group === 1);
    assert.equal(first.length, 2 ** level);
    assert.equal(second.length, 2 ** level);
    first[0].a.forEach((n, i) => {
      close(n, second.at(-1).b[i]);
    });
    first.at(-1).b.forEach((n, i) => {
      close(n, second[0].a[i]);
    });
  }
  for (let order = 1; order <= 3; order++) {
    const s = lessonSegments("hilbert-curve-3d", order);
    assert.equal(s.length, 8 ** order - 1);
    const points = [s[0].a, ...s.map((s) => s.b)];
    assert.equal(new Set(points.map((p) => p.join(","))).size, 8 ** order);
    for (const { a, b } of s)
      close(
        a.reduce((sum, n, i) => sum + Math.abs(n - b[i]), 0),
        1,
      );
  }
});

test("Buddhabrot includes only escaped traces and uses repeatable sampling", () => {
  assert.equal(histogramOrbit({ x: 0, y: 0 }).escaped, false);
  assert.equal(histogramOrbit({ x: -1, y: 0 }).escaped, false);
  const orbit = histogramOrbit({ x: 0.3, y: 0.6 });
  assert.equal(orbit.escaped, true);
  let previous = { x: 0, y: 0 };
  for (const point of orbit.points) {
    close(point.x, previous.x ** 2 - previous.y ** 2 + 0.3);
    close(point.y, 2 * previous.x * previous.y + 0.6);
    previous = point;
  }
  assert.deepEqual(buddhaSamples(100), buddhaSamples(100));
  assert.ok(buddhaSamples(100).some((orbit) => orbit.escaped));
});

test("spherical powers preserve the raised radius and collapse all directions at zero", () => {
  for (const radius of [0, 0.9, 1, 1.2])
    for (const power of [2, 8, 10])
      for (const theta of [0.3, 1.1, 2.4])
        close(Math.hypot(...bulbPower(radius, theta, 0.6, power)), radius ** power);
});

test("the bulb repeats one fewer time than its power, because a turned point's route turns too", () => {
  const sameRoute = (a, b) =>
    a.length === b.length &&
    a.every((point, jump) => Math.hypot(...point.map((v, i) => v - b[jump][i])) < 1e-6);
  for (const power of [3, 4, 5, 6, 8, 9, 10]) {
    for (const start of [
      [0.74, 0.42, 0],
      [0.31, -0.62, 0.25],
      [-0.2, 0.5, -0.5],
    ]) {
      const route = bulbRoute(start, power, 4);
      const turned = bulbRoute(turnAroundAxis(start, 1 / (power - 1)), power, 4);
      assert.ok(
        sameRoute(
          route.map((point) => turnAroundAxis(point, 1 / (power - 1))),
          turned,
        ),
        `power ${power}`,
      );
      const wrong = bulbRoute(turnAroundAxis(start, 1 / power), power, 4);
      assert.ok(
        !sameRoute(
          route.map((point) => turnAroundAxis(point, 1 / power)),
          wrong,
        ),
        `power ${power} does not repeat ${power} times`,
      );
    }
  }
});

test("Rauzy prefix projections stay bounded while the word grows", () => {
  const word = tribonacciWord(12000),
    vectors = contractingProjection();
  assert.deepEqual(
    Array.from(word.slice(0, 13), (n) => n + 1),
    [1, 2, 1, 3, 1, 2, 1, 1, 2, 1, 3, 1, 2],
  );
  let x = 0,
    y = 0;
  for (const letter of word) {
    x += vectors[letter][0];
    y += vectors[letter][1];
    assert.ok(Math.hypot(x, y) < 4);
  }
});

test("Jerusalem counts follow rank refinement, not an equal-generation count", () => {
  assert.deepEqual(
    [0, 1, 2].map(
      (step) =>
        Array.from(generateJerusalemCube(step).firstChild).filter((child) => child < 0).length,
    ),
    [1, 20, 172],
  );
});
