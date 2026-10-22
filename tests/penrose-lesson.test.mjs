import assert from "node:assert/strict";
import test from "node:test";
import {
  getPenroseLessonCut,
  getPenroseLessonParent,
  getPenroseLessonStages,
} from "../utils/lessons/penroseLesson.ts";
import { deflateP2, PHI } from "../utils/penroseTiling.ts";

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
