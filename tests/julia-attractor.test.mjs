import assert from "node:assert/strict";
import { test } from "node:test";
import { JULIA_PRESETS } from "../utils/escapeTimePlaces.ts";
import {
  ATTRACTOR_JUMPS,
  attractingLoop,
  attractorDots,
  BULB_LOOPS,
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
  const circle = attractingLoop({ real: 0, imaginary: 0 });
  assert.equal(circle.length, 1);
  assert.ok(near(circle[0], { real: 0, imaginary: 0 }));

  const two = attractingLoop({ real: -1, imaginary: 0 });
  assert.equal(two.length, 2);
  assert.ok(near(two[0], { real: 0, imaginary: 0 }));
  assert.ok(near(two[1], { real: -1, imaginary: 0 }));

  const three = attractingLoop(RABBIT);
  assert.equal(three.length, 3);
  assert.ok(near(three[0], { real: 0, imaginary: 0 }));
  assert.ok(near(three[1], RABBIT));
  assert.ok(near(three[2], { real: -0.66236, imaginary: 0.56228 }));
});

test("inside the heart the attractor is one fixed point, and it need not be zero", () => {
  const c = { real: -0.1, imaginary: 0.3 };
  const [place, ...rest] = attractingLoop(c);
  assert.equal(rest.length, 0);
  assert.ok(Math.hypot(place.real, place.imaginary) > 0.1);
  const next = {
    real: place.real ** 2 - place.imaginary ** 2 + c.real,
    imaginary: 2 * place.real * place.imaginary + c.imaginary,
  };
  assert.ok(near(place, next, 1e-9));
});

test("no attractor when zero escapes or lands on a loop that pushes points away", () => {
  assert.equal(attractingLoop({ real: 0.2501, imaginary: 0 }), null);
  assert.equal(attractingLoop({ real: 0, imaginary: 1 }), null);
  assert.equal(attractingLoop({ real: -2, imaginary: 0 }), null);
});

test("each bulb number matches the attractor at that bulb's center", () => {
  for (const { places, c } of BULB_LOOPS) {
    assert.equal(attractingLoop(c)?.length, places, `${c.real} ${c.imaginary}`);
  }
});

test("a pick on a number beside a small bulb chooses that bulb", () => {
  const four = BULB_LOOPS.find(({ at }) => at.real === 0.35 && at.imaginary === 0.6);
  assert.deepEqual(pickBulb({ real: 0.36, imaginary: 0.59 }), four.c);
  const open = { real: -0.1, imaginary: 0.3 };
  assert.equal(pickBulb(open), open);
});

test("every Rabbit dot escapes or joins the loop at the turn its color says", () => {
  const loop = attractingLoop(RABBIT);
  const { starts, colors } = attractorDots(RABBIT, loop);
  const jumps = 601;
  const { landedOn, moving, escaped, onPlace } = tallyDots(
    RABBIT,
    dotsAfter(RABBIT, starts, jumps),
    loop,
  );
  assert.equal(moving, 0);
  assert.equal(escaped + onPlace.reduce((sum, count) => sum + count, 0), colors.length);
  for (let dot = 0; dot < colors.length; dot++) {
    if (colors[dot] === ESCAPES) assert.equal(landedOn[dot], -1);
    else assert.equal((((landedOn[dot] - jumps) % 3) + 3) % 3, colors[dot], `dot ${dot}`);
  }
});

test("the demo's last jump leaves almost no Rabbit dot still moving", () => {
  const loop = attractingLoop(RABBIT);
  const { starts, colors } = attractorDots(RABBIT, loop);
  const { moving } = tallyDots(RABBIT, dotsAfter(RABBIT, starts, ATTRACTOR_JUMPS), loop);
  assert.ok(moving <= colors.length / 1000, `${moving} of ${colors.length}`);
});

test("three colors meet where three Rabbit lobes join", () => {
  const loop = attractingLoop(RABBIT);
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
  const { starts, colors } = attractorDots(c, null);
  const { escaped } = tallyDots(c, dotsAfter(c, starts, 400), null);
  assert.equal(escaped, colors.length);
});

test("the article's numbers for the Rabbit", () => {
  const jump = ({ real, imaginary }) => ({
    real: real ** 2 - imaginary ** 2 + RABBIT.real,
    imaginary: 2 * real * imaginary + RABBIT.imaginary,
  });
  const [center] = attractingLoop(RABBIT);
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
  const { starts, colors } = attractorDots(RABBIT, attractingLoop(RABBIT));
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

test("a dot on the loop keeps moving: it lands on a different place every jump", () => {
  const loop = attractingLoop(RABBIT);
  const { starts, colors } = attractorDots(RABBIT, loop);
  const dot = colors.findIndex((color) => color !== ESCAPES);
  const seen = [];
  let positions = dotsAfter(RABBIT, starts, 300);
  for (let jump = 0; jump < 6; jump++) {
    seen.push(tallyDots(RABBIT, positions, loop).landedOn[dot]);
    positions = dotsAfter(RABBIT, positions, 1);
  }
  assert.equal(new Set(seen).size, 3);
  for (let jump = 3; jump < 6; jump++) assert.equal(seen[jump], seen[jump - 3]);
  for (let jump = 1; jump < 6; jump++) assert.notEqual(seen[jump], seen[jump - 1]);
});
