import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import ts from "typescript";

const require = createRequire(import.meta.url);
require.extensions[".ts"] = (module, filename) => {
  const { outputText } = ts.transpileModule(readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  module._compile(outputText, filename);
};
const { createViewport, fixedToFloatExp } = require("../utils/deepZoom/math.ts");
const { buildReference, sampleEscape } = require("../utils/deepZoom/orbit.ts");
const {
  bigGosperIsland,
  gosperIsland,
  latticeCenter,
  polygonArea,
  polygonPerimeter,
  SEVEN_ISLANDS,
} = require("../utils/gosperIsland.ts");
const {
  buildStars,
  largestStarDepth,
  starLoops,
  starReach,
  touchingRatio,
} = require("../utils/starFractal.ts");
const { miraOrbit, miraStep, MIRA_PLACES } = require("../utils/miraMap.ts");
const { circleValue, ghostSpacing, paintCircles } = require("../utils/circlesAndSquares.ts");
const { PEANO_SHARED_POINTS, peanoPoint, peanoRoute } = require("../utils/lessons/peanoLesson.ts");
const { levyTapestryEdges, levyTapestrySides } = require("../utils/lessons/levyTapestry.ts");
const {
  mandelbarBodyEdge,
  mandelbarOrbit,
  mandelbrotBodyEdge,
  matchingOrbits,
  rotatePoint,
} = require("../utils/lessons/mandelbarLesson.ts");
const {
  traceBarnsleyTreeOrbit,
  traceCactusOrbit,
  traceMandelbarOrbit,
} = require("../utils/orbitLesson.ts");

const close = (a, b, tolerance = 1e-9) =>
  assert.ok(Math.abs(a - b) < tolerance, `${a} is not close to ${b}`);
const fromExp = ([mantissa, exponent]) => mantissa * 2 ** exponent;

test("Mandelbar reference orbits flip the point before squaring", () => {
  const c = [-1.1, 0.25];
  const reference = buildReference(createViewport(c, 1), "mandelbar", [0, 0], 6);
  let x = 0;
  let y = 0;
  for (let i = 1; i < reference.length; i++) {
    const next = x * x - y * y + c[0];
    y = -2 * x * y + c[1];
    x = next;
    close(reference.orbit[i * 4] * 2 ** reference.orbit[i * 4 + 1], x, 1e-5);
    close(reference.orbit[i * 4 + 2] * 2 ** reference.orbit[i * 4 + 3], y, 1e-5);
  }
});

test("Cactus orbits start at the pixel and match the published recurrence", () => {
  const c = [0.1, 0.3];
  const reference = buildReference(createViewport(c, 1), "cactus", [0, 0], 8);
  close(reference.orbit[0] * 2 ** reference.orbit[1], c[0], 1e-6);
  close(reference.orbit[2] * 2 ** reference.orbit[3], c[1], 1e-6);
  assert.ok(reference.critical, "a second orbit from zero lets a pixel rebase");
  assert.equal(reference.critical.orbit[0], 0);
  assert.equal(reference.critical.orbit[2], 0);

  const expected = traceCactusOrbit({ real: c[0], imaginary: c[1] }, 8);
  for (const { iteration, point } of expected) {
    if (iteration >= reference.length) break;
    close(
      reference.orbit[iteration * 4] * 2 ** reference.orbit[iteration * 4 + 1],
      point.real,
      1e-5,
    );
    close(
      reference.orbit[iteration * 4 + 2] * 2 ** reference.orbit[iteration * 4 + 3],
      point.imaginary,
      1e-5,
    );
  }
  // The published form and the factored form used in the code agree.
  const x = c[0];
  const y = c[1];
  const square = (a, b) => [a * a - b * b, 2 * a * b];
  const [x2, y2] = square(x, y);
  const cubeX = x2 * x - y2 * y;
  const cubeY = x2 * y + y2 * x;
  const nextX = cubeX + (c[0] - 1) * x - c[1] * y - c[0];
  const nextY = cubeY + (c[0] - 1) * y + c[1] * x - c[1];
  close(reference.orbit[4] * 2 ** reference.orbit[5], nextX, 1e-5);
  close(reference.orbit[6] * 2 ** reference.orbit[7], nextY, 1e-5);
});

test("pixel samples agree with the teaching orbits for the new formulas", () => {
  const cactus = sampleEscape(createViewport([1.2, 0.4], 1), "cactus", [0, 0], 64);
  assert.equal(cactus.escaped, true);
  const body = sampleEscape(createViewport([0.15, 0], 1), "cactus", [0, 0], 400);
  assert.equal(body.escaped, false);
  const bar = sampleEscape(createViewport([0.1, 0.1], 1), "mandelbar", [0, 0], 400);
  assert.equal(bar.escaped, false);
  const outside = sampleEscape(createViewport([1.5, 1.5], 1), "mandelbar", [0, 0], 400);
  assert.equal(outside.escaped, true);
  assert.equal(fromExp(fixedToFloatExp(BigInt(0), 64)), 0);
});

test("the two cactus bodies meet at zero: one settles, the other alternates", () => {
  const settle = (c) => traceCactusOrbit({ real: c, imaginary: 0 }, 2000);
  const right = settle(0.15);
  const left = settle(-0.2);
  const last = (orbit, back) => orbit[orbit.length - 1 - back].point.real;
  close(last(right, 0), last(right, 1), 1e-6);
  assert.ok(Math.abs(last(left, 0) - last(left, 1)) > 0.5);
  close(last(left, 0), last(left, 2), 1e-6);
});

test("Barnsley's tree moves a point toward the axis, then multiplies by c", () => {
  const orbit = traceBarnsleyTreeOrbit(
    { real: 0.6, imaginary: 1.1 },
    { real: 0.5, imaginary: 0.5 },
    2,
  );
  close(orbit[1].folded.real, -0.5);
  close(orbit[1].point.real, 0.6 * -0.5 - 1.1 * 0.5);
  close(orbit[1].point.imaginary, 0.6 * 0.5 + 1.1 * -0.5);
});

test("a Mandelbar route mirrors the point before each square", () => {
  const orbit = traceMandelbarOrbit({ real: 0.1, imaginary: 0.2 }, 3);
  close(orbit[1].point.real, 0.1);
  close(orbit[2].folded.imaginary, -0.2);
  close(orbit[2].point.imaginary, 2 * 0.1 * -0.2 + 0.2);
});

test("rotating c turns the whole Mandelbar route by the same angle", () => {
  for (const power of [2, 3, 4]) {
    const c = { x: -0.4, y: 0.3 };
    const [first, second] = matchingOrbits(c, power, 8);
    second.forEach((point, index) => {
      const turned = rotatePoint(first[index], 1 / (power + 1));
      close(point.x, turned.x);
      close(point.y, turned.y);
    });
  }
});

test("the body's edge is one sign away from the cardioid and has three sharp points", () => {
  const cusp = mandelbarBodyEdge(Math.PI);
  close(cusp.x, -0.75);
  close(cusp.y, 0);
  const turned = rotatePoint(mandelbarBodyEdge(Math.PI), 1 / 3);
  const other = mandelbarBodyEdge(Math.PI / 3);
  close(turned.x, other.x);
  close(Math.abs(turned.y), Math.abs(other.y));
  const barEdge = mandelbarBodyEdge(1);
  const brotEdge = mandelbrotBodyEdge(1);
  close(barEdge.x, brotEdge.x);
  close(barEdge.y - brotEdge.y, Math.sin(2) / 2);
  // A pixel inside the edge settles on one point; outside it does not.
  const settled = mandelbarOrbit({ x: 0.2, y: 0 }, 2, 400);
  close(settled.at(-1).x, settled.at(-2).x, 1e-6);
});

test("every Gosper bend keeps the island's area and lengthens its coast", () => {
  const hexagon = gosperIsland(0);
  for (let round = 1; round <= 5; round++) {
    const island = gosperIsland(round);
    assert.equal(island.length, 6 * 3 ** round);
    close(polygonArea(island), polygonArea(hexagon));
    close(polygonPerimeter(island), polygonPerimeter(hexagon) * (3 / Math.sqrt(7)) ** round);
  }
});

test("the outline of seven islands is one island a round further along", () => {
  for (const round of [0, 1, 2, 3]) {
    const small = gosperIsland(round);
    const walls = new Set();
    const key = (x, y) => `${Math.round(x * 1e6)},${Math.round(y * 1e6)}`;
    for (const [a, b] of SEVEN_ISLANDS) {
      const [dx, dy] = latticeCenter(a, b);
      for (const [x, y] of small) walls.add(key(x + dx, y + dy));
    }
    for (const [x, y] of bigGosperIsland(round))
      assert.ok(walls.has(key(x, y)), `${round}: ${x},${y}`);
  }
});

test("star fractals touch at the N-flake ratio and draw whole star loops", () => {
  close(touchingRatio(5), (3 - Math.sqrt(5)) / 2);
  close(touchingRatio(6), 1 / 3);
  assert.equal(starLoops({ points: 5, skip: 2 }).length, 1);
  assert.deepEqual(starLoops({ points: 5, skip: 2 })[0], [0, 2, 4, 1, 3]);
  assert.equal(starLoops({ points: 6, skip: 2 }).length, 2);
  const settings = { points: 5, skip: 2, ratio: touchingRatio(5), offset: 1, rotation: 0 };
  assert.equal(buildStars(settings, 3).length, 1 + 5 + 25 + 125);
  close(starReach(settings, 1), 1 + settings.ratio);
  assert.ok(5 ** largestStarDepth(5) <= 120000);
});

test("the Mira map multiplies every small area by exactly b", () => {
  const settings = { a: 0.7, b: 0.9998, x0: 0, y0: 0 };
  const h = 1e-5;
  for (const [x, y] of [
    [9, 0],
    [1.5, -3],
    [-4, 7],
  ]) {
    const [px1, py1] = miraStep(settings, x + h, y);
    const [px0, py0] = miraStep(settings, x - h, y);
    const [qx1, qy1] = miraStep(settings, x, y + h);
    const [qx0, qy0] = miraStep(settings, x, y - h);
    const determinant =
      (((px1 - px0) / (2 * h)) * (qy1 - qy0)) / (2 * h) -
      (((qx1 - qx0) / (2 * h)) * (py1 - py0)) / (2 * h);
    close(determinant, settings.b, 1e-5);
  }
  assert.equal(miraOrbit(MIRA_PLACES[0].settings, 1000).length, 2000);
});

test("Mira's slightly shrinking orbits end far inside where they started", () => {
  const orbit = miraOrbit({ a: 0.7, b: 0.9998, x0: 12.1, y0: 0 }, 400000);
  const size = (i) => Math.hypot(orbit[i * 2], orbit[i * 2 + 1]);
  let early = 0;
  for (let i = 0; i < 10000; i++) early = Math.max(early, size(i));
  let late = 0;
  for (let i = 390000; i < 400000; i++) late = Math.max(late, size(i));
  assert.ok(early > 10);
  assert.ok(late < early / 2, `${late} vs ${early}`);
});

test("every ghost center is an exact copy of the real one", () => {
  const modulus = 2;
  const step = Math.sqrt(2 / 48);
  assert.equal(Math.round(ghostSpacing(step, modulus)), 24);
  const shift = 24;
  const reference = circleValue(shift * step, 0, modulus, 1);
  for (const [i, j] of [
    [1, 0],
    [3, 4],
    [-7, 11],
  ]) {
    const here = circleValue(i * step, j * step, modulus, 1);
    const there = circleValue((shift + i) * step, j * step, modulus, 1);
    const difference = (there - here - reference + 2) % 1;
    assert.ok(Math.min(difference, 1 - difference) < 1e-9, `${i},${j}`);
  }
});

test("step sizes with the same step squared over m modulo 1 draw the same dots", () => {
  const paint = (step) => {
    const pixels = new Uint32Array(64 * 64);
    paintCircles(
      pixels,
      64,
      64,
      1,
      { step, modulus: 2, squarings: 1, centerX: 0, centerY: 0 },
      { background: "#000000", color: "#ffffff", bands: "two" },
    );
    return pixels;
  };
  // step^2 / 2 goes from 1/32 to 1 + 1/32. Only small rounding near band edges may differ.
  const first = paint(Math.sqrt(2 / 32));
  const second = paint(Math.sqrt(2 * (1 + 1 / 32)));
  let different = 0;
  first.forEach((value, index) => {
    if (value !== second[index]) different++;
  });
  assert.ok(different <= 4, `${different} pixels differ`);
});

test("the digit rule follows the drawn route and returns to shared points", () => {
  const round = 3;
  const route = peanoRoute(round);
  const cells = 3 ** round;
  const count = route.length;
  assert.equal(count, cells * cells);
  route.forEach(([x, y], index) => {
    const [px, py] = peanoPoint((index + 0.5) / count);
    assert.ok(Math.abs(px - x) <= 0.5 / cells + 1e-9, `x at ${index}`);
    assert.ok(Math.abs(py - y) <= 0.5 / cells + 1e-9, `y at ${index}`);
  });
  close(peanoPoint(0)[0], 0);
  close(peanoPoint(0.5)[0], 0.5);
  close(peanoPoint(0.5)[1], 0.5);
  for (const { positions } of PEANO_SHARED_POINTS) {
    const [x, y] = peanoPoint(positions[0]);
    for (const position of positions.slice(1)) {
      const [px, py] = peanoPoint(position);
      close(px, x, 1e-6);
      close(py, y, 1e-6);
    }
  }
});

test("four Lévy curves leave the middle of their square empty", () => {
  const side = levyTapestrySides(0)[0];
  assert.deepEqual([side[0], side[1], side[2], side[3]], [0, 0, 1, 0]);
  for (const round of [2, 8, 14]) {
    const sides = levyTapestrySides(round);
    const scale = 2 ** (round / 2);
    // In units of the square's side, centered on the square.
    let nearest = Infinity;
    for (const curve of sides)
      for (let i = 0; i < curve.length; i += 2) {
        const x = curve[i] / scale - 0.5;
        const y = curve[i + 1] / scale - 0.5;
        nearest = Math.min(nearest, Math.max(Math.abs(x), Math.abs(y)));
      }
    assert.ok(nearest >= 0.25 - 1e-9, `round ${round}: ${nearest}`);
  }
  const { strokes, edges } = levyTapestryEdges(8);
  assert.equal(strokes, 4 * 2 ** 8);
  assert.ok(edges < strokes);
});
