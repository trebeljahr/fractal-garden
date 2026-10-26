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
  pascalRows,
  pascalResidues,
  elementaryRows,
  midpoint,
  chaosPoints,
  MAX_PASCAL_NUMBER_ROWS,
  MAX_PATTERN_ROWS,
  MAX_CHAOS_POINTS,
} = require("../utils/lessons/sierpinskiConnections.ts");
const { SEED_ANCHORS, TRIANGLE_HEIGHT } = require("../utils/lessons/sierpinskiSeeds.ts");
const near = (actual, expected) =>
  assert.ok(Math.abs(actual - expected) < 1e-12, `${actual} != ${expected}`);

test("Pascal rows add neighboring numbers, including the two outer ones", () => {
  assert.deepEqual(pascalRows(5), [[1], [1, 1], [1, 2, 1], [1, 3, 3, 1], [1, 4, 6, 4, 1]]);
  pascalRows(MAX_PASCAL_NUMBER_ROWS).forEach((row, index) => {
    assert.equal(row.length, index + 1);
    assert.equal(
      row.reduce((sum, value) => sum + value, 0),
      2 ** index,
    );
    assert.deepEqual(row, [...row].reverse());
  });
});

test("modular addition stays exact beyond the range of JavaScript binomial integers", () => {
  for (const modulus of [2, 3, 5, 6, 16]) {
    const rows = pascalResidues(MAX_PATTERN_ROWS, modulus);
    rows.forEach((row, n) => {
      let coefficient = 1n;
      row.forEach((value, k) => {
        assert.equal(value, Number(coefficient % BigInt(modulus)), `row ${n}, column ${k}`);
        coefficient = (coefficient * BigInt(n - k)) / BigInt(k + 1);
      });
    });
  }
});

test("Rule 90 is Pascal parity on alternating positions of a square grid", () => {
  const count = MAX_PATTERN_ROWS;
  const pascal = pascalResidues(count);
  const cells = elementaryRows(90, count);
  cells.forEach((row, n) => {
    const expected = Array(2 * count - 1).fill(0);
    pascal[n].forEach((value, k) => {
      expected[count - 1 - n + 2 * k] = value;
    });
    assert.deepEqual(row, expected, `row ${n}`);
  });
});

test("elementary rules use the standard left-center-right bit order", () => {
  assert.deepEqual(
    elementaryRows(90, 4).map((row) => row.join("")),
    ["0001000", "0010100", "0100010", "1010101"],
  );
  assert.deepEqual(
    elementaryRows(30, 4).map((row) => row.join("")),
    ["0001000", "0011100", "0110010", "1101111"],
  );
  assert.deepEqual(elementaryRows(2, 3)[1], [0, 1, 0, 0, 0]);
  assert.deepEqual(elementaryRows(16, 3)[1], [0, 0, 0, 1, 0]);
  assert.deepEqual(elementaryRows(90 ^ (1 << 2), 4)[1], [0, 0, 1, 1, 1, 0, 0]);
});

test("rules that fill blank neighborhoods also evolve the offscreen background", () => {
  assert.deepEqual(
    elementaryRows(1, 4).map((row) => row.join("")),
    ["0001000", "1100011", "0001000", "1100011"],
  );
  assert.deepEqual(
    elementaryRows(129, 4).map((row) => row.join("")),
    ["0001000", "1100011", "1001001", "0000000"],
  );
  assert.ok(
    elementaryRows(255, 8)
      .slice(1)
      .every((row) => row.every((cell) => cell === 1)),
  );
});

test("the chaos game records one midpoint for each chosen corner without changing inputs", () => {
  const start = [0.2, 0.3];
  const choices = [2, 0, 1];
  const points = chaosPoints(start, choices);
  assert.equal(points.length, choices.length);
  let previous = start;
  points.forEach((point, i) => {
    const corner = SEED_ANCHORS[choices[i]];
    near(point[0] - previous[0], corner[0] - point[0]);
    near(point[1] - previous[1], corner[1] - point[1]);
    assert.notEqual(point, previous);
    previous = point;
  });
  assert.deepEqual(start, [0.2, 0.3]);
  assert.deepEqual(choices, [2, 0, 1]);
  assert.deepEqual(chaosPoints(start, []), []);
});

test("the same corner choices halve starting-point displacement at every jump", () => {
  const choices = Array.from({ length: 24 }, (_, i) => (i * 7 + i * i) % 3);
  const a = [-3, 4],
    b = [7, -2];
  const first = chaosPoints(a, choices),
    second = chaosPoints(b, choices);
  const distance = Math.hypot(a[0] - b[0], a[1] - b[1]);
  first.forEach((point, i) => {
    near(Math.hypot(point[0] - second[i][0], point[1] - second[i][1]), distance / 2 ** (i + 1));
  });
});

test("points starting within the triangle stay inside it through the full dot budget", () => {
  const points = chaosPoints(
    [0.5, (TRIANGLE_HEIGHT * 2) / 3],
    Array.from({ length: MAX_CHAOS_POINTS }, (_, i) => i % 3),
  );
  assert.equal(points.length, MAX_CHAOS_POINTS);
  for (const [x, y] of points) {
    assert.ok(y >= 0 && y <= TRIANGLE_HEIGHT);
    assert.ok(x >= 0.5 - y / (2 * TRIANGLE_HEIGHT) - 1e-12);
    assert.ok(x <= 0.5 + y / (2 * TRIANGLE_HEIGHT) + 1e-12);
  }
  assert.deepEqual(midpoint([Number.MAX_VALUE, 0], [Number.MAX_VALUE, 0]), [Number.MAX_VALUE, 0]);
});

test("invalid inputs and allocation limits fail before generating large drawings", () => {
  for (const count of [0, -1, 0.5, NaN, Infinity]) {
    assert.throws(() => pascalRows(count));
    assert.throws(() => pascalResidues(count));
    assert.throws(() => elementaryRows(90, count));
  }
  assert.throws(() => pascalRows(MAX_PASCAL_NUMBER_ROWS + 1));
  assert.throws(() => pascalResidues(MAX_PATTERN_ROWS + 1));
  assert.throws(() => elementaryRows(90, MAX_PATTERN_ROWS + 1));
  for (const modulus of [0, 1, 17, 2.5, NaN, Infinity])
    assert.throws(() => pascalResidues(8, modulus));
  for (const rule of [-1, 256, 0.5, NaN, Infinity]) assert.throws(() => elementaryRows(rule, 8));
  for (const choice of [-1, 3, 0.5, NaN, Infinity])
    assert.throws(() => chaosPoints([0, 0], [choice]));
  for (const point of [[NaN, 0], [0, Infinity], [0]]) {
    assert.throws(() => midpoint(point, [0, 0]));
    assert.throws(() => midpoint([0, 0], point));
    assert.throws(() => chaosPoints(point, []));
  }
  assert.throws(() => chaosPoints([0, 0], Array(MAX_CHAOS_POINTS + 1).fill(0)));
});
