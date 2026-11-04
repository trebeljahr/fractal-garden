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
const {
  strokePasses,
  timesDrawnCensus,
  timesDrawnLead,
  timesDrawnTint,
} = require("../utils/lessons/timesDrawn.ts");

/** The rule a page really draws, read from the page itself. */
function page(name) {
  const source = readFileSync(new URL(`../pages/l-system/${name}.tsx`, import.meta.url), "utf8");
  const axiom = source.match(/axiom: "([^"]+)"/)[1];
  const rule = source.match(/F: "([^"]+)"/)[1];
  assert.equal(source.match(/angle: (\d+)/)[1], "90");
  assert.equal(source.match(/divideFactor: (\d+)/)[1], "3");
  assert.deepEqual(source.match(/timesDrawnLead\("([^"]+)", "([^"]+)"/).slice(1), [axiom, rule]);
  return { axiom, rule, maxLevel: Number(source.match(/maxIterations: (\d+)/)[1]) };
}

/** The strokes the figure draws at a level, on a grid whose step is one new line. */
function walk({ axiom, rule }, level) {
  const { spec, legacy } = playbackSource("lsystem2d", {
    axiom,
    replace: { F: rule },
    angle: 90,
    startAngle: 0,
    color: "#fff",
    background: "#000",
    lineWidth: 1,
  });
  const { geometry } = buildPlayback(spec, level - 1, legacy);
  const { positions, count } = geometry;
  let minX = Infinity;
  let minY = Infinity;
  for (let i = 0; i < count * 2; i++) {
    minX = Math.min(minX, Math.round(positions[i * 3]));
    minY = Math.min(minY, Math.round(positions[i * 3 + 1]));
  }
  const strokes = [];
  for (let i = 0; i < count; i++) {
    const o = i * 6;
    strokes.push([
      Math.round(positions[o]) - minX,
      Math.round(positions[o + 1]) - minY,
      Math.round(positions[o + 3]) - minX,
      Math.round(positions[o + 4]) - minY,
    ]);
  }
  return { positions, strokes };
}

const lineName = ([x, y, u, v]) => `${x + u},${y + v}`;

/** How many times each line is drawn in each direction. */
function tally(strokes) {
  const lines = new Map();
  for (const stroke of strokes) {
    const [x, y, u, v] = stroke;
    const entry = lines.get(lineName(stroke)) ?? { forward: 0, back: 0, stroke };
    if (x + y < u + v) entry.forward++;
    else entry.back++;
    lines.set(lineName(stroke), entry);
  }
  return lines;
}

/** Separate regions the lines enclose, found by flooding the grid cells between them. */
function floodGaps(strokes, size) {
  const walls = new Set(strokes.map(lineName));
  const seen = new Uint8Array((size + 2) * (size + 2));
  const at = (x, y) => (x + 1) * (size + 2) + y + 1;
  let regions = 0;
  for (let startX = -1; startX <= size; startX++)
    for (let startY = -1; startY <= size; startY++) {
      if (seen[at(startX, startY)]) continue;
      regions++;
      const stack = [[startX, startY]];
      seen[at(startX, startY)] = 1;
      while (stack.length) {
        const [x, y] = stack.pop();
        for (const [nx, ny, wall] of [
          [x + 1, y, `${2 * x + 2},${2 * y + 1}`],
          [x - 1, y, `${2 * x},${2 * y + 1}`],
          [x, y + 1, `${2 * x + 1},${2 * y + 2}`],
          [x, y - 1, `${2 * x + 1},${2 * y}`],
        ]) {
          if (nx < -1 || ny < -1 || nx > size || ny > size) continue;
          if (walls.has(wall) || seen[at(nx, ny)]) continue;
          seen[at(nx, ny)] = 1;
          stack.push([nx, ny]);
        }
      }
    }
  return regions - 1;
}

const CRYSTAL = page("crystal");

test("Crystal stays one gap: at every level, only the starting square closes", () => {
  assert.equal(CRYSTAL.maxLevel, 7);
  for (let level = 1; level <= CRYSTAL.maxLevel; level++) {
    const { strokes } = walk(CRYSTAL, level);
    const census = timesDrawnCensus(CRYSTAL.axiom, CRYSTAL.rule, level);
    assert.equal(census.strokes, 4 * 5 ** (level - 1));
    assert.equal(census.gaps, 1);
    assert.equal(floodGaps(strokes, 3 ** (level - 1)), 1, `level ${level}`);
  }
});

test("Crystal's square is drawn once and every other line twice, once each way", () => {
  for (let level = 1; level <= CRYSTAL.maxLevel; level++) {
    const size = 3 ** (level - 1);
    const { strokes } = walk(CRYSTAL, level);
    const lines = tally(strokes);
    let rim = 0;
    for (const { forward, back, stroke } of lines.values()) {
      const [x, y, u, v] = stroke;
      const onRim = (x === u && (x === 0 || x === size)) || (y === v && (y === 0 || y === size));
      if (onRim) {
        rim++;
        assert.equal(forward + back, 1);
      } else assert.deepEqual([forward, back], [1, 1]);
    }
    assert.equal(rim, 4 * size);
    const census = timesDrawnCensus(CRYSTAL.axiom, CRYSTAL.rule, level);
    assert.equal(census.lines, lines.size);
    assert.deepEqual(
      census.drawn,
      rim === lines.size
        ? [[1, rim]]
        : [
            [1, rim],
            [2, lines.size - rim],
          ],
    );
  }
});

test("Crystal's pen keeps the gap on one side: it always takes the first line on that side", () => {
  for (let level = 2; level <= CRYSTAL.maxLevel; level++) {
    const { strokes } = walk(CRYSTAL, level);
    const walls = new Set(strokes.map(lineName));
    const heading = ([x, y, u, v]) => [u - x, v - y];
    // Find the side from the corners of the square: the pen turns toward the gap there.
    const size = 3 ** (level - 1);
    const center = size / 2;
    const [ax, ay] = heading(strokes[0]);
    const inside =
      Math.sign(ax * (center - strokes[0][1]) - ay * (center - strokes[0][0])) ||
      assert.fail("the pen starts on the square, not through its center");
    const turn = ([dx, dy]) => (inside > 0 ? [-dy, dx] : [dy, -dx]);
    for (let i = 0; i < strokes.length; i++) {
      const [, , x, y] = strokes[i];
      const next = strokes[(i + 1) % strokes.length];
      assert.deepEqual([next[0], next[1]], [x, y], "the pen never lifts, and ends where it began");
      const toward = turn(heading(strokes[i]));
      const straight = heading(strokes[i]);
      const away = [-toward[0], -toward[1]];
      const back = [-straight[0], -straight[1]];
      const first = [toward, straight, away, back].find(([dx, dy]) =>
        walls.has(lineName([x, y, x + dx, y + dy])),
      );
      const [dx, dy] = heading(next);
      assert.ok(dx === first[0] && dy === first[1], `level ${level}, stroke ${i}`);
    }
  }
});

test("a stroke's tint counts the passes so far, so a line changes tint when the pen returns", () => {
  const { positions, strokes } = walk(CRYSTAL, 3);
  const passes = strokePasses(positions, strokes.length);
  const seen = new Map();
  strokes.forEach((stroke, i) => {
    const count = (seen.get(lineName(stroke)) ?? 0) + 1;
    seen.set(lineName(stroke), count);
    assert.equal(passes[i], count);
  });
  assert.deepEqual(
    [1, 2, 3, 4, 5, 8, 9, 16, 17, 32].map(timesDrawnTint),
    [0, 1, 2, 2, 3, 3, 4, 4, 5, 5],
  );
});

test("Crystal's readout counts the figure's level", () => {
  const lead = timesDrawnLead(CRYSTAL.axiom, CRYSTAL.rule, { gaps: true });
  assert.deepEqual(
    lead.readout({ timesDrawn: "plain" }, 4).map((row) => [row.label, row.value, row.tint]),
    [
      ["Pen strokes", "500", undefined],
      ["Different lines", "304", undefined],
      ["Drawn once", "108", undefined],
      ["Drawn twice", "196", undefined],
      ["Gaps inside", "1", undefined],
    ],
  );
  assert.ok(lead.readout({ timesDrawn: "tint" }, 4)[3].tint);
});
