import assert from "node:assert/strict";
import test from "node:test";
import { dragonGroups, dragonTile } from "../utils/lessons/dragonTiling.ts";
import { rewriteSentence, traceTurtle } from "../utils/turtleCurves.ts";

const tileAt = (level) =>
  dragonTile(
    traceTurtle(rewriteSentence("F", { F: "F+G", G: "F-G" }, level), {
      turnAngle: Math.PI / 2,
      drawChars: "FG",
    }).points,
  );

test("the periodic tiles cover every small square once, at every available detail", () => {
  for (let level = 0; level <= 10; level++) {
    const tile = tileAt(level);
    assert.equal(tile.centers.length, 2 ** level);
    const occupied = new Set();
    const period = 4;
    const precision = 2 ** (level + 2);
    // A torus of side 4 checks the entire periodic pattern, including its seams.
    const wrap = (v) =>
      ((Math.round(v * precision) % (period * precision)) + period * precision) %
      (period * precision);
    for (let x = 0; x < period; x++)
      for (let y = 0; y < period; y++) {
        if ((x + y) % 2) continue;
        for (let turn = 0; turn < 4; turn++)
          for (const center of tile.centers) {
            let [cx, cy] = center;
            for (let r = 0; r < turn; r++) [cx, cy] = [-cy, cx];
            const key = `${wrap(x + cx)},${wrap(y + cy)}`;
            assert.ok(!occupied.has(key), `overlapping square at detail ${level}`);
            occupied.add(key);
          }
      }
    // Every square has area 1 / (2 * 2^level). No overlap + full area = coverage.
    assert.equal(occupied.size / (2 * 2 ** level), period ** 2);
    let twiceArea = 0;
    for (const loop of tile.outline.split("Z").filter(Boolean)) {
      const vertices = loop
        .slice(1)
        .split("L")
        .map((point) => point.split(",").map(Number));
      for (let i = 0; i < vertices.length; i++) {
        const [ax, ay] = vertices[i];
        const [bx, by] = vertices[(i + 1) % vertices.length];
        twiceArea += ax * by - bx * ay;
      }
    }
    assert.equal(Math.abs(twiceArea) / 2, 0.5, "the rendered outline preserves tile area");
    assert.ok(tile.outline.endsWith("Z"));
    assert.ok(!tile.outline.includes("NaN"));
    assert.ok(tile.path.endsWith("L1,0"));
  }
});

test("repetition includes the central group and enough neighbours for the viewport", () => {
  const groups = dragonGroups(4);
  assert.equal(groups.length, 41);
  assert.ok(groups.some(({ x, y }) => x === 0 && y === 0));
  assert.ok(groups.every(({ x, y }) => (x + y) % 2 === 0));
});
