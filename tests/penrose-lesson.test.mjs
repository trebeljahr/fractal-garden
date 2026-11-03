import assert from "node:assert/strict";
import test from "node:test";
import {
  getPenroseLessonCut,
  getPenroseLessonParent,
  getPenroseLessonSecondCut,
  getPenroseLessonStages,
} from "../utils/lessons/penroseLesson.ts";
import {
  nearestToCenter,
  slideCandidates,
  slideMatches,
  squareTiles,
  tileKeys,
  tilesFromHalves,
  tilesWithin,
} from "../utils/lessons/penroseSlide.ts";
import { deflateP2, getVisibleTriangles, PHI } from "../utils/penroseTiling.ts";

const close = (a, b, tolerance = 1e-9) => assert.ok(Math.abs(a - b) < tolerance, `${a} != ${b}`);
const vertices = ({ a, b, c }) => [a, b, c];
const cross = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
const area = (points) =>
  Math.abs(
    points.reduce((sum, p, i) => {
      const q = points[(i + 1) % points.length];
      return sum + p[0] * q[1] - q[0] * p[1];
    }, 0),
  ) / 2;
const distance = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]);

// Convex polygon clipping checks interiors rather than comparing coordinates
// or treating a fixed vertex inventory as a visual snapshot.
function intersection(subject, boundary) {
  let output = subject;
  const edges = cross(...boundary) < 0 ? [...boundary].reverse() : boundary;
  for (let i = 0; i < edges.length; i++) {
    const a = edges[i];
    const b = edges[(i + 1) % edges.length];
    const input = output;
    output = [];
    if (!input.length) break;
    let previous = input.at(-1);
    for (const point of input) {
      const pSide = cross(a, b, previous);
      const side = cross(a, b, point);
      if (side >= 0 !== pSide >= 0) {
        const fraction = pSide / (pSide - side);
        output.push([
          previous[0] + (point[0] - previous[0]) * fraction,
          previous[1] + (point[1] - previous[1]) * fraction,
        ]);
      }
      if (side >= 0) output.push(point);
      previous = point;
    }
  }
  return output;
}

test("P2 child triangles fill either parent without overlapping interiors", () => {
  for (const kind of ["acute", "obtuse"]) {
    const stages = getPenroseLessonStages(kind, deflateP2);
    const parent = vertices(stages[0][0]);
    const parentArea = area(parent);
    for (const triangles of stages) {
      close(
        triangles.reduce((sum, triangle) => sum + area(vertices(triangle)), 0),
        parentArea,
      );
      for (const [index, triangle] of triangles.entries()) {
        const points = vertices(triangle);
        close(area(intersection(points, parent)), area(points));
        for (const other of triangles.slice(index + 1)) {
          close(area(intersection(points, vertices(other))), 0);
        }
      }
    }
  }
});

test("P2 subdivision retains the two Robinson triangle angle sets", () => {
  for (const kind of ["acute", "obtuse"]) {
    for (const triangle of getPenroseLessonStages(kind, deflateP2).flat()) {
      const ab = distance(triangle.a, triangle.b);
      const ac = distance(triangle.a, triangle.c);
      const bc = distance(triangle.b, triangle.c);
      close(ab, ac);
      const apex = (Math.acos((ab ** 2 + ac ** 2 - bc ** 2) / (2 * ab * ac)) * 180) / Math.PI;
      close(apex, triangle.type === 0 ? 36 : 108, 1e-8);
    }
  }
});

test("P2 half-tile counts follow the acute and obtuse replacement rules", () => {
  for (const kind of ["acute", "obtuse"]) {
    let expected = kind === "acute" ? [1, 0] : [0, 1];
    for (const triangles of getPenroseLessonStages(kind, deflateP2)) {
      const counts = [
        triangles.filter(({ type }) => type === 0).length,
        triangles.filter(({ type }) => type === 1).length,
      ];
      assert.deepEqual(counts, expected);
      expected = [2 * expected[0] + expected[1], expected[0] + expected[1]];
    }
  }
});

test("the first marked cut divides its parent edge in the golden ratio", () => {
  for (const kind of ["acute", "obtuse"]) {
    const parent = getPenroseLessonParent(kind);
    const [from, to] = kind === "acute" ? [parent.a, parent.b] : [parent.b, parent.c];
    const cut = getPenroseLessonCut(parent);
    close(distance(from, cut) / distance(cut, to), PHI);
    close(cross(from, cut, to), 0);
  }
});

test("the acute lesson marks the second production cut on CA", () => {
  const parent = getPenroseLessonParent("acute");
  const q = getPenroseLessonSecondCut(parent);
  close(distance(parent.c, q) / distance(q, parent.a), PHI);
  close(cross(parent.c, q, parent.a), 0);
  const children = deflateP2(parent);
  assert.deepEqual(q, children[2].a);
  assert.equal(getPenroseLessonSecondCut(getPenroseLessonParent("obtuse")), null);
});

const COMPARED = 3;
const penrosePatch = () => {
  const all = tilesFromHalves(
    getVisibleTriangles("p2", "sun", 5, {
      minX: -COMPARED,
      minY: -COMPARED,
      maxX: COMPARED,
      maxY: COMPARED,
    }),
  );
  return { shown: tilesWithin(all, 1), present: tileKeys(all) };
};

test("half-tiles join into whole kites and darts in about the golden ratio", () => {
  const { shown } = penrosePatch();
  const kites = shown.filter(({ kind }) => kind === 0).length;
  const darts = shown.filter(({ kind }) => kind === 1).length;
  assert.ok(shown.length > 600);
  close(kites / darts, PHI, 0.1);
  for (const tile of shown) assert.equal(tile.corners.length, 4);
});

test("the count ratio reaches the golden ratio from either starting triangle", () => {
  for (const kind of ["acute", "obtuse"]) {
    const last = getPenroseLessonStages(kind, deflateP2).at(-1);
    const narrow = last.filter(({ type }) => type === 0).length;
    close(narrow / (last.length - narrow), PHI, 0.001);
  }
  const stages = getPenroseLessonStages("acute", deflateP2);
  assert.equal(stages.length, 7);
  const third = stages[3];
  assert.equal(third.filter(({ type }) => type === 0).length, 13);
  assert.equal(third.filter(({ type }) => type === 1).length, 8);
});

test("every slide of square tiles lines up, and no slide of kites and darts does", () => {
  const all = squareTiles(COMPARED, 42);
  const squares = tilesWithin(all, 1);
  assert.equal(squares.length, 196);
  const present = tileKeys(all);
  const squareSlides = slideCandidates(squares, present, nearestToCenter(squares));
  assert.ok(squareSlides.length > 100);
  for (const { hits } of squareSlides) assert.equal(hits, squares.length);

  const { shown, present: kitesAndDarts } = penrosePatch();
  const marked = nearestToCenter(shown);
  const candidates = slideCandidates(shown, kitesAndDarts, marked);
  assert.ok(candidates.length > 10);
  for (const { tile, hits } of candidates) {
    assert.ok(hits < shown.length);
    const dx = tile.tip[0] - marked.tip[0];
    const dy = tile.tip[1] - marked.tip[1];
    // The marked tile itself always lands on its target.
    assert.ok(slideMatches(shown, kitesAndDarts, dx, dy).has(marked));
  }
});
