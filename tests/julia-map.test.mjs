import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
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
const { JULIA_MAP_PICTURES } = require("../utils/lessons/juliaMap.ts");
const { juliaExplorerLink } = require("../utils/lessons/linkedJulia.ts");
const { decodeView } = require("../utils/explorerShare.ts");

function zeroEscapes({ real, imaginary }, steps) {
  let x = 0;
  let y = 0;
  for (let step = 0; step < steps; step++) {
    [x, y] = [x * x - y * y + real, 2 * x * y + imaginary];
    if (x * x + y * y > 4) return true;
  }
  return false;
}

test("the article's claim holds: only one marked c lies outside the Mandelbrot set", () => {
  const outside = JULIA_MAP_PICTURES.filter(({ c }) => zeroEscapes(c, 1_000_000));
  assert.deepEqual(
    outside.map(({ id }) => id),
    ["dust"],
  );
});

test("each picture links to the explorer view of its own c", () => {
  for (const { c } of JULIA_MAP_PICTURES) {
    const view = decodeView(new URL(juliaExplorerLink(c), "https://x.test").hash, "/julia-set");
    assert.deepEqual(view.parts.config, { cReal: c.real, cImag: c.imaginary });
  }
});

test("each picture has its saved image", () => {
  const folder = new URL("../public/assets/julia-map/", import.meta.url);
  assert.ok(existsSync(new URL("mandelbrot.webp", folder)));
  for (const { id } of JULIA_MAP_PICTURES) {
    assert.ok(existsSync(new URL(`julia-${id}.webp`, folder)), id);
  }
});
