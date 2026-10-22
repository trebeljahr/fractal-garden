import assert from "node:assert/strict";
import test from "node:test";
import {
  FULL_LOGISTIC_VIEW,
  logisticPoint,
  panLogisticView,
  renderLogistic,
  zoomLogisticView,
} from "../utils/logisticMap.ts";

const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-10, `${a} != ${b}`);
const config = {
  settleIterations: 300,
  plotIterations: 180,
  columns: 200,
  pointAlpha: 0.12,
  pointSize: 0.5,
  background: "#252424",
  color: "#f0d66d",
};

test("zoom preserves the pointer's world coordinates and both axis proportions", () => {
  const view = FULL_LOGISTIC_VIEW;
  const before = logisticPoint(view, 0.73, 0.29);
  const zoomed = zoomLogisticView(view, 0.73, 0.29, 0.4);
  const after = logisticPoint(zoomed, 0.73, 0.29);
  close(before.r, after.r);
  close(before.x, after.x);
  close((zoomed.rMax - zoomed.rMin) / (zoomed.xMax - zoomed.xMin), 1.5);
  const restored = zoomLogisticView(zoomed, 0.73, 0.29, 2.5);
  for (const key of Object.keys(view)) close(view[key], restored[key]);
});

test("zoom stops at the opening size and numerical floor without changing proportions", () => {
  assert.deepEqual(zoomLogisticView(FULL_LOGISTIC_VIEW, 0.5, 0.5, 100), FULL_LOGISTIC_VIEW);
  const tiny = zoomLogisticView(FULL_LOGISTIC_VIEW, 0.5, 0.5, 1e-20);
  close(tiny.xMax - tiny.xMin, 1e-6);
  close(tiny.rMax - tiny.rMin, 1.5e-6);
});

test("panning follows the hand in both directions without changing the ranges", () => {
  const panned = panLogisticView(FULL_LOGISTIC_VIEW, 0.2, 0.1);
  close(panned.rMin, 2.2);
  close(panned.xMax, 1.1);
  const restored = panLogisticView(panned, -0.2, -0.1);
  for (const key of Object.keys(restored)) close(restored[key], FULL_LOGISTIC_VIEW[key]);
});

test("a converged orbit occupies one sharp device pixel per column, even on a wide screen", () => {
  const width = 400;
  const height = 100;
  const view = { rMin: 1.999, rMax: 2.001, xMin: 0, xMax: 1 };
  const data = renderLogistic({ width, height, ratio: 1, view, config });
  for (let col = 0; col < width; col++) {
    const rows = [];
    for (let row = 0; row < height; row++) {
      const index = (row * width + col) * 4;
      assert.equal(data[index + 3], 255);
      if (data[index] !== 37) rows.push(row);
    }
    assert.equal(rows.length, 1, `column ${col} has no gaps or antialiasing fringe`);
    assert.ok(rows[0] === 49 || rows[0] === 50);
  }
});

test("Retina samples stay one physical pixel wide at the default point size", () => {
  const width = 400;
  const height = 200;
  const data = renderLogistic({
    width,
    height,
    ratio: 2,
    view: { rMin: 1.999, rMax: 2.001, xMin: 0, xMax: 1 },
    config,
  });
  for (let col = 0; col < width; col++) {
    let hits = 0;
    for (let row = 0; row < height; row++) if (data[(row * width + col) * 4] !== 37) hits++;
    assert.equal(hits, 1);
  }
});

test("panned regions outside the bounded map remain blank without non-finite artifacts", () => {
  const data = renderLogistic({
    width: 60,
    height: 40,
    ratio: 1,
    view: { rMin: 5, rMax: 6, xMin: 0, xMax: 1 },
    config,
  });
  for (let i = 0; i < data.length; i += 4)
    assert.deepEqual(Array.from(data.slice(i, i + 4)), [37, 36, 36, 255]);
});
