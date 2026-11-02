import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { test } from "node:test";
import { createViewport } from "../utils/deepZoom/math.ts";
import {
  BURNING_SHIP_PLACES,
  JULIA_PLACES,
  JULIA_PRESETS,
  MANDELBROT_PLACES,
} from "../utils/escapeTimePlaces.ts";
import { decodeView, encodeView, restoreConfig } from "../utils/explorerShare.ts";
import { formatZoom, matchesJuliaConstant, matchesPlace } from "../utils/fractalPlaces.ts";

test("large zooms use powers of ten and smaller ones keep plain digits", () => {
  assert.deepEqual(formatZoom(1), { digits: "1" });
  assert.deepEqual(formatZoom(18.75), { digits: "18.8" });
  assert.deepEqual(formatZoom(375_000), { digits: "375,000" });
  assert.deepEqual(formatZoom(999_999), { exponent: 6 });
  assert.deepEqual(formatZoom(3_380_000), { mantissa: "3.38", exponent: 6 });
  assert.deepEqual(formatZoom(1.5 / 1e-30), { mantissa: "1.5", exponent: 30 });
  assert.deepEqual(formatZoom(1.5 / 1.5e-100), { exponent: 100 });
});

test("the Rabbit preset sends zero through a three-step repeat", () => {
  const { cReal, cImag } = JULIA_PRESETS.Rabbit;
  let [x, y] = [0, 0];
  for (let step = 0; step < 3; step++) [x, y] = [x * x - y * y + cReal, 2 * x * y + cImag];
  assert.ok(Math.hypot(x, y) < 1e-4);
});

test("every Rabbit start that stays inside ends on the same three places", () => {
  const { cReal, cImag } = JULIA_PRESETS.Rabbit;
  const next = ([x, y]) => [x * x - y * y + cReal, 2 * x * y + cImag];
  let settled = [0, 0];
  for (let i = 0; i < 3000; i++) settled = next(settled);
  const places = [settled, next(settled), next(next(settled))];
  let inside = 0;
  for (let a = -28; a <= 28; a++) {
    for (let b = -22; b <= 22; b++) {
      let z = [a / 10, b / 10];
      let i = 0;
      while (i < 3000 && Math.hypot(...z) <= 2) {
        z = next(z);
        i++;
      }
      if (i < 3000) continue;
      inside++;
      assert.ok(
        places.some(([x, y]) => Math.hypot(x - z[0], y - z[1]) < 1e-6),
        `${a} ${b}`,
      );
    }
  }
  assert.ok(inside > 0);
});

test("every destination has a preview on disk", () => {
  for (const view of [...JULIA_PLACES, ...MANDELBROT_PLACES, ...BURNING_SHIP_PLACES]) {
    assert.ok(view.preview, view.id);
    assert.ok(existsSync(new URL(`../public${view.preview}`, import.meta.url)), view.preview);
  }
});

test("deep destinations carry enough digits for their depth", () => {
  const deep = MANDELBROT_PLACES.filter((view) => view.preciseCenter);
  assert.ok(deep.length >= 4);
  for (const view of deep) {
    const depth = Math.ceil(-Math.log10(view.zoomSize));
    for (const [index, coordinate] of view.preciseCenter.entries()) {
      if (coordinate !== "0") assert.ok(coordinate.split(".")[1].length >= depth + 30, view.id);
      assert.ok(Math.abs(Number(coordinate) - view.center[index]) < 1e-15, view.id);
    }
    assert.equal(
      createViewport(view.preciseCenter, view.zoomSize).logZoom,
      Math.log2(view.zoomSize),
    );
  }
});

test("Julia destinations with the same framing match the actual constant", () => {
  const views = JULIA_PLACES.filter((view) => view.zoomSize === 1.8);
  for (const selected of views) {
    const c = [selected.parameters.cReal, selected.parameters.cImag];
    assert.deepEqual(
      views.filter((view) => matchesPlace(view, selected) && matchesJuliaConstant(view, c)),
      [selected],
    );
    assert.equal(matchesJuliaConstant(selected, [c[0] + 0.001, c[1]]), false);
  }
});

test("panning or zooming clears the current destination without depending on colors", () => {
  const place = JULIA_PLACES.find((view) => view.zoomSize < 0.01);
  assert.equal(matchesPlace(place, { center: [...place.center], zoomSize: place.zoomSize }), true);
  assert.equal(
    matchesPlace(place, { ...place, center: [place.center[0] + 0.001, place.center[1]] }),
    false,
  );
  assert.equal(matchesPlace(place, { ...place, zoomSize: place.zoomSize * 1.1 }), false);
});

test("every Julia family can survive the same share validation as the studio controls", () => {
  const rules = [
    { path: "preset", kind: "select", options: Object.keys(JULIA_PRESETS) },
    { path: "cReal", kind: "number", min: -1, max: 1 },
    { path: "cImag", kind: "number", min: -1, max: 1 },
  ];
  for (const view of JULIA_PLACES) {
    const saved = decodeView(encodeView("/julia-set", { config: view.parameters }), "/julia-set");
    assert.deepEqual(restoreConfig({}, saved.parts.config, rules), view.parameters);
  }
});
