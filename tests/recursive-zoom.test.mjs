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
  initialPatternCamera,
  movePatternCamera,
  restorePatternCamera,
  patternModel,
  buildPatternGeometry,
  carpetDetailOpacity,
} = require("../utils/recursiveZoom.ts");
const { RecursiveZoomRenderer } = require("../utils/render/recursiveZoom.ts");
const { fixedFromNumber, fixedToNumber } = require("../utils/lsystem/bigfixed.ts");
const { prepareZoom } = require("../utils/lsystem/zoom.ts");
const { DEFAULT_SPEC } = require("../utils/lsystem/spec.ts");
const base = {
  iterations: 3,
  color: "#ffffff",
  background: "#000000",
  holeColor: "#444444",
  fillSquares: true,
  strokeSquares: false,
  lineWidth: 1,
};
const patterns = [
  { kind: "carpet", config: base },
  ...["saltire", "cross"].map((variant) => ({ kind: "vicsek", config: { ...base, variant } })),
  {
    kind: "flake",
    config: {
      ...base,
      sides: 3,
      includeCenter: false,
      rotation: 0,
      fillPolygons: true,
      strokePolygons: false,
    },
  },
  {
    kind: "flake",
    config: {
      ...base,
      sides: 5,
      includeCenter: true,
      rotation: 0,
      fillPolygons: true,
      strokePolygons: false,
    },
  },
  { kind: "tSquare", config: { ...base, ratio: 0.5 } },
];
const polygonCount = (geometry) =>
  Array.from(geometry.paths.values()).reduce((n, polygons) => n + polygons.length, 0);

test("takeover matches the finite carpet, both Vicsek layouts, triangle/pentaflake and T-square", () => {
  const counts = [74, 125, 125, 27, 216, 85];
  patterns.forEach((pattern, i) => {
    const camera = initialPatternCamera(pattern);
    const geometry = buildPatternGeometry(pattern, camera, 1000, 1000);
    assert.equal(polygonCount(geometry), counts[i], pattern.kind);
    assert.equal(geometry.limited, false);
    if (pattern.kind === "carpet") {
      assert.deepEqual(geometry.paths.get(-1)[0], [100, 100, 900, 100, 900, 900, 100, 900]);
      assert.ok(Math.abs(geometry.paths.get(0)[0][0] - (500 - 800 / 6)) < 1e-10);
    }
  });
});

test("zoom anchors the cursor and pan survives beyond floating point precision", () => {
  let camera = initialPatternCamera(patterns[0]);
  camera = movePatternCamera(camera, 1000, 800, 3, 120, -80);
  const scale = camera.frame * 800 * camera.zoom;
  assert.ok(Math.abs(fixedToNumber(camera.x, camera.bits) + 120 / scale - 120 / 640) < 1e-14);
  assert.ok(Math.abs(fixedToNumber(camera.y, camera.bits) - 80 / scale + 80 / 640) < 1e-14);
  camera = movePatternCamera(camera, 1000, 800, 1e100);
  const moved = movePatternCamera(camera, 1000, 800, 1, 0, 0, 1, -2);
  assert.notEqual(moved.x, camera.x);
  assert.notEqual(moved.y, camera.y);
  assert.ok(Math.abs(fixedToNumber(moved.x - camera.x, camera.bits) * scale * 1e100 + 1) < 1e-12);
  const saved = { ...moved, x: moved.x.toString(), y: moved.y.toString() };
  assert.deepEqual(restorePatternCamera(saved), moved);
});

test("visible detail remains finite and bounded at 10^100 and 10^280 zoom", () => {
  for (const pattern of patterns) {
    for (const zoom of [1e100, 1e280]) {
      let camera = movePatternCamera(initialPatternCamera(pattern), 640, 480, zoom);
      // Follow a persistent corner for carpet/Vicsek, the top vertex for a
      // triangle, and the central copy for pentaflake and T-square.
      if (pattern.kind === "carpet" || pattern.kind === "vicsek") {
        camera = {
          ...camera,
          x: fixedFromNumber(-0.5, camera.bits),
          y: fixedFromNumber(-0.5, camera.bits),
        };
        if (pattern.kind === "vicsek" && pattern.config.variant === "cross") camera.x = BigInt(0);
      }
      if (pattern.kind === "flake" && pattern.config.sides === 3)
        camera.y = -patternModel(pattern, camera.bits).one;
      if (pattern.kind === "tSquare") camera.x = camera.y = fixedFromNumber(1, camera.bits);
      const geometry = buildPatternGeometry(pattern, camera, 640, 480);
      assert.equal(geometry.limited, false, `${pattern.kind} at ${zoom}`);
      assert.ok(geometry.generation > 100);
      assert.ok(polygonCount(geometry) > 2, `${pattern.kind} retains local detail`);
      assert.ok(geometry.visited < 120000);
      for (const polygons of geometry.paths.values())
        for (const polygon of polygons) {
          polygon.forEach((value, i) => {
            assert.ok(
              Number.isFinite(value) && value >= -8.01 && value <= (i % 2 ? 488.01 : 648.01),
            );
          });
        }
    }
  }
});

test("invalid shared pattern cameras are rejected", () => {
  const good = { ...initialPatternCamera(patterns[0]), x: "0", y: "0" };
  for (const invalid of [
    null,
    {},
    { ...good, zoom: Infinity },
    { ...good, bits: 1e6 },
    { ...good, x: "bad" },
    { ...good, x: "9".repeat(700) },
  ]) {
    assert.throws(() => restorePatternCamera(invalid));
  }
});

test("zooming a low construction depth still adds pixel-sized detail", () => {
  const pattern = { kind: "carpet", config: { ...base, iterations: 1 } };
  const camera = movePatternCamera(initialPatternCamera(pattern), 1000, 800, 2);
  const geometry = buildPatternGeometry(pattern, camera, 1000, 800);
  assert.ok(geometry.generation >= 5);
});

test("new carpet holes gain contrast continuously across generation boundaries", () => {
  const camera = initialPatternCamera(patterns[0]);
  const atSize = (size, depth = 5) => ({ ...camera, zoom: (size * 3 ** (depth + 1)) / 640 });
  for (const depth of [5, 499]) {
    assert.ok(carpetDetailOpacity(3, atSize(2, depth), 1000, 800, depth) < 1e-20);
    assert.ok(Math.abs(carpetDetailOpacity(3, atSize(4, depth), 1000, 800, depth) - 0.5) < 1e-10);
    assert.ok(Math.abs(carpetDetailOpacity(3, atSize(6, depth), 1000, 800, depth) - 1) < 1e-10);
    const samples = [1.9999, 2, 2.0001, 3, 4, 5, 6].map((size) =>
      carpetDetailOpacity(3, atSize(size, depth), 1000, 800, depth),
    );
    assert.deepEqual(
      samples,
      [...samples].sort((a, b) => a - b),
    );
    assert.ok(samples[2] - samples[0] < 1e-8);
  }
  assert.equal(carpetDetailOpacity(3, atSize(2), 1000, 800, 2), 1);
});

test("leaving the finite carpet view introduces automatic detail without a jump", () => {
  const camera = initialPatternCamera(patterns[0]);
  assert.equal(carpetDetailOpacity(1, camera, 1000, 800, 1), 0);
  assert.ok(carpetDetailOpacity(1, { ...camera, zoom: 1.000001 }, 1000, 800, 1) < 1e-9);
  assert.equal(carpetDetailOpacity(1, { ...camera, zoom: 1.2 }, 1000, 800, 1), 1);
  const geometry = buildPatternGeometry(
    { ...patterns[0], config: { ...base, iterations: 5 } },
    camera,
    1000,
    800,
  );
  assert.equal(polygonCount(geometry), 4682);
  assert.ok(geometry.visited < 6000, "empty leaf squares need no arithmetic or visits");
});

test("the carpet renderer uses spatial opacity and stops drawing once the camera stops", (t) => {
  const fills = [];
  const previous = globalThis.Path2D;
  globalThis.Path2D = class {
    rect() {}
  };
  t.after(() => {
    if (previous === undefined) delete globalThis.Path2D;
    else globalThis.Path2D = previous;
  });
  const ctx = {
    globalAlpha: 0.8,
    fillRect() {},
    fill() {
      fills.push(this.globalAlpha);
    },
  };
  const renderer = new RecursiveZoomRenderer();
  const camera = { ...initialPatternCamera(patterns[0]), zoom: (4 * 3 ** 6) / 640 };
  renderer.update({ pattern: patterns[0], camera });
  assert.equal(renderer.draw(ctx, 1000, 800), false);
  assert.ok(Math.abs(fills.at(-1) - 0.4) < 1e-10);
  assert.equal(ctx.globalAlpha, 0.8);
  const first = [...fills];
  fills.length = 0;
  assert.equal(renderer.draw(ctx, 1000, 800), false);
  assert.deepEqual(fills, first, "idle frames cannot reveal delayed dots");
});

test("overlapping T-square variants coarsen the complete view within budget", () => {
  const pattern = { kind: "tSquare", config: { ...base, iterations: 9, ratio: 0.75 } };
  const camera = movePatternCamera(initialPatternCamera(pattern), 1280, 800, 4, -220, -180);
  const geometry = buildPatternGeometry(pattern, camera, 1280, 800);
  assert.ok(geometry.visited <= 120000);
  assert.ok(polygonCount(geometry) > 0);
});

test("the Sierpinski triangle's existing L-system path adds visible generations", () => {
  const system = prepareZoom(
    {
      ...DEFAULT_SPEC,
      axiom: "F-G-G",
      rules: [
        { symbol: "F", replacement: "F-G+F+G-F" },
        { symbol: "G", replacement: "GG" },
      ],
      angle: 120,
      startAngle: 90,
    },
    3,
  );
  assert.notEqual(typeof system, "string");
  const detail = system.render({
    originX: 0,
    originY: 0,
    offsetX: BigInt(0),
    offsetY: BigInt(0),
    bits: 128,
    scale: 1e5,
    halfWidth: 500,
    halfHeight: 400,
    zoom: 1e4,
  });
  assert.ok(detail.generation > 3);
  assert.ok(detail.count > 0);
  assert.equal(detail.limited, false);
});
