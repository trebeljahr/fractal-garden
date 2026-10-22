import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import ts from "typescript";

// Match the app's TS module resolution without adding a test runtime dependency.
const require = createRequire(import.meta.url);
require.extensions[".ts"] = (module, filename) => {
  const { outputText } = ts.transpileModule(readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  module._compile(outputText, filename);
};
require.extensions[".tsx"] = require.extensions[".ts"];
const {
  buildPlant,
  generationLimit,
  isStoredGarden,
  makePlant,
  MAX_PLANTS,
  SPECIES,
  starterGarden,
} = require("../utils/garden/model.ts");
const { DEFAULT_CAMERA, projection } = require("../utils/garden/render.ts");

test("the garden page exists only in development", () => {
  const previous = process.env.NODE_ENV;
  try {
    process.env.NODE_ENV = "production";
    const { getStaticProps } = require("../pages/garden.tsx");
    assert.deepEqual(getStaticProps(), { notFound: true });
    process.env.NODE_ENV = "test";
    assert.deepEqual(getStaticProps(), { notFound: true });
    process.env.NODE_ENV = "development";
    assert.deepEqual(getStaticProps(), { props: {} });
  } finally {
    if (previous === undefined) Reflect.deleteProperty(process.env, "NODE_ENV");
    else process.env.NODE_ENV = previous;
  }
});

test("all plant forms stay finite and bounded at their maximum generation", () => {
  for (const species of Object.keys(SPECIES)) {
    for (const dimension of ["2d", "3d"]) {
      const plant = { ...makePlant(species, 1), iterations: generationLimit(species) };
      const built = buildPlant(plant, dimension);
      assert.ok(built.geometry.count < 6500, `${species} ${dimension} segment budget`);
      assert.ok(built.leaves.length > 0);
      assert.equal(built.geometry.limited, false);
      assert.deepEqual(built.geometry.warnings, []);
      for (const n of built.geometry.positions) assert.ok(Number.isFinite(n));
      for (let i = 0; i < built.geometry.count; i++) {
        assert.ok(built.births[i] >= 0 && built.ends[i] <= 1.000001);
        assert.ok(built.ends[i] > built.births[i]);
      }
      if (species !== "rosette")
        assert.equal(built.geometry.max[2] - built.geometry.min[2] > 0.01, dimension === "3d");
    }
  }
});

test("a seed reproduces its geometry and changing it changes the stochastic tree", () => {
  const plant = makePlant("tree", 12);
  const a = buildPlant(plant, "3d");
  const b = buildPlant(plant, "3d");
  const c = buildPlant({ ...plant, seed: plant.seed + 1 }, "3d");
  assert.deepEqual(a.geometry.positions, b.geometry.positions);
  assert.deepEqual(a.leaves, b.leaves);
  assert.notDeepEqual(a.geometry.positions, c.geometry.positions);
});

test("editing position, size or color preserves the underlying plant", () => {
  const plant = makePlant("tree", 1);
  const a = buildPlant(plant, "3d");
  const b = buildPlant({ ...plant, x: 2, size: 4.5, color: "#ff0000" }, "3d");
  assert.deepEqual(a.geometry.positions, b.geometry.positions);
  assert.deepEqual(a.leaves, b.leaves);
});

test("ground dragging reverses the perspective projection at different camera angles", () => {
  for (const yaw of [-2, 0, 1.4]) {
    for (const pitch of [0.1, 0.32, 1.15]) {
      const project = projection(1100, 800, {
        dimension: "3d",
        camera: { ...DEFAULT_CAMERA, yaw, pitch },
        growth: 1,
        selected: null,
        wind: false,
      });
      for (const [x, z] of [
        [0, 0],
        [-2, 1],
        [3, -2],
      ]) {
        const screen = project.point(x, 0, z);
        const world = project.ground(screen.x, screen.y, z);
        assert.ok(Math.abs(world[0] - x) < 1e-8);
        assert.ok(Math.abs(world[1] - z) < 1e-8);
      }
    }
  }
});

test("local storage accepts a valid bed and rejects corrupt or excessive geometry", () => {
  const valid = starterGarden();
  assert.equal(isStoredGarden(valid), true);
  assert.equal(isStoredGarden([]), true);
  for (const invalid of [
    null,
    {},
    [null],
    [{ ...valid[0], iterations: 100 }],
    [{ ...valid[0], species: "__proto__" }],
    [{ ...valid[0], x: NaN }],
    [{ ...valid[0], ratio: 4 }],
    [valid[0], valid[0]],
    Array(MAX_PLANTS + 1).fill(valid[0]),
  ]) {
    assert.equal(isStoredGarden(invalid), false);
  }
});
