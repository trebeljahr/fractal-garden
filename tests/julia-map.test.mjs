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
const { arrowTip, JULIA_MAP_PICTURES, mapPosition } = require("../utils/lessons/juliaMap.ts");
const { juliaExplorerLink } = require("../utils/lessons/linkedJulia.ts");
const { decodeView } = require("../utils/explorerShare.ts");

function jumpsToEscape({ real, imaginary }, steps) {
  let x = 0;
  let y = 0;
  for (let step = 1; step <= steps; step++) {
    [x, y] = [x * x - y * y + real, 2 * x * y + imaginary];
    if (x * x + y * y > 4) return step;
  }
  return null;
}

test("the article's claims hold: five marked c lie outside the Mandelbrot set", () => {
  const outside = JULIA_MAP_PICTURES.filter(({ c }) => jumpsToEscape(c, 1_000_000) !== null);
  assert.deepEqual(
    outside.map(({ id }) => id),
    ["spiral", "dust", "rings", "stars", "broken-line"],
  );
  assert.equal(jumpsToEscape({ real: -0.8, imaginary: 0.156 }, 1_000), 252);
});

test("the pictures fill the ring around the map", () => {
  const cells = JULIA_MAP_PICTURES.map(({ row, column }) => `${row},${column}`);
  assert.equal(new Set(cells).size, 12);
  for (const { id, row, column } of JULIA_MAP_PICTURES) {
    assert.ok(
      [row, column].some((at) => at === 0 || at === 3),
      id,
    );
  }
});

test("no two arrows cross", () => {
  const side = (a, b, p) => (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x);
  const arrows = JULIA_MAP_PICTURES.map((picture) => ({
    id: picture.id,
    from: mapPosition(picture.c),
    to: arrowTip(picture),
  }));
  for (const [index, a] of arrows.entries()) {
    for (const b of arrows.slice(index + 1)) {
      const crosses =
        side(a.from, a.to, b.from) * side(a.from, a.to, b.to) < 0 &&
        side(b.from, b.to, a.from) * side(b.from, b.to, a.to) < 0;
      assert.ok(!crosses, `${a.id} crosses ${b.id}`);
    }
  }
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
