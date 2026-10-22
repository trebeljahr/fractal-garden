import assert from "node:assert/strict";
import test from "node:test";
import { LESSON_SYSTEMS, lessonWord, walkLessonWord } from "../utils/lessons/lsystemLesson.ts";
import { traceTurtle } from "../utils/turtleCurve.ts";

const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} != ${b}`);

test("lesson rewrites apply all replacements simultaneously and preserve turn symbols", () => {
  assert.equal(lessonWord("koch", 1), "F-F++F-F");
  assert.equal(lessonWord("dragon", 2), "F+G+F-G");
  assert.equal(lessonWord("hilbert", 1), "+VF-WFW-FV+");
  for (let n = 0; n <= 4; n++)
    assert.equal(walkLessonWord("dragon", lessonWord("dragon", n)).at(-1).drawn, 2 ** n);
  for (let n = 0; n <= 2; n++)
    assert.equal(walkLessonWord("koch", lessonWord("koch", n)).at(-1).drawn, 4 ** n);
});

test("a turn changes heading without moving, while Hilbert rewrite symbols do neither", () => {
  const koch = walkLessonWord("koch", "F+-");
  assert.deepEqual(koch[2].point, koch[1].point);
  assert.equal(koch[2].heading, 30);
  assert.equal(koch[2].action, "clockwise");
  assert.equal(koch[3].heading, 90);
  assert.equal(koch[3].drawn, 1);
  assert.equal(walkLessonWord("dragon", "+")[1].heading, 135);
  const hilbert = walkLessonWord("hilbert", "VW");
  for (const state of hilbert) {
    assert.deepEqual(state.point, { x: 0, y: 0 });
    assert.equal(state.heading, 90);
    assert.equal(state.drawn, 0);
  }
});

test("turtle instruction states agree with the garden's drawing helper", () => {
  for (const preset of ["koch", "dragon", "hilbert"]) {
    const system = LESSON_SYSTEMS[preset];
    const word = lessonWord(preset, 2);
    const states = walkLessonWord(preset, word);
    const drawing = traceTurtle(
      word,
      { "+": system.plus * system.angle, "-": -system.plus * system.angle },
      system.heading,
    );
    const drawn = states.flatMap((state) => (state.segment ? [state.segment.to] : []));
    assert.equal(drawing.points.length, (drawn.length + 1) * 2);
    drawn.forEach((point, index) => {
      close(point.x, drawing.points[(index + 1) * 2]);
      close(point.y, drawing.points[(index + 1) * 2 + 1]);
    });
  }
});

test("the second Hilbert rewrite visits every point of a four-by-four grid once", () => {
  const states = walkLessonWord("hilbert", lessonWord("hilbert", 2));
  const points = [
    states[0].point,
    ...states.flatMap((state) => (state.segment ? [state.point] : [])),
  ];
  assert.equal(points.length, 16);
  assert.equal(new Set(points.map((p) => `${Math.round(p.x)},${Math.round(p.y)}`)).size, 16);
  const xs = points.map((p) => Math.round(p.x));
  const ys = points.map((p) => Math.round(p.y));
  assert.equal(Math.max(...xs) - Math.min(...xs), 3);
  assert.equal(Math.max(...ys) - Math.min(...ys), 3);
});
