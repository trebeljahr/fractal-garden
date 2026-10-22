import assert from "node:assert/strict";
import test from "node:test";
import { createZoomWheelGuard, shouldZoomWheel } from "../utils/shouldZoomWheel.ts";

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

function guardedSurface() {
  let observer;
  const target = surface();
  target.contains = (node) => node === target;
  target.ownerDocument.addEventListener = (_type, listener) => {
    observer = listener;
  };
  target.ownerDocument.removeEventListener = (_type, listener) => {
    assert.equal(listener, observer);
    observer = undefined;
  };
  const guard = createZoomWheelGuard(target);
  const event = (deltaY, timeStamp, ctrlKey = false) => ({
    ...wheel(deltaY, ctrlKey),
    timeStamp,
    defaultPrevented: false,
    preventDefault() {
      this.defaultPrevented = true;
    },
  });
  return {
    target,
    guard,
    event,
    pageWheel(deltaY, timeStamp) {
      observer({ ...event(deltaY, timeStamp), target: {} });
    },
    hasObserver: () => Boolean(observer),
  };
}

test("page-scroll momentum cannot turn into zoom until the wheel pauses", () => {
  const { target, guard, event } = guardedSurface();
  target.getBoundingClientRect = () => ({ top: -200, bottom: 600 });
  assert.equal(guard.shouldZoom(event(-100, 0), true), false);
  target.getBoundingClientRect = () => ({ top: 0, bottom: 800 });
  for (const time of [40, 80, 160, 240, 320]) {
    const momentum = event(-10, time);
    assert.equal(guard.shouldZoom(momentum, true), false);
    assert.equal(momentum.defaultPrevented, true);
  }
  assert.equal(guard.shouldZoom(event(-100, 440), true), true);
  guard.dispose();
});

test("zoom-out momentum stops at the opening size before page scrolling resumes", () => {
  const { guard, event } = guardedSurface();
  assert.equal(guard.shouldZoom(event(100, 0), false), true);
  const atLimit = event(100, 50);
  assert.equal(guard.shouldZoom(atLimit, true), false);
  assert.equal(atLimit.defaultPrevented, true);
  const newGesture = event(100, 170);
  assert.equal(guard.shouldZoom(newGesture, true), false);
  assert.equal(newGesture.defaultPrevented, false);
  guard.dispose();
});

test("scrolling from outside the drawing also needs a pause before zooming", () => {
  const { guard, event, pageWheel } = guardedSurface();
  pageWheel(-100, 100);
  const entering = event(-20, 200);
  assert.equal(guard.shouldZoom(entering, true), false);
  assert.equal(entering.defaultPrevented, true);
  assert.equal(guard.shouldZoom(event(-100, 320), true), true);
  guard.dispose();
});

test("a brief pause releases either mode while uninterrupted momentum stays blocked", () => {
  for (const fromZoom of [false, true]) {
    const { guard, event } = guardedSurface();
    assert.equal(guard.shouldZoom(event(100, 0), !fromZoom), fromZoom);

    const momentum = event(100, 119);
    assert.equal(guard.shouldZoom(momentum, fromZoom), false);
    assert.equal(momentum.defaultPrevented, true);

    const newGesture = event(100, 239);
    assert.equal(guard.shouldZoom(newGesture, fromZoom), !fromZoom);
    assert.equal(newGesture.defaultPrevented, false);
    guard.dispose();
  }
});

test("ordinary wheel zoom starts immediately and preserves direction changes", () => {
  const { guard, event } = guardedSurface();
  for (const [delta, time] of [
    [-100, 0],
    [100, 80],
    [-100, 160],
  ]) {
    assert.equal(guard.shouldZoom(event(delta, time), false), true);
  }
  guard.dispose();
});

test("pinching bypasses the pause and horizontal scrolling does not select a mode", () => {
  const { guard, event, pageWheel } = guardedSurface();
  pageWheel(-100, 100);
  assert.equal(guard.shouldZoom(event(-10, 110, true), true), true);
  assert.equal(guard.shouldZoom(event(0, 120), true), false);
  assert.equal(guard.shouldZoom(event(-100, 130), true), true);
  guard.dispose();
});

test("wheel state stays local to each viewer and its document observer is cleaned up", () => {
  const a = guardedSurface();
  const b = guardedSurface();
  a.pageWheel(-100, 100);
  assert.equal(a.guard.shouldZoom(a.event(-20, 200), true), false);
  assert.equal(b.guard.shouldZoom(b.event(-20, 200), true), true);
  a.guard.dispose();
  b.guard.dispose();
  assert.equal(a.hasObserver(), false);
  assert.equal(b.hasObserver(), false);
});
