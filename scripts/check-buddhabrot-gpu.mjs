import { readFileSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

// Produces a Playwright CLI run-code payload. Uses the production GPU renderer.
// node scripts/check-buddhabrot-gpu.mjs /private/tmp/check-buddhabrot.js
// playwright-cli run-code --filename=/private/tmp/check-buddhabrot.js
const root = fileURLToPath(new URL("../", import.meta.url));
const sources = {};
function bundle(path) {
  const key = relative(root, path).replace(/\.ts$/, "");
  if (sources[key]) return;
  const source = ts.transpileModule(readFileSync(path, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  sources[key] = source;
  for (const match of source.matchAll(/require\("(\.[^"]+)"\)/g))
    bundle(resolve(dirname(path), `${match[1]}.ts`));
}
bundle(resolve(root, "utils/buddhabrotGpu/renderer.ts"));

async function check(sources) {
  const modules = {};
  const load = (key) => {
    if (modules[key]) return modules[key].exports;
    const module = { exports: {} };
    modules[key] = module;
    const require = (id) => {
      const parts = key.split("/").slice(0, -1);
      for (const part of id.split("/")) {
        if (part === "..") parts.pop();
        else if (part !== ".") parts.push(part);
      }
      return load(parts.join("/"));
    };
    new Function("require", "module", "exports", sources[key])(require, module, module.exports);
    return module.exports;
  };
  const assert = (condition, message) => {
    if (!condition) throw new Error(message);
  };
  const { BuddhabrotGpuRenderer } = load("utils/buddhabrotGpu/renderer");
  const { getBuddhabrotViewport } = load("utils/render/buddhabrotMath");
  const canvas = document.createElement("canvas");
  const renderer = await BuddhabrotGpuRenderer.create(canvas);
  assert(renderer, "Hardware WebGPU renderer required for this check");
  const device = renderer.device;
  const errors = [];
  device.addEventListener("uncapturederror", (event) => errors.push(event.error.message));
  const params = {
    maxIterations: 20,
    minOrbitLength: 0,
    paused: false,
    samplesPerFrame: 131072,
    exposure: 0.9,
    color: "#ffffff",
    background: "#000000",
  };
  const read = async (buffer, bytes = buffer.size) => {
    const staging = device.createBuffer({
      size: bytes,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
    });
    const encoder = device.createCommandEncoder();
    encoder.copyBufferToBuffer(buffer, 0, staging, 0, bytes);
    device.queue.submit([encoder.finish()]);
    await staging.mapAsync(GPUMapMode.READ);
    const result = staging.getMappedRange().slice(0);
    staging.unmap();
    staging.destroy();
    return result;
  };
  const frame = async () => {
    const start = performance.now();
    renderer.draw();
    await device.queue.onSubmittedWorkDone();
    return performance.now() - start;
  };
  const identical = (a, b) => a.length === b.length && a.every((n, i) => n === b[i]);
  const summary = (times) => {
    const sorted = times.toSorted((a, b) => a - b);
    return {
      medianMs: sorted[Math.floor(sorted.length / 2)],
      p95Ms: sorted[Math.ceil(sorted.length * 0.95) - 1],
      maxMs: sorted.at(-1),
    };
  };
  try {
    renderer.resize(192, 160, 1);
    renderer.update(params);
    await frame();
    const seeds = await read(renderer.seeds, renderer.stats.cachedSamples * 16);
    const sf = new Float32Array(seeds),
      si = new Uint32Array(seeds);
    const bounds = getBuddhabrotViewport(192, 160);
    const expected = new Float64Array(192 * 160);
    let maxLength = 0;
    for (let seed = 0; seed < renderer.stats.cachedSamples; seed++) {
      const offset = seed * 4,
        cr = sf[offset],
        ci = sf[offset + 1],
        length = si[offset + 2],
        weight = si[offset + 3];
      maxLength = Math.max(maxLength, length);
      assert(length <= 20 && weight <= 512, "Invalid escape length or importance weight");
      let r = 0,
        i = 0;
      for (let step = 0; step < length - 1; step++) {
        [r, i] = [r * r - i * i + cr, 2 * r * i + ci];
        const y = Math.floor(((bounds.maxY + r) / (bounds.maxY - bounds.minY)) * 160);
        for (const xValue of [i, -i]) {
          const x = Math.floor(((xValue - bounds.minX) / (bounds.maxX - bounds.minX)) * 192);
          if (x >= 0 && x < 192 && y >= 0 && y < 160) expected[y * 192 + x] += weight;
        }
      }
    }
    const actual = new Uint32Array(await read(renderer.target.low));
    const high = new Uint32Array(await read(renderer.target.high));
    assert(
      high.every((n) => n === 0),
      "Unexpected counter overflow/underflow",
    );
    let mass = 0,
      difference = 0;
    for (let i = 0; i < actual.length; i++) {
      mass += actual[i];
      difference += Math.abs(actual[i] - expected[i]);
    }
    const oracleRelativeError = difference / mass;
    assert(maxLength === 20 && mass > 0, "20-step sampling produced no usable picture");
    assert(oracleRelativeError < 0.005, `CPU/GPU density mismatch: ${oracleRelativeError}`);
    while (renderer.stats.samples <= renderer.stats.cacheCapacity + 262144) await frame();
    renderer.update({ ...params, paused: true });
    await frame();
    const before = new Uint32Array(await read(renderer.target.low));
    const saved = renderer.stats;
    renderer.update({ ...params, paused: true, viewport: { x: 0.13, y: -0.1, zoom: 4 } });
    await frame();
    renderer.update({ ...params, paused: true });
    await frame();
    const after = new Uint32Array(await read(renderer.target.low));
    assert(
      identical(before, after),
      "Cache replay differs from accumulated density after replacement",
    );
    assert(renderer.stats.samples === saved.samples, "Paused movement added or discarded samples");
    const exported = await renderer.exportPng(2);
    const bitmap = await createImageBitmap(exported);
    assert(bitmap.width === 384 && bitmap.height === 320, "Incorrect high-resolution export size");
    bitmap.close();
    assert(
      identical(after, new Uint32Array(await read(renderer.target.low))),
      "Export changed the live histogram",
    );

    const performanceResults = [];
    for (const ratio of [1, 2]) {
      renderer.resize(1280, 720, ratio);
      renderer.update({ ...params, samplesPerFrame: 16384, paused: true });
      await frame();
      const moving = [];
      for (let n = 0; n < 12; n++) {
        renderer.update({
          ...params,
          paused: true,
          viewport: { x: n * 0.002, y: -n * 0.001, zoom: 1 + n * 0.1 },
        });
        moving.push(await frame());
        assert(
          renderer.stats.width === 1280 * ratio && renderer.stats.height === 720 * ratio,
          "Movement reduced framebuffer resolution",
        );
        assert(
          renderer.stats.cachedSamples === saved.cachedSamples,
          "Movement discarded cached paths",
        );
      }
      const sampling = [];
      renderer.update({ ...params, samplesPerFrame: 16384 });
      await frame();
      for (let n = 0; n < 12; n++) sampling.push(await frame());
      performanceResults.push({
        width: 1280 * ratio,
        height: 720 * ratio,
        moving: summary(moving),
        sampling: summary(sampling),
      });
    }
    renderer.update({ ...params, maxIterations: 20000, minOrbitLength: 0, paused: true });
    await frame();
    assert(renderer.stats.samples <= 839, "High iteration opening batch exceeded its work budget");
    assert(errors.length === 0, errors.join("\n"));
    const adapter = await navigator.gpu.requestAdapter();
    return {
      passed: true,
      adapter: adapter?.info,
      oracleRelativeError,
      cacheCapacity: saved.cacheCapacity,
      replayExact: true,
      exportSize: [384, 320],
      performance: performanceResults,
      errors,
    };
  } finally {
    renderer.dispose();
    canvas.remove();
  }
}

const output = resolve(process.argv[2] ?? "/private/tmp/check-buddhabrot.js");
writeFileSync(
  output,
  `async (page) => { const result = await page.evaluate(${check.toString()}, ${JSON.stringify(sources)}); console.log(JSON.stringify(result)); return result; }`,
);
console.log(output);
