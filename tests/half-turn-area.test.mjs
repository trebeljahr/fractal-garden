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
  MAX_CONSTRUCTION_LINES,
  QUADRATIC_KOCH_ISLAND_NEIGHBORS_MAX,
} = require("../utils/constructionLimits.ts");
const {
  areaMoved,
  detourRuns,
  HALF_TURN_RULES,
  ISLAND_LEAD,
  lineGrowth,
  MINKOWSKI_LEAD,
  neighborShifts,
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
  {
    name: "island",
    kind: "quadraticKochIsland",
    page: "quadratic-koch-island",
    settings: {},
    top: 4,
    lead: ISLAND_LEAD,
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

test("the island figure names what a level moves until the neighbors are showing", () => {
  assert.equal(ISLAND_LEAD.control.path, "neighbors");
  const values = (neighbors, level) =>
    ISLAND_LEAD.readout({ neighbors }, level).map((row) => row.value);
  assert.deepEqual(values(false, 1), ["×3", "33.3%", "33.3%", "100%"]);
  assert.deepEqual(values(false, 3), ["×27", "8.3%", "8.3%", "100%"]);
  assert.deepEqual(values(true, 2), ["×9", "100%"]);
});

// The small squares inside a closed walk, found row by row from its upright lines.
function insideSquares(points) {
  const rows = new Map();
  for (let i = 0; i + 1 < points.length; i++) {
    const [a, b] = [points[i], points[i + 1]];
    if (a[0] !== b[0]) continue;
    const row = Math.min(a[1], b[1]);
    if (!rows.has(row)) rows.set(row, []);
    rows.get(row).push(a[0]);
  }
  const squares = [];
  for (const [row, walls] of rows) {
    walls.sort((p, q) => p - q);
    for (let i = 0; i + 1 < walls.length; i += 2)
      for (let x = walls[i]; x < walls[i + 1]; x++) squares.push([x, row]);
  }
  return squares;
}

const FIGURE = Object.fromEntries(FIGURES.map((figure) => [figure.name, figure]));

// The shifts the figure uses, measured in steps on the walk it draws.
function shifts(figure, level) {
  const points = walk(figure, level);
  const flat = new Float32Array((points.length - 1) * 4);
  for (let i = 0; i + 1 < points.length; i++) flat.set([...points[i], ...points[i + 1]], i * 4);
  const { sides, corners } = neighborShifts(flat, points.length - 1);
  const clean = (list) => list.map(([x, y]) => [x + 0, y + 0]);
  return { sides: clean(sides), corners: clean(corners) };
}

test("copies shifted by one side cover the plane once, and each neighbor shares a quarter", () => {
  for (const [name, top] of [
    ["island", 3],
    ["minkowski", 2],
  ]) {
    const figure = FIGURE[name];
    for (let level = 1; level <= top; level++) {
      const points = walk(figure, level);
      const side = HALF_TURN_RULES[name].shrink ** level;
      const { sides: moves, corners } = shifts(figure, level);
      for (const [x, y] of moves) assert.equal(Math.hypot(x, y), side);
      const line = (dx, dy) => {
        const lines = new Set();
        for (let i = 0; i + 1 < points.length; i++) {
          const a = `${points[i][0] + dx},${points[i][1] + dy}`;
          const b = `${points[i + 1][0] + dx},${points[i + 1][1] + dy}`;
          lines.add(a < b ? `${a}|${b}` : `${b}|${a}`);
        }
        return lines;
      };
      const own = line(0, 0);
      for (const [x, y] of moves) {
        const shared = [...line(x, y)].filter((key) => own.has(key)).length;
        assert.equal(shared, own.size / 4, `${name} level ${level}`);
      }

      // The eight copies the figure fills, and the island itself.
      const covered = new Map();
      const inside = insideSquares(points);
      for (const [a, b] of [[0, 0], ...moves, ...corners])
        for (const [x, y] of inside) {
          const key = `${x + a},${y + b}`;
          covered.set(key, (covered.get(key) ?? 0) + 1);
        }
      // Every square in the box around the middle island lies in exactly one copy.
      const xs = points.map(([x]) => x);
      const ys = points.map(([, y]) => y);
      for (let x = Math.min(...xs); x < Math.max(...xs); x++)
        for (let y = Math.min(...ys); y < Math.max(...ys); y++)
          assert.equal(covered.get(`${x},${y}`), 1, `${name} level ${level}: ${x},${y}`);
    }
  }
});

/**
 * The straight directions in which one island can move forever without running into its neighbor.
 * Two small squares overlap when their offset is under one step on both axes, so a direction only
 * changes between blocked and free at a line through a corner of the square around that offset.
 * Testing those directions, and one between each neighboring pair, tests them all.
 */
function freeDirections(figure, level, [shiftX, shiftY]) {
  const inside = insideSquares(walk(figure, level));
  const offsets = new Set();
  for (const a of inside)
    for (const b of inside) offsets.add(`${b[0] + shiftX - a[0]},${b[1] + shiftY - a[1]}`);
  const parsed = [...offsets].map((key) => key.split(",").map(Number));
  const candidates = new Map();
  for (const [x, y] of parsed)
    for (const [dx, dy] of [
      [x - 1, y - 1],
      [x - 1, y + 1],
      [x + 1, y - 1],
      [x + 1, y + 1],
    ])
      if (dx || dy) candidates.set(Math.atan2(dy, dx), [dx, dy]);
  const sorted = [...candidates.entries()].sort((p, q) => p[0] - q[0]).map(([, d]) => d);
  const tests = [];
  sorted.forEach(([px, py], i) => {
    const [qx, qy] = sorted[(i + 1) % sorted.length];
    const [lp, lq] = [Math.hypot(px, py), Math.hypot(qx, qy)];
    tests.push([px, py], [px / lp + qx / lq, py / lp + qy / lq]);
  });
  const blocked = ([dx, dy]) =>
    parsed.some(([x, y]) => {
      let [low, high] = [0, Infinity];
      for (const [offset, step] of [
        [x, dx],
        [y, dy],
      ]) {
        if (Math.abs(step) < 1e-12) {
          if (Math.abs(offset) >= 1) return false;
          continue;
        }
        const [p, q] = [(offset - 1) / step, (offset + 1) / step];
        low = Math.max(low, Math.min(p, q));
        high = Math.min(high, Math.max(p, q));
      }
      return high - low > 1e-9;
    });
  return tests.filter((direction) => !blocked(direction));
}

test("two of the island's steps run backward, and Minkowski's rule has none", () => {
  const backward = (rule) => {
    const points = replacementPoints(rule);
    return points.filter((p, i) => i && p[0] < points[i - 1][0]).length;
  };
  assert.equal(backward(HALF_TURN_RULES.island), 2);
  assert.equal(backward(HALF_TURN_RULES.minkowski), 0);
});

test("island neighbors lock at level 1, while Minkowski's lock only at level 2", () => {
  for (const shift of shifts(FIGURE.island, 1).sides)
    assert.deepEqual(freeDirections(FIGURE.island, 1, shift), []);
  for (const shift of shifts(FIGURE.minkowski, 1).sides) {
    const free = freeDirections(FIGURE.minkowski, 1, shift);
    assert.ok(free.length > 0);
    // The only way out is straight away from the neighbor.
    for (const [dx, dy] of free) {
      const length = Math.hypot(dx, dy) * Math.hypot(...shift);
      assert.ok(Math.abs((dx * -shift[0] + dy * -shift[1]) / length - 1) < 1e-9);
    }
  }
  for (const shift of shifts(FIGURE.minkowski, 2).sides)
    assert.deepEqual(freeDirections(FIGURE.minkowski, 2, shift), []);
});

class FakePath {
  moveTo() {}
  lineTo() {}
  closePath() {}
  addPath() {}
  rect() {}
}
globalThis.Path2D = FakePath;

function fills(figure, level, consumedShare = 1, neighbors = false) {
  const built = model(figure, level);
  const paint = preparePlaybackDrawing(800, 500, built, false, {
    background: "#000",
    color: "#fff",
    lineWidth: 1,
    zoom: 1,
    x: 0,
    y: 0,
    detours: figure.name,
    neighbors,
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

test("the neighbors stay inside the figure's line budget and replace the tints", () => {
  const figure = FIGURE.island;
  assert.equal(fills(figure, 1, 1, true).length, 8);
  // The line and eight filled copies of it.
  const lines = (level) => 9 * model(figure, level).geometry.count;
  assert.ok(lines(QUADRATIC_KOCH_ISLAND_NEIGHBORS_MAX) <= MAX_CONSTRUCTION_LINES);
  assert.ok(lines(QUADRATIC_KOCH_ISLAND_NEIGHBORS_MAX + 1) > MAX_CONSTRUCTION_LINES);
});
