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
  carpetHeightAt,
  carpetHeightStep,
  carpetLineFate,
  carpetLineHoles,
  carpetLineRows,
  formatCarpetHeight,
  NAMED_HEIGHTS,
} = require("../utils/lessons/carpetLine.ts");
const { drawSierpinskiCarpet } = require("../utils/render/drawings/sierpinskiCarpet.ts");

// 972 is 4 × 3^5, so at level 5 every hole on the page's own generator has whole-number corners.
const SIDE = 972;
const WIDTH = (SIDE * 5) / 4;

/** The holes the page's generator draws at a level, read off the drawing calls it makes. */
function generatorHoles(level) {
  const holes = [];
  globalThis.Path2D = class {
    rect(x, y, width, height) {
      holes.push({ x, y, width, height });
    }
  };
  const context = { translate() {}, fillRect() {}, fill() {}, fillStyle: "" };
  drawSierpinskiCarpet(context, WIDTH, WIDTH, {
    iterations: level,
    color: "",
    holeColor: "",
    background: "",
  });
  for (const hole of holes)
    assert.ok([hole.x, hole.y, hole.width].every(Number.isInteger), "corners must be exact");
  return holes;
}

// The generator's y runs down the page. A height is measured up from the bottom.
const generatorCrossed = (holes, { top, bottom }) => {
  const up = SIDE * top;
  return holes.filter((hole) => {
    const low = SIDE - hole.y - hole.height;
    return low * bottom < up && up < (low + hole.height) * bottom;
  });
};
const generatorAlong = (holes, { top, bottom }) => {
  const up = SIDE * top;
  return holes.filter((hole) => {
    const low = SIDE - hole.y - hole.height;
    return low * bottom === up || (low + hole.height) * bottom === up;
  });
};
const generatorTouched = (holes, { top, bottom }) => {
  const up = SIDE * top;
  return holes.filter((hole) => {
    const low = SIDE - hole.y - hole.height;
    return low * bottom <= up && up <= (low + hole.height) * bottom;
  });
};
const height = (top, bottom) => ({ top, bottom });

test("one quarter of the way up meets no hole and no edge on the page's own generator", () => {
  for (const line of [height(1, 4), height(3, 4)])
    for (let level = 1; level <= 5; level++) {
      const holes = generatorHoles(level);
      assert.equal(holes.length, (8 ** level - 1) / 7);
      assert.equal(generatorCrossed(holes, line).length, 0);
      // Closed squares, so this also rules out touching a side or a corner of any hole.
      assert.equal(generatorTouched(holes, line).length, 0);
      assert.equal(carpetLineHoles(line, level).length, 0);
    }
});

test("no two holes touch, so their edges are separate loops inside the outer border", () => {
  const holes = generatorHoles(5);
  for (let a = 0; a < holes.length; a++) {
    const one = holes[a];
    assert.ok(one.x > 0 && one.y > 0 && one.x + one.width < SIDE && one.y + one.height < SIDE);
    for (let b = a + 1; b < holes.length; b++) {
      const two = holes[b];
      const apart =
        one.x + one.width < two.x ||
        two.x + two.width < one.x ||
        one.y + one.height < two.y ||
        two.y + two.height < one.y;
      assert.ok(apart);
    }
  }
});

test("the reason is a two-step loop between a quarter and three quarters of a row", () => {
  // 1/4 of the whole height is 3/4 of the bottom row. 3/4 of that is 1/4 of the top row.
  assert.deepEqual(carpetLineRows(height(1, 4), 8), [0, 2, 0, 2, 0, 2, 0, 2]);
  assert.deepEqual(carpetLineRows(height(3, 4), 8), [2, 0, 2, 0, 2, 0, 2, 0]);
  assert.deepEqual(carpetLineFate(height(1, 4)), { firstHole: null, edge: null });
  assert.deepEqual(carpetLineFate(height(3, 4)), { firstHole: null, edge: null });
});

test("one half goes through holes at every level, and one third runs along an edge", () => {
  assert.deepEqual(
    [1, 2, 3, 4, 5].map((level) => carpetLineHoles(height(1, 2), level).length),
    [1, 3, 7, 15, 31],
  );
  assert.deepEqual(carpetLineFate(height(1, 2)), { firstHole: 1, edge: null });

  assert.deepEqual(carpetLineFate(height(1, 3)), { firstHole: null, edge: 1 });
  for (let level = 1; level <= 5; level++) {
    const holes = generatorHoles(level);
    assert.equal(generatorCrossed(holes, height(1, 3)).length, 0);
    // It lies along the bottom of the big center hole, the one 324 wide.
    const along = generatorAlong(holes, height(1, 3));
    assert.equal(along.length, 1);
    assert.equal(along[0].width, 324);
    assert.equal(SIDE - along[0].y - along[0].height, 324);
  }
});

test("the holes counted are the holes the generator draws, at every height tried", () => {
  const heights = [height(1, 2), height(1, 3), height(2, 3), height(1, 4), height(1, 9)];
  heights.push(height(4, 9), height(5, 27), height(1, 5), height(3, 10), height(13, 40));
  for (let top = 1; top < 1000; top += 37) heights.push(height(top, 1000));
  for (let top = 1; top < 243; top += 11) heights.push(height(top, 243));
  for (let level = 1; level <= 5; level++) {
    const holes = generatorHoles(level);
    for (const line of heights) {
      const expected = generatorCrossed(holes, line);
      const found = carpetLineHoles(line, level);
      assert.equal(found.length, expected.length, `${line.top}/${line.bottom} at level ${level}`);
      const place = ({ x, y, width }) => `${x},${y},${width}`;
      assert.deepEqual(
        found
          .map((hole) => {
            const width = SIDE / 3 ** hole.level;
            return place({ x: hole.column * width, y: hole.row * width, width });
          })
          .sort(),
        expected.map(place).sort(),
      );
    }
  }
});

test("the first hole and the edge named by the fate match the generator", () => {
  const heights = [];
  for (let top = 1; top < 243; top++) heights.push(height(top, 243));
  for (let top = 1; top < 1000; top += 7) heights.push(height(top, 1000));
  const byLevel = [1, 2, 3, 4, 5].map(generatorHoles);
  for (const line of heights) {
    const { firstHole, edge } = carpetLineFate(line);
    const crossedAt = byLevel.findIndex((holes) => generatorCrossed(holes, line).length > 0);
    if (firstHole !== null && firstHole <= 5) assert.equal(crossedAt + 1, firstHole);
    else assert.equal(crossedAt, -1);
    const alongAt = byLevel.findIndex((holes) => generatorAlong(holes, line).length > 0);
    if (edge !== null && edge <= 5) assert.equal(alongAt + 1, edge);
    else assert.equal(alongAt, -1);
  }
});

test("close to one quarter is not enough: the first hole only comes later", () => {
  assert.equal(carpetLineFate(height(255, 1000)).firstHole, 5);
  assert.equal(carpetLineFate(height(249, 1000)).firstHole, 6);
  assert.equal(carpetLineFate(height(251, 1000)).firstHole, 10);
  // Other fractions with no middle row exist too. They are not a mistake in the readout.
  assert.deepEqual(carpetLineFate(height(3, 10)), { firstHole: null, edge: null });
});

test("a pointer lands exactly on the named heights, and rounds exactly elsewhere", () => {
  const snap = 0.006;
  assert.deepEqual(carpetHeightAt(0.2501, snap), height(1, 4));
  assert.deepEqual(carpetHeightAt(0.7499, snap), height(3, 4));
  assert.deepEqual(carpetHeightAt(1 / 3 + 0.004, snap), height(1, 3));
  assert.deepEqual(carpetHeightAt(0.5, snap), height(1, 2));
  assert.deepEqual(carpetHeightAt(0.26, snap), height(13, 50));
  // The outer border can't be picked.
  assert.deepEqual(carpetHeightAt(0, snap), height(1, 1000));
  assert.deepEqual(carpetHeightAt(1, snap), height(999, 1000));
  for (const named of NAMED_HEIGHTS)
    assert.deepEqual(carpetHeightAt(named.top / named.bottom, snap), named);
});

test("the arrow keys step by a thousandth and leave a third for the next thousandth", () => {
  assert.deepEqual(carpetHeightStep(height(1, 4), 1), height(251, 1000));
  assert.deepEqual(carpetHeightStep(height(1, 4), -1), height(249, 1000));
  assert.deepEqual(carpetHeightStep(height(1, 3), 1), height(167, 500));
  assert.deepEqual(carpetHeightStep(height(1, 3), -1), height(333, 1000));
  assert.deepEqual(carpetHeightStep(height(999, 1000), 1), height(999, 1000));
});

test("heights read as fractions when they are simple", () => {
  assert.equal(formatCarpetHeight(height(1, 4)), "1/4");
  assert.equal(formatCarpetHeight(height(3, 10)), "3/10");
  assert.equal(formatCarpetHeight(height(251, 1000)), "0.251");
});
