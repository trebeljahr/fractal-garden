import assert from "node:assert/strict";
import { test } from "node:test";
import { JULIA_PRESETS } from "../utils/escapeTimePlaces.ts";
import {
  attractingLoop,
  BULB_LOOPS,
  pickBulb,
  swarmStarts,
  traceSwarm,
} from "../utils/lessons/juliaSwarm.ts";

const RABBIT = { real: JULIA_PRESETS.Rabbit.cReal, imaginary: JULIA_PRESETS.Rabbit.cImag };
const near = (a, b, tolerance = 1e-4) =>
  Math.hypot(a.real - b.real, a.imaginary - b.imaginary) < tolerance;

test("following zero finds the article's loops", () => {
  const circle = attractingLoop({ real: 0, imaginary: 0 });
  assert.equal(circle.length, 1);
  assert.ok(near(circle[0], { real: 0, imaginary: 0 }));

  const two = attractingLoop({ real: -1, imaginary: 0 });
  assert.equal(two.length, 2);
  assert.ok(two.some((p) => near(p, { real: 0, imaginary: 0 })));
  assert.ok(two.some((p) => near(p, { real: -1, imaginary: 0 })));

  const three = attractingLoop(RABBIT);
  assert.equal(three.length, 3);
  for (const place of [{ real: 0, imaginary: 0 }, RABBIT, { real: -0.66236, imaginary: 0.56228 }]) {
    assert.ok(three.some((p) => near(p, place)));
  }
});

test("inside the heart the loop is one fixed point, and it need not be zero", () => {
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

test("no loop when zero escapes or lands on a loop that pushes points away", () => {
  assert.equal(attractingLoop({ real: 0.2501, imaginary: 0 }), null);
  assert.equal(attractingLoop({ real: 0, imaginary: 1 }), null);
  assert.equal(attractingLoop({ real: -2, imaginary: 0 }), null);
});

test("each bulb number matches the loop at that bulb's center and at its label's bulb", () => {
  for (const { places, c } of BULB_LOOPS) {
    assert.equal(attractingLoop(c)?.length, places, `${c.real} ${c.imaginary}`);
  }
});

test("a pick on a number beside a small bulb chooses that bulb", () => {
  const four = BULB_LOOPS.find(({ at }) => at.real === 0.35 && at.imaginary === 0.6);
  assert.deepEqual(pickBulb({ real: 0.36, imaginary: 0.59 }), four.c);
  const open = { real: -0.1, imaginary: 0.3 };
  assert.equal(pickBulb(open), open);
  const insideHeart = { real: 0.01, imaginary: 0.01 };
  assert.equal(pickBulb(insideHeart), insideHeart);
});

test("every dot still bounded for the Rabbit ends on the three places", () => {
  const starts = swarmStarts();
  assert.equal(starts.length / 2, 1920);
  const jumps = 600;
  const trace = traceSwarm(RABBIT, starts, jumps);
  const dots = starts.length / 2;
  const places = attractingLoop(RABBIT);
  let onLoop = 0;
  for (let dot = 0; dot < dots; dot++) {
    const at = (jumps * dots + dot) * 2;
    if (Number.isNaN(trace[at])) continue;
    const point = { real: trace[at], imaginary: trace[at + 1] };
    assert.ok(
      places.some((p) => near(p, point, 1e-6)),
      `dot ${dot}`,
    );
    onLoop++;
  }
  assert.ok(onLoop > 0);
});

test("outside the Mandelbrot set no dot stays", () => {
  const starts = swarmStarts();
  const jumps = 400;
  const trace = traceSwarm({ real: 0.4, imaginary: 0.4 }, starts, jumps);
  const dots = starts.length / 2;
  for (let dot = 0; dot < dots; dot++) {
    assert.ok(Number.isNaN(trace[(jumps * dots + dot) * 2]), `dot ${dot}`);
  }
});

test("the article's numbers for the Rabbit", () => {
  const jump = ({ real, imaginary }) => ({
    real: real ** 2 - imaginary ** 2 + RABBIT.real,
    imaginary: 2 * real * imaginary + RABBIT.imaginary,
  });
  const center = attractingLoop(RABBIT).reduce((a, b) =>
    Math.hypot(a.real, a.imaginary) < Math.hypot(b.real, b.imaginary) ? a : b,
  );
  // A point 0.1 from the loop's place at zero, after each trip of three jumps.
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
  assert.ok(Math.hypot(back.real, back.imaginary) < 0.0001);
});
