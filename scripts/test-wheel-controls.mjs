import assert from "node:assert/strict";
import test from "node:test";
import {
  createZoomWheelGuard,
  listenForZoomWheel,
  shouldZoomWheel,
  zoomWheelDelta,
} from "../utils/shouldZoomWheel.ts";

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

// Node has EventTarget but no browser WheelEvent constructor.
class TestWheelEvent extends Event {
  constructor(type, options = {}) {
    super(type, options);
    const { cancelable: _cancelable, ...properties } = options;
    Object.assign(this, { deltaY: 0, deltaMode: 0, ctrlKey: false }, properties);
  }
}
const previousWheelEvent = globalThis.WheelEvent;
globalThis.WheelEvent = TestWheelEvent;
test.after(() => {
  if (previousWheelEvent) globalThis.WheelEvent = previousWheelEvent;
  else delete globalThis.WheelEvent;
});

function pinchSurface() {
  const target = new EventTarget();
  const view = new EventTarget();
  view.innerHeight = 800;
  target.ownerDocument = Object.assign(new EventTarget(), { defaultView: view });
  target.clientHeight = 800;
  target.contains = (node) => node === target;
  target.getBoundingClientRect = () => ({
    left: 20,
    top: -100,
    width: 600,
    height: 800,
    bottom: 700,
  });
  const guard = createZoomWheelGuard(target);
  let zoom = 1;
  const anchors = [];
  const remove = listenForZoomWheel(target, (event) => {
    if (!guard.shouldZoom(event, zoom <= 1)) return;
    event.preventDefault();
    zoom *= Math.exp(-zoomWheelDelta(event, target));
    anchors.push([event.clientX, event.clientY]);
  });
  const send = (type, props = {}) => {
    const event =
      type === "wheel"
        ? new TestWheelEvent(type, { cancelable: true, ...props })
        : Object.assign(new Event(type, { cancelable: true }), props);
    target.dispatchEvent(event);
    return event;
  };
  return {
    target,
    view,
    send,
    zoom: () => zoom,
    anchors,
    dispose: () => {
      remove();
      guard.dispose();
    },
  };
}

test("native pinches capture start, change and end while clipped, with exact reversible scale", () => {
  const h = pinchSurface();
  assert.equal(h.send("gesturestart", { scale: 1 }).defaultPrevented, true);
  for (const scale of [1.1, 1.5, 2]) {
    assert.equal(
      h.send("gesturechange", { scale, clientX: 120, clientY: 230 }).defaultPrevented,
      true,
    );
    assert.ok(Math.abs(h.zoom() - scale) < 1e-12);
  }
  assert.deepEqual(h.anchors.at(-1), [120, 230]);
  h.send("gesturechange", { scale: 1 });
  assert.ok(Math.abs(h.zoom() - 1) < 1e-12);
  assert.equal(h.send("gestureend").defaultPrevented, true);
  h.dispose();
});

test("pinches bypass page scrolling and keep capturing at the opening zoom limit", () => {
  const h = pinchSurface();
  const pageScroll = h.send("wheel", { deltaY: -100 });
  assert.equal(pageScroll.defaultPrevented, false);
  assert.equal(h.zoom(), 1);
  assert.equal(h.send("wheel", { deltaY: -10, ctrlKey: true }).defaultPrevented, true);
  assert.ok(Math.abs(h.zoom() - Math.exp(0.1)) < 1e-12);
  assert.equal(h.send("wheel", { deltaY: 10, ctrlKey: true }).defaultPrevented, true);
  assert.ok(Math.abs(h.zoom() - 1) < 1e-12);
  assert.equal(h.send("wheel", { deltaY: 10, ctrlKey: true }).defaultPrevented, true);
  assert.equal(h.send("wheel", { deltaY: 0, ctrlKey: true }).defaultPrevented, true);
  h.dispose();
});

test("native gestures do not double zoom when wheel events also arrive", () => {
  const h = pinchSurface();
  h.send("gesturestart", { scale: 1 });
  h.send("gesturechange", { scale: 2 });
  const duplicate = h.send("wheel", { deltaY: -10, ctrlKey: true });
  assert.equal(duplicate.defaultPrevented, true);
  assert.ok(Math.abs(h.zoom() - 2) < 1e-12);
  h.send("gestureend");
  h.send("wheel", { deltaY: -10, ctrlKey: true });
  assert.ok(h.zoom() > 2);
  h.dispose();
});

test("invalid native scales cannot corrupt zoom; missing anchors use the canvas center", () => {
  const h = pinchSurface();
  h.send("gesturestart");
  for (const scale of [0, -1, Infinity, NaN, undefined]) {
    assert.equal(h.send("gesturechange", { scale }).defaultPrevented, true);
    assert.equal(h.zoom(), 1);
  }
  h.send("gesturechange", { scale: 2 });
  assert.ok(Math.abs(h.zoom() - 2) < 1e-12);
  assert.deepEqual(h.anchors.at(-1), [320, 300]);
  h.dispose();
});

test("blur releases native pinch state and disposing removes all gesture listeners", () => {
  const h = pinchSurface();
  h.send("gesturestart", { scale: 1 });
  h.view.dispatchEvent(new Event("blur"));
  h.send("wheel", { deltaY: -10, ctrlKey: true });
  assert.ok(h.zoom() > 1);
  const zoom = h.zoom();
  h.dispose();
  for (const type of ["wheel", "gesturestart", "gesturechange", "gestureend"]) {
    assert.equal(h.send(type, { scale: 3, deltaY: -100, ctrlKey: true }).defaultPrevented, false);
    assert.equal(h.zoom(), zoom);
  }
});

test("wheel units normalize while pinch and ordinary scrolling retain separate sensitivity", () => {
  const target = { clientHeight: 800 };
  assert.equal(zoomWheelDelta({ deltaY: 10, deltaMode: 0, ctrlKey: true }, target), 0.1);
  assert.equal(zoomWheelDelta({ deltaY: 10, deltaMode: 0, ctrlKey: false }, target), 0.015);
  assert.equal(zoomWheelDelta({ deltaY: 1, deltaMode: 1 }, target), 16 * 0.0015);
  assert.equal(zoomWheelDelta({ deltaY: 1, deltaMode: 2 }, target), 800 * 0.0015);
});
