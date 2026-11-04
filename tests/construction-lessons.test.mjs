import assert from "node:assert/strict";
import test from "node:test";
import {
  canopyBranches,
  carpetHoles,
  circleContacts,
  kochEdge,
} from "../utils/constructionDiagrams.ts";
import { keepMengerCube, mengerLayers } from "../utils/menger.ts";
import {
  ESCAPE_RADIUS,
  jumpControl,
  jumpExit,
  jumpPoint,
  landsExactly,
  mirrorRoutes,
  ORBIT_LESSON_LIMIT,
  squarePoint,
  traceTeachingOrbit,
  traceUntilLoop,
} from "../utils/orbitLesson.ts";
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
    for (const ratio of [0.4, 0.6, 0.7]) {
      const branches = canopyBranches(5, angle, ratio);
      assert.equal(branches.length, 63);
      for (const b of branches) {
        close(Math.hypot(b.end.x - b.start.x, b.end.y - b.start.y), ratio ** b.depth);
        if (b.depth)
          assert.ok(
            branches.some(
              (p) => p.depth === b.depth - 1 && p.end.x === b.start.x && p.end.y === b.start.y,
            ),
          );
      }
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
test("orbit lesson stops counting when a point lands back on an earlier one", () => {
  const zero = { real: 0, imaginary: 0 };
  const rabbit = { real: -0.12256, imaginary: 0.74486 };
  const minusOne = traceUntilLoop({ real: -1, imaginary: 0 }, zero);
  assert.deepEqual(minusOne.loop, { from: 0, period: 2 });
  assert.deepEqual(
    minusOne.orbit.map((s) => s.point.real),
    [0, -1, 0],
  );
  const inside = traceUntilLoop(rabbit, { real: 0.3, imaginary: 0 });
  assert.deepEqual(inside.loop, { from: 13, period: 3 });
  assert.equal(inside.orbit.at(-1).iteration, 16);
  // Exact loops on repelling points count too: 0, i, -1 + i, -i, -1 + i.
  assert.deepEqual(traceUntilLoop({ real: 0, imaginary: 1 }, zero).loop, { from: 2, period: 2 });
  // 0, -2, 2, 2: a point that stays put is a loop of one jump.
  assert.deepEqual(traceUntilLoop({ real: -2, imaginary: 0 }, zero).loop, { from: 2, period: 1 });
});
test("orbit lesson only matches rows the jump list prints the same", () => {
  const zero = { real: 0, imaginary: 0 };
  const listed = (value) => Number(value.toFixed(3)) + 0;
  const row = ({ real, imaginary }) => `${listed(real)},${listed(imaginary)}`;
  for (let x = -2; x <= 0.5; x += 0.05) {
    for (let y = -1.2; y <= 1.2; y += 0.05) {
      const { orbit, loop } = traceUntilLoop({ real: x, imaginary: y }, zero);
      if (!loop) continue;
      assert.equal(row(orbit.at(-1).point), row(orbit[loop.from].point), `(${x}, ${y})`);
    }
  }
  // Closing in on one place is not landing on it. (0.03, 0.16) gets close, and never arrives.
  const closing = traceUntilLoop({ real: 0.03, imaginary: 0.16 }, zero);
  assert.equal(closing.loop.period, 1);
  assert.equal(landsExactly(closing.orbit, closing.loop), false);
  const exact = traceUntilLoop({ real: -1, imaginary: 0 }, zero);
  assert.equal(landsExactly(exact.orbit, exact.loop), true);
});
test("orbit lesson does not call a slow or escaping orbit a loop", () => {
  const zero = { real: 0, imaginary: 0 };
  const leaving = traceUntilLoop({ real: 1, imaginary: 0 }, zero);
  assert.equal(leaving.loop, null);
  assert.deepEqual(
    leaving.orbit.map((s) => s.point.real),
    [0, 1, 2, 5],
  );
  // 1.0001 barely moves at first, then doubles its distance from 1 and leaves.
  const lingering = traceUntilLoop(zero, { real: 1.0001, imaginary: 0 });
  assert.equal(lingering.loop, null);
  assert.ok(lingering.orbit.at(-1).point.real > ESCAPE_RADIUS);
  // c = 0.25 creeps toward 0.5 and never lands within the tolerance of its last point.
  const creeping = traceUntilLoop({ real: 0.25, imaginary: 0 }, zero);
  assert.equal(creeping.loop, null);
  assert.equal(creeping.orbit.length, ORBIT_LESSON_LIMIT + 1);
  // This pixel spirals in to one place. Every second landing is close, but it is not a two-jump loop.
  const spiraling = traceUntilLoop({ real: -0.56, imaginary: -0.18 }, zero);
  assert.notEqual(spiraling.loop?.period, 2);
  // Every loop found across the picture visits separate places.
  for (let x = -2; x <= 0.5; x += 0.05) {
    for (let y = -1.2; y <= 1.2; y += 0.05) {
      const { orbit, loop } = traceUntilLoop({ real: x, imaginary: y }, zero);
      if (!loop || loop.period === 1) continue;
      const places = orbit.slice(loop.from, -1).map((s) => s.point);
      for (const [index, place] of places.entries()) {
        for (const other of places.slice(index + 1))
          assert.ok(
            Math.hypot(place.real - other.real, place.imaginary - other.imaginary) > 0.001,
            `(${x}, ${y})`,
          );
      }
    }
  }
});
test("the written Add c sums add up at five decimals for every jump in the picture", () => {
  const rabbit = { real: -0.12256, imaginary: 0.74486 };
  const five = (value) => Number(value.toFixed(5)) + 0;
  for (let x = -2.8; x <= 2.8; x += 0.2) {
    for (let y = -2.2; y <= 2.2; y += 0.2) {
      const { orbit } = traceUntilLoop(rabbit, { real: five(x), imaginary: five(y) });
      for (let jump = 1; jump < orbit.length; jump++) {
        const squared = squarePoint(orbit[jump - 1].point);
        const next = orbit[jump].point;
        assert.equal(five(five(squared.real) + rabbit.real), five(next.real));
        assert.equal(five(five(squared.imaginary) + rabbit.imaginary), five(next.imaginary));
      }
    }
  }
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

test("each Burning Ship jump records the fold that happens before it", () => {
  const orbit = traceTeachingOrbit(
    { real: -1.76, imaginary: -0.03 },
    { real: 0, imaginary: 0 },
    true,
    2,
  );
  assert.deepEqual(orbit[1].point, { real: -1.76, imaginary: -0.03 });
  assert.deepEqual(orbit[2].folded, { real: 1.76, imaginary: 0.03 });
  close(orbit[2].point.real, 1.3367);
  close(orbit[2].point.imaginary, 0.0756);
});

test("a point past the dashed circle only moves farther away", () => {
  const step = (z, c, fold) => {
    const x = fold ? Math.abs(z.real) : z.real;
    const y = fold ? Math.abs(z.imaginary) : z.imaginary;
    return { real: x * x - y * y + c.real, imaginary: 2 * x * y + c.imaginary };
  };
  const zero = { real: 0, imaginary: 0 };
  const followAfterCrossing = (c, start, fold) => {
    const last = traceTeachingOrbit(c, start, fold).at(-1).point;
    if (Math.hypot(last.real, last.imaginary) <= ESCAPE_RADIUS) return;
    let z = last;
    for (let i = 0; i < 4; i++) {
      const next = step(z, c, fold);
      assert.ok(Math.hypot(next.real, next.imaginary) > Math.hypot(z.real, z.imaginary));
      z = next;
    }
  };
  for (let x = -2.8; x <= 2.8; x += 0.2) {
    for (let y = -2.2; y <= 2.2; y += 0.2) {
      const pixel = { real: x, imaginary: y };
      followAfterCrossing(pixel, zero, false);
      followAfterCrossing(pixel, zero, true);
      followAfterCrossing(zero, pixel, false);
      followAfterCrossing({ real: -1, imaginary: 0 }, pixel, false);
    }
  }
});

test("jumps there and back curve to opposite sides, so a two-point repeat is visible", () => {
  const a = { x: 100, y: 200 };
  const b = { x: 300, y: 200 };
  const there = jumpControl(a, b);
  const back = jumpControl(b, a);
  assert.ok((there.y - 200) * (back.y - 200) < 0);
  assert.deepEqual(jumpPoint(a, there, b, 0), a);
  assert.deepEqual(jumpPoint(a, there, b, 1), b);
  assert.deepEqual(jumpControl(a, a), a);
});

test("a jump off the picture reports the edge it leaves through", () => {
  const exit = jumpExit({ x: 300, y: 200 }, { x: 900, y: 200 }, 400, 300);
  assert.equal(exit.x, 400);
  assert.ok(exit.y >= 0 && exit.y <= 300);
  assert.equal(jumpExit({ x: 300, y: 200 }, { x: 390, y: 200 }, 400, 300), null);
});

test("lesson escape counts hold for all three formulas", () => {
  const zero = { real: 0, imaginary: 0 };
  const examples = [
    ["mandelbrot", { real: -1, imaginary: 0 }, zero, null],
    ["mandelbrot", { real: 1, imaginary: 0 }, zero, 3],
    ["julia", { real: 0.5, imaginary: 0 }, zero, null],
    ["julia", { real: 1.25, imaginary: 0 }, zero, 2],
    ["julia", { real: 2.5, imaginary: 0 }, zero, 0],
    ["burning-ship", { real: -1.76, imaginary: -0.03 }, zero, 12],
    ["burning-ship", { real: -1.8, imaginary: -0.03 }, zero, 7],
  ];
  for (const [kind, pixel, c, expected] of examples) {
    const orbit = traceTeachingOrbit(
      kind === "julia" ? c : pixel,
      kind === "julia" ? pixel : zero,
      kind === "burning-ship",
    );
    const last = orbit.at(-1);
    assert.equal(
      Math.hypot(last.point.real, last.point.imaginary) > ESCAPE_RADIUS ? last.iteration : null,
      expected,
    );
  }
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

test("the fold splits a Burning Ship pixel from its mirror image, and only the fold does", () => {
  const pixel = { real: -0.5, imaginary: -0.5 };
  const [ship, mirror] = mirrorRoutes(pixel, true);
  assert.deepEqual(ship[1].point, pixel);
  assert.deepEqual(mirror[1].point, { real: -0.5, imaginary: 0.5 });
  assert.deepEqual(ship[2].folded, { real: 0.5, imaginary: 0.5 });
  assert.deepEqual(mirror[2].folded, { real: 0.5, imaginary: 0.5 });
  assert.deepEqual(ship[2].point, { real: -0.5, imaginary: 0 });
  assert.deepEqual(mirror[2].point, { real: -0.5, imaginary: 1 });
  assert.equal(mirror.at(-1).iteration, 4);
  assert.ok(Math.hypot(mirror[4].point.real, mirror[4].point.imaginary) > ESCAPE_RADIUS);
  assert.equal(ship.at(-1).iteration, ORBIT_LESSON_LIMIT);

  const [settled] = mirrorRoutes(pixel, true, 2000);
  close(Number(settled.at(-1).point.real.toFixed(2)), -0.41);
  close(Number(settled.at(-1).point.imaginary.toFixed(2)), -0.28);

  for (const c of [pixel, { real: -1.2, imaginary: 0.2 }, { real: 0.3, imaginary: 0.6 }]) {
    const [first, second] = mirrorRoutes(c, false);
    assert.equal(first.length, second.length);
    first.forEach((step, jump) => {
      close(step.point.real, second[jump].point.real);
      close(step.point.imaginary, -second[jump].point.imaginary);
    });
  }
});
