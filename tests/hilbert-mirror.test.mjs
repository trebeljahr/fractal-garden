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
const { generateHilbertCurve3D } = require("../utils/polyline3d.ts");
const { hilbertGrid } = require("../utils/lessons/hilbertJoin.ts");
const {
  MIRROR_LEVEL,
  hilbertMirrorRoute,
  routeCheck,
  smallCubeShape,
  smallPath,
} = require("../utils/lessons/hilbertMirror.ts");

const same = (a, b) => a.join() === b.join();
const sub = (a, b) => a.map((value, axis) => value - b[axis]);
const dot = (a, b) => a.reduce((sum, value, axis) => sum + value * b[axis], 0);
const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];

/** Every turn and mirror of a cube, written as signed axes. */
const SYMMETRIES = [
  [0, 1, 2],
  [0, 2, 1],
  [1, 0, 2],
  [1, 2, 0],
  [2, 0, 1],
  [2, 1, 0],
].flatMap((order) =>
  Array.from(
    { length: 8 },
    (_, signs) => (point) => order.map((axis, i) => point[axis] * ((signs >> i) & 1 ? -1 : 1)),
  ),
);
const centred = (route, level) => route.map((p) => p.map((v) => 2 * v - (2 ** level - 1)));
const text = (route) => route.map((p) => p.join()).join(";");
/** The same text for a route and for any turned, mirrored or reversed copy of it. */
function shapeOf(route) {
  let best = null;
  for (const walk of [route, [...route].reverse()])
    for (const symmetry of SYMMETRIES) {
      const candidate = text(walk.map(symmetry));
      if (best === null || candidate < best) best = candidate;
    }
  return best;
}

/**
 * Haverkort's definition of a curve (appendix G): the moves between octants, then each octant's
 * signed permutation. A negative `reversed` flag is his `{ ]`, a reversed copy.
 */
function selfSimilar({ moves, octants }, level) {
  if (level === 0) return [[0, 0, 0]];
  const inner = selfSimilar({ moves, octants }, level - 1);
  const walk = [[0, 0, 0]];
  for (const set of moves) {
    const next = walk.at(-1).slice();
    for (const move of set) next[Math.abs(move) - 1] += Math.sign(move) * 2;
    walk.push(next);
  }
  const middle = [0, 1, 2].map(
    (axis) => (Math.min(...walk.map((p) => p[axis])) + Math.max(...walk.map((p) => p[axis]))) / 2,
  );
  const half = 2 ** (level - 1);
  return octants.flatMap((octant, i) =>
    (octant.reversed ? [...inner].reverse() : inner).map((point) => {
      const placed = [0, 0, 0];
      octant.turn.forEach((target, from) => {
        placed[Math.abs(target) - 1] = Math.sign(target) * point[from];
      });
      return placed.map((value, axis) => value + (walk[i][axis] - middle[axis]) * half);
    }),
  );
}
const f = (...turn) => ({ turn, reversed: false });
const r = (...turn) => ({ turn, reversed: true });
const GRAY = [[1], [2], [-1], [3], [1], [-2], [-1]];
const PAPER = {
  sasburg: {
    moves: GRAY,
    octants: [
      f(3, 2, 1),
      f(3, 1, 2),
      f(2, 1, 3),
      f(2, -3, -1),
      r(2, 3, -1),
      r(2, 1, -3),
      r(-3, 1, 2),
      r(-3, 2, 1),
    ],
  },
  imposter: {
    moves: GRAY,
    octants: [
      f(3, 2, 1),
      f(1, 3, 2),
      f(1, 2, 3),
      f(2, -3, -1),
      r(2, 3, -1),
      r(1, 2, -3),
      r(1, -3, 2),
      r(-3, 2, 1),
    ],
  },
  butz: {
    moves: GRAY,
    octants: [
      f(2, 3, 1),
      f(3, 1, 2),
      f(3, 1, 2),
      f(-1, -2, 3),
      r(-1, -2, -3),
      r(-3, 1, 2),
      r(-3, 1, 2),
      r(2, -3, 1),
    ],
  },
  baseCamp: {
    moves: GRAY,
    octants: [
      f(3, 2, 1),
      r(1, -2, -3),
      f(1, 2, -3),
      r(-1, 2, -3),
      f(-1, 2, 3),
      r(1, 2, 3),
      f(1, -2, 3),
      r(-3, -2, 1),
    ],
  },
};

test("with nothing mirrored, this is the route the page's generator draws", () => {
  for (let level = 1; level <= 5; level++) {
    const { points } = generateHilbertCurve3D(level);
    assert.deepEqual(hilbertMirrorRoute(level, 0).flat(), Array.from(points), `level ${level}`);
  }
});

test("every mix of mirrors is a route that fills the small cubes in turn, one step at a time", () => {
  for (let mirrored = 0; mirrored < 256; mirrored++) {
    for (let level = 1; level <= 3; level++) {
      const route = hilbertMirrorRoute(level, mirrored);
      assert.deepEqual(routeCheck(route), { visited: 8 ** level, longestMove: 1 });
      const eighth = 8 ** (level - 1);
      const half = 2 ** (level - 1);
      for (let cube = 0; cube < 8; cube++) {
        const section = route.slice(cube * eighth, (cube + 1) * eighth);
        const corner = section[0].map((value) => Math.floor(value / half));
        assert.ok(
          section.every((p) =>
            same(
              p.map((v) => Math.floor(v / half)),
              corner,
            ),
          ),
        );
      }
    }
  }
});

test("every small path is a turned or mirrored copy of the whole route", () => {
  for (const mirrored of [0, 1, 0b00100000, 0b10011001, 0b01010111, 255]) {
    const whole = centred(hilbertMirrorRoute(2, mirrored), 2);
    const route = centred(hilbertMirrorRoute(3, mirrored), 3);
    const shapes = new Set();
    for (let cube = 0; cube < 8; cube++) {
      const section = route.slice(cube * 64, (cube + 1) * 64);
      const middle = [0, 1, 2].map((axis) => {
        const values = section.map((p) => p[axis]);
        return (Math.min(...values) + Math.max(...values)) / 2;
      });
      shapes.add(
        SYMMETRIES.some(
          (symmetry) => text(whole.map(symmetry)) === text(section.map((p) => sub(p, middle))),
        ),
      );
    }
    assert.deepEqual([...shapes], [true], `mirrored ${mirrored}`);
  }
});

test("a mirror moves only one small path, in the diagonal plane through its two ends", () => {
  const plain = hilbertMirrorRoute(MIRROR_LEVEL, 0);
  for (let cube = 0; cube < 8; cube++) {
    const flipped = hilbertMirrorRoute(MIRROR_LEVEL, 1 << cube);
    const before = smallPath(plain, cube);
    const after = smallPath(flipped, cube);
    assert.ok(same(before[0], after[0]), "the start stays");
    assert.ok(same(before.at(-1), after.at(-1)), "the end stays");
    assert.equal(before.filter((p, i) => !same(p, after[i])).length, 4);
    for (let other = 0; other < 8; other++)
      if (other !== cube) assert.deepEqual(smallPath(flipped, other), smallPath(plain, other));

    const { corners, plane } = smallCubeShape(before);
    assert.equal(corners.length, 8);
    assert.ok(
      plane.every((p) => corners.some((c) => same(c, p))),
      "the plane meets four corners",
    );
    assert.deepEqual(plane.slice(0, 2), [before[0], before.at(-1)], "it holds both ends");
    const normal = cross(sub(plane[1], plane[0]), sub(plane[3], plane[0]));
    assert.equal(dot(normal, sub(plane[2], plane[0])), 0, "the four corners lie in one plane");
    before.forEach((point, i) => {
      const scale = (2 * dot(sub(point, plane[0]), normal)) / dot(normal, normal);
      assert.deepEqual(
        point.map((value, axis) => value - scale * normal[axis]),
        after[i],
      );
    });
  }
});

test("the mirrors reach curves Haverkort lists, but not all of them", () => {
  const shape = (mirrored) => shapeOf(centred(hilbertMirrorRoute(3, mirrored), 3));
  const listed = (name) => shapeOf(selfSimilar(PAPER[name], 3));
  assert.equal(shape(255), listed("sasburg"));
  assert.equal(shape(0b10011001), listed("imposter"));
  assert.notEqual(shape(0), listed("sasburg"));
  assert.notEqual(shape(0), listed("imposter"));
  const butz = shapeOf(selfSimilar(PAPER.butz, 2));
  for (let mirrored = 0; mirrored < 256; mirrored++)
    assert.notEqual(
      shapeOf(centred(hilbertMirrorRoute(2, mirrored), 2)),
      butz,
      "Butz puts its small paths' ends elsewhere",
    );
  // Sasburg is Ca00.cT4, with the first four octants' reflections 1010. Mirroring flips each one,
  // so this page's curve has 0101, which his figure 9 writes as C: Ca00.cTC.
  const reflected = PAPER.sasburg.octants.slice(0, 4).map(({ turn }) => {
    const axes = turn.map((target) => Math.abs(target) - 1);
    const unit = (i) => [0, 1, 2].map((axis) => (axis === axes[i] ? Math.sign(turn[i]) : 0));
    return dot(cross(unit(0), unit(1)), unit(2)) < 0 ? 1 : 0;
  });
  assert.deepEqual(reflected, [1, 0, 1, 0]);
});

test("the mirrors give 136 different curves from 256 settings", () => {
  const shapes = new Set();
  for (let mirrored = 0; mirrored < 256; mirrored++)
    shapes.add(shapeOf(centred(hilbertMirrorRoute(2, mirrored), 2)));
  assert.equal(shapes.size, 136);
});

test("mirroring and running backward give Haverkort's 30,736 curves for this page's ends", () => {
  // Each cube's forward copy, and the backward copy that has the same two ends.
  const forward = [
    [3, 1, 2],
    [2, 1, 3],
    [1, 2, 3],
    [-3, 2, -1],
    [3, 2, 1],
    [1, 2, 3],
    [-2, -1, 3],
    [-3, -1, 2],
  ];
  const backward = [
    [-3, 1, 2],
    [-2, 1, 3],
    [-1, 2, 3],
    [3, 2, -1],
    [-3, 2, 1],
    [-1, 2, 3],
    [2, -1, 3],
    [3, -1, 2],
  ];
  const corners = [
    [-1, -1, -1],
    [-1, -1, 1],
    [-1, 1, 1],
    [-1, 1, -1],
    [1, 1, -1],
    [1, 1, 1],
    [1, -1, 1],
    [1, -1, -1],
  ];
  const build = (mirrored, reversed, level) => {
    let route = new Int32Array(3);
    for (let round = 1; round <= level; round++) {
      const count = route.length / 3;
      const next = new Int32Array(count * 24);
      let at = 0;
      for (let cube = 0; cube < 8; cube++) {
        const backwards = (reversed >> cube) & 1;
        const base = backwards ? backward[cube] : forward[cube];
        const turn = (mirrored >> cube) & 1 ? [base[0], base[2], base[1]] : base;
        const placed = [0, 0, 0];
        for (let i = 0; i < count; i++) {
          const from = (backwards ? count - 1 - i : i) * 3;
          for (let axis = 0; axis < 3; axis++)
            placed[Math.abs(turn[axis]) - 1] = Math.sign(turn[axis]) * route[from + axis];
          for (let axis = 0; axis < 3; axis++)
            next[at++] = placed[axis] + corners[cube][axis] * 2 ** (round - 1);
        }
      }
      route = next;
    }
    return route;
  };
  assert.equal(
    build(0, 0, 3).join(),
    centred(hilbertMirrorRoute(3), 3).flat().join(),
    "nothing chosen is this page's route",
  );
  // The one symmetry that keeps the small cubes in order: mirror end for end, and reverse.
  const hash = (route, partner) => {
    let a = 0x811c9dc5 | 0;
    let b = 0x1234567 | 0;
    for (let i = 0; i < route.length; i++) {
      const at = partner ? route.length - 3 - i + 2 * (i % 3) : i;
      const value = partner && i % 3 === 0 ? -route[at] : route[at];
      a = Math.imul(a ^ value, 16777619);
      b = Math.imul(b + value, 0x5bd1e995) ^ (b >>> 13);
    }
    return (a >>> 0) * 2 ** 21 + (b >>> 11);
  };
  const curves = new Set();
  for (let mirrored = 0; mirrored < 256; mirrored++)
    for (let reversed = 0; reversed < 256; reversed++) {
      const route = build(mirrored, reversed, 3);
      curves.add(Math.min(hash(route, false), hash(route, true)));
    }
  assert.equal(curves.size, 30736);
});

test("Haverkort's count includes routes that step diagonally", () => {
  const route = selfSimilar(PAPER.baseCamp, 2).map((p) => p.map((v) => (v + 3) / 2));
  assert.equal(routeCheck(route).visited, 64);
  assert.ok(routeCheck(route).longestMove > 1);
});

test("a square leaves one curve, the one the 2D page draws", () => {
  const turns = [
    ([x, y]) => [x, y],
    ([x, y]) => [-y, x],
    ([x, y]) => [-x, -y],
    ([x, y]) => [y, -x],
    ([x, y]) => [-x, y],
    ([x, y]) => [x, -y],
    ([x, y]) => [y, x],
    ([x, y]) => [-y, -x],
  ];
  const options = turns.flatMap((turn) => [
    { turn, reversed: false },
    { turn, reversed: true },
  ]);
  const quadrants = [
    [-1, -1],
    [-1, 1],
    [1, 1],
    [1, -1],
  ];
  const build = (choice, level) => {
    if (level === 0) return [[0, 0]];
    const inner = build(choice, level - 1);
    const half = 2 ** (level - 1);
    return choice.flatMap(({ turn, reversed }, i) =>
      (reversed ? [...inner].reverse() : inner).map((point) => {
        const [x, y] = turn(point);
        return [x + quadrants[i][0] * half, y + quadrants[i][1] * half];
      }),
    );
  };
  const valid = (route) =>
    new Set(route.map((p) => p.join())).size === route.length &&
    route.every(
      (p, i) =>
        i === 0 ||
        Math.max(Math.abs(p[0] - route[i - 1][0]), Math.abs(p[1] - route[i - 1][1])) <= 2,
    );
  const shape2d = (route) => {
    let best = null;
    for (const walk of [route, [...route].reverse()])
      for (const turn of turns) {
        const candidate = walk.map((p) => turn(p).join()).join(";");
        if (best === null || candidate < best) best = candidate;
      }
    return best;
  };
  const curves = new Set();
  for (const a of options)
    for (const b of options)
      for (const c of options)
        for (const d of options) {
          const choice = [a, b, c, d];
          // A route that only touches at corners can last two levels. It breaks by level 4.
          if ([2, 3, 4].every((level) => valid(build(choice, level))))
            curves.add(shape2d(build(choice, 3)));
        }
  const onPage = hilbertGrid(3).map(([x, y]) => [2 * x - 7, 2 * y - 7]);
  assert.deepEqual([...curves], [shape2d(onPage)]);
});
