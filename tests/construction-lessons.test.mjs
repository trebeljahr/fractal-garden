import assert from "node:assert/strict";
import test from "node:test";
import {
  applyFernRule,
  CLASSIC_FERN_MATRIX,
  chooseFernRule,
  traceFern,
} from "../utils/barnsleyFern.ts";
import {
  canopyBranches,
  carpetHoles,
  circleContacts,
  kochEdge,
} from "../utils/constructionDiagrams.ts";
import { keepMengerCube, mengerLayers } from "../utils/menger.ts";
import { traceTeachingOrbit } from "../utils/orbitLesson.ts";
import { pythagorasFork } from "../utils/pythagorasFork.ts";
import { buildApollonianGasket } from "../utils/render/drawings/apollonianGasket.ts";

const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} != ${b}`);

test("carpet holes do not overlap and preserve the expected remaining area", () => {
  for (let step = 0; step <= 3; step++) {
    const holes = carpetHoles(step);
    close(1 - holes.reduce((sum, h) => sum + h.size ** 2, 0), (8 / 9) ** step);
    for (const a of holes) {
      assert.ok(a.x > 0 && a.y > 0 && a.x + a.size < 1 && a.y + a.size < 1);
      for (const b of holes) {
        if (a === b) continue;
        assert.ok(
          a.x + a.size <= b.x + 1e-12 ||
            b.x + b.size <= a.x + 1e-12 ||
            a.y + a.size <= b.y + 1e-12 ||
            b.y + b.size <= a.y + 1e-12,
        );
      }
    }
  }
});
test("Koch replacements preserve endpoints and increase length by four thirds", () => {
  for (let step = 0; step <= 4; step++) {
    const points = kochEdge(step);
    assert.equal(points.length, 4 ** step + 1);
    assert.deepEqual(points[0], { x: 0, y: 0 });
    assert.deepEqual(points.at(-1), { x: 1, y: 0 });
    let length = 0;
    for (let i = 1; i < points.length; i++)
      length += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
    close(length, (4 / 3) ** step);
  }
});
test("canopy children join existing tips and shrink consistently across angle choices", () => {
  for (const angle of [20, 50, 100]) {
    const branches = canopyBranches(5, angle);
    assert.equal(branches.length, 63);
    for (const b of branches) {
      close(Math.hypot(b.end.x - b.start.x, b.end.y - b.start.y), 0.62 ** b.depth);
      if (b.depth)
        assert.ok(
          branches.some(
            (p) => p.depth === b.depth - 1 && p.end.x === b.start.x && p.end.y === b.start.y,
          ),
        );
    }
  }
});
test("new Apollonian circles stay enclosed and touch at least three older circles", () => {
  const circles = buildApollonianGasket(3);
  assert.equal(circles.length, 56);
  for (const c of circles.filter((c) => c.depth > 0)) {
    assert.ok(Math.hypot(c.x, c.y) + c.radius <= 1 + 1e-9);
    const touches = circles.filter(
      (p) =>
        p.depth < c.depth &&
        Math.abs(
          Math.hypot(p.x - c.x, p.y - c.y) -
            (p.bend < 0 ? p.radius - c.radius : p.radius + c.radius),
        ) < 1e-8,
    );
    assert.ok(touches.length >= 3);
  }
});

test("contact markers lie on both the new circle and its older neighbor, including the enclosure", () => {
  const circles = buildApollonianGasket(3);
  for (const circle of circles.filter((c) => c.depth > 0)) {
    const contacts = circleContacts(circle, circles);
    assert.ok(contacts.length >= 3);
    for (const point of contacts) {
      close(Math.hypot(point.x - circle.x, point.y - circle.y), circle.radius);
      assert.ok(
        circles.some(
          (parent) =>
            parent.depth < circle.depth &&
            Math.abs(Math.hypot(point.x - parent.x, point.y - parent.y) - parent.radius) < 1e-8,
        ),
      );
    }
  }
});
test("orbit lesson shows bounded cycles and stops after an escaping iterate", () => {
  const zero = { real: 0, imaginary: 0 };
  assert.ok(
    traceTeachingOrbit(zero, zero).every((s) => s.point.real === 0 && s.point.imaginary === 0),
  );
  assert.deepEqual(
    traceTeachingOrbit({ real: 1, imaginary: 0 }, zero).map((s) => s.point.real),
    [0, 1, 2, 5],
  );
  assert.deepEqual(
    traceTeachingOrbit({ real: -1, imaginary: 0 }, zero)
      .slice(0, 5)
      .map((s) => s.point.real),
    [0, -1, 0, -1, 0],
  );
});
test("Julia changes the starting point while Burning Ship folds both components before the square", () => {
  const c = { real: -0.8, imaginary: 0.156 };
  const start = { real: -0.5, imaginary: 0.3 };
  const plain = traceTeachingOrbit(c, start, false, 1)[1];
  const folded = traceTeachingOrbit(c, start, true, 1)[1];
  close(plain.point.real, folded.point.real);
  close(plain.point.imaginary, -0.144);
  close(folded.point.imaginary, 0.456);
  assert.deepEqual(folded.folded, { real: 0.5, imaginary: 0.3 });
  assert.deepEqual(traceTeachingOrbit(c, start)[0].point, start);
});

test("Menger layers remove seven cubes and preserve the rule under axis permutations", () => {
  const layers = mengerLayers();
  assert.deepEqual(
    layers.map((layer) => layer.filter((cell) => cell.kept).length),
    [8, 4, 8],
  );
  assert.equal(layers.flat().filter((cell) => !cell.kept).length, 7);
  for (const { x, y, z, kept } of layers.flat()) {
    assert.equal(kept, keepMengerCube(z, x, y));
    assert.equal(kept, keepMengerCube(-x, -y, -z));
  }
});

test("Pythagoras forks stay right-angled with square areas summing to their parent", () => {
  const area = (polygon) =>
    Math.abs(
      polygon.reduce((sum, point, index) => {
        const next = polygon[(index + 1) % polygon.length];
        return sum + point.x * next.y - next.x * point.y;
      }, 0),
    ) / 2;
  for (const angle of [15, 30, 45, 60, 75]) {
    const fork = pythagorasFork(angle);
    const [a, tip, b] = fork.triangle;
    close((a.x - tip.x) * (b.x - tip.x) + (a.y - tip.y) * (b.y - tip.y), 0);
    close(area(fork.parent), 1);
    close(area(fork.left), fork.leftArea);
    close(area(fork.right), fork.rightArea);
    close(area(fork.left) + area(fork.right), 1);
    for (const square of [fork.left, fork.right]) {
      const side = Math.hypot(square[1].x - square[0].x, square[1].y - square[0].y);
      for (let i = 0; i < 4; i++) {
        const next = square[(i + 1) % 4];
        close(Math.hypot(next.x - square[i].x, next.y - square[i].y), side);
      }
    }
  }
  close(pythagorasFork(45).leftArea, 0.5);
  close(pythagorasFork(30).leftArea, 0.75);
});

test("fern weights partition the choices used by the explorer", () => {
  close(
    CLASSIC_FERN_MATRIX.reduce((sum, rule) => sum + rule[6], 0),
    1,
  );
  assert.deepEqual([0, 0.85, 0.86, 0.93, 0.999].map(chooseFernRule), [1, 1, 2, 3, 0]);
  assert.deepEqual(applyFernRule({ x: 2, y: 5 }, 0), { x: 0, y: 0.8 });
  const main = applyFernRule({ x: 2, y: 5 }, 1);
  close(main.x, 1.9);
  close(main.y, 5.77);
});

test("the seeded fern walk applies every chosen rule to the preceding point", () => {
  const walk = traceFern(32);
  assert.deepEqual(walk, traceFern(32));
  assert.notDeepEqual(walk, traceFern(32, 42));
  assert.equal(walk[0].rule, null);
  assert.equal(walk[3].rule, 0);
  for (let i = 1; i < walk.length; i++) {
    assert.deepEqual(walk[i].point, applyFernRule(walk[i - 1].point, walk[i].rule));
    assert.ok(Number.isFinite(walk[i].point.x) && Number.isFinite(walk[i].point.y));
  }
});
