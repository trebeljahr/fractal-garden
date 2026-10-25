// CPU sort benchmark only. It preserves the same Float32 depths and stable face
// order; Canvas rasterization and complete-frame performance are separate costs.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import ts from "typescript";

const require = createRequire(import.meta.url);
require.extensions[".ts"] = (module, filename) =>
  module._compile(
    ts.transpileModule(readFileSync(filename, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText,
    filename,
  );
const { sortFloatDepthOrder } = require("../utils/render/floatDepthOrder.ts");
const { drawPolyhedronScene } = require("../utils/polyhedronFractals.ts");
const { buildScene } = require("../utils/render/scene3d.ts");

const median = (values) => values.sort((a, b) => a - b)[Math.floor(values.length / 2)];
function benchmark(name, depths, seed) {
  const native = seed.slice();
  const optimized = seed.slice();
  native.sort((a, b) => depths[a] - depths[b]);
  sortFloatDepthOrder(depths, optimized);
  assert.deepEqual(optimized, native, `${name}: face order changed`);
  const timings = { native: [], optimized: [] };
  for (let round = 0; round < 30; round++) {
    // Alternate measurement order to avoid always favoring the warmer run.
    for (const kind of round % 2 ? ["optimized", "native"] : ["native", "optimized"]) {
      const order = kind === "native" ? native : optimized;
      order.set(seed);
      const start = performance.now();
      if (kind === "native") order.sort((a, b) => depths[a] - depths[b]);
      else sortFloatDepthOrder(depths, order);
      const elapsed = performance.now() - start;
      if (round >= 5) timings[kind].push(elapsed);
    }
  }
  const nativeMs = median(timings.native);
  const optimizedMs = median(timings.optimized);
  return {
    name,
    visibleFaces: seed.length,
    nativeMs,
    optimizedMs,
    speedup: nativeMs / optimizedMs,
    exactOrder: true,
  };
}

const results = [];
for (const [name, spec, rank] of [
  ["quadratic-koch-3", { kind: "quadraticKoch3d" }, 3],
  ["menger-3", { kind: "menger" }, 3],
  ["koch-tetrahedron-5", { kind: "kochSurface", start: "tetrahedron" }, 5],
]) {
  const { scene } = buildScene(spec, rank);
  let visible = 0;
  const ctx = {
    fillRect() {},
    beginPath() {
      visible++;
    },
    moveTo() {},
    lineTo() {},
    closePath() {},
    fill() {},
    stroke() {},
  };
  drawPolyhedronScene(ctx, 1280, 720, scene, {
    rotationX: 23,
    rotationY: -37,
    cameraDistance: 6,
    background: "#252424",
    fillColor: "#8fb0ff",
    strokeColor: "#dce9ff",
    lineWidth: 0.7,
    showFaces: true,
    showWireframe: true,
  });
  const seed = scene.order.slice(0, visible).sort();
  results.push(benchmark(name, scene.depths, seed));
}
const depths = Float32Array.from(
  { length: 60000 },
  (_, i) => Math.sin(i * 13.351) * 2 + ((i % 17) - 8) * 0.001,
);
results.push(
  benchmark(
    "60000-mixed-depths",
    depths,
    Uint32Array.from({ length: depths.length }, (_, i) => i),
  ),
);
console.log(JSON.stringify({ benchmark: "stable-float32-face-sort", results }, null, 2));
