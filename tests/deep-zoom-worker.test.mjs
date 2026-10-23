import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import ts from "typescript";

const require = createRequire(import.meta.url);
require.extensions[".ts"] = (module, filename) => {
  module._compile(
    ts.transpileModule(readFileSync(filename, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText,
    filename,
  );
};
const { createViewportAtLog, moveViewport } = require("../utils/deepZoom/math.ts");
const { buildReference } = require("../utils/deepZoom/orbit.ts");
let reply;
const saved = globalThis.self;
globalThis.self = {
  postMessage: (data, options) => {
    reply = structuredClone(data, options);
    for (const buffer of options?.transfer ?? []) assert.equal(buffer.byteLength, 0);
  },
};
require("../workers/deepZoom.worker.ts");
const receive = globalThis.self.onmessage;

test("worker transfers every orbit and Julia critical orbit in a repair packet", () => {
  const view = createViewportAtLog([0.1, 0.5], -100);
  const views = [view, moveViewport(view, 0.01, 0), moveViewport(view, 0, -0.01)];
  const c = [-0.8, 0.156];
  receive({
    data: {
      id: 7,
      view,
      formula: "julia",
      c,
      iterations: 300,
      tiles: views.map((view) => ({ view })),
    },
  });
  assert.equal(reply.id, 7);
  assert.equal(reply.references.length, 3);
  reply.references.forEach((reference, index) => {
    assert.deepEqual(reference, buildReference(views[index], "julia", c, 300));
  });
});

test("worker retains single-reference requests and reports calculation failures", () => {
  const view = createViewportAtLog([-2, 0], -1000);
  receive({ data: { id: 8, view, formula: "mandelbrot", c: [0, 0], iterations: 8192 } });
  assert.equal(reply.references.length, 1);
  assert.deepEqual(reply.references[0], buildReference(view, "mandelbrot", [0, 0], 8192));
  receive({ data: { id: 9, view, formula: "mandelbrot", c: [0, 0], iterations: -1 } });
  assert.equal(reply.id, 9);
  assert.match(reply.error, /Invalid reference/);
});

test.after(() => {
  globalThis.self = saved;
});
