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
const { prepareZoom } = require("../utils/lsystem/zoom.ts");
const { DEFAULT_SPEC } = require("../utils/lsystem/spec.ts");
const spec = {
  ...DEFAULT_SPEC,
  axiom: "F",
  rules: [{ symbol: "F", replacement: "-F++F-" }],
  angle: 45,
  startAngle: 90,
};
const viewAt = (zoom, scale, size) => ({
  originX: 0,
  originY: 0,
  offsetX: 0n,
  offsetY: 0n,
  bits: Math.max(128, Math.ceil(Math.log2(zoom)) + 64),
  scale: scale * zoom,
  halfWidth: size / 2,
  halfHeight: size / 2,
  zoom,
});

test("Lévy refinement stops one generation earlier across zoom levels and resolutions", () => {
  for (const [baseGeneration, scale] of [
    [4, 40],
    [16, 2],
  ]) {
    for (const size of [400, 800, 1600]) {
      const original = prepareZoom(spec, baseGeneration);
      const adjusted = prepareZoom(spec, baseGeneration, -1);
      assert.notEqual(typeof original, "string");
      assert.notEqual(typeof adjusted, "string");
      // Include zooming back out to exercise the cached generation search.
      for (const zoom of [1, 1.1, 2, 5, 20, 100, 1e30, 5, 1]) {
        const view = viewAt(zoom, scale, size);
        const before = original.render(view);
        const after = adjusted.render(view);
        assert.equal(after.generation, Math.max(baseGeneration, before.generation - 1));
        assert.equal(after.limited, false);
        assert.ok(after.count > 0);
        if (zoom === 1) assert.deepEqual(after.positions, before.positions);
      }
    }
  }
});

test("worker caches include the page's refinement offset", () => {
  const messages = [];
  globalThis.self = { postMessage: (message) => messages.push(message) };
  try {
    require("../utils/lsystem/worker.ts");
    for (const [id, detailOffset] of [
      [1, 0],
      [2, -1],
      [3, 0],
    ]) {
      self.onmessage({
        data: {
          id,
          spec,
          iterations: 16,
          detailOffset,
          view: viewAt(20, 2, 800),
        },
      });
    }
    assert.equal(messages[1].detail.generation, messages[0].detail.generation - 1);
    assert.equal(messages[2].detail.generation, messages[0].detail.generation);
  } finally {
    delete globalThis.self;
  }
});
