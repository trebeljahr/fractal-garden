import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import ts from "typescript";

const require = createRequire(import.meta.url);
require.extensions[".ts"] = (module, filename) =>
  module._compile(
    ts.transpileModule(readFileSync(filename, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText,
    filename,
  );
const { fitFractalFrame } = require("../utils/fractalFrame.ts");
const { framedPatternCamera, movePatternCamera } = require("../utils/recursiveZoom.ts");
const { fixedToNumber } = require("../utils/lsystem/bigfixed.ts");
const { fernBounds, fernOpeningView } = require("../utils/fernViewport.ts");
const { FERN_PRESETS } = require("../utils/fernPresets.ts");
const {
  FULL_LOGISTIC_VIEW,
  fitLogisticView,
  logisticPoint,
  zoomLogisticView,
} = require("../utils/logisticMap.ts");

const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} != ${b}`);
const frames = [
  fitFractalFrame(1440, 848, 24, 92),
  fitFractalFrame(390, 740, 24, 108),
  fitFractalFrame(844, 338, 24, 92),
];
const pattern = { kind: "carpet", config: { iterations: 3 } };

for (const frame of frames) {
  test(`recursive opening fits clear of controls at ${frame.width}×${frame.height}`, () => {
    const view = framedPatternCamera(pattern, frame);
    const scale = view.frame * Math.min(frame.width, frame.height);
    const centerY = frame.height / 2 - fixedToNumber(view.y, view.bits) * scale;
    assert.ok(centerY - scale / 2 >= frame.top);
    assert.ok(centerY + scale / 2 <= frame.height - frame.bottom);
    close(centerY, (frame.height + frame.top - frame.bottom) / 2);
    // Anchoring is against the full surface, including the area below the fit rectangle.
    const anchor = { x: 80, y: frame.height / 2 - 5 };
    const zoomed = movePatternCamera(view, frame.width, frame.height, 3, anchor.x, anchor.y);
    close(
      fixedToNumber(view.y, view.bits) + anchor.y / scale,
      fixedToNumber(zoomed.y, zoomed.bits) + anchor.y / (scale * 3),
    );
  });

  test(`fern opening fits its invariant bounds at ${frame.width}×${frame.height}`, () => {
    for (const { matrix } of Object.values(FERN_PRESETS)) {
      const bounds = fernBounds(matrix);
      const view = fernOpeningView(bounds, frame);
      const scale = Math.min(frame.width, frame.height) / (2 * 2 ** view.logZoom);
      const centerY = frame.height / 2 - (bounds.y - fixedToNumber(view.y, view.bits)) * scale;
      const centerX = frame.width / 2 + (bounds.x - fixedToNumber(view.x, view.bits)) * scale;
      assert.ok(centerY - bounds.ry * scale >= frame.top - 1e-9);
      assert.ok(centerY + bounds.ry * scale <= frame.height - frame.bottom + 1e-9);
      assert.ok(centerX - bounds.rx * scale >= 0);
      assert.ok(centerX + bounds.rx * scale <= frame.width);
    }
  });

  test(`logistic opening pads world bounds without changing zoom anchors at ${frame.width}×${frame.height}`, () => {
    const opening = fitLogisticView(FULL_LOGISTIC_VIEW, frame);
    close(logisticPoint(opening, 0.5, frame.top / frame.height).x, 1);
    close(logisticPoint(opening, 0.5, (frame.height - frame.bottom) / frame.height).x, 0);
    const point = logisticPoint(opening, 0.8, 0.9);
    const zoomed = zoomLogisticView(opening, 0.8, 0.9, 0.5, opening);
    const after = logisticPoint(zoomed, 0.8, 0.9);
    close(point.r, after.r);
    close(point.x, after.x);
    const reset = zoomLogisticView(zoomed, 0.8, 0.9, 2, opening);
    for (const key of Object.keys(opening)) close(reset[key], opening[key]);
  });
}
