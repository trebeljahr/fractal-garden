import assert from "node:assert/strict";
import test from "node:test";
import {
  DLA_LESSON_CLUSTER,
  DLA_MAX_WALK_STEPS,
  dlaContactCells,
  traceDlaWalk,
} from "../utils/lessons/dlaLesson.ts";

test("seeded walkers replay cardinal unit moves without changing the frozen cluster", () => {
  const original = structuredClone(DLA_LESSON_CLUSTER);
  for (const seed of [22, 25, 1]) {
    const frames = traceDlaWalk(seed);
    assert.deepEqual(frames, traceDlaWalk(seed));
    for (let i = 1; i < frames.length; i++) {
      const a = frames[i - 1].point;
      const b = frames[i].point;
      assert.equal(Math.abs(a.x - b.x) + Math.abs(a.y - b.y), 1);
      assert.ok(!DLA_LESSON_CLUSTER.some((cell) => cell.x === b.x && cell.y === b.y));
    }
  }
  assert.deepEqual(DLA_LESSON_CLUSTER, original);
  assert.notDeepEqual(traceDlaWalk(22), traceDlaWalk(25));
});

test("contact stops a walk at its first frozen neighbor, including diagonal contact", () => {
  const short = traceDlaWalk(22);
  const diagonal = traceDlaWalk(25);
  assert.equal(short.length - 1, 5);
  assert.deepEqual(short.at(-1), { point: { x: 6, y: 5 }, status: "stuck" });
  assert.equal(diagonal.length - 1, 16);
  assert.deepEqual(diagonal.at(-1), { point: { x: 7, y: 5 }, status: "stuck" });
  for (const frames of [short, diagonal]) {
    for (const frame of frames.slice(0, -1)) {
      assert.equal(frame.status, "walking");
      assert.equal(dlaContactCells(frame.point, DLA_LESSON_CLUSTER).length, 0);
    }
    assert.equal(dlaContactCells(frames.at(-1).point, DLA_LESSON_CLUSTER).length, 1);
  }
  const touchingStart = traceDlaWalk(22, { start: { x: 5, y: 5 } });
  assert.equal(touchingStart.length, 1);
  assert.equal(touchingStart[0].status, "stuck");
});

test("leaving the fixed window discards the walker without replacing or steering it", () => {
  const frames = traceDlaWalk(1);
  assert.equal(frames.length - 1, 17);
  assert.deepEqual(frames.at(-1), { point: { x: 13, y: 6 }, status: "discarded" });
  for (const frame of frames.slice(0, -1)) {
    assert.ok(frame.point.x >= 0 && frame.point.x < 13 && frame.point.y >= 0 && frame.point.y < 13);
    assert.equal(frame.status, "walking");
  }
});

test("walk work is bounded even when contact and window exit do not happen", () => {
  const options = { start: { x: 50, y: 50 }, cluster: [], size: 100, maxSteps: 3 };
  const frames = traceDlaWalk(22, options);
  assert.equal(frames.length, 4);
  assert.equal(frames.at(-1).status, "limit");
  const capped = traceDlaWalk(22, {
    ...options,
    size: 1000,
    start: { x: 500, y: 500 },
    maxSteps: 1000000,
  });
  assert.equal(capped.length, DLA_MAX_WALK_STEPS + 1);
  assert.equal(capped.at(-1).status, "limit");
  assert.throws(() => traceDlaWalk(22, { start: { x: 6, y: 6 } }), /outside the frozen cluster/);
});
