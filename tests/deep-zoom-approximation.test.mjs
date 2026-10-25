import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import ts from "typescript";

const require = createRequire(import.meta.url);
require.extensions[".ts"] = (module, filename) => {
  const { outputText } = ts.transpileModule(readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  module._compile(outputText, filename);
};
const { buildApproximation } = require("../utils/deepZoom/approximation.ts");
const { buildReference, sampleEscape } = require("../utils/deepZoom/orbit.ts");
const {
  createViewportAtLog,
  fixedFromNumber,
  fixedOffset,
  fixedToFloatExp,
  moveViewport,
} = require("../utils/deepZoom/math.ts");

function scalarFromTexel(data, offset, bits) {
  const mantissa = fixedFromNumber(data[offset], bits);
  const exponent = BigInt(data[offset + 1]);
  return exponent >= 0n ? mantissa << exponent : mantissa >> -exponent;
}

function complexFromTexel(data, offset, bits) {
  return [scalarFromTexel(data, offset, bits), scalarFromTexel(data, offset + 2, bits)];
}

function logMagnitude(z, bits) {
  const [rm, re] = fixedToFloatExp(z[0], bits);
  const [im, ie] = fixedToFloatExp(z[1], bits);
  const exponent = Math.max(rm === 0 ? -Infinity : re, im === 0 ? -Infinity : ie);
  return Number.isFinite(exponent)
    ? exponent +
        Math.log2(
          Math.hypot(
            rm === 0 ? 0 : rm * 2 ** (re - exponent),
            im === 0 ? 0 : im * 2 ** (ie - exponent),
          ),
        )
    : -Infinity;
}

function add(a, b) {
  return [a[0] + b[0], a[1] + b[1]];
}
function multiply(a, b, bits) {
  return [(a[0] * b[0] - a[1] * b[1]) >> BigInt(bits), (a[0] * b[1] + a[1] * b[0]) >> BigInt(bits)];
}
function squareMagnitude(z) {
  return z[0] * z[0] + z[1] * z[1];
}

function selectBlock(table, refIndex, iteration, limit, delta, dc, bits) {
  if (logMagnitude(dc, bits) > table.logDeltaC) return null;
  const offset = refIndex * table.stride * 4;
  const logDelta = logMagnitude(delta, bits);
  for (const candidate of [0, 1]) {
    const header = offset + candidate * 2;
    const skip = table.data[header + 1];
    if (skip > 1 && iteration + skip <= limit && logDelta < table.data[header])
      return { skip, coefficients: offset + 4 + candidate * 8, short: candidate === 1 };
  }
  return null;
}

// A fixed-point consumer of the actual packed table, compared below with the
// independent full-orbit oracle. No floating-point perturbation implementation
// is reused here; the antenna's reference samples are exactly representable.
function acceleratedEscape(view, reference, table, dx, dy) {
  const dc = [fixedOffset(dx, view.logZoom, view.bits), fixedOffset(dy, view.logZoom, view.bits)];
  let delta = [0n, 0n];
  let refIndex = 0;
  let iteration = 0;
  let skipped = 0;
  let shortJumps = 0;
  let ordinarySteps = 0;
  let actual = [0n, 0n];
  const bailout = 65536n << BigInt(2 * view.bits);
  while (iteration < reference.iterations) {
    const block = selectBlock(
      table,
      refIndex,
      iteration,
      reference.iterations,
      delta,
      dc,
      view.bits,
    );
    if (block) {
      const { skip, coefficients } = block;
      const a = complexFromTexel(table.data, coefficients, view.bits);
      const b = complexFromTexel(table.data, coefficients + 4, view.bits);
      delta = add(multiply(a, delta, view.bits), multiply(b, dc, view.bits));
      refIndex += skip;
      iteration += skip;
      skipped += skip - 1;
      shortJumps += block.short ? 1 : 0;
    } else {
      ordinarySteps++;
      const ref = complexFromTexel(reference.orbit, refIndex * 4, view.bits);
      const twice = [ref[0] * 2n, ref[1] * 2n];
      delta = add(add(multiply(twice, delta, view.bits), multiply(delta, delta, view.bits)), dc);
      refIndex++;
      iteration++;
    }
    actual = add(complexFromTexel(reference.orbit, refIndex * 4, view.bits), delta);
    if (squareMagnitude(actual) > bailout)
      return {
        escaped: true,
        iteration: iteration - 1,
        actual,
        skipped,
        shortJumps,
        ordinarySteps,
      };
    if (squareMagnitude(actual) < squareMagnitude(delta) || refIndex >= reference.length - 1) {
      delta = actual;
      refIndex = 0;
    }
  }
  return { escaped: false, iteration, actual, skipped, shortJumps, ordinarySteps };
}

test("constant antenna orbit gives closed-form affine blocks without exponent overflow", () => {
  const reference = buildReference(createViewportAtLog([-2, 0], -4096), "mandelbrot", [0, 0], 1100);
  const table = buildApproximation(reference, { logDeltaC: -4094, maxBlockLength: 1024 });
  assert.equal(table.stride, 5);
  assert.equal(table.length, reference.length);
  assert.equal(table.maxSkip, 1024);
  assert.ok(table.data.every(Number.isFinite));
  assert.equal(table.data[1], 0, "the critical step at index zero must not be skipped");
  const offset = 2 * table.stride * 4;
  assert.equal(table.data[offset + 1], 1024);
  // Z=2 throughout this block: A=4^L, B=(4^L-1)/3.
  assert.deepEqual(Array.from(table.data.slice(offset + 4, offset + 8)), [1, 2048, 0, 0]);
  assert.equal(table.data[offset + 8], Math.fround(4 / 3));
  assert.equal(table.data[offset + 9], 2046);
  assert.equal(table.data[offset + 10], 0);
  assert.equal(table.data[offset + 3], 8);
  assert.deepEqual(Array.from(table.data.slice(offset + 12, offset + 16)), [1, 16, 0, 0]);
  assert.equal(table.data[offset + 16], 21845 / 16384);
  assert.equal(table.data[offset + 17], 14);
});

test("coefficient components retain tiny imaginary terms beyond binary64's range", () => {
  const view = moveViewport(createViewportAtLog([-2, 0], -4096), 0, 0.5);
  const reference = buildReference(view, "mandelbrot", [0, 0], 200);
  const table = buildApproximation(reference, { logDeltaC: -4094 });
  const offset = 2 * table.stride * 4;
  assert.ok(table.data[offset + 1] >= 64);
  assert.notEqual(table.data[offset + 6], 0, "imaginary A mantissa must survive");
  assert.ok(table.data[offset + 7] < -1074, "imaginary A needs an extended exponent");
  assert.ok(table.data.every(Number.isFinite));
});

test("a short block remains usable after the long block fails its radius check", () => {
  const view = createViewportAtLog([-2, 0], -4096);
  const reference = buildReference(view, "mandelbrot", [0, 0], 2200);
  const table = buildApproximation(reference, { logDeltaC: -4094 });
  const offset = 2 * table.stride * 4;
  const delta = [fixedFromNumber(2 ** -80, view.bits), 0n];
  const dc = [fixedOffset(-1, view.logZoom, view.bits), 0n];
  assert.ok(logMagnitude(delta, view.bits) >= table.data[offset]);
  assert.ok(logMagnitude(delta, view.bits) < table.data[offset + 2]);
  const selected = selectBlock(table, 2, 2, reference.iterations, delta, dc, view.bits);
  assert.equal(selected.short, true);
  assert.equal(selected.skip, 8);

  const longOnly = { ...table, data: table.data.slice() };
  for (let index = 0; index < longOnly.length; index++) longOnly.data[index * 20 + 3] = 0;
  const both = acceleratedEscape(view, reference, table, -1, 0);
  const long = acceleratedEscape(view, reference, longOnly, -1, 0);
  const exact = sampleEscape(view, "mandelbrot", [0, 0], reference.iterations, -1, 0);
  assert.equal(both.escaped, exact.escaped);
  assert.equal(both.iteration, exact.iteration);
  assert.equal(long.iteration, exact.iteration);
  assert.ok(both.shortJumps > 0);
  assert.ok(
    both.ordinarySteps < long.ordinarySteps,
    "short blocks remove late-orbit ordinary steps",
  );
});

test("short candidates are distinct and respect their configured maximum", () => {
  const reference = buildReference(createViewportAtLog([-2, 0], -1000), "mandelbrot", [0, 0], 200);
  for (const [maxBlockLength, shortMaxBlockLength, expectedLong, expectedShort] of [
    [128, 8, 128, 8],
    [128, 4, 128, 4],
    [8, 8, 8, 4],
    [4, 8, 4, 2],
    [2, 8, 2, 0],
  ]) {
    const table = buildApproximation(reference, {
      logDeltaC: -998,
      maxBlockLength,
      shortMaxBlockLength,
    });
    const offset = 2 * table.stride * 4;
    assert.equal(table.data[offset + 1], expectedLong);
    assert.equal(table.data[offset + 3], expectedShort);
    if (expectedShort === 0)
      assert.ok(table.data.slice(offset + 12, offset + 20).every((value) => value === 0));
  }
});

test("packed maps preserve antenna escape decisions and counts at 10^-1000 and deeper", () => {
  for (const depth of [80, 1000 * Math.log2(10), 4096]) {
    const view = createViewportAtLog([-2, 0], -depth);
    const iterations = Math.ceil(depth / 2) + 100;
    const reference = buildReference(view, "mandelbrot", [0, 0], iterations);
    const table = buildApproximation(reference, { logDeltaC: view.logZoom + 2 });
    for (const [dx, dy] of [
      [-1, 0],
      [1, 0],
      [0, 0],
      [0, 0.5],
      [-0.5, -0.25],
    ]) {
      const accelerated = acceleratedEscape(view, reference, table, dx, dy);
      const exact = sampleEscape(view, "mandelbrot", [0, 0], iterations, dx, dy);
      assert.equal(accelerated.escaped, exact.escaped, `depth ${depth}, pixel ${dx},${dy}`);
      assert.equal(accelerated.iteration, exact.iteration, `depth ${depth}, pixel ${dx},${dy}`);
      assert.ok(accelerated.skipped > 0);
      if (exact.escaped) {
        const actual = accelerated.actual.map((value) => {
          const [m, e] = fixedToFloatExp(value, view.bits);
          return m * 2 ** e;
        });
        const expected = exact.z.map(([m, e]) => m * 2 ** e);
        assert.ok(
          Math.hypot(actual[0] - expected[0], actual[1] - expected[1]) / Math.hypot(...expected) <
            2e-5,
          "escaped orbit value remains close to the independent oracle",
        );
      }
    }
  }
});

test("every skipped intermediate state stays below the escape radius", () => {
  const view = createViewportAtLog([0.4, 0.3], -60);
  const reference = buildReference(view, "mandelbrot", [0, 0], 200);
  const table = buildApproximation(reference, { logDeltaC: -58 });
  assert.equal(reference.escaped, true);
  const dc = 2 ** table.logDeltaC;
  for (let start = 0; start < reference.length; start++) {
    for (const candidate of [0, 1]) {
      const header = start * table.stride * 4 + candidate * 2;
      const skip = table.data[header + 1];
      if (skip < 2) continue;
      // Check the nonlinear triangle envelope at the edge of both domains,
      // not merely the affine block's final value.
      let magnitude = 2 ** table.data[header];
      for (let index = start; index < start + skip; index++) {
        const z = complexFromTexel(reference.orbit, index * 4, view.bits);
        const next = complexFromTexel(reference.orbit, (index + 1) * 4, view.bits);
        const referenceMagnitude = 2 ** logMagnitude(z, view.bits);
        const nextMagnitude = 2 ** logMagnitude(next, view.bits);
        magnitude = 2 * referenceMagnitude * magnitude + magnitude * magnitude + dc;
        assert.ok(nextMagnitude + magnitude < 129);
      }
    }
  }
});

test("parameter domains are explicit and unsupported formulas produce no jumps", () => {
  const view = createViewportAtLog([-2, 0], -80);
  for (const formula of ["julia", "burning-ship"]) {
    const reference = buildReference(view, formula, [0, 0], 200);
    const table = buildApproximation(reference, { logDeltaC: -78 });
    assert.equal(table.maxSkip, 0);
    assert.ok(table.data.every((value) => value === 0));
  }
  const reference = buildReference(view, "mandelbrot", [0, 0], 200);
  assert.equal(buildApproximation(reference, { logDeltaC: 0 }).maxSkip, 0);
  const table = buildApproximation(reference, { logDeltaC: -78 });
  const wider = createViewportAtLog([-2, 0], -30);
  assert.equal(
    acceleratedEscape(wider, reference, table, -1, 0).skipped,
    0,
    "a wider view cannot reuse a table outside its parameter domain",
  );
  for (const options of [
    { logDeltaC: NaN },
    { logDeltaC: Infinity },
    { logDeltaC: -80, maxBlockLength: 0 },
    { logDeltaC: -80, shortMaxBlockLength: 0 },
    { logDeltaC: -80, shortMaxBlockLength: 8193 },
    { logDeltaC: -80, relativeError: 0 },
  ]) {
    assert.throws(() => buildApproximation(reference, options));
  }
});
