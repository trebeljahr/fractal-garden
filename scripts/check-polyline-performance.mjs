import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

// node scripts/check-polyline-performance.mjs BASELINE.ts CALLBACK.js [CAPTURES]
// node scripts/check-polyline-performance.mjs --extract-captures CAPTURES/captures.json
// POLYLINE_WIDTH/HEIGHT/SAMPLES/WARMUP default to 640/480/8/3.
// POLYLINE_FILTER selects fixture names. Run the callback with Playwright CLI.
const args = process.argv.slice(2);
if (args[0] === "--extract-captures") {
  const path = args[1];
  if (!path) throw Error("--extract-captures requires a bundle path");
  const images = JSON.parse(readFileSync(path, "utf8"));
  if (!Array.isArray(images)) throw Error("Capture bundle must contain an image array");
  mkdirSync(dirname(path), { recursive: true });
  for (const { name, data } of images) {
    if (
      typeof name !== "string" ||
      basename(name) !== name ||
      !name.endsWith(".png") ||
      typeof data !== "string" ||
      !data.startsWith("data:image/png;base64,")
    )
      throw Error("Invalid PNG capture entry");
    writeFileSync(join(dirname(path), name), Buffer.from(data.split(",")[1], "base64"));
  }
  console.log(JSON.stringify({ extracted: images.length, directory: dirname(path) }));
  process.exit(0);
}
if (!args[0]) throw Error("Supply the unmodified polyline3d.ts source as the first argument");
const width = Number(process.env.POLYLINE_WIDTH ?? 640),
  height = Number(process.env.POLYLINE_HEIGHT ?? 480),
  samples = Number(process.env.POLYLINE_SAMPLES ?? 8),
  warmup = Number(process.env.POLYLINE_WARMUP ?? 3);
for (const [name, value] of Object.entries({ width, height, samples, warmup }))
  if (!Number.isInteger(value) || value < 1) throw Error(`${name} must be a positive integer`);
const root = fileURLToPath(new URL("../", import.meta.url)),
  entry = "utils/polyline3d.ts",
  modules = {};
const transpile = (source, filename) =>
  ts.transpileModule(source, {
    fileName: filename,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
function bundle(id) {
  if (modules[id]) return;
  const filename = resolve(root, id),
    code = transpile(readFileSync(filename, "utf8"), filename),
    dependencies = {};
  modules[id] = { code, dependencies };
  for (const [, request] of code.matchAll(/require\(["']([^"']+)["']\)/g)) {
    if (!request.startsWith(".")) throw Error(`Nonlocal browser dependency: ${request}`);
    const dependency = relative(root, resolve(dirname(filename), `${request}.ts`));
    dependencies[request] = dependency;
    bundle(dependency);
  }
}
bundle(entry);
const baseline = transpile(readFileSync(args[0], "utf8"), resolve(root, entry));
const fixtures = ["lorenz-150000", "rossler-100000", "hilbert-32768"].flatMap((shape) =>
  [
    { view: "gradient-orbit", rotationX: 23, rotationY: -37, cameraDistance: 6, lineWidth: 1.1 },
    {
      view: "spatial-depth",
      rotationX: -55,
      rotationY: 121,
      cameraDistance: 6,
      lineWidth: 0.8,
      spatialCamera: { target: ["0", "0", "0"], bits: 160, zoom: 0.5 },
    },
    {
      view: "wire-close-clipped",
      rotationX: 9,
      rotationY: 24,
      cameraDistance: 0.65,
      lineWidth: 0.55,
    },
  ].map(({ view, ...options }) => ({
    name: `${shape}-${view}`,
    shape,
    options: {
      background: "#252424",
      nearColor: "#f8bc75",
      farColor: "#516cad",
      farAlpha: 0.2,
      ...options,
    },
  })),
);
const selected = fixtures.filter((fixture) =>
  fixture.name.includes(process.env.POLYLINE_FILTER ?? ""),
);
if (!selected.length) throw Error("POLYLINE_FILTER did not match a fixture");

async function check(page, payload, captures) {
  const result = await page.evaluate(
    async ({ modules, baseline, entry, fixtures, width, height, samples, warmup, capture }) => {
      function variant(isBaseline, instrument = false) {
        const cache = {},
          stats = { active: false, arrays: 0, views: 0, backingBytes: 0, byType: {} };
        const types = [Float32Array, Float64Array, Uint8Array, Uint32Array];
        const constructors = instrument
          ? types.map(
              (Type) =>
                class extends Type {
                  constructor(...args) {
                    super(...args);
                    if (stats.active) {
                      const view = args[0] instanceof ArrayBuffer;
                      stats.arrays++;
                      stats.views += Number(view);
                      stats.backingBytes += view ? 0 : this.byteLength;
                      stats.byType[Type.name] ??= { arrays: 0, backingBytes: 0 };
                      const count = stats.byType[Type.name];
                      count.arrays++;
                      count.backingBytes += view ? 0 : this.byteLength;
                    }
                  }
                },
            )
          : types;
        function load(id) {
          if (cache[id]) return cache[id].exports;
          const module = { exports: {} };
          cache[id] = module;
          const { code, dependencies } = modules[id];
          new Function(
            "module",
            "exports",
            "require",
            "Float32Array",
            "Float64Array",
            "Uint8Array",
            "Uint32Array",
            isBaseline && id === entry ? baseline : code,
          )(module, module.exports, (request) => load(dependencies[request]), ...constructors);
          return module.exports;
        }
        return { poly: load(entry), stats };
      }
      function build(poly, shape) {
        if (shape.startsWith("hilbert"))
          return poly.normalizePolyline(poly.generateHilbertCurve3D(5));
        if (shape.startsWith("lorenz"))
          return poly.createEndlessOrbit(
            (x, y, z, out) => {
              out[0] = 10 * (y - x);
              out[1] = x * (28 - z) - y;
              out[2] = x * y - (8 / 3) * z;
            },
            [0.1, 0, 0],
            0.005,
            149999,
            [0, 2, 1],
          ).polyline;
        return poly.normalizePolyline(
          poly.integrateRK4(
            (x, y, z, out) => {
              out[0] = -y - z;
              out[1] = x + 0.2 * y;
              out[2] = 0.2 + z * (x - 5.7);
            },
            [1, 1, 0],
            0.01,
            99999,
          ),
          [0, 2, 1],
        );
      }
      const implementations = [variant(true), variant(false)],
        labels = ["baseline", "reused-buffers"];
      const median = (values) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
      const results = [],
        images = [];
      for (const fixture of fixtures) {
        const canvases = implementations.map(() => {
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          return canvas;
        });
        try {
          const contexts = canvases.map((canvas) => {
            const context = canvas.getContext("2d", { willReadFrequently: false });
            if (!context) throw Error("Canvas 2D unavailable");
            return context;
          });
          const scenes = implementations.map(({ poly }) => build(poly, fixture.shape));
          const geometryBytes = scenes.map(
            (scene) =>
              new Uint8Array(
                scene.points.buffer,
                scene.points.byteOffset,
                scene.count * 3 * scene.points.BYTES_PER_ELEMENT,
              ),
          );
          let geometryChanges = Math.abs(geometryBytes[0].length - geometryBytes[1].length);
          for (let i = 0; i < Math.min(geometryBytes[0].length, geometryBytes[1].length); i++)
            geometryChanges += Number(geometryBytes[0][i] !== geometryBytes[1][i]);
          const timings = implementations.map(() => ({ submissionMs: [], synchronizedMs: [] }));
          const pixels = { changedBytes: 0, changedPixels: 0, maximumDelta: 0, checkedFrames: 0 };
          let finalOptions;
          for (let round = 0; round < warmup + samples; round++) {
            const options = {
              ...fixture.options,
              rotationX: fixture.options.rotationX + round * 0.13,
              rotationY: fixture.options.rotationY + round * 0.37,
            };
            finalOptions = options;
            for (const index of round % 2 ? [1, 0] : [0, 1]) {
              const start = performance.now();
              implementations[index].poly.drawPolyline3D(
                contexts[index],
                width,
                height,
                scenes[index],
                scenes[index].count,
                options,
              );
              const submitted = performance.now();
              contexts[index].getImageData(width >> 1, height >> 1, 1, 1);
              const synchronized = performance.now();
              if (round >= warmup) {
                timings[index].submissionMs.push(submitted - start);
                timings[index].synchronizedMs.push(synchronized - start);
              }
            }
            if (round >= warmup) {
              const rgba = contexts.map((ctx) => ctx.getImageData(0, 0, width, height).data);
              pixels.checkedFrames++;
              for (let at = 0; at < rgba[0].length; at += 4) {
                let changed = false;
                for (let channel = 0; channel < 4; channel++) {
                  const delta = Math.abs(rgba[0][at + channel] - rgba[1][at + channel]);
                  if (delta) {
                    pixels.changedBytes++;
                    changed = true;
                  }
                  pixels.maximumDelta = Math.max(pixels.maximumDelta, delta);
                }
                if (changed) pixels.changedPixels++;
              }
            }
            await new Promise((resolve) => setTimeout(resolve, 0));
          }
          // Separate instrumented module instances leave production timing intact.
          // Typed-array subclasses preserve native storage and count slice species,
          // distinguishing new backing storage from zero-copy subarray views.
          const allocations = implementations.map((_, index) => {
            const counted = variant(index === 0, true);
            const draw = () =>
              counted.poly.drawPolyline3D(
                contexts[index],
                width,
                height,
                scenes[index],
                scenes[index].count,
                finalOptions,
              );
            for (let i = 0; i < warmup; i++) draw();
            counted.stats.active = true;
            draw();
            counted.stats.active = false;
            const { active, ...stats } = counted.stats;
            return { implementation: labels[index], measuredDraws: 1, ...stats };
          });
          const measurements = timings.map((timing, index) => ({
            implementation: labels[index],
            medianSubmissionMs: median(timing.submissionMs),
            medianSynchronizedMs: median(timing.synchronizedMs),
            samples: timing,
          }));
          results.push({
            name: fixture.name,
            points: scenes[0].count,
            geometryChangedBytes: geometryChanges,
            measurements,
            allocations,
            speedup: measurements[0].medianSynchronizedMs / measurements[1].medianSynchronizedMs,
            pixels,
          });
          if (capture)
            canvases.forEach((canvas, index) => {
              images.push({
                name: `${fixture.name}-${labels[index]}.png`,
                data: canvas.toDataURL("image/png"),
              });
            });
        } finally {
          for (const canvas of canvases) {
            canvas.width = 1;
            canvas.height = 1;
          }
        }
      }
      return {
        passed: results.every(
          (r) =>
            r.geometryChangedBytes === 0 &&
            r.pixels.changedBytes === 0 &&
            r.allocations[0].backingBytes > 0 &&
            r.allocations[1].backingBytes === 0,
        ),
        width,
        height,
        samples,
        warmup,
        timing:
          "alternating moving-camera pairs; submission CPU and complete Canvas draw via one-pixel getImageData; geometry creation/full-frame comparisons/allocation instrumentation excluded",
        allocationMethod:
          "one draw after warmup in separate module instances; native typed-array subclasses count constructors and slice species; bytes exclude zero-copy views",
        results,
        images,
      };
    },
    { ...payload, capture: Boolean(captures) },
  );
  if (captures) {
    let url;
    try {
      const downloaded = page.waitForEvent("download");
      url = await page.evaluate((images) => {
        const href = URL.createObjectURL(
          new Blob([JSON.stringify(images)], { type: "application/json" }),
        );
        const link = document.createElement("a");
        link.href = href;
        link.download = "captures.json";
        document.body.appendChild(link);
        link.click();
        link.remove();
        return href;
      }, result.images);
      const download = await downloaded,
        path = `${captures}/captures.json`;
      await download.saveAs(path);
      const failure = await download.failure();
      if (failure) throw Error(failure);
      result.captureBundle = { path, images: result.images.length };
    } catch (error) {
      result.captureError = String(error);
    } finally {
      if (url) await page.evaluate((href) => URL.revokeObjectURL(href), url);
    }
  }
  delete result.images;
  console.log(JSON.stringify(result, null, 2));
  return result;
}
writeFileSync(
  args[1] ?? "/private/tmp/check-polyline-performance.js",
  `async(page)=>await (${check.toString()})(page,${JSON.stringify({ modules, baseline, entry, fixtures: selected, width, height, samples, warmup })},${JSON.stringify(args[2] ?? null)})`,
);
