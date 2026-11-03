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
  HISTOGRAM_WIDTH,
  LongRoutes,
  NUMBERS_TO_TEST,
  paintVisits,
  PICTURE_HEIGHT,
  PICTURE_WIDTH,
  ROUTE_LIMIT,
  RouteRun,
  routeBand,
  routeLength,
  routeVisits,
  traceRoute,
  visitBin,
  visitLight,
  visitOpacity,
} = require("../utils/lessons/buddhabrotAccumulation.ts");
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

test("only escaped routes contribute, and only positions before they leave", () => {
  const escaped = traceRoute({ x: 0.3, y: 0.6 });
  assert.equal(escaped.escaped, true);
  const still = [traceRoute({ x: 0, y: 0 }), traceRoute({ x: -1, y: 0 })];
  assert.equal(accumulateOrbits(still).visits, 0);
  const last = escaped.points.at(-1);
  assert.ok(last.x ** 2 + last.y ** 2 > 4);
  const single = accumulateOrbits([escaped]);
  const expected = routeVisits(escaped).filter((p) => visitBin(p) >= 0).length;
  assert.equal(expected <= escaped.points.length - 1, true);
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

test("each recorded position maps to one square of the upright picture", () => {
  // Real numbers run down and imaginary numbers run across, as in the explorer.
  assert.equal(visitBin({ x: -2, y: -1.3 }), 0);
  assert.equal(visitBin({ x: -2, y: 0 }), 26);
  assert.equal(visitBin({ x: 0, y: 0 }), 40 * HISTOGRAM_WIDTH + 26);
  assert.equal(visitBin({ x: 1, y: 0 }), -1);
  assert.equal(visitBin({ x: 0, y: 1.3 }), -1);
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
  assert.equal(cells[40 * HISTOGRAM_WIDTH + 26], 2);
});

test("fixed exposure never dims a pixel when more visits are added", () => {
  assert.equal(visitOpacity(0), 0);
  assert.equal(visitLight(0), 0);
  for (let n = 1; n < 100; n++) {
    assert.ok(visitOpacity(n) >= visitOpacity(n - 1));
    assert.ok(visitOpacity(n) <= 1);
    assert.ok(visitLight(n * 100) > visitLight((n - 1) * 100));
    assert.ok(visitLight(n * 100) <= 1);
  }
  // At the end of a full run this matches the explorer at exposure 0.45, with one sample per pair.
  const count = 500;
  const pixelArea = (1 / 200) ** 2;
  const density = (count * 8) / ((NUMBERS_TO_TEST / 2) * pixelArea);
  assert.ok(Math.abs(visitLight(count) - (1 - Math.exp(-0.25 * 0.45 * density))) < 1e-12);
});

test("a route's length agrees with its full trace, with or without the shortcuts", () => {
  let seed = 7;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let i = 0; i < 4000; i++) {
    const c = { x: -2 + 2.6 * random(), y: 1.2 * random() };
    const route = traceRoute(c);
    assert.equal(routeLength(c.x, c.y), route.escaped ? route.points.length : 0, `${c.x} ${c.y}`);
  }
  assert.equal(routeLength(-0.75, 0.01), 315);
  assert.equal(routeBand(20), 0);
  assert.equal(routeBand(21), 1);
  assert.equal(routeBand(200), 1);
  assert.equal(routeBand(201), 2);
  assert.equal(routeBand(ROUTE_LIMIT), 2);
});

test("recording a route adds exactly its own visits, and a route that stays adds nothing", () => {
  const run = new RouteRun();
  assert.equal(run.addRoute({ x: 0, y: 0 }, traceRoute({ x: 0, y: 0 })), 0);
  assert.equal(run.addRoute({ x: -1, y: 0 }, traceRoute({ x: -1, y: 0 })), 0);
  assert.deepEqual(run.tally(null), { routes: 0, dots: 0 });
  assert.equal(
    run.visits.flatMap((counts) => Array.from(counts)).reduce((a, b) => a + b),
    0,
  );
  const c = { x: 0.3, y: 0.6 };
  const route = traceRoute(c);
  const expected = accumulateOrbits([route]).visits;
  assert.equal(run.addRoute(c, route), expected);
  assert.equal(run.addRoute(c, route), expected);
  assert.deepEqual(run.tally(null), { routes: 2, dots: 2 * expected });
  assert.equal(
    run.visits[routeBand(route.points.length)].reduce((a, b) => a + b),
    2 * expected,
  );
});

test("a run is repeatable, counts what it paints, and keeps its bands apart", () => {
  const first = new RouteRun();
  const second = new RouteRun();
  first.testPairs(20_000);
  second.testPairs(5_000);
  second.testPairs(15_000);
  assert.equal(first.tested, 40_000);
  assert.deepEqual(first.routes, second.routes);
  assert.deepEqual(first.dots, second.dots);
  first.visits.forEach((counts, band) => {
    assert.equal(
      counts.reduce((a, b) => a + b),
      first.dots[band],
    );
    // Mirror-image numbers follow mirror-image routes.
    for (let row = 0; row < PICTURE_HEIGHT; row += 37)
      for (let column = 0; column < PICTURE_WIDTH; column += 11)
        assert.equal(
          counts[row * PICTURE_WIDTH + column],
          counts[row * PICTURE_WIDTH + PICTURE_WIDTH - 1 - column],
        );
  });
  const pixels = new Uint32Array(PICTURE_WIDTH * PICTURE_HEIGHT);
  paintVisits(pixels, first, null);
  const before = pixels.map((pixel) => pixel & 255);
  first.testPairs(20_000);
  paintVisits(pixels, first, null);
  pixels.forEach((pixel, index) => {
    if ((pixel & 255) < before[index]) assert.fail(`pixel ${index} dimmed`);
  });
});

test("the first step of a long route is its own number and the second squares and adds", () => {
  const routes = new LongRoutes();
  routes.find(4000);
  assert.ok(routes.found > 0);
  for (let i = 0; i < routes.found; i++) {
    const x = routes.numbers[i * 2];
    const y = routes.numbers[i * 2 + 1];
    assert.ok(routeLength(x, y) > 200);
    const [one, two] = traceRoute({ x, y }).points;
    assert.deepEqual(one, { x, y });
    assert.deepEqual(two, { x: x * x - y * y + x, y: 2 * x * y + y });
  }
  const counts = new Uint32Array(PICTURE_WIDTH * PICTURE_HEIGHT);
  routes.stepCounts(1, counts);
  const x = routes.numbers[0];
  const y = routes.numbers[1];
  const row = Math.floor((x + 2) * 200);
  const column = Math.floor((y + 1.3) * 200);
  assert.ok(counts[row * PICTURE_WIDTH + column] >= 1);
  assert.ok(counts[row * PICTURE_WIDTH + PICTURE_WIDTH - 1 - column] >= 1);
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
