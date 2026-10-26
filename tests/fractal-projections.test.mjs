import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import ts from "typescript";

const require = createRequire(import.meta.url);
require.extensions[".ts"] = (m, f) =>
  m._compile(
    ts.transpileModule(readFileSync(f, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText,
    f,
  );
const {
  projectionPolygons,
  sliceCube,
  tetrahedronPieces,
  tetrahedronProjection,
} = require("../utils/fractalProjections.ts");
const { generateMengerSponge } = require("../utils/voxelFractals.ts");
const {
  liftSlice,
  clipAtSlice,
  mengerSliceGeometry,
  tunnelSection,
} = require("../utils/lessons/mengerSlice.ts");
const area = (p) =>
  Math.abs(
    p.reduce((s, v, i) => {
      const q = p[(i + 1) % p.length];
      return s + v[0] * q[1] - q[0] * v[1];
    }, 0),
  ) / 2;
const inside = (p, x, y) =>
  p.every((a, i) => {
    const b = p[(i + 1) % p.length];
    return (b[0] - a[0]) * (y - a[1]) - (b[1] - a[1]) * (x - a[0]) >= -1e-9;
  });
test("axis projections follow the carpet and Greek-cross removal rules", () => {
  for (let n = 0; n <= 3; n++)
    for (const [kind, copies] of [
      ["menger", 8],
      ["vicsek", 5],
    ]) {
      const polys = projectionPolygons(kind, n, false);
      assert.equal(polys.length, copies ** n);
      const expected = 4 * (copies / 9) ** n;
      assert.ok(Math.abs(polys.reduce((s, p) => s + area(p), 0) - expected) < 1e-8);
    }
});
test("tetrahedron square shadows tile the full square at every finite stage", () => {
  for (let n = 0; n <= 3; n++) {
    const polys = projectionPolygons("tetrahedron", n, false),
      count = 2 ** n;
    assert.ok(Math.abs(polys.reduce((s, p) => s + area(p), 0) - 4) < 1e-10);
    for (let x = 0; x < count; x++)
      for (let y = 0; y < count; y++)
        assert.ok(
          polys.some((p) => inside(p, -1 + ((x + 0.5) * 2) / count, -1 + ((y + 0.5) * 2) / count)),
        );
  }
});
test("edge-parallel tetrahedron projection collapses two copies into a triangular gasket", () => {
  for (let n = 0; n <= 3; n++) {
    const polys = projectionPolygons("tetrahedron", n, true);
    assert.equal(polys.length, 3 ** n);
    assert.ok(
      Math.abs(polys.reduce((s, p) => s + area(p), 0) - 2 * Math.SQRT2 * (3 / 4) ** n) < 1e-8,
    );
  }
});
test("central cube slice is a regular hexagon, and out-of-cube cuts are empty", () => {
  const cube = generateMengerSponge(0)[0],
    hex = sliceCube(cube, 0);
  assert.equal(hex.length, 6);
  assert.ok(Math.abs(area(hex) - 3 * Math.sqrt(3)) < 1e-9);
  assert.deepEqual(sliceCube(cube, 4), []);
  for (let n = 1; n <= 3; n++) {
    const polys = projectionPolygons("menger", n, true);
    assert.ok(polys.length > 0);
    assert.ok(!polys.some((p) => inside(p, 0, 0)), "The centre tunnel must remain empty");
    assert.ok(polys.flat(2).every(Number.isFinite));
  }
});

test("colored copies preserve their identity when two shadows overlap", () => {
  const square = tetrahedronPieces(1, false);
  const triangle = tetrahedronPieces(1, true);
  assert.equal(square.length, 4);
  assert.equal(new Set(square.map((piece) => JSON.stringify(piece.shadow))).size, 4);
  assert.notDeepEqual(triangle[0].vertices, triangle[1].vertices);
  assert.deepEqual(triangle[0].shadow, triangle[1].shadow);
  assert.equal(new Set(triangle.map((piece) => JSON.stringify(piece.shadow))).size, 3);
  for (const triangular of [false, true]) {
    const pieces = tetrahedronPieces(3, triangular);
    for (let corner = 0; corner < 4; corner++) {
      const group = pieces.filter((piece) => piece.corner === corner);
      assert.equal(group.length, 16);
      for (const piece of group) {
        assert.ok(
          piece.vertices.every((point) =>
            point.every(
              (value, axis) =>
                Math.abs(
                  value -
                    square[corner].vertices.reduce((sum, vertex) => sum + vertex[axis] / 4, 0),
                ) <=
                0.5 + 1e-10,
            ),
          ),
        );
      }
    }
  }
});
test("viewing arrows follow directions that disappear in the matching shadows", () => {
  for (const triangular of [false, true]) {
    const point = [0.2, -0.3, 0.7];
    const shifted = triangular ? [0.2, 1.7, 2.7] : [0.2, -0.3, 2.7];
    const a = tetrahedronProjection(point, triangular);
    const b = tetrahedronProjection(shifted, triangular);
    assert.ok(a.every((value, axis) => Math.abs(value - b[axis]) < 1e-10));
  }
});

test("the solid caps and flat view describe the same moving diagonal plane", () => {
  for (const offset of [-2.8, -1.2, 0, 0.64, 2.8]) {
    const data = mengerSliceGeometry(2, offset);
    assert.ok(data.sections.length > 0);
    for (const section of data.sections)
      for (const point of section) {
        const lifted = liftSlice(point, offset);
        assert.ok(Math.abs(lifted.reduce((sum, v) => sum + v, 0) - offset) < 1e-9);
        assert.ok(lifted.every((v) => Math.abs(v) <= 1 + 1e-9));
      }
    for (const face of data.faces)
      for (const point of face) assert.ok(point.reduce((sum, v) => sum + v, 0) <= offset + 1e-9);
  }
  const clipped = clipAtSlice(
    [
      [-1, -1, 0],
      [1, -1, 0],
      [1, 1, 0],
      [-1, 1, 0],
    ],
    0,
  );
  assert.equal(clipped.length, 3);
  assert.ok(clipped.every((p) => p[0] + p[1] + p[2] <= 1e-9));
});

test("the central star hole is exactly the union of the three first-round tunnel sections", () => {
  const data = mengerSliceGeometry(1, 0);
  const tunnels = [0, 1, 2].map((axis) => tunnelSection(axis, 0));
  for (let x = -1.4; x <= 1.4; x += 0.073)
    for (let y = -1.4; y <= 1.4; y += 0.081) {
      if (!inside(data.boundary, x, y)) continue;
      const inHole = tunnels.some((p) => inside(p, x, y));
      const inSolid = data.sections.some((p) => inside(p, x, y));
      assert.notEqual(inHole, inSolid, `solid/tunnel mismatch at ${x},${y}`);
    }
});
