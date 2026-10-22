import assert from "node:assert/strict";
import { test } from "node:test";
import {
  decodeView,
  encodeView,
  MAX_SHARE_LENGTH,
  readViewport,
  restoreConfig,
  snapshotConfig,
} from "../utils/explorerShare.ts";
import { PAGE_SEO } from "../utils/pageSeo.ts";
import { getRelatedFractals } from "../utils/relatedFractals.ts";

const rules = [
  { path: "iterations", kind: "number", min: 0, max: 8 },
  { path: "ruleset.color", kind: "color" },
  { path: "variant", kind: "select", options: ["tetrahedron", "pyramid"] },
  { path: "autoRotate", kind: "boolean" },
];

test("shared views preserve exact coordinates, colors and Unicode without leaking functions", () => {
  const initLength = () => 42;
  const config = {
    iterations: 4,
    ruleset: { color: "#aabbcc", axiom: "F", initLength },
    variant: "tetrahedron",
    autoRotate: true,
  };
  const parts = {
    config: snapshotConfig(config, rules),
    viewport: { center: [-0.7463, 0.1102], zoomSize: 0.005 },
    label: "Lévy 🌿",
  };
  const saved = decodeView(encodeView("/mandelbrot", parts), "/mandelbrot");
  assert.deepEqual(saved.parts, parts);
  const restored = restoreConfig(config, saved.parts.config, rules);
  assert.equal(restored.ruleset.initLength, initLength);
  assert.equal(restored.ruleset.axiom, "F");
  assert.equal(restored.autoRotate, false);
  assert.equal(config.autoRotate, true);
  assert.deepEqual(readViewport(saved.parts.viewport, 0.00005, 4), parts.viewport);
});

test("reject broken, oversized, wrong-page and unsupported-version links", () => {
  assert.equal(decodeView("#an-article-heading", "/mandelbrot"), null);
  assert.throws(() => decodeView("#view=%bad", "/mandelbrot"));
  assert.throws(() => decodeView(`#view=${"a".repeat(MAX_SHARE_LENGTH + 1)}`, "/mandelbrot"));
  assert.throws(() => decodeView(encodeView("/julia-set", {}), "/mandelbrot"));
  const badVersion = btoa(JSON.stringify({ version: 99, path: "/mandelbrot", parts: {} }));
  assert.throws(() => decodeView(`#view=${badVersion}`, "/mandelbrot"));
});

test("untrusted settings cannot replace rules, functions or unrelated object properties", () => {
  const initial = {
    iterations: 2,
    ruleset: { color: "#ffffff", axiom: "F", initLength: () => 10 },
    variant: "tetrahedron",
    autoRotate: true,
  };
  const malicious = JSON.parse(
    '{"iterations":3,"ruleset":{"color":"#123456","axiom":"HUGE","initLength":"oops"},"__proto__":{"polluted":true}}',
  );
  const result = restoreConfig(initial, malicious, rules);
  assert.equal(result.ruleset.axiom, "F");
  assert.equal(result.ruleset.initLength, initial.ruleset.initLength);
  assert.equal(result.ruleset.color, "#123456");
  assert.equal({}.polluted, undefined);
  assert.equal(initial.ruleset.color, "#ffffff");
  for (const saved of [
    { iterations: 1e9 },
    { iterations: NaN },
    { variant: "unknown" },
    { ruleset: { color: "url(https://example.com)" } },
  ]) {
    assert.throws(() => restoreConfig(initial, saved, rules));
  }
});

test("refuse invalid viewport positions and unreasonable zoom", () => {
  for (const view of [
    { center: [0, Infinity], zoomSize: 1 },
    { center: [0, 0], zoomSize: -1 },
    { center: [0, 0], zoomSize: 1e-300 },
    { center: [0], zoomSize: 1 },
  ]) {
    assert.throws(() => readViewport(view, 0.00005, 4));
  }
});

test("drag rotations beyond a full turn remain shareable", () => {
  const rule = [{ path: "rotationY", kind: "number", min: -180, max: 180 }];
  const snapshot = snapshotConfig({ rotationY: 732 }, rule);
  assert.deepEqual(restoreConfig({ rotationY: 0 }, snapshot, rule), { rotationY: 12 });
});

test("related links explain connections and never link a fractal to itself", () => {
  for (const path of [
    "/mandelbrot",
    "/burning-ship",
    "/l-system/sierpinski-triangle",
    "/sierpinski-carpet",
    "/sierpinski-tetrahedron",
  ]) {
    const related = getRelatedFractals(path);
    assert.ok(related.length >= 2);
    assert.ok(related.every((entry) => entry.href !== path && entry.reason.length > 20));
    assert.equal(new Set(related.map((entry) => entry.href)).size, related.length);
  }
});

test("every fractal has real, crawlable related destinations", () => {
  for (const path of Object.keys(PAGE_SEO).filter(
    (path) => !["/", "/privacy", "/imprint"].includes(path),
  )) {
    const related = getRelatedFractals(path);
    assert.ok(related.length, path);
    for (const { href } of related) assert.ok(PAGE_SEO[href], `${path} -> ${href}`);
  }
});
