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
  createSceneMotion,
  setSceneProgress,
  CONSTRUCTION_MOTION_MS,
} = require("../utils/constructionMotion.ts");
const { buildScene, Scene3DRenderer } = require("../utils/render/scene3d.ts");
const specs = [
  { kind: "menger" },
  { kind: "vicsek3d" },
  { kind: "mosely", variant: "lighter" },
  { kind: "mosely", variant: "heavier" },
  { kind: "jerusalem" },
  { kind: "flake", mesh: "tetrahedron", ratio: 0.5 },
  { kind: "flake", mesh: "icosahedron", ratio: 1 / (1 + (1 + Math.sqrt(5)) / 2) },
  { kind: "kochSurface", start: "triangle" },
  { kind: "kochSurface", start: "tetrahedron" },
  { kind: "quadraticKoch3d" },
];
for (const spec of specs)
  test(`${JSON.stringify(spec)} transitions end at the exact next geometry`, () => {
    for (const level of [1, 2]) {
      const motion = createSceneMotion(spec, level);
      const final = buildScene(spec, level);
      assert.ok(motion);
      const positions = motion.type === "faces" ? motion.scene.positions : motion.scene.boxes;
      const expected = final.type === "faces" ? final.scene.positions : final.scene.boxes;
      setSceneProgress(motion, 0);
      assert.deepEqual(positions, motion.start);
      setSceneProgress(motion, 0.5);
      assert.ok(positions.some((p, i) => p !== motion.start[i] && p !== motion.end[i]));
      assert.ok(positions.every(Number.isFinite));
      setSceneProgress(motion, 1);
      assert.deepEqual(positions, motion.end);
      // Carved voxels append the disappearing pieces after the surviving surface.
      assert.deepEqual(positions.subarray(0, expected.length), expected);
      if (spec.kind === "menger" || spec.kind === "vicsek3d" || spec.kind === "mosely") {
        for (let offset = expected.length; offset < positions.length; offset += 72) {
          for (let v = 1; v < 24; v++)
            assert.deepEqual(
              positions.subarray(offset + v * 3, offset + v * 3 + 3),
              positions.subarray(offset, offset + 3),
            );
        }
      }
    }
  });

test("new quadratic bumps start on their parent planes", () => {
  const motion = createSceneMotion({ kind: "quadraticKoch3d" }, 1);
  for (let i = 0; i < motion.start.length; i += 3)
    assert.ok(motion.start.subarray(i, i + 3).some((x) => Math.abs(Math.abs(x) - 0.5) < 1e-6));
  assert.ok(motion.end.some((x) => Math.abs(x) > 0.5));
});

test("the explorer remains static; only forward construction steps animate", (t) => {
  let time = 100;
  t.mock.method(performance, "now", () => time);
  const ctx = new Proxy(
    { getTransform: () => ({ a: 1 }) },
    { get: (target, key) => target[key] ?? (() => {}) },
  );
  const view = {
    rotationX: 24,
    rotationY: 30,
    cameraDistance: 6,
    background: "#10151a",
    fillColor: "#b7c9bd",
    strokeColor: "#f5c56d",
    lineWidth: 0.5,
    showFaces: true,
    showWireframe: false,
    autoRotate: false,
    rotationSpeed: 0,
  };
  const r = new Scene3DRenderer();
  const params = { spec: { kind: "menger" }, iterations: 0, view };
  r.update(params);
  assert.equal(r.draw(ctx, 480, 320), false);
  r.update({ ...params, iterations: 1 });
  assert.equal(r.draw(ctx, 480, 320), false);
  r.update({ ...params, iterations: 2, constructionMotion: true });
  assert.equal(r.draw(ctx, 480, 320), true);
  time += CONSTRUCTION_MOTION_MS + 1;
  assert.equal(r.draw(ctx, 480, 320), false);
  r.update({ ...params, iterations: 1, constructionMotion: true });
  assert.equal(r.draw(ctx, 480, 320), false);
});
