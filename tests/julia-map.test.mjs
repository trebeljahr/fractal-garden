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
const {
  arrowTip,
  CAPTION,
  JULIA_MAP_PICTURES,
  mapPosition,
  tileBox,
} = require("../utils/lessons/juliaMap.ts");
const { MANDELBROT_COLORING } = require("../utils/escapeTimeColoring.ts");
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

test("the article's claims hold: six marked c lie outside the Mandelbrot set", () => {
  const outside = JULIA_MAP_PICTURES.filter(({ c }) => jumpsToEscape(c, 1_000_000) !== null);
  assert.deepEqual(
    outside.map(({ id }) => id),
    ["bolts", "spiral", "islands", "rings", "dendrite", "stars"],
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

test("no arrow runs over another dot or picture", () => {
  const samples = 200;
  for (const picture of JULIA_MAP_PICTURES) {
    const from = mapPosition(picture.c);
    const to = arrowTip(picture);
    for (const other of JULIA_MAP_PICTURES.filter((each) => each !== picture)) {
      const dot = mapPosition(other.c);
      const box = tileBox(other);
      for (let sample = 0; sample <= samples; sample++) {
        const x = from.x + ((to.x - from.x) * sample) / samples;
        const y = from.y + ((to.y - from.y) * sample) / samples;
        assert.ok(Math.hypot(x - dot.x, y - dot.y) > 5, `${picture.id} crosses ${other.id}'s dot`);
        const inPicture =
          x > box.x && x < box.x + box.width && y > box.y - CAPTION && y < box.y + box.width;
        assert.ok(!inPicture, `${picture.id} crosses ${other.id}'s picture`);
      }
    }
  }
});

test("each picture links to the explorer view of its own c in its own colors", () => {
  const { colorDensity, colorOffset, interior } = MANDELBROT_COLORING;
  for (const { c } of JULIA_MAP_PICTURES) {
    const link = juliaExplorerLink(c, MANDELBROT_COLORING);
    const view = decodeView(new URL(link, "https://x.test").hash, "/julia-set");
    assert.deepEqual(view.parts.config, {
      cReal: c.real,
      cImag: c.imaginary,
      colorDensity,
      colorOffset,
      interior,
    });
  }
});

test("each picture has its saved image", () => {
  const folder = new URL("../public/assets/julia-map/", import.meta.url);
  assert.ok(existsSync(new URL("mandelbrot.webp", folder)));
  for (const { id } of JULIA_MAP_PICTURES) {
    assert.ok(existsSync(new URL(`julia-${id}.webp`, folder)), id);
  }
});
