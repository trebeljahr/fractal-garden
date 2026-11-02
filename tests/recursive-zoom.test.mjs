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
const { buildIslandGeometry } = require("../utils/gosperIslandZoom.ts");
const { gosperIsland, polygonArea } = require("../utils/gosperIsland.ts");
const { buildStars, starTips, touchingRatio } = require("../utils/starFractal.ts");
const { fixedFromNumber, fixedToNumber } = require("../utils/lsystem/bigfixed.ts");
const { prepareZoom } = require("../utils/lsystem/zoom.ts");
const { DEFAULT_SPEC } = require("../utils/lsystem/spec.ts");
const { clipPolygon } = require("../utils/recursiveZoom.ts");
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

const star = (overrides = {}) => ({
  kind: "star",
  config: {
    ...base,
    colorEnd: "#ff0000",
    points: 5,
    skip: 2,
    ratio: touchingRatio(5),
    offset: 1,
    rotation: 0,
    smallestOnly: false,
    fillStars: false,
    ...overrides,
  },
});

const island = (view = "one", iterations = 2) => ({
  kind: "island",
  config: {
    iterations,
    view,
    fillIslands: true,
    background: "#000000",
    color: "#111111",
    colorEnd: "#ffffff",
    outline: "#000000",
    lineWidth: 1,
  },
});

test("a star's opening view holds every star, in the same places as the finite drawing", () => {
  const pattern = star();
  const camera = initialPatternCamera(pattern);
  const geometry = buildPatternGeometry(pattern, camera, 1000, 1000);
  assert.equal(polygonCount(geometry), 1 + 5 + 25 + 125);
  assert.equal(geometry.limited, false);
  const scale = camera.frame * 1000;
  const [root] = geometry.paths.get(0);
  const tips = starTips(pattern.config);
  [0, 2, 4, 1, 3].forEach((tip, index) => {
    assert.ok(Math.abs(root[index * 2] - (500 + tips[tip][0] * scale)) < 1e-9);
    assert.ok(Math.abs(root[index * 2 + 1] - (500 + tips[tip][1] * scale)) < 1e-9);
  });
  const finite = buildStars(pattern.config, 3).filter((entry) => entry.depth === 3);
  const leaf = geometry.paths.get(3)[0];
  assert.ok(
    Math.abs(leaf[0] - (500 + (finite[0].x + finite[0].radius * tips[0][0]) * scale)) < 1e-9,
  );
  const smallest = star({ smallestOnly: true });
  assert.equal(polygonCount(buildPatternGeometry(smallest, camera, 1000, 1000)), 125);
});

test("a star's long line stays exactly in place far below float precision", () => {
  const pattern = star();
  for (const zoom of [1e30, 1e100, 1e280]) {
    let camera = movePatternCamera(initialPatternCamera(pattern), 800, 600, zoom);
    const { vertices } = patternModel(pattern, camera.bits);
    // Sit on the middle of the root star's first line.
    camera = {
      ...camera,
      x: (vertices[0][0] + vertices[2][0]) / BigInt(2),
      y: (vertices[0][1] + vertices[2][1]) / BigInt(2),
    };
    const geometry = buildPatternGeometry(pattern, camera, 800, 600);
    const [line] = geometry.paths.get(0);
    let nearest = Number.POSITIVE_INFINITY;
    for (let i = 0; i < line.length; i += 2) {
      const j = (i + 2) % line.length;
      const dx = line[j] - line[i];
      const dy = line[j + 1] - line[i + 1];
      const length = Math.hypot(dx, dy) || 1;
      nearest = Math.min(
        nearest,
        Math.abs((400 - line[i]) * dy - (300 - line[i + 1]) * dx) / length,
      );
    }
    assert.ok(nearest < 1e-6, `${zoom}: ${nearest}`);
    assert.ok(line.every((value) => Number.isFinite(value) && Math.abs(value) < 1000));
  }
});

test("zooming toward the tip of tips keeps finding smaller stars", () => {
  const pattern = star();
  for (const zoom of [1e12, 1e100, 1e280]) {
    let camera = movePatternCamera(initialPatternCamera(pattern), 640, 480, zoom);
    const { vertices, one, ratio } = patternModel(pattern, camera.bits);
    // Following the top copy forever ends at the top tip divided by 1 - ratio.
    camera = {
      ...camera,
      x: (vertices[0][0] * one) / (one - ratio),
      y: (vertices[0][1] * one) / (one - ratio),
    };
    const geometry = buildPatternGeometry(pattern, camera, 640, 480);
    assert.equal(geometry.limited, false);
    assert.ok(geometry.generation > 20);
    assert.ok(polygonCount(geometry) > 10, `${zoom}: ${polygonCount(geometry)}`);
    assert.ok(geometry.visited < 120000);
  }
});

test("high star copy sizes reduce depth instead of dropping branches", () => {
  const pattern = star({ ratio: 0.7 });
  const camera = movePatternCamera(initialPatternCamera(pattern), 640, 480, 4);
  const geometry = buildPatternGeometry(pattern, camera, 640, 480);
  assert.ok(polygonCount(geometry) > 100);
  assert.ok(geometry.visited <= 120001);
});

test("an island's opening coast matches the finite outline, with y pointing down", () => {
  for (const iterations of [0, 1, 3]) {
    const pattern = island("one", iterations);
    const camera = initialPatternCamera(pattern);
    const geometry = buildIslandGeometry(pattern.config, camera, 4000, 4000, clipPolygon);
    const [[outline]] = Array.from(geometry.paths.values());
    const expected = gosperIsland(iterations);
    assert.equal(outline.length / 2, expected.length);
    const scale = camera.frame * 4000;
    expected.forEach(([x, y], index) => {
      assert.ok(Math.abs(outline[index * 2] - (2000 + x * scale)) < 1e-6, `${iterations} x`);
      assert.ok(Math.abs(outline[index * 2 + 1] - (2000 - y * scale)) < 1e-6, `${iterations} y`);
    });
  }
});

test("an island view draws one, seven or a plane full of tiles", () => {
  const count = (view) => {
    const pattern = island(view, 1);
    const geometry = buildIslandGeometry(
      pattern.config,
      initialPatternCamera(pattern),
      900,
      900,
      clipPolygon,
    );
    return Array.from(geometry.paths.values()).reduce((sum, group) => sum + group.length, 0);
  };
  assert.equal(count("one"), 1);
  assert.equal(count("seven"), 7);
  assert.ok(count("plane") > 7);
});

test("a corner of the hexagon stays on the coast at every depth", () => {
  const pattern = island("one", 2);
  for (const zoom of [1e6, 1e30, 1e100, 1e280]) {
    const opening = movePatternCamera(initialPatternCamera(pattern), 800, 600, zoom);
    // Every round keeps the hexagon's corners, here (1, 0).
    const camera = { ...opening, x: fixedFromNumber(1, opening.bits), y: BigInt(0) };
    const geometry = buildIslandGeometry(pattern.config, camera, 800, 600, clipPolygon);
    const [[outline]] = Array.from(geometry.paths.values());
    let nearest = Number.POSITIVE_INFINITY;
    for (let i = 0; i < outline.length; i += 2)
      nearest = Math.min(nearest, Math.hypot(outline[i] - 400, outline[i + 1] - 300));
    assert.ok(nearest < 1e-3, `${zoom}: ${nearest}`);
    assert.ok(outline.length > 40, `${zoom} shows local detail: ${outline.length}`);
    assert.ok(geometry.visited < 100000, `${zoom}: ${geometry.visited}`);
    assert.ok(outline.every((value) => Number.isFinite(value) && Math.abs(value) < 1000));
  }
});

test("far inside an island the fill still covers the whole view", () => {
  const pattern = island("one", 2);
  for (const zoom of [1e6, 1e100, 1e280]) {
    const camera = movePatternCamera(initialPatternCamera(pattern), 800, 600, zoom);
    const geometry = buildIslandGeometry(pattern.config, camera, 800, 600, clipPolygon);
    const [[outline]] = Array.from(geometry.paths.values());
    const points = [];
    for (let i = 0; i < outline.length; i += 2) points.push([outline[i], outline[i + 1]]);
    assert.ok(Math.abs(polygonArea(points) - 808 * 608) < 1e-6, `${zoom}`);
  }
});
