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
const { constructionFrame } = require("../utils/constructionFrame.ts");

test("construction depth and camera stay independent of the main recursive view", () => {
  const original = {
    iterations: 8,
    ratio: 0.5,
    color: "#ffe100",
    viewport: { scale: 20, x: 4, y: 9 },
  };
  const source = structuredClone(original);
  const frame = constructionFrame("tSquare", source, 2, 1440, 900);
  assert.equal(frame.iterations, 2);
  assert.equal(frame.viewport, undefined);
  assert.equal(frame.ratio, original.ratio);
  assert.equal(frame.color, original.color);
  assert.deepEqual(source, original);
});

test("scene construction returns outside without changing the explorer pose or rotation", () => {
  const source = {
    spec: { kind: "menger" },
    iterations: 4,
    view: { cameraDistance: 3, autoRotate: true, rotationX: 42, rotationY: 19, grab: [1, 0, 0, 0] },
  };
  const original = structuredClone(source);
  const frame = constructionFrame("scene3d", source, 1, 1440, 900);
  assert.equal(frame.iterations, 1);
  assert.equal(frame.view.cameraDistance, 7.5);
  assert.equal(frame.view.autoRotate, false);
  assert.equal(frame.view.grab, undefined);
  assert.equal(frame.view.rotationX, 42);
  assert.deepEqual(source, original);
});

test("Hilbert lessons change the nested order and show the complete path at each step", () => {
  const source = {
    source: { kind: "hilbert3d", order: 5 },
    config: { animateTrail: true, autoRotate: true },
  };
  const frame = constructionFrame("polylineScene", source, 2, 390, 844);
  assert.equal(frame.source.order, 2);
  assert.equal(frame.config.animateTrail, false);
  assert.equal(frame.config.autoRotate, false);
  assert.equal(source.source.order, 5);
  assert.equal(source.config.animateTrail, true);
});

test("L-system lesson frames retain proportions and placement across desktop and phone sizes", () => {
  for (const [width, height] of [
    [1440, 900],
    [390, 844],
  ]) {
    const source = {
      initialLength: 300,
      translation: [width / 2 - 80, height / 2 + 100],
      iterations: 7,
    };
    const frame = constructionFrame("lsystem2d", source, 2, width, height);
    const scale = Math.min(720 / width, 480 / height);
    assert.equal(frame.initialLength, 300 * scale);
    assert.deepEqual(frame.translation, [360 - 80 * scale, 240 + 100 * scale]);
    assert.equal(frame.iterations, 2);
    assert.equal(source.iterations, 7);
  }
});

test("L-system article construction does not inherit the explorer's UI insets", () => {
  for (const [width, height, top, bottom] of [
    [1440, 848, 24, 92],
    [390, 740, 24, 108],
    [844, 338, 24, 92],
  ]) {
    const fitHeight = height - top - bottom;
    const source = {
      initialLength: 300,
      translation: [width / 2 - 80, fitHeight / 2 + 100],
      iterations: 7,
    };
    const framed = {
      ...source,
      framing: { width, height, top, bottom },
      translation: [source.translation[0], source.translation[1] + top],
    };
    assert.deepEqual(
      constructionFrame("lsystem2d", framed, 2, width, height),
      constructionFrame("lsystem2d", source, 2, width, fitHeight),
    );
    assert.equal(framed.translation[1], source.translation[1] + top);
  }
});

const { drawLSystemConstruction } = require("../utils/render/drawings/lsystemConstruction.ts");
const { DEFAULT_SPEC } = require("../utils/lsystem/spec.ts");

test("custom 2D and 3D construction rules fit every branch inside the lesson frame", () => {
  const previous = globalThis.Path2D;
  try {
    globalThis.Path2D = class {
      points = [];
      moveTo(x, y) {
        this.points.push(["move", x, y]);
      }
      lineTo(x, y) {
        this.points.push(["line", x, y]);
      }
    };
    for (const dimension of ["2d", "3d"]) {
      const strokes = [];
      const ctx = {
        fillRect() {},
        stroke(path) {
          strokes.push(path);
        },
      };
      const count = drawLSystemConstruction(ctx, 720, 480, {
        ...DEFAULT_SPEC,
        dimension,
        axiom: "F[+F]F",
        rules: [],
        iterations: 0,
      });
      assert.equal(count, 3);
      const points = strokes.flatMap((path) => path.points);
      assert.equal(points.filter(([command]) => command === "move").length, 3);
      assert.equal(points.filter(([command]) => command === "line").length, 3);
      for (const [, x, y] of points) {
        assert.ok(Number.isFinite(x) && x >= 0 && x <= 720);
        assert.ok(Number.isFinite(y) && y >= 0 && y <= 480);
      }
      assert.ok(ctx.lineWidth > 0);
    }
  } finally {
    globalThis.Path2D = previous;
  }
});
