import assert from "node:assert/strict";
import { test } from "node:test";
import { isSidewaysSlide } from "../utils/touchSlide.ts";

test("a small first move is not yet a slide", () => {
  assert.equal(isSidewaysSlide(10, 0), false);
  assert.equal(isSidewaysSlide(-4, 1), false);
});

test("a finger going mostly up or down leaves the page to scroll", () => {
  assert.equal(isSidewaysSlide(11, 30), false);
  assert.equal(isSidewaysSlide(30, 30), false);
  assert.equal(isSidewaysSlide(0, -200), false);
});

test("a finger clearly going sideways is a slide, in either direction", () => {
  assert.equal(isSidewaysSlide(11, 0), true);
  assert.equal(isSidewaysSlide(-40, 12), true);
});
