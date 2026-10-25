import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

// node scripts/check-face-render-performance.mjs CALLBACK.js [CAPTURES]
// node scripts/check-face-render-performance.mjs --extract-captures CAPTURES/captures.json
// FACE_WIDTH/HEIGHT/SAMPLES/WARMUP default to 960/720/8/4. FACE_FILTER selects
// fixture names. Run the callback with Playwright CLI run-code --filename.
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
const width = Number(process.env.FACE_WIDTH ?? 960);
const height = Number(process.env.FACE_HEIGHT ?? 720);
const samples = Number(process.env.FACE_SAMPLES ?? 8);
const warmup = Number(process.env.FACE_WARMUP ?? 4);
for (const [name, value] of Object.entries({ width, height, samples, warmup }))
  if (!Number.isInteger(value) || value < 1) throw Error(`${name} must be a positive integer`);

// Bundle only the pure geometry dependency tree. Each browser variant gets an
// independent module cache and independently constructed scenes/scratch buffers.
const root = fileURLToPath(new URL("../", import.meta.url));
const entry = "utils/polyhedronFractals.ts";
const voxelEntry = "utils/voxelFractals.ts";
const modules = {};
const transpile = (source, filename) =>
  ts.transpileModule(source, {
    fileName: filename,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
function bundle(id) {
  if (modules[id]) return;
  const filename = resolve(root, id);
  const code = transpile(readFileSync(filename, "utf8"), filename);
  const dependencies = {};
  modules[id] = { code, dependencies };
  for (const [, request] of code.matchAll(/require\(["']([^"']+)["']\)/g)) {
    if (!request.startsWith(".")) throw Error(`Nonlocal browser dependency: ${request}`);
    const dependency = relative(root, resolve(dirname(filename), `${request}.ts`));
    dependencies[request] = dependency;
    bundle(dependency);
  }
}
bundle(entry);
bundle(voxelEntry);
const original = readFileSync(resolve(root, entry), "utf8");
const optimizedCall = "const drawOrder = sortFloatDepthOrder(depths, order, visible);";
if (original.split(optimizedCall).length !== 2)
  throw Error("Expected exactly one optimized face-sort call in production source");
const baseline = transpile(
  original.replace(
    optimizedCall,
    "const drawOrder = order.subarray(0, visible).sort((a, b) => depths[a] - depths[b]);",
  ),
  resolve(root, entry),
);
const fixtures = ["quadratic-koch-3", "menger-3", "koch-tetrahedron-5"].flatMap((shape) =>
  [
    ["faces-wire", 23, -37, 6, true, true],
    ["faces-seams", -67, 143, 6, true, false],
    ["wire-only-close", 0, 0, 3, false, true],
  ].map(([style, rotationX, rotationY, cameraDistance, showFaces, showWireframe]) => ({
    name: `${shape}-${style}`,
    shape,
    options: {
      rotationX,
      rotationY,
      cameraDistance,
      showFaces,
      showWireframe,
      background: "#252424",
      fillColor: "#8fb0ff",
      strokeColor: "#dce9ff",
      lineWidth: 0.7,
    },
  })),
);
const selected = fixtures.filter((f) => f.name.includes(process.env.FACE_FILTER ?? ""));
if (!selected.length) throw Error("FACE_FILTER did not match a fixture");

async function check(page, payload, captures) {
  const result = await page.evaluate(
    async ({
      modules,
      baseline,
      entry,
      voxelEntry,
      fixtures,
      width,
      height,
      samples,
      warmup,
      capture,
    }) => {
      function variant(isBaseline) {
        const cache = {};
        function load(id) {
          if (cache[id]) return cache[id].exports;
          const module = { exports: {} };
          cache[id] = module;
          const { code, dependencies } = modules[id];
          new Function(
            "module",
            "exports",
            "require",
            isBaseline && id === entry ? baseline : code,
          )(module, module.exports, (request) => load(dependencies[request]));
          return module.exports;
        }
        return { poly: load(entry), voxel: load(voxelEntry) };
      }
      const implementations = [variant(true), variant(false)];
      const labels = ["native-sort", "radix-sort"];
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
            // Explicit false keeps repeated synchronization reads from changing
            // Chrome's rendering backend partway through the paired experiment.
            const context = canvas.getContext("2d", { willReadFrequently: false });
            if (!context) throw Error("Canvas 2D is unavailable");
            return context;
          });
          const scenes = implementations.map(({ poly, voxel }) => {
            if (fixture.shape === "quadratic-koch-3")
              return poly.quadsToScene(voxel.generateQuadraticKochSurface(3));
            if (fixture.shape === "menger-3")
              return poly.quadsToScene(voxel.exposedCubeFaces(voxel.generateMengerSponge(3)));
            return poly.buildKochSurfaceScene("tetrahedron", 5);
          });
          const timings = implementations.map(() => ({ drawMs: [], synchronizedMs: [] }));
          for (let round = 0; round < warmup + samples; round++) {
            for (const index of round % 2 ? [1, 0] : [0, 1]) {
              const start = performance.now();
              implementations[index].poly.drawPolyhedronScene(
                contexts[index],
                width,
                height,
                scenes[index],
                fixture.options,
              );
              const drawn = performance.now();
              contexts[index].getImageData(width >> 1, height >> 1, 1, 1);
              const synchronized = performance.now();
              if (round >= warmup) {
                timings[index].drawMs.push(drawn - start);
                timings[index].synchronizedMs.push(synchronized - start);
              }
            }
          }
          // Full-frame readbacks and PNG encoding are outside timed intervals.
          const pixels = contexts.map((ctx) => ctx.getImageData(0, 0, width, height).data);
          let changedBytes = 0,
            changedPixels = 0,
            maximumDelta = 0;
          for (let i = 0; i < pixels[0].length; i += 4) {
            let changed = false;
            for (let channel = 0; channel < 4; channel++) {
              const delta = Math.abs(pixels[0][i + channel] - pixels[1][i + channel]);
              if (delta) {
                changedBytes++;
                changed = true;
              }
              maximumDelta = Math.max(maximumDelta, delta);
            }
            if (changed) changedPixels++;
          }
          const measurements = timings.map((timing, index) => ({
            implementation: labels[index],
            medianDrawMs: median(timing.drawMs),
            medianSynchronizedMs: median(timing.synchronizedMs),
            samples: timing,
          }));
          results.push({
            name: fixture.name,
            faces: scenes[0].faceCount,
            measurements,
            speedup: measurements[0].medianSynchronizedMs / measurements[1].medianSynchronizedMs,
            pixels: { changedBytes, changedPixels, maximumDelta },
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
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
      return {
        passed: results.every((r) => r.pixels.changedBytes === 0),
        width,
        height,
        samples,
        warmup,
        timing:
          "complete Canvas 2D draw plus one-pixel getImageData synchronization; independent scenes; alternating pairs; geometry construction and full-image readback excluded",
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
      const download = await downloaded;
      const path = `${captures}/captures.json`;
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
  args[0] ?? "/private/tmp/check-face-render-performance.js",
  `async(page)=>await (${check.toString()})(page,${JSON.stringify({ modules, baseline, entry, voxelEntry, fixtures: selected, width, height, samples, warmup })},${JSON.stringify(args[1] ?? null)})`,
);
