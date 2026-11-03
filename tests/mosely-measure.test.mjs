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
const { generateMoselySnowflake, exposedCubeFaces } = require("../utils/voxelFractals.ts");
const {
  MOSELY_LEAD,
  moselyCubes,
  moselySurface,
  moselyVolume,
} = require("../utils/lessons/moselyMeasure.ts");

const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} vs ${b}`);

test("the readout's numbers match the cubes and exposed faces the generator makes", () => {
  for (const variant of ["lighter", "heavier"]) {
    for (let level = 0; level <= 3; level++) {
      const cubes = generateMoselySnowflake(level, variant);
      assert.equal(cubes.length, moselyCubes(variant, level));
      close(moselyVolume(variant, level), cubes.length / 27 ** level);
      close(moselySurface(variant, level), exposedCubeFaces(cubes).length / 9 ** level);
    }
  }
});

test("volume falls and surface area rises with either center option", () => {
  for (const variant of ["lighter", "heavier"]) {
    for (let level = 2; level <= 8; level++) {
      assert.ok(moselyVolume(variant, level) < moselyVolume(variant, level - 1));
      assert.ok(moselySurface(variant, level) > moselySurface(variant, level - 1));
    }
  }
});

test("the lead offers both center options and reads the chosen one", () => {
  assert.deepEqual(
    MOSELY_LEAD.control.options.map((option) => option.label),
    ["Center removed", "Center kept"],
  );
  assert.deepEqual(
    MOSELY_LEAD.readout({ variant: "lighter" }, 3).map((row) => row.value),
    ["5,832", "29.6%", "19.09"],
  );
  assert.deepEqual(
    MOSELY_LEAD.readout({ variant: "heavier" }, 3).map((row) => row.value),
    ["6,859", "34.8%", "16.86"],
  );
});
