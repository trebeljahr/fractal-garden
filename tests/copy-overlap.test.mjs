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
const { FAMILY_RULES, routeStays } = require("../utils/lessons/holomorphicFamilies.ts");

// Measures how much of a copy lies on the Mandelbrot set: scale both to the same area, center
// them, try every turn, and divide the shared area by the combined area.
const GRID = 120;
const SIDE = Number(process.env.OVERLAP_SIDE ?? 240);

function shapeAround(shader, center, half, side, jumps) {
  const grid = new Uint8Array(side * side);
  for (let row = 0; row < side; row++)
    for (let column = 0; column < side; column++)
      grid[row * side + column] = routeStays(
        shader,
        {
          real: center.real - half + (2 * half * (column + 0.5)) / side,
          imaginary: center.imaginary - half + (2 * half * (row + 0.5)) / side,
        },
        jumps,
      )
        ? 1
        : 0;
  const seen = new Uint8Array(side * side);
  let largest = [];
  for (let first = 0; first < side * side; first++) {
    if (!grid[first] || seen[first]) continue;
    const stack = [first];
    const cells = [];
    seen[first] = 1;
    while (stack.length) {
      const cell = stack.pop();
      cells.push(cell);
      const row = Math.floor(cell / side);
      const column = cell % side;
      for (const [dc, dr] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        const c = column + dc;
        const r = row + dr;
        if (c < 0 || r < 0 || c >= side || r >= side) continue;
        const next = r * side + c;
        if (grid[next] && !seen[next]) {
          seen[next] = 1;
          stack.push(next);
        }
      }
    }
    if (cells.length > largest.length) largest = cells;
  }
  const inside = new Uint8Array(side * side);
  let sumX = 0;
  let sumY = 0;
  for (const cell of largest) {
    inside[cell] = 1;
    sumX += cell % side;
    sumY += Math.floor(cell / side);
  }
  return {
    inside,
    side,
    x: sumX / largest.length,
    y: sumY / largest.length,
    size: Math.sqrt(largest.length),
  };
}

const holds = (shape, x, y) => {
  const column = Math.round(shape.x + x * shape.size);
  const row = Math.round(shape.y + y * shape.size);
  return (
    column >= 0 &&
    row >= 0 &&
    column < shape.side &&
    row < shape.side &&
    shape.inside[row * shape.side + column] === 1
  );
};

function overlap(a, b) {
  const atTurn = (degrees) => {
    const cos = Math.cos((degrees * Math.PI) / 180);
    const sin = Math.sin((degrees * Math.PI) / 180);
    let shared = 0;
    let either = 0;
    for (let row = 0; row < GRID; row++) {
      const y = -1.4 + (2.8 * (row + 0.5)) / GRID;
      for (let column = 0; column < GRID; column++) {
        const x = -1.4 + (2.8 * (column + 0.5)) / GRID;
        const inA = holds(a, x, y);
        const inB = holds(b, cos * x - sin * y, sin * x + cos * y);
        if (inA && inB) shared++;
        if (inA || inB) either++;
      }
    }
    return shared / either;
  };
  let best = 0;
  let bestTurn = 0;
  for (let degrees = 0; degrees < 360; degrees += 6) {
    const value = atTurn(degrees);
    if (value > best) {
      best = value;
      bestTurn = degrees;
    }
  }
  for (let degrees = bestTurn - 5; degrees <= bestTurn + 5; degrees++)
    best = Math.max(best, atTurn(degrees));
  return best;
}

const article = readFileSync(
  new URL("../fractal-descriptions/mandelbrot.md", import.meta.url),
  "utf8",
);

test("each copy's stated overlap with the Mandelbrot set is what it measures", () => {
  const whole = shapeAround(1, { real: -0.7, imaginary: 0 }, 1.45, 600, 1500);
  const measured = [];
  for (const rule of FAMILY_RULES)
    for (const place of rule.places) {
      const value = overlap(whole, shapeAround(rule.shader, place.at, place.half, SIDE, 1200));
      measured.push(`${rule.name} (${place.at.real}, ${place.at.imaginary}): ${value.toFixed(3)}`);
      if (!process.env.OVERLAP_PRINT)
        assert.ok(Math.abs(value - place.overlap) < 0.04, measured.at(-1));
    }
  if (process.env.OVERLAP_PRINT) console.log(measured.join("\n"));
  assert.match(article, /the match under each small picture/);
});
