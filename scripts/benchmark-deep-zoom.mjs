import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { performance } from "node:perf_hooks";
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
const { createViewportAtLog } = require("../utils/deepZoom/math.ts");
const { buildReference } = require("../utils/deepZoom/orbit.ts");
const fixtures = [
  ["Seahorse tail", "mandelbrot", [-0.7435669, 0.1314023], Math.log2(0.0006), [0, 0], 1400],
  [
    "Deep boundary",
    "mandelbrot",
    ["-0.743643887037151007923796441434256376153", "0.131825904205311970493132056385139"],
    -300,
    [0, 0],
    4096,
  ],
  ["Deep antenna", "mandelbrot", [-2, 0], -1000 * Math.log2(10), [0, 0], 8192],
  ["Julia boundary", "julia", [0.1, 0.5], -100, [-0.8, 0.156], 2400],
  ["Julia unit circle", "julia", [1, 0], -1000 * Math.log2(10), [0, 0], 8192],
  ["Ship sail folds", "burning-ship", [-1.77375, -0.055625], Math.log2(0.004), [0, 0], 1400],
];
const results = fixtures.map(([name, formula, center, depth, c, iterations]) => {
  const view = createViewportAtLog(center, depth);
  const run = () => buildReference(view, formula, c, iterations);
  const reference = run();
  const hash = createHash("sha256").update(Buffer.from(reference.orbit.buffer));
  if (reference.critical) hash.update(Buffer.from(reference.critical.orbit.buffer));
  // Warm up before five bounded samples; retain equal workload across revisions.
  for (let i = 0; i < 5; i++) run();
  const samples = [];
  for (let sample = 0; sample < 5; sample++) {
    const start = performance.now();
    for (let i = 0; i < 20; i++) run();
    samples.push((performance.now() - start) / 20);
  }
  samples.sort((a, b) => a - b);
  return {
    name,
    formula,
    bits: view.bits,
    iterations,
    length: reference.length,
    medianMs: samples[2],
    samplesMs: samples,
    sha256: hash.digest("hex"),
  };
});
const output = JSON.stringify(results, null, 2);
if (process.argv[2]) writeFileSync(process.argv[2], `${output}\n`);
console.log(output);
