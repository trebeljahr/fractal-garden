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
  buildFlakeScene,
  dodecahedronMesh,
  icosahedronMesh,
  octahedronMesh,
} = require("../utils/polyhedronFractals.ts");
const {
  CORNER,
  cutFilled,
  cutFlakeScene,
  cutSquares,
  flakeVolumeLeft,
  OCTAHEDRON_CUT_LEVELS,
} = require("../utils/lessons/octahedronCut.ts");

const PHI = (1 + Math.sqrt(5)) / 2;
const close = (a, b, tolerance = 1e-9) =>
  assert.ok(Math.abs(a - b) < tolerance, `${a} is not close to ${b}`);

test("the octahedron has its corners on the three axes, so all three middle cuts are alike", () => {
  const corners = octahedronMesh().vertices.map((corner) => corner.join());
  for (const [x, y, z] of octahedronMesh().vertices) {
    assert.ok(corners.includes([y, z, x].join()));
    assert.ok(corners.includes([z, x, y].join()));
    assert.ok(Math.abs(x) + Math.abs(y) + Math.abs(z) === 1.3);
  }
  assert.equal(corners.length, 6);
});

// Reads the octahedra straight out of the explorer's own scene and cuts each one by hand.
function cutFromExplorer(level, height) {
  const scene = buildFlakeScene(octahedronMesh(), 1 / 2, level);
  const squares = [];
  for (let copy = 0; copy < scene.vertexCount / 6; copy++) {
    const corners = Array.from({ length: 6 }, (_, corner) => [
      scene.positions[(copy * 6 + corner) * 3] / 1.3,
      scene.positions[(copy * 6 + corner) * 3 + 1] / 1.3,
      scene.positions[(copy * 6 + corner) * 3 + 2] / 1.3,
    ]);
    const ys = corners.map((corner) => corner[1]);
    const size = (Math.max(...ys) - Math.min(...ys)) / 2;
    const y = (Math.max(...ys) + Math.min(...ys)) / 2;
    const x = corners.reduce((sum, corner) => sum + corner[0], 0) / 6;
    const z = corners.reduce((sum, corner) => sum + corner[2], 0) / 6;
    const radius = size - Math.abs(y - height);
    if (radius > 1e-6) squares.push({ x, z, radius });
  }
  return squares;
}

const ordered = (squares) =>
  squares.map(({ x, z, radius }) => [x, z, radius].map((value) => value.toFixed(6)).join()).sort();

test("the squares in the cut are the explorer's octahedra, cut at that height", () => {
  for (const level of [0, 1, 2, 4]) {
    for (const height of [0, 0.01, 0.25, 0.33, 0.5, 0.6, 0.75, 0.99]) {
      assert.deepEqual(
        ordered(cutSquares(level, height)),
        ordered(cutFromExplorer(level, height)),
        `level ${level}, height ${height}`,
      );
    }
  }
});

test("the middle cut stays completely filled while the volume heads to zero", () => {
  for (let level = 0; level <= 8; level++) {
    assert.equal(cutFilled(level, 0), 1);
    assert.equal(cutSquares(level, 0).length, 4 ** level);
    // Four half-size squares at the corners: nothing overlaps and nothing is left over.
    if (level) {
      const squares = cutSquares(level, 0);
      const seen = new Set(squares.map(({ x, z }) => `${x},${z}`));
      assert.equal(seen.size, squares.length);
    }
  }
  assert.equal(flakeVolumeLeft(8).toFixed(4), "0.1001");
});

test("the four copies around the middle fill the big square, and the other two touch one point", () => {
  assert.deepEqual(
    ordered(cutSquares(1, 0)),
    ordered([
      { x: 0.5, z: 0, radius: 0.5 },
      { x: -0.5, z: 0, radius: 0.5 },
      { x: 0, z: 0.5, radius: 0.5 },
      { x: 0, z: -0.5, radius: 0.5 },
    ]),
  );
});

test("the volume is what the cuts add up to", () => {
  for (const level of [1, 2, 4]) {
    const steps = 4096;
    let sum = 0;
    // Both halves, and each cut's area is 2 * radius^2. The octahedron's volume is 4/3.
    for (let step = 0; step < steps; step++) {
      for (const { radius } of cutSquares(level, (step + 0.5) / steps)) {
        sum += (2 * 2 * radius * radius) / steps;
      }
    }
    close(sum / (4 / 3), flakeVolumeLeft(level), 1e-5);
  }
});

// Exact: a height of k/100 in a copy is 2k/100 in a side copy and (2k - 100)/100 in the top copy.
function exactArea(k, level, memo = new Map()) {
  const at = Math.abs(k);
  if (at >= 100) return 0;
  if (level === 0) return 2 * (1 - at / 100) ** 2;
  const key = at * 1000 + level;
  if (!memo.has(key)) {
    memo.set(
      key,
      exactArea(2 * at, level - 1, memo) +
        (exactArea(2 * at - 100, level - 1, memo) + exactArea(2 * at + 100, level - 1, memo)) / 4,
    );
  }
  return memo.get(key);
}
const exactShare = (k, level) => exactArea(k, level) / (2 * (1 - k / 100) ** 2);

test("the slider's stops at 0, 0.5 and 0.75 stay full, and 0.25 stays at five ninths", () => {
  for (let level = 0; level <= 8; level++) {
    assert.equal(cutFilled(level, 0.5), 1);
    assert.equal(cutFilled(level, 0.75), 1);
    close(exactShare(25, level + 40), 5 / 9);
    if (level) close(cutFilled(level, 0.25), 5 / 9);
  }
  assert.equal(cutFilled(0, 0.25), 1);
  // The five squares: four side copies at their own height 0.5, and the top copy at its -0.5.
  assert.deepEqual(
    ordered(cutSquares(1, 0.25)),
    ordered([
      { x: 0.5, z: 0, radius: 0.25 },
      { x: -0.5, z: 0, radius: 0.25 },
      { x: 0, z: 0.5, radius: 0.25 },
      { x: 0, z: -0.5, radius: 0.25 },
      { x: 0, z: 0, radius: 0.25 },
    ]),
  );
  // Corners, then 0.5 and 0.75 in the next copies up: each is the middle of a top copy.
  assert.deepEqual(ordered(cutSquares(1, 0.5)), ordered([{ x: 0, z: 0, radius: 0.5 }]));
  assert.deepEqual(ordered(cutSquares(1, 0.75)), ordered([{ x: 0, z: 0, radius: 0.25 }]));
});

test("every other stop on the slider keeps falling as the level rises", () => {
  for (let k = 1; k < 100; k++) {
    if (k % 25 === 0) continue;
    const height = k / 100;
    for (let level = 1; level <= OCTAHEDRON_CUT_LEVELS; level++) {
      close(cutFilled(level, height), exactShare(k, level));
      assert.ok(cutFilled(level, height) <= cutFilled(level - 1, height));
    }
    // A stop high up can sit inside one top copy for a few levels. After that it never settles.
    for (let level = 9; level <= 60; level++) {
      assert.ok(exactShare(k, level) < exactShare(k, level - 3), `stop ${k}, level ${level}`);
    }
    assert.ok(exactShare(k, 60) < 1e-3, `stop ${k} is still ${exactShare(k, 60)}`);
  }
});

test("the cut scene stays below the cut, and its faces still point out", () => {
  const whole = buildFlakeScene(octahedronMesh(), 1 / 2, 2);
  for (const [level, height] of [
    [1, 0],
    [2, 0.25],
    [3, 0.33],
    [OCTAHEDRON_CUT_LEVELS, 0],
  ]) {
    const scene = cutFlakeScene(level, height);
    for (let vertex = 0; vertex < scene.vertexCount; vertex++) {
      assert.ok(scene.positions[vertex * 3 + 1] <= height * CORNER + 1e-5);
    }
    // Clipping keeps a face's direction, so normals stay among the octahedron's eight.
    for (let face = 0; face < scene.faceCount; face++) {
      const [x, y, z] = scene.normals.slice(face * 3, face * 3 + 3);
      for (const value of [x, y, z]) close(Math.abs(value), 1 / Math.sqrt(3), 1e-5);
    }
  }
  // Height 1 leaves the whole flake, with every face in place.
  assert.equal(cutFlakeScene(2, 1).faceCount, whole.faceCount);
  assert.equal(cutFilled(2, 1), null);
});

test("the other two solids have smaller copies, so the center is in none of them", () => {
  // A copy at corner v holds the center only if (1 - r) / r * v is inside the solid, so r >= 1/2.
  for (const [mesh, ratio] of [
    [dodecahedronMesh(), 1 / (2 + PHI)],
    [icosahedronMesh(), 1 / (1 + PHI)],
  ]) {
    assert.ok(ratio < 1 / 2);
    const planes = mesh.faces.map((face) => {
      const [a, b, c] = face.map((index) => mesh.vertices[index]);
      const u = b.map((value, i) => value - a[i]);
      const v = c.map((value, i) => value - a[i]);
      const normal = [
        u[1] * v[2] - u[2] * v[1],
        u[2] * v[0] - u[0] * v[2],
        u[0] * v[1] - u[1] * v[0],
      ];
      return { normal, offset: normal[0] * a[0] + normal[1] * a[1] + normal[2] * a[2] };
    });
    for (const corner of mesh.vertices) {
      const inCopy = corner.map((value) => (-(1 - ratio) * value) / ratio);
      const inside = planes.every(
        ({ normal, offset }) =>
          normal[0] * inCopy[0] + normal[1] * inCopy[1] + normal[2] * inCopy[2] <= offset + 1e-9,
      );
      assert.equal(inside, false);
    }
  }
});
