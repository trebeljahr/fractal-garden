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
  buildPlayback,
  playbackPace,
  playbackSource,
  symbolWindow,
} = require("../utils/lsystem/playback.ts");
const { expand, interpret } = require("../utils/lsystem/engine.ts");
const { DEFAULT_SPEC } = require("../utils/lsystem/spec.ts");
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-5, `${a} != ${b}`);
const pose = (model, index) => Array.from(model.poses.slice(index * 6, index * 6 + 6));

test("rewriting records replacements from the old string, including copied turns", () => {
  const spec = {
    ...DEFAULT_SPEC,
    axiom: "F+X",
    rules: [
      { symbol: "F", replacement: "FF" },
      { symbol: "X", replacement: "F-X" },
    ],
  };
  const model = buildPlayback(spec, 2);
  assert.equal(model.word, expand(spec, 2).sentence);
  assert.equal(model.previous, "FF+F-X");
  assert.deepEqual(model.history, ["F+X", "FF+F-X", "FFFF+FF-F-X"]);
  const rules = Object.fromEntries(spec.rules.map((r) => [r.symbol, r.replacement]));
  Array.from(model.previous).forEach((symbol, i) => {
    assert.equal(model.word.slice(model.offsets[i], model.offsets[i + 1]), rules[symbol] ?? symbol);
  });
});

test("seeded weighted choices match the actual explorer sentence and geometry", () => {
  const spec = {
    ...DEFAULT_SPEC,
    axiom: "FFFF",
    seed: 67,
    rules: [
      { symbol: "F", replacement: "F+F", weight: 2 },
      { symbol: "F", replacement: "F-F", weight: 1 },
    ],
  };
  const model = buildPlayback(spec, 4);
  assert.equal(model.word, expand(spec, 4).sentence);
  assert.deepEqual(model.geometry.positions, interpret(model.word, spec).positions);
  let rebuilt = "";
  for (let i = 0; i < model.previous.length; i++) {
    const replacement = model.word.slice(model.offsets[i], model.offsets[i + 1]);
    assert.ok(["F+F", "F-F", "+", "-"].includes(replacement));
    rebuilt += replacement;
  }
  assert.equal(rebuilt, model.word);
});

test("the turtle moves, saves, jumps back, and turns without adding false lines", () => {
  const word = "F[+F]f-F";
  const model = buildPlayback({ ...DEFAULT_SPEC, axiom: word, angle: 90 }, 0);
  assert.deepEqual(pose(model, 2), pose(model, 1)); // [ remembers, stays put
  assert.deepEqual(pose(model, 5), pose(model, 1)); // ] restores position and heading
  assert.equal(model.drawn[5], model.drawn[4]);
  assert.equal(model.drawn[6], model.drawn[5]); // f moves, no line
  close(pose(model, 6)[1], 2);
  assert.deepEqual(pose(model, 7).slice(0, 3), pose(model, 6).slice(0, 3));
  assert.equal(model.drawn.at(-1), 3);
});

test("spatial pitch and roll keep traced poses on the real 3D path", () => {
  const model = buildPlayback(
    { ...DEFAULT_SPEC, dimension: "3d", axiom: "F&F\\F^F/F", angle: 90 },
    0,
  );
  let segment = 0;
  Array.from(model.word).forEach((symbol, i) => {
    if (symbol !== "F") return;
    pose(model, i + 1)
      .slice(0, 3)
      .forEach((v, axis) => {
        close(v, model.geometry.positions[segment * 6 + 3 + axis]);
      });
    segment++;
  });
  assert.ok(model.geometry.positions.some((v, i) => i % 3 === 2 && Math.abs(v) > 0.1));
});

test("legacy turns reflect with & and restore the branch's turn direction", () => {
  const source = playbackSource("lsystem2d", {
    axiom: "F[&+F]+F",
    replace: {},
    angle: 90,
    startAngle: 0,
  });
  const model = buildPlayback(source.spec, 0, source.legacy);
  close(pose(model, 5)[0], -1);
  close(pose(model, 8)[0], 1);
  close(pose(model, 8)[1], 1);
  assert.equal(source.legacy, true);
});

test("empty generations, deleted symbols, and the seed all have valid timelines", () => {
  const spec = { ...DEFAULT_SPEC, axiom: "F", rules: [{ symbol: "F", replacement: "" }] };
  const first = buildPlayback(spec, 1);
  assert.equal(first.word, "");
  assert.equal(first.rewriteLength, 1);
  assert.deepEqual(Array.from(first.offsets), [0, 0]);
  const third = buildPlayback(spec, 3);
  assert.deepEqual(third.history, ["F", "", "", ""]);
  assert.equal(third.rewriteLength, 0);
  assert.equal(third.word.length, 0);
  assert.equal(buildPlayback(spec, 0).rewriteLength, 0);
});

test("long string windows always contain the consumed symbol and mark excerpts", () => {
  const word = "F+".repeat(500);
  for (const index of [0, 70, 500, 999]) {
    const view = symbolWindow(word, index);
    assert.ok(index >= view.start && index < view.start + view.text.length);
    assert.equal(view.text, word.slice(view.start, view.start + 80));
  }
  assert.equal(symbolWindow("F+F", 1).after, false);
});

test("a stage plays in about two seconds at any length, and short strings stay readable", () => {
  for (const symbols of [1, 7, 39, 41, 500, 49995, 655350]) {
    const { delay, advance } = playbackPace(symbols);
    const ticks = Math.ceil(symbols / advance);
    assert.ok(ticks * delay <= 2300, `${symbols} symbols take ${ticks * delay} ms`);
    assert.ok(delay >= 50);
    assert.ok(advance >= 1);
  }
  assert.equal(playbackPace(7).advance, 1);
  assert.ok(playbackPace(7).delay >= 200);
  assert.ok(playbackPace(49995, 4).delay >= 50);
  assert.ok(playbackPace(7, 0.5).delay > playbackPace(7).delay);
});

test("every bespoke turtle player matches its existing page renderer", () => {
  class CapturePath {
    points = [];
    moveTo(x, y) {
      this.points.push([x, y]);
    }
    lineTo(x, y) {
      this.points.push([x, y]);
    }
  }
  globalThis.Path2D = CapturePath;
  const drawings = require("../utils/render/drawings/turtleCurves.ts");
  const names = {
    dragonCurve: "drawDragonCurve",
    terdragon: "drawTerdragon",
    gosperCurve: "drawGosperCurve",
    peanoCurve: "drawPeanoCurve",
    levyTapestry: "drawLevyTapestry",
    kochAntiSnowflake: "drawKochAntiSnowflake",
    quadraticKochIsland: "drawQuadraticKochIsland",
    minkowskiSausage: "drawMinkowskiSausage",
    cesaroFractal: "drawCesaroFractal",
    fibonacciWordFractal: "drawFibonacciWordFractal",
    twindragon: "drawTwindragon",
  };
  for (const [kind, name] of Object.entries(names)) {
    // Round 0 of the Peano curve is a lone symbol with nothing to draw.
    for (const iterations of kind === "peanoCurve" ? [1, 2] : [0, 1, 2]) {
      const settings = {
        iterations,
        angle: 71,
        island: true,
        color: "#ffffff",
        background: "#000000",
        lineWidth: 1,
        showTiling: false,
        firstDragon: "#ffffff",
        secondDragon: "#ffffff",
      };
      const source = playbackSource(kind, settings);
      const model = buildPlayback(
        source.spec,
        iterations,
        source.legacy,
        source.turns,
        source.repeat,
        source.fibonacci,
      );
      const paths = [];
      let current = [];
      const ctx = {
        fillRect() {},
        save() {},
        restore() {},
        translate() {},
        beginPath() {
          current = [];
        },
        moveTo(x, y) {
          current.push([x, y]);
        },
        lineTo(x, y) {
          current.push([x, y]);
        },
        closePath() {},
        stroke(path) {
          paths.push(path?.points ?? current);
        },
      };
      const count = drawings[name](ctx, 800, 600, settings);
      assert.equal(model.geometry.count, count, `${kind} ${iterations}: segment count`);
      const actual = paths.flat().map(([x, y]) => [x, -y]);
      const expected = [];
      for (let i = 0; i < model.geometry.positions.length; i += 3)
        expected.push([model.geometry.positions[i], model.geometry.positions[i + 1]]);
      const normalize = (points) => {
        const xs = points.map((p) => p[0]),
          ys = points.map((p) => p[1]);
        const left = Math.min(...xs),
          bottom = Math.min(...ys);
        const span = Math.max(Math.max(...xs) - left, Math.max(...ys) - bottom, 1e-9);
        return points.map(([x, y]) => [(x - left) / span, (y - bottom) / span]);
      };
      const normalized = normalize(actual),
        reference = normalize(expected);
      // Every production vertex must be present in the traced construction.
      for (const [x, y] of normalized)
        assert.ok(
          reference.some(([a, b]) => Math.abs(a - x) < 1e-5 && Math.abs(b - y) < 1e-5),
          `${kind} ${iterations}: missing production vertex ${x},${y}`,
        );
    }
  }
});
