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
  pngExportSize,
  renderCanvasPng,
  registerPngExporter,
  exportCanvasPng,
} = require("../utils/pngExport.ts");
const { watchDisplayResolution } = require("../utils/displayResolution.ts");

test("exports preserve aspect ratio, improve small previews, and retain larger native displays within safe bounds", () => {
  for (const [width, height, ratio] of [
    [1440, 908, 2],
    [390, 760, 3],
    [2560, 1440, 2],
    [10000, 10000, 4],
  ]) {
    const result = pngExportSize(width, height, ratio);
    assert.ok(Math.max(result.width, result.height) >= 4096);
    assert.ok(result.width <= 8192 && result.height <= 8192);
    assert.ok(result.width * result.height <= 32_010_000);
    assert.ok(Math.abs(result.width / result.height - width / height) < 0.001);
  }
  assert.deepEqual(pngExportSize(2560, 1440, 2), { width: 5120, height: 2880, ratio: 2 });
  assert.throws(() => pngExportSize(0, 100));
});

test("PNG snapshots the fresh large render and restores live size before encoding completes", async () => {
  let finish;
  const drawn = [];
  const canvas = {
    width: 1600,
    height: 900,
    getBoundingClientRect: () => ({ width: 800, height: 450 }),
    toBlob: (fn) => {
      assert.deepEqual(drawn.at(-1), [4096, 2304, 5.12]);
      finish = fn;
    },
  };
  const promise = renderCanvasPng(canvas, pngExportSize(800, 450, 2), (ratio) =>
    drawn.push([canvas.width, canvas.height, ratio]),
  );
  assert.deepEqual(drawn, [
    [4096, 2304, 5.12],
    [1600, 900, 2],
  ]);
  const blob = new Blob(["pixels"], { type: "image/png" });
  finish(blob);
  assert.equal(await promise, blob);
});

test("failed rendering and failed encoding both restore the live drawing", async () => {
  for (const errorAt of ["draw", "encode"]) {
    let finish;
    const drawn = [];
    const canvas = {
      width: 800,
      height: 450,
      getBoundingClientRect: () => ({ width: 800, height: 450 }),
      toBlob: (fn) => {
        finish = fn;
      },
    };
    const render = () =>
      renderCanvasPng(canvas, pngExportSize(800, 450), (ratio) => {
        drawn.push(ratio);
        if (errorAt === "draw" && ratio > 1) throw new Error("Draw failed");
      });
    if (errorAt === "draw") assert.throws(render, /Draw failed/);
    else {
      const promise = render();
      finish(null);
      await assert.rejects(promise, /encoding failed/);
    }
    assert.deepEqual([canvas.width, canvas.height], [800, 450]);
    assert.equal(drawn.at(-1), 1);
  }
});

test("DPR watcher re-arms after the display change and stops on disposal", () => {
  const original = {
    window: globalThis.window,
    requestAnimationFrame: globalThis.requestAnimationFrame,
    cancelAnimationFrame: globalThis.cancelAnimationFrame,
  };
  const queries = [];
  let updates = 0,
    scheduled;
  globalThis.requestAnimationFrame = (callback) => {
    scheduled = callback;
    return 1;
  };
  globalThis.cancelAnimationFrame = () => {
    scheduled = undefined;
  };
  globalThis.window = {
    devicePixelRatio: 2,
    addEventListener() {},
    removeEventListener() {},
    matchMedia: (query) => {
      const entry = {
        query,
        addEventListener: (_, listener) => {
          entry.listener = listener;
        },
        removeEventListener: () => {
          entry.listener = null;
        },
      };
      queries.push(entry);
      return entry;
    },
  };
  try {
    const stop = watchDisplayResolution(() => updates++);
    assert.equal(updates, 1);
    queries[0].listener();
    // Media events can precede the updated devicePixelRatio value.
    window.devicePixelRatio = 3;
    scheduled();
    assert.equal(queries[0].listener, null);
    assert.equal(queries[1].query, "(resolution: 3dppx)");
    assert.equal(updates, 2);
    queries[1].listener();
    window.devicePixelRatio = 2;
    scheduled();
    assert.equal(queries[2].query, "(resolution: 2dppx)");
    stop();
    assert.equal(queries[2].listener, null);
    assert.equal(scheduled, undefined);
  } finally {
    Object.assign(globalThis, original);
  }
});

test("canvas exporters are scoped to a canvas and stale cleanup preserves a replacement", async () => {
  const original = globalThis.window;
  globalThis.window = { devicePixelRatio: 2 };
  try {
    const canvas = { getBoundingClientRect: () => ({ width: 1000, height: 500 }) };
    const unregister = registerPngExporter(canvas, async () => {
      throw new Error("old exporter");
    });
    const blob = new Blob(["new export"]);
    const remove = registerPngExporter(canvas, async (size) => {
      assert.equal(size.width, 4096);
      return blob;
    });
    unregister();
    assert.equal(await exportCanvasPng(canvas), blob);
    remove();
  } finally {
    globalThis.window = original;
  }
});

test("GPU limits preserve native density where possible and bound large targets uniformly", () => {
  const { webglPixelRatio } = require("../utils/renderResolution.ts");
  const gl = {
    MAX_VIEWPORT_DIMS: "viewport",
    MAX_TEXTURE_SIZE: "texture",
    MAX_RENDERBUFFER_SIZE: "buffer",
    getParameter: (key) => (key === "viewport" ? [4096, 2048] : 4096),
  };
  assert.equal(webglPixelRatio(gl, 390, 600, 3), 3);
  const ratio = webglPixelRatio(gl, 1440, 900, 4);
  assert.equal(ratio, 2048 / 900);
  assert.ok(1440 * ratio < 4096);
  assert.equal(webglPixelRatio(gl, 1000, 1000, 4, 1_000_000), 1);
});
