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
class CapturePath {
  points = [];
  moveTo(x, y) {
    this.points.push([x, y]);
  }
  lineTo(x, y) {
    this.points.push([x, y]);
  }
}
globalThis.Path2D = CapturePath;

const { buildPlayback, playbackSource } = require("../utils/lsystem/playback.ts");
const { preparePlaybackDrawing } = require("../utils/lsystem/playbackDrawing.ts");
const { TERDRAGON_CONSTRUCTION_MAX } = require("../utils/constructionLimits.ts");
const {
  fullHexagonSide,
  gridDistance,
  gridLineKey,
  TERDRAGON_COPY_TINTS,
  TERDRAGON_LEAD,
  terdragonCensus,
  terdragonLines,
} = require("../utils/lessons/terdragonCopies.ts");

const LEVELS = Array.from({ length: TERDRAGON_CONSTRUCTION_MAX }, (_, i) => i + 1);

function model(level, copies) {
  const source = playbackSource("terdragon", {
    iterations: level,
    color: "#fff",
    background: "#000",
    lineWidth: 1,
    copies,
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

/** Reads the generator's strokes back as whole grid coordinates, failing if one is off the grid. */
function generatorLines({ geometry: { positions, count } }) {
  const ux = positions[3] - positions[0];
  const uy = positions[4] - positions[1];
  const vx = ux / 2 - (uy * Math.sqrt(3)) / 2;
  const vy = (ux * Math.sqrt(3)) / 2 + uy / 2;
  const corner = (x, y) => {
    const det = ux * vy - uy * vx;
    const a = (x * vy - y * vx) / det;
    const b = (ux * y - uy * x) / det;
    assert.ok(Math.abs(a - Math.round(a)) < 1e-2 && Math.abs(b - Math.round(b)) < 1e-2);
    return [Math.round(a), Math.round(b)];
  };
  const lines = new Map();
  for (let i = 0; i < count; i++) {
    const o = i * 6;
    const line = gridLineKey(
      ...corner(positions[o], positions[o + 1]),
      ...corner(positions[o + 3], positions[o + 4]),
    );
    lines.set(line, (lines.get(line) ?? 0) + 1);
  }
  return lines;
}

test("one copy never draws a line twice, and neither do six together", () => {
  for (const level of LEVELS) {
    for (const copies of [1, 6]) {
      const lines = generatorLines(model(level, copies));
      assert.equal(lines.size, copies * 3 ** level, `level ${level}, ${copies} copies`);
      assert.deepEqual([...new Set(lines.values())], [1]);
      assert.equal(terdragonCensus(level, copies).twice, 0);
      assert.equal(terdragonCensus(level, copies).strokes, copies * 3 ** level);
    }
  }
});

test("the census walks exactly the lines the generator draws", () => {
  for (const level of [1, 2, 5, 7]) {
    for (const copies of [1, 3, 6]) {
      assert.deepEqual(
        [...terdragonLines(level, copies).keys()].sort((a, b) => a - b),
        [...generatorLines(model(level, copies)).keys()].sort((a, b) => a - b),
      );
    }
  }
});

test("six copies leave no line missing in a hexagon that grows; five leave none full", () => {
  const STEPS = [
    [1, 0],
    [0, 1],
    [-1, 1],
    [-1, 0],
    [0, -1],
    [1, -1],
  ];
  const missing = (lines, side) => {
    let count = 0;
    for (let a = -side; a <= side; a++)
      for (let b = -side; b <= side; b++) {
        if (gridDistance(a, b) > side) continue;
        for (const [da, db] of STEPS) {
          if (gridDistance(a + da, b + db) > side) continue;
          if (!lines.has(gridLineKey(a, b, a + da, b + db))) count++;
        }
      }
    return count;
  };
  const sides = LEVELS.map((level) => {
    const lines = generatorLines(model(level, 6));
    const { hexagonSide } = terdragonCensus(level, 6);
    assert.equal(missing(lines, hexagonSide), 0, `level ${level}`);
    assert.ok(missing(lines, hexagonSide + 1) > 0, `level ${level}`);
    for (const copies of [1, 2, 3, 4, 5]) {
      assert.equal(fullHexagonSide(generatorLines(model(level, copies))), 0);
      assert.equal(terdragonCensus(level, copies).hexagonSide, 0);
    }
    return hexagonSide;
  });
  assert.deepEqual(sides, [1, 2, 3, 5, 8, 17, 26, 50, 77]);
});

test("the new path's middle corners are the centers of the triangles on the old line", () => {
  const { geometry } = model(1, 1);
  const p = [0, 1, 2].map((i) => [geometry.positions[i * 6], geometry.positions[i * 6 + 1]]);
  p.push([geometry.positions[15], geometry.positions[16]]);
  const close = ([ax, ay], [bx, by]) => Math.hypot(ax - bx, ay - by) < 1e-4;
  const dx = p[3][0] - p[0][0];
  const dy = p[3][1] - p[0][1];
  const midpoint = [p[0][0] + dx / 2, p[0][1] + dy / 2];
  // A triangle's center is a third of its height from the old line, on either side.
  const toCenter = [(-dy * Math.sqrt(3)) / 6, (dx * Math.sqrt(3)) / 6];
  const centers = [
    [midpoint[0] + toCenter[0], midpoint[1] + toCenter[1]],
    [midpoint[0] - toCenter[0], midpoint[1] - toCenter[1]],
  ];
  assert.ok(centers.some((center) => close(center, p[1])));
  assert.ok(centers.some((center) => close(center, p[2])));
  assert.ok(!close(p[1], p[2]));
  // It looks the same from either end: turned 180 degrees about its middle, it lands on itself.
  for (let i = 0; i < 4; i++)
    assert.ok(close([2 * midpoint[0] - p[i][0], 2 * midpoint[1] - p[i][1]], p[3 - i]));
});

test("replacing every line of a grid makes a smaller grid, each line from one old line", () => {
  // Grid corners in the new, smaller grid. The bend's steps come from the same rule.
  const STEPS = [
    [1, 0],
    [0, 1],
    [-1, 1],
    [-1, 0],
    [0, -1],
    [1, -1],
  ];
  const add = ([a, b], [c, d]) => [a + c, b + d];
  const bend = (start, direction) => {
    const points = [start];
    for (const turn of [0, 2, 0]) points.push(add(points.at(-1), STEPS[(direction + turn) % 6]));
    return points;
  };
  const old = (direction) => bend([0, 0], direction)[3];
  const RANGE = 12;
  const lines = new Map();
  let oldLines = 0;
  const replace = (start, direction) => {
    const points = bend(start, direction);
    for (let i = 0; i < 3; i++) {
      const line = gridLineKey(...points[i], ...points[i + 1]);
      lines.set(line, (lines.get(line) ?? 0) + 1);
    }
  };
  for (let i = -RANGE; i <= RANGE; i++)
    for (let j = -RANGE; j <= RANGE; j++) {
      const corner = [i * old(0)[0] + j * old(1)[0], i * old(0)[1] + j * old(1)[1]];
      for (const direction of [0, 1, 2]) {
        replace(corner, direction);
        oldLines++;
      }
    }
  assert.equal(lines.size, oldLines * 3);
  assert.deepEqual([...new Set(lines.values())], [1]);
  // Walking each old line the other way gives the same new lines.
  const before = lines.size;
  for (let i = -RANGE; i <= RANGE; i++)
    for (let j = -RANGE; j <= RANGE; j++) {
      const corner = [i * old(0)[0] + j * old(1)[0], i * old(0)[1] + j * old(1)[1]];
      for (const direction of [0, 1, 2]) replace(add(corner, old(direction)), direction + 3);
    }
  assert.equal(lines.size, before);
  // Near the middle every line of the smaller grid is there.
  for (let a = -6; a <= 6; a++)
    for (let b = -6; b <= 6; b++)
      for (const step of STEPS)
        assert.ok(lines.has(gridLineKey(a, b, a + step[0], b + step[1])), `${a},${b}`);
});

test("each copy is the first turned about the start, and adding one moves nothing", () => {
  const level = 4;
  const one = model(level, 1).geometry;
  const six = model(level, 6);
  const lines = one.count;
  for (let copy = 0; copy < 6; copy++) {
    const angle = (copy * Math.PI) / 3;
    for (let i = 0; i < lines * 2; i++) {
      const x = one.positions[i * 3];
      const y = one.positions[i * 3 + 1];
      const o = (copy * lines * 2 + i) * 3;
      assert.ok(
        Math.abs(six.geometry.positions[o] - (Math.cos(angle) * x - Math.sin(angle) * y)) < 1e-3,
      );
      assert.ok(
        Math.abs(six.geometry.positions[o + 1] - (Math.sin(angle) * x + Math.cos(angle) * y)) <
          1e-3,
      );
    }
  }
  // Fewer copies hold the same six in their positions, so the frame doesn't change.
  for (const copies of [2, 3, 4, 5]) {
    const fewer = model(level, copies).geometry;
    assert.equal(fewer.count, copies * lines);
    assert.deepEqual(fewer.positions, six.geometry.positions);
  }
  // One pen walks every copy in turn and ends with every line drawn.
  assert.equal(six.instructionLength, six.word.length * 6);
  assert.equal(six.drawn[six.instructionLength], six.geometry.count);
  for (let i = 1; i <= six.instructionLength; i++) assert.ok(six.drawn[i] >= six.drawn[i - 1]);
});

/** Paints a finished level and records every stroke, with its color. */
function painted(level, copies) {
  const current = model(level, copies);
  const paint = preparePlaybackDrawing(800, 400, current, false, {
    background: "#000",
    color: "#fff",
    lineWidth: 1,
    zoom: 1,
    x: 0,
    y: 0,
    copies,
    showOldLines: true,
  });
  const strokes = [];
  let loose = [];
  const ctx = new Proxy(
    {},
    {
      get: (target, key) => {
        if (key === "stroke")
          return (path) =>
            strokes.push({ style: target.strokeStyle, points: path?.points ?? loose });
        if (key === "lineTo") return (x, y) => loose.push([x, y]);
        if (key === "beginPath")
          return () => {
            loose = [];
          };
        return key in target ? target[key] : () => {};
      },
      set: (target, key, value) => {
        target[key] = value;
        return true;
      },
    },
  );
  paint(ctx, current.instructionLength, 1, true);
  return { strokes, lines: current.geometry.count };
}

test("from two copies up the frame stays put, so a new copy lands beside the others", () => {
  const firstCopy = (copies) => painted(4, copies).strokes[0].points.slice(0, 2 * 3 ** 4);
  for (const copies of [3, 4, 5, 6]) assert.deepEqual(firstCopy(copies), firstCopy(2));
  const span = (points) =>
    Math.max(...points.map(([x]) => x)) - Math.min(...points.map(([x]) => x));
  assert.ok(span(firstCopy(1)) > span(firstCopy(2)), "one copy fills the frame by itself");
});

test("the level before shows dim only at the first levels", () => {
  const dim = (level, copies) =>
    painted(level, copies).strokes.filter(({ style }) => style === "#eee8ce40");
  assert.equal(dim(1, 1)[0].points.length, 2);
  // Level 2's dim lines are level 1's 18 lines.
  assert.equal(dim(2, 6)[0].points.length, 2 * 18);
  assert.equal(dim(3, 6)[0].points.length, 2 * 54);
  assert.equal(dim(4, 6).length, 0);
  // Each dim line joins the start of three new lines to their end.
  const { strokes } = painted(1, 1);
  const [start, end] = dim(1, 1)[0].points;
  const close = ([ax, ay], [bx, by]) => Math.hypot(ax - bx, ay - by) < 1e-3;
  assert.ok(close(start, strokes[0].points[0]));
  assert.ok(close(end, strokes[0].points[5]));
});

test("the white hexagon has the census's side, and only six copies have one", () => {
  const white = (level, copies) =>
    painted(level, copies).strokes.filter(({ style }) => style === "#ffffff");
  for (const copies of [1, 5]) assert.equal(white(4, copies).length, 0);
  for (const level of [1, 2, 4]) {
    const [{ points }] = white(level, 6);
    assert.equal(points.length, 6);
    const ghost = painted(level, 6).strokes[0].points;
    const line = Math.hypot(ghost[1][0] - ghost[0][0], ghost[1][1] - ghost[0][1]);
    for (let i = 0; i < 6; i++) {
      const [ax, ay] = points[i];
      const [bx, by] = points[(i + 1) % 6];
      assert.ok(
        Math.abs(Math.hypot(ax - bx, ay - by) - terdragonCensus(level, 6).hexagonSide * line) <
          1e-2,
      );
    }
  }
});

test("four of this site's dragon curves share one point the same way, on a grid of squares", () => {
  const STEPS = [
    [1, 0],
    [0, 1],
    [-1, 0],
    [0, -1],
  ];
  for (let level = 1; level <= 14; level++) {
    let word = "F";
    for (let i = 0; i < level; i++)
      word = word.replace(/[FG]/g, (symbol) => (symbol === "F" ? "F+G" : "F-G"));
    const lines = new Set();
    for (let copy = 0; copy < 4; copy++) {
      let x = 0;
      let y = 0;
      let direction = copy;
      for (const symbol of word) {
        if (symbol === "+") direction = (direction + 1) % 4;
        else if (symbol === "-") direction = (direction + 3) % 4;
        else {
          const nextX = x + STEPS[direction][0];
          const nextY = y + STEPS[direction][1];
          lines.add(`${x + nextX},${y + nextY}`);
          x = nextX;
          y = nextY;
        }
      }
    }
    assert.equal(lines.size, 4 * 2 ** level, `level ${level}`);
    if (level < 14) continue;
    // By level 14 every line within 40 steps of the start is drawn.
    for (let a = -40; a < 40; a++)
      for (let b = -40; b <= 40; b++) {
        assert.ok(lines.has(`${2 * a + 1},${2 * b}`) && lines.has(`${2 * b},${2 * a + 1}`));
      }
  }
});

test("a tint per copy, and a readout of the count, the doubles and the hexagon", () => {
  assert.equal(new Set(TERDRAGON_COPY_TINTS).size, 6);
  assert.deepEqual(TERDRAGON_LEAD.readout({ copies: 6 }, 4), [
    { label: "Lines drawn", value: "486" },
    { label: "Drawn twice", value: "0" },
    { label: "Full hexagon", value: "5 lines a side" },
  ]);
  assert.deepEqual(TERDRAGON_LEAD.readout({ copies: 5 }, 4).at(-1), {
    label: "Full hexagon",
    value: "none",
  });
  assert.equal(TERDRAGON_LEAD.readout({ copies: 6 }, 1).at(-1).value, "1 line a side");
});
