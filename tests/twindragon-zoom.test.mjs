import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
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
const { expand, interpret } = require("../utils/lsystem/engine.ts");
const { fittedFrame } = require("../utils/lsystem/pageZoom.ts");
const {
  MAX_TILE_RANGE,
  TILING_PADDING,
  twindragonLevel,
  twindragonSpec,
} = require("../utils/lsystem/twindragon.ts");
const { prepareZoom } = require("../utils/lsystem/zoom.ts");
const { rewriteSentence, traceTurtle } = require("../utils/turtleCurves.ts");

const settings = {
  showTiling: false,
  firstDragon: "#ffb86b",
  secondDragon: "#c792ea",
  background: "#252424",
  lineWidth: 1.5,
};

// The first dragon and its 180° turn, the way drawTwindragon traces them.
const pagePaths = (iterations) => {
  const { points } = traceTurtle(rewriteSentence("F", { F: "F+G", G: "F-G" }, iterations), {
    turnAngle: Math.PI / 2,
    startAngle: (-iterations * Math.PI) / 4,
    drawChars: "FG",
  });
  const [endX, endY] = points[points.length - 1];
  return {
    first: points,
    second: points.map(([x, y]) => [endX - x, endY - y]),
    chord: [endX, endY],
  };
};

// Adding 0 after rounding turns -0 into 0, so both print alike.
const keyOf = (x, y) =>
  `${(Math.round(x * 1000) / 1000 + 0).toFixed(3)},${(Math.round(y * 1000) / 1000 + 0).toFixed(3)}`;
const edges = ({ positions, count }) => {
  const found = [];
  for (let i = 0; i < count; i++) {
    const o = i * 6;
    found.push(
      `${keyOf(positions[o], positions[o + 1])}>${keyOf(positions[o + 3], positions[o + 4])}`,
    );
  }
  return found;
};
const pathEdges = (points, dx = 0, dy = 0) =>
  points
    .slice(1)
    .map(([x, y], i) => `${keyOf(points[i][0] + dx, points[i][1] + dy)}>${keyOf(x + dx, y + dy)}`);

test("the zoom draws the same two dragons as the page at every level", () => {
  for (const iterations of [1, 2, 3, 6, 9]) {
    const spec = twindragonSpec({ ...settings, iterations });
    const { first, second } = pagePaths(iterations);
    const drawn = interpret(expand(spec, iterations).sentence, spec);
    assert.deepEqual(edges(drawn), [...pathEdges(first), ...pathEdges(second)]);
  }
});

test("the tiling places a copy at every lattice point, the middle tile last", () => {
  const iterations = 3;
  const spec = twindragonSpec({ ...settings, iterations, showTiling: true });
  const { first, second, chord } = pagePaths(iterations);
  const drawn = edges(interpret(expand(spec, iterations).sentence, spec));
  const tile = [...pathEdges(first), ...pathEdges(second)];
  assert.equal(drawn.length, tile.length * (2 * MAX_TILE_RANGE + 1) ** 2);
  assert.deepEqual(drawn.slice(-tile.length), tile);
  const all = new Set(drawn);
  for (const [a, b] of [
    [1, 0],
    [0, 1],
    [-1, 0],
    [0, -1],
    [MAX_TILE_RANGE, -MAX_TILE_RANGE],
    [-MAX_TILE_RANGE, MAX_TILE_RANGE],
  ]) {
    const dx = a * chord[0] - b * chord[1];
    const dy = a * chord[1] + b * chord[0];
    for (const edge of pathEdges(first, dx, dy)) assert.ok(all.has(edge), `${a},${b}: ${edge}`);
  }
});

const viewAt = (x, y, zoom, scale) => ({
  originX: x,
  originY: y,
  offsetX: 0n,
  offsetY: 0n,
  bits: Math.max(128, Math.ceil(Math.log2(zoom)) + 64),
  scale: scale * zoom,
  halfWidth: 500,
  halfHeight: 400,
  zoom,
});

test("zooming keeps adding detail, with two colors and faded copies", () => {
  const iterations = 6;
  const single = prepareZoom(twindragonSpec({ ...settings, iterations }), iterations);
  const tiling = prepareZoom(
    twindragonSpec({ ...settings, iterations, showTiling: true }),
    iterations,
  );
  assert.notEqual(typeof single, "string");
  assert.notEqual(typeof tiling, "string");

  const opening = single.render(viewAt(4, 0, 1, 60));
  assert.equal(opening.generation, iterations);
  assert.deepEqual(new Set(opening.colors), new Set([0, 1]));

  const openingTiling = tiling.render(viewAt(4, 0, 1, 60));
  assert.deepEqual(new Set(openingTiling.colors), new Set([0, 1, 2, 3]));

  const opened = iterations;
  for (const zoom of [8, 1e3, 1e6, 1e15, 1e40, 1e100, 1e250]) {
    for (const system of [single, tiling]) {
      const detail = system.render(viewAt(0, 0, zoom, 60));
      assert.equal(detail.limited, false);
      assert.ok(detail.count > 0, `nothing drawn at ${zoom}`);
      assert.ok(detail.generation > opened);
      const longest = Math.max(
        ...Array.from({ length: detail.count }, (_, i) => {
          const o = i * 6;
          return Math.hypot(
            detail.positions[o + 3] - detail.positions[o],
            detail.positions[o + 4] - detail.positions[o + 1],
          );
        }),
      );
      assert.ok(longest < 200, `lines ${longest}px long at ${zoom}`);
    }
  }
});

// Browsers give workers less stack than Node gives its main thread, and a stack
// overflow there freezes the picture without any message on the page.
test("the deepest zoom fits a small stack and draws away from the curve's start", () => {
  const probe = `
    const { readFileSync } = require("node:fs");
    const ts = require("typescript");
    require.extensions[".ts"] = (module, filename) =>
      module._compile(
        ts.transpileModule(readFileSync(filename, "utf8"), {
          compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
        }).outputText,
        filename,
      );
    const { prepareZoom } = require("./utils/lsystem/zoom.ts");
    const { twindragonSpec } = require("./utils/lsystem/twindragon.ts");
    const spec = twindragonSpec(${JSON.stringify({ ...settings, iterations: 6 })});
    const system = prepareZoom(spec, 6);
    for (const zoom of [1e50, 1e113, 1e173, 1e230, 1e279]) {
      const scale = 60 * zoom;
      const bits = Math.ceil(Math.log2(scale)) + 64;
      const offset = (value) => (BigInt(Math.round(value * 2 ** 40)) << BigInt(bits)) >> 40n;
      const detail = system.render({
        originX: 0,
        originY: 0,
        offsetX: offset(2.3),
        offsetY: offset(-1.1),
        bits,
        scale,
        halfWidth: 500,
        halfHeight: 400,
        zoom,
      });
      if (detail.count === 0) throw new Error("nothing drawn at " + zoom);
    }
  `;
  const { status, stderr } = spawnSync(process.execPath, ["--stack-size=150", "-e", probe], {
    encoding: "utf8",
  });
  assert.equal(status, 0, stderr);
});

test("the tiling's opening view draws every row at the highest level", () => {
  const iterations = twindragonLevel({ iterations: 16, showTiling: true });
  assert.ok(iterations < 16);
  const [width, height] = [2560, 1440];
  const single = twindragonSpec({ ...settings, iterations });
  const { scale, originX, originY } = fittedFrame(
    single,
    iterations,
    width,
    height,
    TILING_PADDING,
    1,
  );
  const system = prepareZoom(
    { ...single, ...twindragonSpec({ ...settings, iterations, showTiling: true }) },
    iterations,
  );
  const detail = system.render({
    ...viewAt((width / 2 - originX) / scale, (originY - height / 2) / scale, 1, scale),
    halfWidth: width * 0.65,
    halfHeight: height * 0.65,
  });
  assert.equal(detail.limited, false);
  // Rows run from the bottom up, so a cut-off drawing leaves the top empty.
  let top = -Infinity;
  let bottom = Infinity;
  for (let i = 0; i < detail.count; i++) {
    top = Math.max(top, detail.positions[i * 6 + 1]);
    bottom = Math.min(bottom, detail.positions[i * 6 + 1]);
  }
  assert.ok(top > height / 2, `drawn only up to ${top}`);
  assert.ok(bottom < -height / 2, `drawn only down to ${bottom}`);
});
