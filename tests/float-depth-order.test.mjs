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
const { sortFloatDepthOrder } = require("../utils/render/floatDepthOrder.ts");
const { drawPolyhedronScene } = require("../utils/polyhedronFractals.ts");
const { buildScene } = require("../utils/render/scene3d.ts");

function compare(depths, original, count = original.length) {
  const expected = original.slice();
  expected.subarray(0, count).sort((a, b) => depths[a] - depths[b]);
  const actual = original.slice();
  const result = sortFloatDepthOrder(depths, actual, count);
  assert.deepEqual(actual, expected);
  assert.equal(result.buffer, actual.buffer);
  assert.equal(result.length, count);
  return result;
}

test("depth ordering keeps ties, signed zeros, infinities and untouched tail entries", () => {
  const values = [
    -Infinity,
    -3.4028234663852886e38,
    -10,
    -1,
    -1.401298464324817e-45,
    -0,
    0,
    1.401298464324817e-45,
    1,
    10,
    3.4028234663852886e38,
    Infinity,
  ];
  // Use an offset view, so bit reinterpretation must respect byteOffset.
  const storage = new Float32Array(2054);
  const depths = storage.subarray(3, 2051);
  for (let i = 0; i < depths.length; i++) depths[i] = values[(i * 7) % values.length];
  const order = Uint32Array.from({ length: depths.length }, (_, i) => depths.length - i - 1);
  for (const count of [0, 1, 2, 255, 256, 257, 1021, depths.length]) {
    compare(depths, order, count);
  }
  depths.fill(-0);
  compare(depths, order);
  for (let i = 0; i < depths.length; i += 2) depths[i] = 0;
  compare(depths, order);
});

test("changing Float32 depths and visible prefixes reuse storage without stale keys", () => {
  const depths = new Float32Array(8192);
  const bits = new Uint32Array(depths.buffer);
  const order = Uint32Array.from({ length: depths.length }, (_, i) => (i * 4051) % depths.length);
  let random = 0x184df73a;
  for (let frame = 0; frame < 12; frame++) {
    for (let i = 0; i < bits.length; i++) {
      random = (Math.imul(random, 1664525) + 1013904223) >>> 0;
      bits[i] = random;
      // Keep this case on the radix path, including arbitrary subnormals.
      if (!Number.isFinite(depths[i])) depths[i] = i % 7;
    }
    compare(depths, order, frame % 2 ? 1024 + frame * 71 : depths.length);
  }
});

test("NaN depths retain the original comparator behavior before mutating the order", () => {
  const depths = Float32Array.from({ length: 1024 }, (_, i) => Math.sin(i * 7.37));
  const order = Uint32Array.from({ length: depths.length }, (_, i) => depths.length - i - 1);
  for (const index of [0, 511, 1023]) {
    depths[index] = NaN;
    compare(depths, order);
    depths[index] = Infinity;
  }
});

test("finite 3D construction draw orders match the original sort at changing views", () => {
  const scenes = [
    [{ kind: "menger" }, 2],
    [{ kind: "vicsek3d" }, 3],
    [{ kind: "mosely", variant: "lighter" }, 2],
    [{ kind: "mosely", variant: "heavier" }, 2],
    [{ kind: "quadraticKoch3d" }, 3],
    [{ kind: "flake", mesh: "tetrahedron", ratio: 0.5 }, 3],
    [{ kind: "flake", mesh: "squarePyramid", ratio: 0.5 }, 3],
    [{ kind: "flake", mesh: "octahedron", ratio: 1 / 3 }, 2],
    [{ kind: "flake", mesh: "dodecahedron", ratio: 0.2 }, 2],
    [{ kind: "flake", mesh: "icosahedron", ratio: 0.2 }, 2],
    [{ kind: "kochSurface", start: "triangle" }, 4],
    [{ kind: "kochSurface", start: "tetrahedron" }, 3],
  ];
  for (const [spec, rank] of scenes) {
    const { scene } = buildScene(spec, rank);
    for (const [rotationX, rotationY, cameraDistance] of [
      [0, 0, 6],
      [23, -37, 3],
      [-67, 143, 6],
    ]) {
      let visible = 0;
      const ctx = {
        fillRect() {},
        beginPath() {
          visible++;
        },
        moveTo() {},
        lineTo() {},
        closePath() {},
        fill() {},
        stroke() {},
      };
      drawPolyhedronScene(ctx, 800, 600, scene, {
        rotationX,
        rotationY,
        cameraDistance,
        background: "#252424",
        fillColor: "#8fb0ff",
        strokeColor: "#dce9ff",
        lineWidth: 0.7,
        showFaces: true,
        showWireframe: true,
        doubleSided: spec.kind === "kochSurface",
      });
      // The renderer fills the visible prefix in original face-index order.
      const original = scene.order.slice(0, visible).sort();
      const expected = original.sort((a, b) => scene.depths[a] - scene.depths[b]);
      assert.deepEqual(scene.order.subarray(0, visible), expected, JSON.stringify(spec));
    }
  }
});
