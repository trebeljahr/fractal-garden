import assert from "node:assert/strict";
import test from "node:test";
import { shouldZoomWheel } from "../utils/shouldZoomWheel.ts";

const surface = (top = 0, bottom = 800) => ({
  getBoundingClientRect: () => ({ top, bottom }),
  ownerDocument: { defaultView: { innerHeight: 800 } },
});
const wheel = (deltaY, ctrlKey = false) => ({ deltaY, ctrlKey });

test("scroll down leaves the drawing at minimum zoom; scroll up can zoom in", () => {
  assert.equal(shouldZoomWheel(wheel(100), surface(), true), false);
  assert.equal(shouldZoomWheel(wheel(-100), surface(), true), true);
  assert.equal(shouldZoomWheel(wheel(100), surface(), false), true);
});

test("a partly hidden drawing lets the page scroll in either direction at any zoom", () => {
  for (const clipped of [surface(-200, 600), surface(200, 1000)]) {
    for (const atMinZoom of [false, true]) {
      assert.equal(shouldZoomWheel(wheel(-100), clipped, atMinZoom), false);
      assert.equal(shouldZoomWheel(wheel(100), clipped, atMinZoom), false);
    }
  }
  assert.equal(shouldZoomWheel(wheel(-100), surface(-0.5, 799.5), false), true);
});

test("trackpad pinches still zoom when clipped or at minimum zoom", () => {
  assert.equal(shouldZoomWheel(wheel(-10, true), surface(-200, 600), true), true);
  assert.equal(shouldZoomWheel(wheel(10, true), surface(), true), true);
});

test("horizontal-only scroll gestures do not change zoom", () => {
  assert.equal(shouldZoomWheel(wheel(0), surface(), false), false);
});
