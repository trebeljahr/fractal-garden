import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import ts from "typescript";
import {
  edgeCube,
  edgeMisfits,
  edgeTotal,
  JERUSALEM_FIT,
  jerusalemFace,
  snapToFit,
} from "../utils/lessons/jerusalemFit.ts";

const require = createRequire(import.meta.url);
require.extensions[".ts"] = (module, filename) =>
  module._compile(
    ts.transpileModule(readFileSync(filename, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText,
    filename,
  );
const { generateJerusalemCube, JERUSALEM_RATIO } = require("../utils/voxelFractals.ts");

const close = (a, b, tolerance = 1e-5) => assert.ok(Math.abs(a - b) < tolerance, `${a} vs ${b}`);

test("the lesson's fit is the generator's ratio, and it fills an edge", () => {
  close(JERUSALEM_FIT, JERUSALEM_RATIO, 1e-12);
  close(edgeTotal(JERUSALEM_FIT), 1, 1e-12);
  assert.ok(edgeTotal(0.413) < 1);
  assert.ok(edgeTotal(0.415) > 1);
});

test("the slider can land on the fit, and only near it", () => {
  assert.equal(snapToFit(0.414), JERUSALEM_FIT);
  assert.equal(snapToFit(0.41), 0.41);
  assert.equal(snapToFit(0.42), 0.42);
});

test("the face matches the front of the generator's level 1", () => {
  const { boxes } = generateJerusalemCube(1);
  // Boxes are center x, y, z and edge length; the whole cube spans -1 to 1 and comes first.
  const front = [];
  for (let i = 4; i < boxes.length; i += 4) {
    const size = boxes[i + 3];
    if (Math.abs(boxes[i + 2] + size / 2 - 1) < 1e-5)
      front.push({
        x: (boxes[i] - size / 2 + 1) / 2,
        y: (boxes[i + 1] - size / 2 + 1) / 2,
        size: size / 2,
      });
  }
  const { corners, edges } = jerusalemFace(JERUSALEM_FIT);
  const expected = [...corners, ...edges];
  assert.equal(front.length, expected.length);
  for (const piece of expected)
    assert.ok(
      front.some(
        (box) =>
          Math.abs(box.x - piece.x) < 1e-5 &&
          Math.abs(box.y - piece.y) < 1e-5 &&
          Math.abs(box.size - piece.size) < 1e-5,
      ),
      `${JSON.stringify(piece)} is on the front face`,
    );
});

test("an edge cube meets the next level's small corner cube face to face", () => {
  const { next, edges } = jerusalemFace(JERUSALEM_FIT);
  const edge = edges.find((piece) => piece.y === 0);
  const neighbor = next.find(
    (piece) => piece.y === 0 && Math.abs(piece.x + piece.size - edge.x) < 1e-12,
  );
  assert.ok(neighbor, "the small cube ends exactly where the edge cube starts");
  close(neighbor.size, edge.size, 1e-12);
  close(edge.size, edgeCube(JERUSALEM_FIT), 1e-12);
});

test("the misfits mark what is really there", () => {
  assert.deepEqual(edgeMisfits(JERUSALEM_FIT).stretches, []);
  const [left, right] = edgeMisfits(0.36).stretches;
  close(left[0], 0.36);
  close(left[1], (1 - 0.36 ** 2) / 2);
  close(left[1] - left[0], (1 - edgeTotal(0.36)) / 2);
  close(right[1], 1 - 0.36);
  // Too wide: the stretch is the part of the edge cube inside the corner cube.
  const [overlap] = edgeMisfits(0.45).stretches;
  close(overlap[1], 0.45);
  close(overlap[0], (1 - 0.45 ** 2) / 2);
});
