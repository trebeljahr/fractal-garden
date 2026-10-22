import assert from "node:assert/strict";
import { test } from "node:test";
import { JULIA_PLACES, JULIA_PRESETS } from "../utils/escapeTimePlaces.ts";
import { decodeView, encodeView, restoreConfig } from "../utils/explorerShare.ts";
import { matchesJuliaConstant, matchesPlace } from "../utils/fractalPlaces.ts";

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
