import assert from "node:assert/strict";
import { test } from "node:test";
import { JULIA_PRESETS } from "../utils/escapeTimePlaces.ts";
import {
  attractingOrbit,
  attractorDots,
  BULB_ORBITS,
  dotsAfter,
  ESCAPES,
  fateOf,
  pickBulb,
  tallyDots,
} from "../utils/lessons/juliaAttractor.ts";

const RABBIT = { real: JULIA_PRESETS.Rabbit.cReal, imaginary: JULIA_PRESETS.Rabbit.cImag };
const near = (a, b, tolerance = 1e-4) =>
  Math.hypot(a.real - b.real, a.imaginary - b.imaginary) < tolerance;

test("following zero finds the attractor, listed in jump order from zero", () => {
  const circle = attractingOrbit({ real: 0, imaginary: 0 });
  assert.equal(circle.length, 1);
  assert.ok(near(circle[0], { real: 0, imaginary: 0 }));

  const two = attractingOrbit({ real: -1, imaginary: 0 });
  assert.equal(two.length, 2);
  assert.ok(near(two[0], { real: 0, imaginary: 0 }));
  assert.ok(near(two[1], { real: -1, imaginary: 0 }));

  const three = attractingOrbit(RABBIT);
  assert.equal(three.length, 3);
  assert.ok(near(three[0], { real: 0, imaginary: 0 }));
  assert.ok(near(three[1], RABBIT));
  assert.ok(near(three[2], { real: -0.66236, imaginary: 0.56228 }));
});

test("inside the heart the attractor is one fixed point, and it need not be zero", () => {
  const c = { real: -0.1, imaginary: 0.3 };
  const [place, ...rest] = attractingOrbit(c);
  assert.equal(rest.length, 0);
  assert.ok(Math.hypot(place.real, place.imaginary) > 0.1);
  const next = {
    real: place.real ** 2 - place.imaginary ** 2 + c.real,
    imaginary: 2 * place.real * place.imaginary + c.imaginary,
  };
  assert.ok(near(place, next, 1e-9));
});

test("no attractor when zero escapes or lands on an orbit that pushes points away", () => {
  assert.equal(attractingOrbit({ real: 0.2501, imaginary: 0 }), null);
  assert.equal(attractingOrbit({ real: 0, imaginary: 1 }), null);
  assert.equal(attractingOrbit({ real: -2, imaginary: 0 }), null);
});

test("each bulb number matches the attractor at that bulb's center", () => {
  for (const { places, c } of BULB_ORBITS) {
    assert.equal(attractingOrbit(c)?.length, places, `${c.real} ${c.imaginary}`);
  }
});

test("a pick on a number beside a small bulb chooses that bulb", () => {
  const four = BULB_ORBITS.find(({ at }) => at.real === 0.35 && at.imaginary === 0.6);
  assert.deepEqual(pickBulb({ real: 0.36, imaginary: 0.59 }), four.c);
  const open = { real: -0.1, imaginary: 0.3 };
  assert.equal(pickBulb(open), open);
});

const follow = (x, y, c, jumps) => {
  let [u, v] = [x, y];
  for (let step = 0; step < jumps; step++) {
    [u, v] = [u * u - v * v + c.real, 2 * u * v + c.imaginary];
    if (Math.hypot(u, v) > 1e6) return { real: Number.NaN, imaginary: Number.NaN };
  }
  return { real: u, imaginary: v };
};

test("every Rabbit dot escapes or joins the orbit at the turn its color says", () => {
  const orbit = attractingOrbit(RABBIT);
  const dots = attractorDots(RABBIT, orbit);
  const jumps = 601;
  for (let dot = 0; dot < dots.colors.length; dot++) {
    const point = follow(dots.starts[dot * 2], dots.starts[dot * 2 + 1], RABBIT, jumps);
    if (dots.colors[dot] === ESCAPES) assert.ok(Number.isNaN(point.real), `dot ${dot}`);
    else assert.ok(near(point, orbit[(dots.colors[dot] + jumps) % 3], 1e-6), `dot ${dot}`);
  }
});

test("dots skip calculating once settled, and still match following them every jump", () => {
  const orbit = attractingOrbit(RABBIT);
  const dots = attractorDots(RABBIT, orbit);
  for (const jumps of [0, 1, 7, 40, dots.lastJump, dots.lastJump + 500]) {
    const positions = dotsAfter(RABBIT, dots, orbit, jumps);
    for (let dot = 0; dot < dots.colors.length; dot++) {
      if (dots.colors[dot] === ESCAPES && dots.arrivals[dot] < jumps) {
        assert.ok(Number.isNaN(positions[dot * 2]));
        continue;
      }
      const point = follow(dots.starts[dot * 2], dots.starts[dot * 2 + 1], RABBIT, jumps);
      const shown = { real: positions[dot * 2], imaginary: positions[dot * 2 + 1] };
      // A dot counts as joined within 0.001 of a place, and the next jumps can stretch that gap a little.
      assert.ok(near(point, shown, 5e-3), `dot ${dot} jump ${jumps}`);
    }
  }
});

test("a run stops on the first jump with every dot on the orbit or escaped", () => {
  const orbit = attractingOrbit(RABBIT);
  const dots = attractorDots(RABBIT, orbit);
  const end = tallyDots(dots, dots.lastJump);
  assert.equal(end.moving, 0);
  assert.equal(end.joined + end.escaped, dots.colors.length);
  assert.ok(tallyDots(dots, dots.lastJump - 1).moving > 0);
  assert.ok(dots.lastJump < 300);
});

test("a run still ends when some dots never settle", () => {
  for (const c of [
    { real: 0.25, imaginary: 0 },
    { real: -0.390541, imaginary: -0.586788 },
  ]) {
    const dots = attractorDots(c, attractingOrbit(c));
    assert.ok(tallyDots(dots, dots.lastJump).moving > 0);
    assert.ok(dots.lastJump <= 300);
  }
});

test("a dot on the orbit lands on a different place every jump", () => {
  const orbit = attractingOrbit(RABBIT);
  const dots = attractorDots(RABBIT, orbit);
  const dot = dots.colors.findIndex((color) => color !== ESCAPES);
  const visited = [];
  for (let jumps = 300; jumps < 306; jumps++) {
    const positions = dotsAfter(RABBIT, dots, orbit, jumps);
    visited.push(
      orbit.findIndex((place) =>
        near(place, { real: positions[dot * 2], imaginary: positions[dot * 2 + 1] }),
      ),
    );
  }
  assert.equal(new Set(visited).size, 3);
  for (let jump = 3; jump < 6; jump++) assert.equal(visited[jump], visited[jump - 3]);
  for (let jump = 1; jump < 6; jump++) assert.notEqual(visited[jump], visited[jump - 1]);
});

test("three colors meet where three Rabbit lobes join", () => {
  const loop = attractingOrbit(RABBIT);
  for (const joint of [
    [-0.27634, 0.47973],
    [0.27634, -0.47973],
  ]) {
    const seen = new Set();
    for (let i = 0; i < 360; i++) {
      const angle = (i / 360) * 2 * Math.PI;
      const fate = fateOf(
        joint[0] + 0.01 * Math.cos(angle),
        joint[1] + 0.01 * Math.sin(angle),
        RABBIT,
        loop,
      );
      if (fate !== ESCAPES) seen.add(fate);
    }
    assert.deepEqual([...seen].sort(), [0, 1, 2]);
  }
});

test("outside the Mandelbrot set no dot stays", () => {
  const c = { real: 0.4, imaginary: 0.4 };
  const dots = attractorDots(c, null);
  const { escaped } = tallyDots(dots, dots.lastJump);
  assert.equal(escaped, dots.colors.length);
});

test("the article's numbers for the Rabbit", () => {
  const jump = ({ real, imaginary }) => ({
    real: real ** 2 - imaginary ** 2 + RABBIT.real,
    imaginary: 2 * real * imaginary + RABBIT.imaginary,
  });
  const [center] = attractingOrbit(RABBIT);
  // A point 0.1 from the place at zero, after each trip of three jumps.
  let point = { real: center.real + 0.1, imaginary: center.imaginary };
  const distances = [];
  for (let trip = 0; trip < 3; trip++) {
    point = jump(jump(jump(point)));
    distances.push(Math.hypot(point.real - center.real, point.imaginary - center.imaginary));
  }
  assert.ok(Math.abs(distances[0] - 0.026) < 0.001);
  assert.ok(Math.abs(distances[1] - 0.0018) < 0.0001);
  assert.ok(Math.abs(distances[2] - 0.000009) < 0.000001);

  // The point where three lobes meet lands on itself.
  const joint = { real: -0.27634, imaginary: 0.47973 };
  assert.ok(near(jump(joint), joint, 1e-4));

  // c is rounded, so three jumps from zero land just beside zero.
  const back = jump(jump(jump({ real: 0, imaginary: 0 })));
  assert.ok(Math.hypot(back.real, back.imaginary) < 0.00001);

  // Most points reach a value that repeats exactly, to the last stored digit, in about 30 jumps.
  const { starts, colors } = attractorDots(RABBIT, attractingOrbit(RABBIT));
  const repeatAt = [];
  for (let dot = 0; dot < colors.length; dot++) {
    if (colors[dot] === ESCAPES) continue;
    const history = [{ real: starts[dot * 2], imaginary: starts[dot * 2 + 1] }];
    for (let step = 1; step < 4000; step++) {
      history.push(jump(history[step - 1]));
      const earlier = history[step - 3];
      if (
        earlier &&
        earlier.real === history[step].real &&
        earlier.imaginary === history[step].imaginary
      ) {
        repeatAt.push(step);
        break;
      }
    }
  }
  repeatAt.sort((a, b) => a - b);
  const median = repeatAt[repeatAt.length >> 1];
  assert.ok(median >= 20 && median <= 40, `median ${median}`);
});
