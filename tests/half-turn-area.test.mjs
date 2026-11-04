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
const { buildPlayback, playbackSource } = require("../utils/lsystem/playback.ts");
const { preparePlaybackDrawing } = require("../utils/lsystem/playbackDrawing.ts");
const {
  areaMoved,
  detourRuns,
  HALF_TURN_RULES,
  lineGrowth,
  MINKOWSKI_LEAD,
  replacementLines,
  replacementPoints,
} = require("../utils/lessons/halfTurnArea.ts");

// Each page's figure, with every level its explorer or its figure offers.
const FIGURES = [
  {
    name: "minkowski",
    kind: "minkowskiSausage",
    page: "minkowski-sausage",
    settings: { island: true },
    top: 5,
    lead: MINKOWSKI_LEAD,
  },
];

function model(figure, level) {
  const source = playbackSource(figure.kind, {
    iterations: level,
    color: "#fff",
    background: "#000",
    lineWidth: 1,
    ...figure.settings,
  });
  return buildPlayback(
    source.spec,
    level,
    source.legacy,
    source.turns,
    source.repeat,
    source.fibonacci,
    source.copies,
  );
}

// The walk the figure draws, in whole steps.
function walk(figure, level) {
  const { positions, count } = model(figure, level).geometry;
  // Adding zero turns a rounded -0 into 0.
  const points = [[Math.round(positions[0]) + 0, Math.round(positions[1]) + 0]];
  for (let i = 0; i < count; i++)
    points.push([Math.round(positions[i * 6 + 3]) + 0, Math.round(positions[i * 6 + 4]) + 0]);
  return points;
}

/** The area of a closed walk, signed by the way it runs around. */
const shoelace = (points) => {
  let sum = 0;
  for (let i = 0; i < points.length; i++) {
    const [a, b] = [points[i], points[(i + 1) % points.length]];
    sum += a[0] * b[1] - b[0] * a[1];
  }
  return sum / 2;
};

for (const figure of FIGURES) {
  const rule = HALF_TURN_RULES[figure.name];

  test(`${figure.name}: the figure draws the page's own rule`, () => {
    const source = readFileSync(
      new URL(`../pages/l-system/${figure.page}.tsx`, import.meta.url),
      "utf8",
    );
    assert.ok(source.includes(rule.rule));
    const spec = playbackSource(figure.kind, { iterations: 1, ...figure.settings }).spec;
    assert.equal(spec.rules[0].replacement, rule.rule);
    assert.equal(figure.lead.initial.detours, figure.name);
  });

  test(`${figure.name}: the line closes, never touches itself and keeps the square's area`, () => {
    for (let level = 1; level <= figure.top; level++) {
      const points = walk(figure, level);
      const lines = points.length - 1;
      const side = rule.shrink ** level;
      assert.equal(lines, 4 * replacementLines(rule) ** level);
      assert.deepEqual(points[lines], points[0]);
      const corners = new Set(points.slice(0, -1).map(String));
      assert.equal(corners.size, lines, `level ${level} reaches a corner twice`);
      assert.equal(Math.abs(shoelace(points.slice(0, -1))), side * side);
      // Its length, against the four sides it started from.
      assert.equal(lines / side, 4 * lineGrowth(rule, level));
    }
  });

  test(`${figure.name}: a half turn around the middle puts a replacement on itself`, () => {
    const points = replacementPoints(rule);
    const middle = (points.length - 1) / 2;
    assert.deepEqual(points[middle], [0, 0]);
    assert.deepEqual(points[0], [-rule.shrink / 2, 0]);
    points.forEach(([x, y], i) => {
      const [a, b] = points[points.length - 1 - i];
      assert.equal(a + x, 0);
      assert.equal(b + y, 0);
    });
    // One detour on each side of the old line, with the size the lesson says.
    const before = shoelace(points.slice(0, middle + 1));
    const after = shoelace(points.slice(middle));
    assert.equal(Math.abs(before), rule.detourSquares);
    assert.equal(before, -after);
  });

  test(`${figure.name}: every level adds and removes the share the readout shows`, () => {
    for (let level = 1; level <= Math.min(figure.top, 3); level++) {
      const points = walk(figure, level);
      const whole = shoelace(points.slice(0, -1));
      const total = { added: 0, removed: 0 };
      for (const { from, to, effect } of detourRuns(points.length - 1, rule)) {
        // Swapping the old line for this detour changes the walk's area by the detour's own area.
        const change = shoelace(points.slice(from, to + 1));
        assert.equal(Math.sign(change) === Math.sign(whole), effect === "added");
        total[effect] += Math.abs(change);
      }
      assert.equal(total.added, total.removed);
      assert.equal(total.added / Math.abs(whole), areaMoved(rule, level));
    }
  });
}

test("the Minkowski figure names what a level moves only around a square", () => {
  assert.equal(MINKOWSKI_LEAD.control.path, "island");
  const values = (island, level) =>
    MINKOWSKI_LEAD.readout({ island }, level).map((row) => row.value);
  assert.deepEqual(values(false, 3), ["×8"]);
  assert.deepEqual(values(true, 1), ["×2", "25.0%", "25.0%", "100%"]);
  assert.deepEqual(values(true, 3), ["×8", "6.3%", "6.3%", "100%"]);
  assert.deepEqual(values(true, 5), ["×32", "1.6%", "1.6%", "100%"]);
});

class FakePath {
  moveTo() {}
  lineTo() {}
  closePath() {}
  addPath() {}
  rect() {}
}
globalThis.Path2D = FakePath;

function fills(figure, level, consumedShare = 1) {
  const built = model(figure, level);
  const paint = preparePlaybackDrawing(800, 500, built, false, {
    background: "#000",
    color: "#fff",
    lineWidth: 1,
    zoom: 1,
    x: 0,
    y: 0,
    detours: figure.name,
  });
  const tints = [];
  const context = new Proxy(
    { fillStyle: "" },
    {
      get: (target, key) => {
        // The pen's dot and arrow fill the current path, with no path of their own.
        if (key === "fill") return (path) => path && tints.push(target.fillStyle);
        return key in target ? target[key] : () => {};
      },
      set: (target, key, value) => {
        target[key] = value;
        return true;
      },
    },
  );
  paint(context, Math.floor(built.instructionLength * consumedShare), 1, true);
  return tints;
}

test("the tints follow the pen, and stop when they would be thinner than the line", () => {
  const figure = FIGURES[0];
  const runs = 2 * 4 * 8 ** 2;
  assert.equal(fills(figure, 3).length, runs);
  const halfway = fills(figure, 3, 0.5).length;
  assert.ok(halfway > 0 && halfway < runs);
  assert.equal(fills(figure, 3, 0).length, 0);
  assert.equal(fills(figure, 4).length, 0);
});
