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
  halfWidthAt,
  JULIA_ZOOM_COLORING,
  juliaBounds,
  juliaFit,
  MANDELBROT_ZOOM_COLORING,
  mandelbrotBounds,
  matchingFactor,
  ZOOM_PLACES,
  ZOOM_STOPS,
  zoomAt,
} = require("../utils/lessons/mandelbrotJuliaZoom.ts");

const place = (name) => ZOOM_PLACES.find((option) => option.name === name);

// Fixed-point complex numbers, because these orbits leave a repeat within double precision's reach.
const BITS = 512n;
const ONE = 1n << BITS;
const fixed = (value) => {
  const scaled = BigInt(Math.round(value * 2 ** 60));
  return (scaled << BITS) >> 60n;
};
const times = ([a, b], [c, d]) => [(a * c - b * d) >> BITS, (a * d + b * c) >> BITS];
const plus = ([a, b], [c, d]) => [a + c, b + d];
const minus = ([a, b], [c, d]) => [a - c, b - d];
const over = ([a, b], [c, d]) => {
  const size = (c * c + d * d) >> BITS;
  return [(((a * c + b * d) >> BITS) << BITS) / size, (((b * c - a * d) >> BITS) << BITS) / size];
};
/** Whether the size is below 2 ** -bits. */
const below = ([a, b], bits) => {
  const edge = ONE >> BigInt(bits);
  return a * a + b * b < edge * edge;
};

function orbitAndChange(c, jumps) {
  let z = [0n, 0n];
  let change = [0n, 0n];
  const orbit = [z];
  for (let i = 0; i < jumps; i++) {
    change = plus(times([2n * z[0], 2n * z[1]], change), [ONE, 0n]);
    z = plus(times(z, z), c);
    orbit.push(z);
  }
  return { orbit, change };
}

/** Refines c so that the point after `landsAfter + repeatLength` jumps is back where it landed. */
function exactLanding({ c, landsAfter, repeatLength }) {
  let exact = [fixed(c.real), fixed(c.imaginary)];
  for (let i = 0; i < 12; i++) {
    const end = orbitAndChange(exact, landsAfter + repeatLength);
    const landing = orbitAndChange(exact, landsAfter);
    const gap = minus(end.orbit.at(-1), landing.orbit.at(-1));
    exact = minus(exact, over(gap, minus(end.change, landing.change)));
  }
  return exact;
}

for (const zoomPlace of ZOOM_PLACES) {
  test(`${zoomPlace.name}: zero lands exactly on its repeat`, () => {
    const { landsAfter, repeatLength, c } = zoomPlace;
    const exact = exactLanding(zoomPlace);
    assert.ok(below(minus(exact, [fixed(c.real), fixed(c.imaginary)]), 50));
    const { orbit } = orbitAndChange(exact, landsAfter + 3 * repeatLength);
    // Landed: every point from here on repeats, far beyond any rounding.
    for (let i = landsAfter; i <= landsAfter + 2 * repeatLength; i++) {
      assert.ok(below(minus(orbit[i + repeatLength], orbit[i]), 300));
    }
    // Not sooner, and not a shorter repeat.
    assert.ok(!below(minus(orbit[landsAfter - 1 + repeatLength], orbit[landsAfter - 1]), 20));
    for (let length = 1; length < repeatLength; length++) {
      assert.ok(!below(minus(orbit[landsAfter + length], orbit[landsAfter]), 20));
    }
    // Zero is not on the repeat, so this is not the center of a bulb.
    for (let i = 1; i <= landsAfter + repeatLength; i++) {
      assert.ok(!below(orbit[i], 20));
    }
  });
}

test("the article's route for (0, 1) lands on a repeat after two jumps", () => {
  const steps = [[0, 0]];
  for (let i = 0; i < 5; i++) {
    const [x, y] = steps.at(-1);
    steps.push([x * x - y * y, 2 * x * y + 1]);
  }
  assert.deepEqual(steps, [
    [0, 0],
    [0, 1],
    [-1, 1],
    [0, -1],
    [-1, 1],
    [0, -1],
  ]);
});

test("the factor at (0, 1) is the one worked out by hand from Tan Lei's formula", () => {
  // Her lambda = (f^l)'(c) / (d/dc f^l(c) - da/dc) = 2i / ((1 + 2i) - (0.2 + 0.4i)) = 1 + 0.5i.
  // Mandelbrot offsets are lambda times Julia offsets, so w = 1 / lambda = 0.8 - 0.4i.
  const w = matchingFactor(place("Fork").c);
  assert.ok(Math.abs(w.real - 0.8) < 1e-9);
  assert.ok(Math.abs(w.imaginary + 0.4) < 1e-9);
});

test("the factors agree with a high-precision calculation", () => {
  const known = {
    Fork: [0.894427, -26.5651],
    Star: [0.98748, -17.854],
    Spiral: [4.3549, -73.886],
  };
  for (const { name, c } of ZOOM_PLACES) {
    const { scale, degrees } = juliaFit(c);
    assert.ok(Math.abs(scale - known[name][0]) < 1e-3, name);
    assert.ok(Math.abs(degrees - known[name][1]) < 1e-2, name);
  }
});

test("zoom runs from the widest view to the narrowest in equal ratios", () => {
  for (const zoomPlace of ZOOM_PLACES) {
    assert.equal(halfWidthAt(zoomPlace, 0), zoomPlace.widest);
    assert.ok(Math.abs(halfWidthAt(zoomPlace, ZOOM_STOPS) - 0.0004) < 1e-12);
    const ratio = halfWidthAt(zoomPlace, 1) / halfWidthAt(zoomPlace, 0);
    const next = halfWidthAt(zoomPlace, 51) / halfWidthAt(zoomPlace, 50);
    assert.ok(Math.abs(ratio - next) < 1e-12);
    assert.equal(zoomAt(zoomPlace, 0), 1);
  }
});

test("the first picture shows the whole Mandelbrot set", () => {
  for (const zoomPlace of ZOOM_PLACES) {
    const [left, right, bottom, top] = mandelbrotBounds(zoomPlace, 0);
    assert.ok(left <= -2 && right >= 0.48, zoomPlace.name);
    assert.ok(bottom <= -1.13 && top >= 1.13, zoomPlace.name);
  }
});

test("the turned canvas shows w * d under each screen offset d", () => {
  for (const zoomPlace of ZOOM_PLACES) {
    const { c } = zoomPlace;
    const w = matchingFactor(c);
    const { degrees, cover } = juliaFit(c);
    const half = halfWidthAt(zoomPlace, 40);
    const [left, right] = juliaBounds(zoomPlace, 40);
    // A clockwise CSS turn by phi shows the canvas position e^(i phi) * s at screen position s.
    const phi = (degrees * Math.PI) / 180;
    for (const [sx, sy] of [
      [1, 0],
      [0.3, -0.8],
      [-1, 1],
    ]) {
      const canvasX = sx * Math.cos(phi) - sy * Math.sin(phi);
      const canvasY = sx * Math.sin(phi) + sy * Math.cos(phi);
      // The canvas is `cover` times wider than the frame, so one frame half is 1 / cover of it.
      const juliaX = ((canvasX / cover) * (right - left)) / 2;
      const juliaY = ((canvasY / cover) * (right - left)) / 2;
      const expectedX = (w.real * sx - w.imaginary * sy) * half;
      const expectedY = (w.real * sy + w.imaginary * sx) * half;
      assert.ok(Math.abs(juliaX - expectedX) < 1e-9 * half);
      assert.ok(Math.abs(juliaY - expectedY) < 1e-9 * half);
    }
    // The frame's corners stay inside the turned canvas.
    assert.ok(Math.abs(Math.cos(phi)) + Math.abs(Math.sin(phi)) <= cover + 1e-12);
  }
});

const SHADER_BAILOUT = 256 ** 2;

/** The shader's smooth count, or null if the point has not escaped. */
function smoothCount(point, c, { mandelbrot, round = (v) => v }) {
  let x = mandelbrot ? 0 : point.real;
  let y = mandelbrot ? 0 : point.imaginary;
  const addReal = mandelbrot ? point.real : c.real;
  const addImaginary = mandelbrot ? point.imaginary : c.imaginary;
  let count = mandelbrot ? 0 : 1;
  for (let i = 0; i < MANDELBROT_ZOOM_COLORING.iterations; i++) {
    const nextX = round(round(round(x * x) - round(y * y)) + addReal);
    y = round(round(round(x * y) * 2) + addImaginary);
    x = nextX;
    const size = x * x + y * y;
    if (size > SHADER_BAILOUT) return count + 1 - Math.log2(Math.log(size) / 2);
    count++;
  }
  return null;
}

/** Both pictures' counts over a grid of matching pixels. Points that never escape count as the limit. */
function pictureCounts(zoomPlace, stop) {
  const { c } = zoomPlace;
  const half = halfWidthAt(zoomPlace, stop);
  const w = matchingFactor(c);
  const limit = MANDELBROT_ZOOM_COLORING.iterations;
  const size = 96;
  const pairs = [];
  for (let row = 0; row < size; row++) {
    for (let column = 0; column < size; column++) {
      const sx = ((column + 0.5) / size) * 2 - 1;
      const sy = ((row + 0.5) / size) * 2 - 1;
      const mandelbrot = { real: c.real + sx * half, imaginary: c.imaginary + sy * half };
      const julia = {
        real: c.real + (w.real * sx - w.imaginary * sy) * half,
        imaginary: c.imaginary + (w.real * sy + w.imaginary * sx) * half,
      };
      pairs.push([
        smoothCount(mandelbrot, c, { mandelbrot: true }) ?? limit,
        smoothCount(julia, c, { mandelbrot: false }) ?? limit,
      ]);
    }
  }
  return pairs;
}

function correlation(pairs) {
  const mean = (index) => pairs.reduce((sum, pair) => sum + pair[index], 0) / pairs.length;
  const [a, b] = [mean(0), mean(1)];
  let ab = 0;
  let aa = 0;
  let bb = 0;
  for (const [x, y] of pairs) {
    ab += (x - a) * (y - b);
    aa += (x - a) ** 2;
    bb += (y - b) ** 2;
  }
  return ab / Math.sqrt(aa * bb);
}

const withinOneJump = (pairs) =>
  pairs.filter(([x, y]) => Math.abs(x - y) <= 1).length / pairs.length;

test("the pictures are unrelated zoomed out and match zoomed in", () => {
  for (const zoomPlace of ZOOM_PLACES) {
    assert.ok(correlation(pictureCounts(zoomPlace, 0)) < 0.5, zoomPlace.name);
    assert.ok(correlation(pictureCounts(zoomPlace, ZOOM_STOPS)) > 0.7, zoomPlace.name);
  }
});

test("the article's zoom for Fork gives the same picture on both sides", () => {
  const fork = place("Fork");
  const stop = Array.from({ length: ZOOM_STOPS + 1 }, (_, i) => i).find(
    (i) => zoomAt(fork, i) >= 200,
  );
  assert.ok(withinOneJump(pictureCounts(fork, stop)) > 0.95);
});

test("the Julia count starts one jump ahead, so one count gives one color", () => {
  const { colorOffset, colorDensity } = MANDELBROT_ZOOM_COLORING;
  assert.ok(Math.abs(JULIA_ZOOM_COLORING.colorOffset - (colorOffset + colorDensity / 40)) < 1e-12);
  assert.equal(JULIA_ZOOM_COLORING.palette, MANDELBROT_ZOOM_COLORING.palette);
  assert.equal(JULIA_ZOOM_COLORING.iterations, MANDELBROT_ZOOM_COLORING.iterations);
  assert.equal(JULIA_ZOOM_COLORING.interior, MANDELBROT_ZOOM_COLORING.interior);
});

test("32-bit floats stay clean at the deepest stop", () => {
  const round = Math.fround;
  for (const zoomPlace of ZOOM_PLACES) {
    const { c } = zoomPlace;
    const half = halfWidthAt(zoomPlace, ZOOM_STOPS);
    const scale = juliaFit(c).scale;
    const center = { real: round(c.real), imaginary: round(c.imaginary) };
    // Neighboring pixels on a 1200-pixel canvas still land on different 32-bit numbers.
    for (const size of [half, half * scale]) {
      const pixel = (2 * size) / 1200;
      for (const value of [c.real, c.imaginary]) {
        const ulp = Math.abs(round(Math.abs(value) * (1 + 2 ** -23)) - round(Math.abs(value)));
        assert.ok(pixel > 2 * (ulp || 2 ** -30), `${zoomPlace.name} ${value}`);
      }
    }
    let different = 0;
    const samples = 40;
    for (let row = 0; row < samples; row++) {
      for (let column = 0; column < samples; column++) {
        const sx = ((column + 0.5) / samples) * 2 - 1;
        const sy = ((row + 0.5) / samples) * 2 - 1;
        const point = { real: c.real + sx * half, imaginary: c.imaginary + sy * half };
        const single = {
          real: round(center.real + round(sx * half)),
          imaginary: round(center.imaginary + round(sy * half)),
        };
        const exact = smoothCount(point, c, { mandelbrot: true });
        const rounded = smoothCount(single, center, { mandelbrot: true, round });
        if (exact === null || rounded === null || Math.abs(exact - rounded) > 1) different++;
      }
    }
    assert.ok(different / samples ** 2 < 0.1, `${zoomPlace.name}: ${different}`);
  }
});
