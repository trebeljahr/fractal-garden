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
const { rewriteSentence, traceTurtle } = require("../utils/turtleCurves.ts");
const {
  digitsOf,
  FILL_CELLS_PER_UNIT,
  FILL_DIGITS,
  FRACTION_DIGITS,
  latticeCells,
  numberAt,
  ORIGIN,
  placeStep,
  spotOf,
} = require("../utils/lessons/twindragonDigits.ts");

// The first dragon and its 180° turn, the way drawTwindragon traces them, with the first dragon's
// ends at (0, 0) and (1, 0).
const drawing = (level) => {
  const { points } = traceTurtle(rewriteSentence("F", { F: "F+G", G: "F-G" }, level), {
    turnAngle: Math.PI / 2,
    startAngle: (-level * Math.PI) / 4,
    drawChars: "FG",
  });
  const [endX, endY] = points[points.length - 1];
  assert.ok(Math.abs(endY) < 1e-6, "the first dragon's ends stay level");
  const scaled = points.map(([x, y]) => [x / endX, y / endX]);
  return [...scaled, ...scaled.map(([x, y]) => [1 - x, -y])];
};

// Every number with this many digits after the point, the same way the lesson steps through them.
const fractions = (digits, base = [-1, -1]) => {
  const inverse = [
    base[0] / (base[0] ** 2 + base[1] ** 2),
    -base[1] / (base[0] ** 2 + base[1] ** 2),
  ];
  let step = [0, 1];
  let found = [ORIGIN];
  for (let i = 0; i < digits; i++) {
    step = [
      step[0] * inverse[0] - step[1] * inverse[1],
      step[0] * inverse[1] + step[1] * inverse[0],
    ];
    const [dx, dy] = step;
    found = found.flatMap(([x, y]) => [
      [x, y],
      [x + dx, y + dy],
    ]);
  }
  return found;
};

// How far the farthest point of `from` lies from its nearest point of `to`.
function reach(from, to) {
  const cell = 1 / 32;
  const bins = new Map();
  const at = (x, y) => `${Math.floor(x / cell)},${Math.floor(y / cell)}`;
  for (const point of to) {
    const key = at(point[0], point[1]);
    if (bins.has(key)) bins.get(key).push(point);
    else bins.set(key, [point]);
  }
  let worst = 0;
  for (const [x, y] of from) {
    let best = Infinity;
    const [cx, cy] = [Math.floor(x / cell), Math.floor(y / cell)];
    for (let ring = 0; best > (ring - 1) * cell && ring < 64; ring++)
      for (let i = -ring; i <= ring; i++)
        for (let j = -ring; j <= ring; j++) {
          if (Math.max(Math.abs(i), Math.abs(j)) !== ring) continue;
          for (const point of bins.get(`${cx + i},${cy + j}`) ?? [])
            best = Math.min(best, Math.hypot(point[0] - x, point[1] - y));
        }
    worst = Math.max(worst, best);
  }
  return worst;
}
const apart = (a, b) => Math.max(reach(a, b), reach(b, a));

test("at each level the tiling's copies use every line of a square mesh exactly once", () => {
  for (let level = 1; level <= 12; level++) {
    const { points } = traceTurtle(rewriteSentence("F", { F: "F+G", G: "F-G" }, level), {
      turnAngle: Math.PI / 2,
      startAngle: 0,
      drawChars: "FG",
    });
    const first = points.map(([x, y]) => [Math.round(x), Math.round(y)]);
    const [cx, cy] = first[first.length - 1];
    const tile = [...first, ...first.map(([x, y]) => [cx - x, cy - y])];
    const breaks = first.length;
    const size = Math.hypot(cx, cy);
    const seen = new Map();
    for (let a = -4; a <= 4; a++)
      for (let b = -4; b <= 4; b++) {
        const [dx, dy] = [a * cx - b * cy, a * cy + b * cx];
        for (let i = 1; i < tile.length; i++) {
          if (i === breaks) continue;
          const [p, q] = [tile[i - 1], tile[i]];
          const [lowX, lowY] = [Math.min(p[0], q[0]) + dx, Math.min(p[1], q[1]) + dy];
          const key = `${lowX},${lowY},${p[0] === q[0] ? "up" : "right"}`;
          seen.set(key, (seen.get(key) ?? 0) + 1);
        }
      }
    // Every line of the mesh in a window well inside the copies drawn.
    const window = Math.ceil(2 * size);
    for (let x = -window; x <= window; x++)
      for (let y = -window; y <= window; y++)
        for (const way of ["up", "right"])
          assert.equal(seen.get(`${x},${y},${way}`), 1, `level ${level}: ${x},${y},${way}`);
  }
});

test("the fractions and the page's two dragons approach the same shape", () => {
  const distances = [8, 10, 12, 14].map((level) => apart(drawing(level), fractions(level + 2)));
  distances.forEach((distance, i) => {
    assert.ok(distance < 0.032 / 2 ** i, `level ${8 + 2 * i} is ${distance} away`);
  });
  // The figure the article's note quotes.
  assert.ok(distances[3] < 0.004, `level 14 is ${distances[3]} away`);
});

test("base -1 + i gives the mirror image, not this drawing", () => {
  const dragons = drawing(12);
  const mirrored = fractions(14, [-1, 1]);
  // Whichever quarter turn and shift centers it on the drawing.
  const centered = mirrored.map(([x, y]) => [x - ORIGIN[0] + 0.2, y - ORIGIN[1] + 0.1]);
  for (const [cos, sin] of [
    [1, 0],
    [0, 1],
    [-1, 0],
    [0, -1],
  ]) {
    const turned = centered.map(([x, y]) => [0.5 + cos * x - sin * y, cos * y + sin * x]);
    assert.ok(apart(dragons, turned) > 0.15);
  }
});

test("each place to the right is 0.71 times as long and turned 135 degrees counterclockwise", () => {
  for (let place = 4; place > -FRACTION_DIGITS; place--) {
    const [a, b] = placeStep(place);
    const [c, d] = placeStep(place - 1);
    assert.ok(Math.abs(Math.hypot(c, d) / Math.hypot(a, b) - Math.SQRT1_2) < 1e-12);
    const turn = (Math.atan2(a * d - b * c, a * c + b * d) * 180) / Math.PI;
    assert.ok(Math.abs(turn - 135) < 1e-9, `${place}: ${turn}`);
  }
  assert.deepEqual(placeStep(0), [0, 1]);
});

test("every grid point in a wide square has exactly one row of whole digits", () => {
  const seen = new Set();
  for (let a = -300; a <= 300; a++)
    for (let b = -300; b <= 300; b++) {
      const n = digitsOf(a, b);
      assert.notEqual(n, null);
      assert.ok(!seen.has(n), `${a},${b} repeats ${n}`);
      seen.add(n);
    }
  // Reading any row of digits gives a grid point, and no two rows give the same one.
  const bits = 16;
  const cells = latticeCells(bits);
  const points = new Set();
  for (let n = 0; n < 2 ** bits; n++) {
    const [a, b] = [cells[2 * n], cells[2 * n + 1]];
    assert.equal(digitsOf(a, b), n);
    points.add(`${a},${b}`);
  }
  assert.equal(points.size, 2 ** bits);
});

test("a number's spot leads back to that number, and every spot has a close number", () => {
  for (let n = 0; n < 2 ** (FRACTION_DIGITS + 4); n += 37) {
    assert.equal(numberAt(spotOf(n), 4), n);
    assert.ok(n >= 2 ** FRACTION_DIGITS || numberAt(spotOf(n), 0) === n);
  }
  // The places that sum to a number are the ones the lesson draws as arrows.
  const cells = latticeCells(FRACTION_DIGITS + 2);
  for (const n of [0, 1, 5, 4097, 11111, 2 ** 14 - 1]) {
    const [x, y] = spotOf(n);
    assert.ok(Math.abs(x - (ORIGIN[0] + cells[2 * n + 1] / 64)) < 1e-12);
    assert.ok(Math.abs(y - (ORIGIN[1] - cells[2 * n] / 64)) < 1e-12);
  }
  // A spot in a tile the row of whole digits can't reach yet has no number.
  assert.equal(numberAt([ORIGIN[0] + 40, ORIGIN[1]], 4), null);
});

test("the picture's cells sit where the same digits land, and touching tiles get different tones", () => {
  const whole = 4;
  const cells = latticeCells(FILL_DIGITS + 2);
  for (const n of [0, 1, 7, 4097, 11111, 2 ** (FILL_DIGITS + 2) - 1]) {
    let [x, y] = ORIGIN;
    for (let bit = 0; bit < FILL_DIGITS + 2; bit++)
      if ((n >> bit) & 1) {
        const [dx, dy] = placeStep(bit - FILL_DIGITS);
        x += dx;
        y += dy;
      }
    assert.ok(Math.abs(x - (ORIGIN[0] - cells[2 * n] / FILL_CELLS_PER_UNIT)) < 1e-12);
    assert.ok(Math.abs(y - (ORIGIN[1] - cells[2 * n + 1] / FILL_CELLS_PER_UNIT)) < 1e-12);
  }

  const digits = 8;
  const fine = latticeCells(digits + whole);
  const tileAt = new Map();
  for (let n = 0; n < 2 ** (digits + whole); n++)
    tileAt.set(`${fine[2 * n]},${fine[2 * n + 1]}`, n >> digits);
  let touching = 0;
  for (const [key, tile] of tileAt) {
    const [a, b] = key.split(",").map(Number);
    for (const other of [tileAt.get(`${a + 1},${b}`), tileAt.get(`${a},${b + 1}`)]) {
      if (other === undefined || other === tile) continue;
      touching++;
      assert.notEqual(other & 3, tile & 3);
    }
  }
  assert.ok(touching > 0);
});

test("a whole part shifts its tile by a whole number of grid steps", () => {
  for (let whole = 1; whole < 16; whole++) {
    const start = spotOf(whole * 2 ** FRACTION_DIGITS);
    const [dx, dy] = [start[0] - ORIGIN[0], start[1] - ORIGIN[1]];
    assert.ok(Math.abs(dx - Math.round(dx)) < 1e-12);
    assert.ok(Math.abs(dy - Math.round(dy)) < 1e-12);
    const n = 1234;
    const [x, y] = spotOf(whole * 2 ** FRACTION_DIGITS + n);
    const [fx, fy] = spotOf(n);
    assert.ok(Math.abs(x - fx - dx) < 1e-12 && Math.abs(y - fy - dy) < 1e-12);
  }
});

test("each added whole digit makes a bigger copy of the tile: twice as many, 1.41 times as long", () => {
  // With two whole digits, four tiles fill the tile scaled by 2 and given a quarter turn.
  const digits = 8;
  const tile = fractions(digits + 2);
  const shift = (points, [dx, dy]) => points.map(([x, y]) => [x + dx, y + dy]);
  const small = fractions(digits);
  const group = [0, 1, 2, 3].flatMap((whole) => {
    const start = spotOf(whole * 2 ** FRACTION_DIGITS);
    return shift(small, [start[0] - ORIGIN[0], start[1] - ORIGIN[1]]);
  });
  // (-1 - i)^2 = 2i: scale by 2 and turn a quarter turn counterclockwise around the origin.
  const bigger = tile.map(([x, y]) => [
    ORIGIN[0] - 2 * (y - ORIGIN[1]),
    ORIGIN[1] + 2 * (x - ORIGIN[0]),
  ]);
  assert.ok(apart(group, bigger) < 1e-9);
});
