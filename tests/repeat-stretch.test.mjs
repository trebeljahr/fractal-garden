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
  allRepeats,
  bulbOutline,
  fixedPoints,
  heartOutline,
  NEWTON_COPY_CENTER,
  NEWTON_NO_ROOT,
  newtonAverageFate,
  newtonView,
  NEWTON_STOPS,
  oneJumpStretch,
  PATCH_PLACES,
  patchRun,
  pushingRepeats,
  twoJumpStretch,
  twoRepeat,
} = require("../utils/lessons/repeatStretch.ts");

const jump = (z, c) => ({
  real: z.real * z.real - z.imaginary * z.imaginary + c.real,
  imaginary: 2 * z.real * z.imaginary + c.imaginary,
});
const apart = (a, b) => Math.hypot(a.real - b.real, a.imaginary - b.imaginary);
const article = readFileSync(
  new URL("../fractal-descriptions/mandelbrot.md", import.meta.url),
  "utf8",
);

// Follows zero's route; true if it never crosses the dashed circle.
const staysIn = (c, steps = 20000) => {
  let z = { real: 0, imaginary: 0 };
  for (let step = 0; step < steps; step++) {
    z = jump(z, c);
    if (Math.hypot(z.real, z.imaginary) > 2) return false;
  }
  return true;
};

test("fixed points and the two-number repeat solve their equations", () => {
  const c = { real: -0.3, imaginary: 0.3 };
  for (const z of fixedPoints(c)) assert.ok(apart(jump(z, c), z) < 1e-12);
  const [first, second] = twoRepeat(c);
  assert.ok(apart(jump(first, c), second) < 1e-12);
  assert.ok(apart(jump(second, c), first) < 1e-12);
  // Two jumps stretch by 2z₁ · 2z₂ = 4(c + 1).
  const product = {
    real: 4 * (first.real * second.real - first.imaginary * second.imaginary),
    imaginary: 4 * (first.real * second.imaginary + first.imaginary * second.real),
  };
  assert.ok(Math.abs(Math.hypot(product.real, product.imaginary) - twoJumpStretch(c)) < 1e-12);
});

test("the drawn outlines are where the stretch is exactly 1", () => {
  for (const c of heartOutline(36)) {
    const least = Math.min(...fixedPoints(c).map(oneJumpStretch));
    assert.ok(Math.abs(least - 1) < 1e-9);
  }
  for (const c of bulbOutline(36)) assert.ok(Math.abs(twoJumpStretch(c) - 1) < 1e-12);
});

test("just inside the outlines zero stays, and past the heart's dent it escapes", () => {
  // Scaling a point out from the middle may land on a smaller bulb, so only inside is tested all
  // the way round. The dent at c = 0.25 has no bulb attached.
  for (const c of heartOutline(120))
    assert.ok(staysIn({ real: c.real * 0.98, imaginary: c.imaginary * 0.98 }));
  assert.ok(!staysIn({ real: 0.26, imaginary: 0 }));
  for (const c of bulbOutline(60))
    assert.ok(staysIn({ real: -1 + (c.real + 1) * 0.9, imaginary: c.imaginary * 0.9 }));
  assert.ok(!staysIn({ real: -1.26, imaginary: 0.2 }));
});

test("the solver finds nearly every point that returns after n jumps", () => {
  const places = [
    { real: -1, imaginary: 0 },
    { real: -0.12256, imaginary: 0.74486 },
    { real: 0, imaginary: 1 },
    { real: 0.45, imaginary: 0.1 },
    { real: -0.8, imaginary: 0.156 },
  ];
  for (const c of places) {
    for (const jumps of [3, 8, 12]) {
      const { xs, ys } = pushingRepeats(c, jumps);
      let returning = 0;
      for (let k = 0; k < xs.length; k++) {
        let z = { real: xs[k], imaginary: ys[k] };
        for (let done = 0; done < jumps; done++) z = jump(z, c);
        if (apart(z, { real: xs[k], imaginary: ys[k] }) < 1e-5) returning++;
      }
      assert.ok(returning / xs.length >= 0.55, `${c.real},${c.imaginary} n=${jumps}: ${returning}`);
      if (jumps === 12) assert.ok(returning / xs.length > 0.99, `${c.real} n=12: ${returning}`);
    }
    assert.equal(allRepeats(c, 4).length, (2 ** 4 + 1) * 2);
  }
});

test("a tiny patch on the Julia set spreads, one inside stays small", () => {
  const edge = patchRun(PATCH_PLACES[0].at, 800);
  assert.ok(edge[0].width < 3e-6);
  // The article's figure: a stretch of 3.24 reaches a width of about 1 after about 12 jumps.
  assert.ok(edge[12].width > 0.5 && edge[12].width < 5, String(edge[12].width));
  assert.ok(edge.at(-1).escaped > 0);
  assert.ok(edge.at(-1).settled > 0);
  const inside = patchRun(PATCH_PLACES[1].at, 800);
  assert.equal(inside.at(-1).escaped, 0);
  assert.ok(Math.max(...inside.map((frame) => frame.width)) < 1e-4);
  const outside = patchRun(PATCH_PLACES[2].at, 800);
  assert.equal(outside.at(-1).escaped, 800);
});

test("Newton's method traps the guess 0 for z³ − 2z + 2, as the article says", () => {
  const step = (z) => z - (z ** 3 - 2 * z + 2) / (3 * z ** 2 - 2);
  assert.equal(step(0), 1);
  assert.equal(step(1), 0);
  assert.match(article, /z\^3-2z\+2/);
});

test("the Newton picture has a black copy at its target, and little black overall", () => {
  assert.equal(newtonAverageFate(-0.815, 0.8467).root, NEWTON_NO_ROOT);
  const { center, half } = newtonView(NEWTON_STOPS);
  assert.ok(apart(center, NEWTON_COPY_CENTER) < 1e-12);
  let black = 0;
  const side = 120;
  for (let row = 0; row < side; row++)
    for (let column = 0; column < side; column++) {
      const fate = newtonAverageFate(
        center.real - half + ((column + 0.5) / side) * 2 * half,
        center.imaginary - half + ((row + 0.5) / side) * 2 * half,
      );
      if (fate.root === NEWTON_NO_ROOT) black++;
    }
  assert.ok(black / side ** 2 > 0.03, `copy fills ${black}`);
  const whole = newtonView(0);
  assert.equal(whole.zoom, 1);
  assert.equal(Math.abs(whole.center.real) + Math.abs(whole.center.imaginary), 0);
});

test("the article holds each new demo once", () => {
  for (const kind of ["repeat-stretch", "all-repeats", "tiny-patch", "newton-copy"])
    assert.equal(article.split(`data-lesson="${kind}"`).length, 2, kind);
});
