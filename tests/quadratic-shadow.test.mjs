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
const { generateQuadraticKochSurface } = require("../utils/voxelFractals.ts");
const {
  QUADRATIC_SHADOW_LEAD,
  SHADOW_LEVELS,
  shadowArea,
  shadowGaps,
  shadowOutline,
  shadowPaths,
  solidVolume,
  surfaceArea,
} = require("../utils/lessons/quadraticShadow.ts");

const LEVELS = [0, 1, 2, 3, 4];
const AXES = ["x", "y", "z"];
const center = (corners) =>
  Object.fromEntries(AXES.map((axis) => [axis, corners.reduce((sum, p) => sum + p[axis] / 4, 0)]));

/** The squares of the finest grid that the faces cover when seen straight along one axis. */
function castShadow(level, along) {
  const steps = 3 ** level;
  const [a, b] = AXES.filter((axis) => axis !== along);
  const cells = new Set();
  for (const { corners, normal } of generateQuadraticKochSurface(level)) {
    if (normal[along] === 0) continue;
    const middle = center(corners);
    cells.add(
      `${Math.floor((middle[a] + 0.5) * steps + 1e-9)},${Math.floor((middle[b] + 0.5) * steps + 1e-9)}`,
    );
  }
  return cells;
}

/** The squares of the finest grid inside the drawn outline, counted along each row. */
function insideOutline(outline) {
  const rows = new Map();
  for (let i = 0; i + 3 < outline.length; i += 2) {
    const [ax, ay, , by] = outline.slice(i, i + 4);
    if (ay === by) continue;
    const row = Math.min(ay, by);
    rows.set(row, [...(rows.get(row) ?? []), { x: ax, up: by > ay ? 1 : -1 }]);
  }
  const cells = new Set();
  for (const [row, crossings] of rows) {
    crossings.sort((p, q) => p.x - q.x);
    let winding = 0;
    for (let i = 0; i < crossings.length - 1; i++) {
      winding += crossings[i].up;
      if (winding === 0) continue;
      for (let x = crossings[i].x; x < crossings[i + 1].x; x++) cells.add(`${x},${row}`);
    }
  }
  return cells;
}

test("the shadow along each axis is exactly the drawn outline filled in", () => {
  for (const level of LEVELS) {
    const inside = insideOutline(shadowOutline(level));
    for (const axis of AXES) {
      const cast = castShadow(level, axis);
      assert.equal(cast.size, inside.size, `level ${level} along ${axis}`);
      for (const cell of cast) assert.ok(inside.has(cell), `level ${level}: ${cell}`);
    }
  }
});

test("the readout is the area of what the faces cast", () => {
  for (const level of LEVELS) {
    const cells = castShadow(level, "z").size;
    assert.ok(Math.abs(cells / 9 ** level - shadowArea(level)) < 1e-9, `level ${level}`);
  }
  assert.deepEqual(
    [1, 2, 3, 4].map((level) => castShadow(level, "z").size),
    [13, 137, 1333, 12497],
  );
  assert.equal(shadowOutline(SHADOW_LEVELS).length, 2 * (4 * 5 ** SHADOW_LEVELS + 1));
});

test("the outline stays in the diamond, and the diamond is the outline plus the triangles", () => {
  for (const level of [0, 1, 2, 3]) {
    const outline = shadowOutline(level);
    const steps = 3 ** level;
    // The face runs from 0 to steps, so its center is steps / 2 and the diamond reaches steps from it.
    const reach = (x, y) => Math.abs(x - steps / 2) + Math.abs(y - steps / 2);
    for (let i = 0; i < outline.length; i += 2)
      assert.ok(reach(outline[i], outline[i + 1]) <= steps + 1e-9, `level ${level}`);

    const gaps = shadowGaps(outline);
    assert.equal(gaps.length, 4 * 5 ** level);
    // Every spot in the diamond is in the shadow or in exactly one triangle, never both.
    const inside = insideOutline(outline);
    const inTriangle = (px, py, [ax, ay, bx, by, cx, cy]) => {
      const side = (x0, y0, x1, y1) => (x1 - x0) * (py - y0) - (y1 - y0) * (px - x0);
      const signs = [side(ax, ay, bx, by), side(bx, by, cx, cy), side(cx, cy, ax, ay)];
      return signs.every((s) => s > 0) || signs.every((s) => s < 0);
    };
    const samples = 54;
    const size = 2 * steps;
    for (let i = 0; i < samples; i++)
      for (let j = 0; j < samples; j++) {
        const x = -steps / 2 + ((i + 0.37) / samples) * size;
        const y = -steps / 2 + ((j + 0.41) / samples) * size;
        if (reach(x, y) >= steps) continue;
        const covered = inside.has(`${Math.floor(x)},${Math.floor(y)}`);
        const holders = gaps.filter((gap) => inTriangle(x, y, gap)).length;
        assert.equal(covered ? 1 : holders, 1, `level ${level} at ${x},${y}`);
        if (covered) assert.equal(holders, 0, `level ${level}: a triangle overlaps the shadow`);
      }
    // Their areas add up to what the readout says is left of the diamond.
    const area = gaps.reduce(
      (sum, [ax, ay, bx, by, cx, cy]) =>
        sum + Math.abs((bx - ax) * (cy - ay) - (by - ay) * (cx - ax)) / 2,
      0,
    );
    assert.ok(Math.abs(area / steps ** 2 - (2 - shadowArea(level))) < 1e-9, `level ${level}`);
  }
});

test("the shadow heads to the diamond's area, twice the face", () => {
  assert.ok(Math.abs(shadowArea(60) - 2) < 1e-12);
  assert.equal(shadowArea(0), 1);
  assert.ok(Math.abs(shadowArea(1) - 13 / 9) < 1e-12);
});

test("no two faces coincide, and the readouts match what the faces measure", () => {
  for (const level of LEVELS) {
    const faces = generateQuadraticKochSurface(level);
    assert.equal(faces.length, 6 * 13 ** level);
    const seen = new Set();
    const width = 3 ** -level;
    let enclosed = 0;
    for (const { corners, normal } of faces) {
      const middle = center(corners);
      const key = AXES.map((axis) => Math.round(2 * 3 ** level * middle[axis])).join();
      assert.ok(!seen.has(key), `level ${level}: two faces at ${key}`);
      seen.add(key);
      // The volume of a closed surface, from the divergence theorem.
      enclosed +=
        (AXES.reduce((sum, axis) => sum + middle[axis] * normal[axis], 0) * width ** 2) / 3;
    }
    assert.ok(Math.abs((faces.length * width ** 2) / 6 - surfaceArea(level)) < 1e-9);
    assert.ok(Math.abs(enclosed - solidVolume(level)) < 1e-9, `level ${level}: ${enclosed}`);
  }
});

test("the solid stays in the cube and its six pyramids, and fills only 3/7 of them", () => {
  for (const level of LEVELS) {
    for (const { corners } of generateQuadraticKochSurface(level))
      for (const { x, y, z } of corners) {
        const reach = Math.max(
          Math.abs(x) + Math.abs(y),
          Math.abs(y) + Math.abs(z),
          Math.abs(x) + Math.abs(z),
        );
        assert.ok(reach <= 1 + 1e-9, `level ${level}: ${x},${y},${z}`);
      }
  }
  assert.ok(Math.abs(solidVolume(60) - 10 / 7) < 1e-12);
  // The cube holds 1 and each pyramid (1 * 1/2) / 3 = 1/6.
  const pyramids = 6 * (1 / 6);
  assert.ok(Math.abs((solidVolume(60) - 1) / pyramids - 3 / 7) < 1e-12);
});

test("the figure's control and readouts", () => {
  assert.equal(QUADRATIC_SHADOW_LEAD.initial.show, "solid");
  const read = (show, level) =>
    QUADRATIC_SHADOW_LEAD.readout({ show }, level).map((row) => row.value);
  assert.deepEqual(read("shadow", 3), ["1.83 × the face", "91.4%"]);
  assert.deepEqual(read("solid", 3), ["3.01 × the cube's", "1.38 × the cube's"]);
  assert.equal(shadowPaths(0).gaps.split("Z").length - 1, 4);
  assert.equal(shadowPaths(3).gaps.split("Z").length - 1, 4 * 5 ** 3);
  assert.equal(shadowPaths(4).gaps, "");
});
