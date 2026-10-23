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
const {
  centerZoomFrame,
  projectZoomFrame,
  restoreZoomFrame,
} = require("../utils/lsystem/pageZoom.ts");

test("hiding and showing chrome keeps the same scene center and active scale", () => {
  const original = { originX: 127.25, originY: 603.75, scale: 17.3 };
  const camera = centerZoomFrame(original, 1280, 720);
  for (const [width, height] of [
    [1280, 900],
    [640, 900],
    [1280, 720],
  ]) {
    const screen = projectZoomFrame(camera, width, height);
    assert.equal(screen.scale, original.scale);
    // The same scene point remains at the center of every drawing area.
    assert.ok(Math.abs(screen.originX + camera.centerX * screen.scale - width / 2) < 1e-10);
    assert.ok(Math.abs(screen.originY - camera.centerY * screen.scale - height / 2) < 1e-10);
  }
  assert.deepEqual(camera, centerZoomFrame(original, 1280, 720));
});

test("links captured after a resize preserve the exact center at deep zoom", () => {
  const camera = { centerX: 1 / 3, centerY: -Math.PI, scale: 17.3 };
  for (const [width, height] of [
    [1280, 720],
    [1280, 900],
    [375, 812],
  ]) {
    const saved = JSON.parse(
      JSON.stringify({
        frame: projectZoomFrame(camera, width, height),
        centerX: camera.centerX,
        centerY: camera.centerY,
      }),
    );
    const restored = restoreZoomFrame(saved.frame, width, height, width, height, saved);
    for (const zoom of [7306, 1e100, 1e280]) {
      assert.equal((restored.centerX - camera.centerX) * camera.scale * zoom, 0);
      assert.equal((restored.centerY - camera.centerY) * camera.scale * zoom, 0);
    }
    assert.equal(restored.scale, camera.scale);
  }
});

test("older links derive their scene center before adapting to another viewport", () => {
  const frame = { originX: 127.25, originY: 603.75, scale: 17.3 };
  const original = centerZoomFrame(frame, 1280, 720);
  const restored = restoreZoomFrame(frame, 1280, 720, 640, 480);
  assert.equal(restored.centerX, original.centerX);
  assert.equal(restored.centerY, original.centerY);
  assert.equal(restored.scale, frame.scale * (480 / 720));
});
