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
const { expandLSystem, traceTurtle } = require("../utils/turtleCurve.ts");
const { CESARO_LEAD, cesaroLine, cesaroTip } = require("../utils/lessons/cesaroAngle.ts");

// The same recipe the explorer draws: four sides of a square, spikes inward.
function walk(angle, level) {
  const { points } = traceTurtle(
    expandLSystem("FLFLFLF", { F: "F+F--F+F" }, level),
    { "+": angle, "-": -angle, L: 90 },
    0,
  );
  return points;
}

test("each new line has the length the readout says, and four of them span the old line", () => {
  for (const angle of [60, 72, 85, 89, 90]) {
    const points = walk(angle, 1);
    const length = Math.hypot(points[2] - points[0], points[3] - points[1]);
    // The first side at level 1 ends where the first level 0 line of length 1 scaled by 1 would.
    const side = Math.hypot(points[8] - points[0], points[9] - points[1]);
    assert.ok(Math.abs(length / side - cesaroLine(angle)) < 1e-9, `${angle}`);
  }
  assert.ok(Math.abs(cesaroLine(60) - 1 / 3) < 1e-12);
  assert.ok(Math.abs(cesaroLine(85) - 0.46) < 1e-3);
  assert.ok(Math.abs(cesaroLine(90) - 1 / 2) < 1e-12);
  assert.equal(cesaroTip(60), 60);
  assert.equal(cesaroTip(90), 0);
});

test("at 90 degrees the line walks a whole grid: inner lines twice, outer lines once", () => {
  for (let level = 1; level <= 6; level++) {
    const points = walk(90, level);
    const count = points.length / 2 - 1;
    assert.equal(count, 4 * 4 ** level);
    const size = 2 ** level;
    const unit = Math.hypot(points[2] - points[0], points[3] - points[1]);
    const grid = [];
    const xs = [];
    const ys = [];
    for (let i = 0; i < points.length; i += 2) {
      xs.push(points[i]);
      ys.push(points[i + 1]);
    }
    const [minX, minY] = [Math.min(...xs), Math.min(...ys)];
    for (let i = 0; i < xs.length; i++)
      grid.push([Math.round((xs[i] - minX) / unit), Math.round((ys[i] - minY) / unit)]);
    assert.equal(Math.max(...grid.map(([x]) => x)), size);
    assert.equal(Math.max(...grid.map(([, y]) => y)), size);

    const walked = new Map();
    for (let i = 1; i < grid.length; i++) {
      const [a, b] = [grid[i - 1], grid[i]];
      assert.equal(Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]), 1, "one grid step at a time");
      const low = a[0] + a[1] < b[0] + b[1] ? a : b;
      const high = low === a ? b : a;
      const key = `${low}|${high}`;
      const entry = walked.get(key) ?? { forward: 0, back: 0, low, high };
      if (low === a) entry.forward++;
      else entry.back++;
      walked.set(key, entry);
    }
    assert.equal(walked.size, 2 * size * (size + 1));
    for (const { forward, back, low, high } of walked.values()) {
      const onRim =
        (low[0] === high[0] && (low[0] === 0 || low[0] === size)) ||
        (low[1] === high[1] && (low[1] === 0 || low[1] === size));
      if (onRim) assert.equal(forward + back, 1);
      else assert.deepEqual([forward, back], [1, 1]);
    }
  }
});

test("the lead reads the notch and names the grid only at 90 degrees", () => {
  assert.deepEqual(
    CESARO_LEAD.readout({ angle: 85 }, 3).map((row) => row.value),
    ["46.0%", "10°"],
  );
  assert.deepEqual(
    CESARO_LEAD.readout({ angle: 90 }, 3).map((row) => row.value),
    ["50.0%", "0°", "8 × 8"],
  );
  assert.equal(CESARO_LEAD.control.max, 90);
});
