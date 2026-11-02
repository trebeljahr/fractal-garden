import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import ts from "typescript";

const require = createRequire(import.meta.url);
require.extensions[".ts"] = (module, filename) =>
  module._compile(
    ts.transpileModule(
      readFileSync(filename, "utf8").replaceAll("import.meta.url", '"file:///fern-renderer.ts"'),
      { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } },
    ).outputText,
    filename,
  );
const {
  createViewport,
  createViewportAtLog,
  moveViewport,
  zoomViewport,
} = require("../utils/deepZoom/math.ts");
const {
  FERN_TILE_SIZE,
  FernPointCloud,
  fernTileIntersects,
  fernTileLod,
  projectFernTile,
} = require("../utils/fernPoints.ts");
const { createFernWalker, fernBounds, fernOpeningSpan } = require("../utils/fernViewport.ts");
const { FERN_PRESETS } = require("../utils/fernPresets.ts");
const { FernViewportRenderer } = require("../utils/fernRenderer.ts");

const source = () => ({ view: createViewport([0, 0], 1), width: 800, height: 600 });
test("camera changes keep point coordinates and identities; later samples append", () => {
  const cloud = new FernPointCloud(),
    frame = source();
  const first = cloud.append(frame, [400.125, 300.25, 410.75, 310.5]);
  const tile = cloud.tiles.get(first[0].id),
    old = Array.from(tile.points.subarray(0, 4));
  const target = { ...frame, view: zoomViewport(frame.view, frame.view.logZoom - 1, 0, 0) };
  assert.deepEqual(Array.from(projectFernTile(tile, target)), [400.25, 300.5, 421.5, 321]);
  cloud.append(target, [405, 305]);
  assert.equal(cloud.tiles.get(tile.id), tile);
  assert.deepEqual(Array.from(tile.points.subarray(0, 4)), old);
  assert.equal(cloud.count, 3);
  const mask = cloud.coverage(target).occupied;
  assert.equal(mask[300 * 800 + 400], 1);
  assert.equal(mask[305 * 800 + 405], 1);
});

test("point projection retains exact subpixel camera differences beyond float range", () => {
  for (const log of [-60, -2000]) {
    const frame = { ...source(), view: createViewportAtLog([0, 1], log) };
    const cloud = new FernPointCloud();
    const [append] = cloud.append(frame, [400, 300]);
    const tile = cloud.tiles.get(append.id);
    const target = {
      ...frame,
      view: moveViewport(zoomViewport(frame.view, log - 20, 0, 0), 0.25, -0.125),
    };
    assert(fernTileIntersects(tile, target));
    const p = projectFernTile(tile, target);
    assert.equal(p.length, 2);
    assert(Math.abs(p[0] - 325) < 0.001);
    assert(Math.abs(p[1] - 262.5) < 0.001);
  }
});

test("viewport sampling yields only subpixel points in gaps and preserves coverage on coarsening", () => {
  const matrix = FERN_PRESETS.barnsley.matrix,
    b = fernBounds(matrix),
    frame = {
      width: 400,
      height: 300,
      view: createViewport([b.x, b.y], fernOpeningSpan(b, 400, 300)),
    };
  const covered = new Uint8Array(400 * 300).fill(1);
  const empty = createFernWalker(matrix, frame.view, 400, 300, "chaos", 42, covered);
  assert.deepEqual(empty.step(1000), []);
  const occupied = new Uint8Array(400 * 300),
    walker = createFernWalker(matrix, frame.view, 400, 300, "chaos", 42, occupied),
    seen = new Set();
  let fractional = false;
  for (let k = 0; k < 100000; k += 1000) {
    const points = walker.step(1000);
    for (let i = 0; i < points.length; i += 2) {
      const x = points[i],
        y = points[i + 1];
      assert(x >= 0 && x < 400 && y >= 0 && y < 300);
      const key = Math.floor(y) * 400 + Math.floor(x);
      assert(!seen.has(key), "existing point pixel was sampled again");
      seen.add(key);
      fractional ||= !Number.isInteger(x) || !Number.isInteger(y);
    }
    if (!walker.pending && walker.samples >= 300000) break;
  }
  assert(seen.size > 1000);
  assert(fractional, "point positions must not be rounded into pixels");
});

test("cache pressure evicts only offscreen detail and retains the opening points", () => {
  const cloud = new FernPointCloud(),
    frame = source();
  const [root] = cloud.append(frame, [400, 300]);
  const away = { ...frame, view: createViewport([100, 100], 0.01) };
  const [outside] = cloud.append(away, [400, 300]);
  const [visible] = cloud.append(frame, [480, 300]);
  const removed = cloud.prune(frame, 2);
  assert.deepEqual(removed, [outside.id]);
  assert(cloud.tiles.has(root.id));
  assert(cloud.tiles.has(visible.id));
});

test("views within an octave extend one set of tiles and one pixel grid", () => {
  const cloud = new FernPointCloud(),
    frame = source();
  const inOctave = (log) => ({ ...frame, view: zoomViewport(frame.view, log, 0, 0) });
  for (let k = 1; k < 100; k++) cloud.append(inOctave(-k / 100), [400 + k / 10, 300]);
  assert.equal(new Set(Array.from(cloud.tiles.values(), (t) => t.epoch)).size, 1);
  assert(cloud.tiles.size <= 2, `views fragmented the cloud into ${cloud.tiles.size} tiles`);
  // The same frame pixel seen from another view adds nothing: its grid does not move.
  const screen = (log, framePixel) => 400 + (framePixel - 400) * 2 ** (-1 - log);
  const [added] = cloud.append(inOctave(-0.5), [screen(-0.5, 500.5), 300]);
  const before = cloud.count;
  assert.deepEqual(cloud.append(inOctave(-0.25), [screen(-0.25, 500.5), 300]), []);
  assert.equal(cloud.count, before);
  assert.equal(cloud.tiles.get(added.id).count, 1);
});

test("a far pan within an octave starts a new frame so float offsets stay subpixel", () => {
  const cloud = new FernPointCloud(),
    frame = source();
  const [near] = cloud.append(frame, [400, 300]);
  const far = { ...frame, view: moveViewport(frame.view, 2 ** 8, 0) };
  const [other] = cloud.append(far, [400, 300]);
  assert.notEqual(other.epoch, near.epoch);
  assert.deepEqual(Array.from(projectFernTile(cloud.tiles.get(other.id), far)), [400, 300]);
});

test("finer tiles thin to what their pixels can show; their own level keeps every point", () => {
  const full = FERN_TILE_SIZE ** 2;
  assert.deepEqual(fernTileLod(full, 1), { stride: 1, count: full });
  assert.deepEqual(fernTileLod(full, 0.51), { stride: 1, count: full });
  assert.deepEqual(fernTileLod(10, 0.1), { stride: 1, count: 10 });
  assert.deepEqual(fernTileLod(full, 0.4), { stride: 2, count: full / 2 }, "one level finer");
  // Half a dot per pixel three levels out, so an old view fades into sparser dots.
  assert.deepEqual(fernTileLod(full, 1 / 8), { stride: 16, count: 32 });
  assert.deepEqual(fernTileLod(full, 1e-9), { stride: 16, count: 1 });
  assert.deepEqual(fernTileLod(full, 0), { stride: 16, count: 1 });
  assert.deepEqual(fernTileLod(0, 0), { stride: 1, count: 0 });
  assert.deepEqual(fernTileLod(full, Infinity), { stride: 1, count: full });
  assert(fernTileLod(full, 1 / 64).stride * 8 <= 255, "WebGL rejects a stride above 255 bytes");
  // Subsets nest, so a halving only removes dots and never swaps them.
  const subset = (lod) => new Set(Array.from({ length: lod.count }, (_, i) => i * lod.stride));
  const coarse = subset(fernTileLod(full, 0.1)),
    fine = subset(fernTileLod(full, 0.2));
  for (const i of coarse) assert(fine.has(i));
});

test("mask only marks drawn dots, so the sampler can fill behind thinned detail", () => {
  const cloud = new FernPointCloud(),
    frame = { ...source(), view: createViewportAtLog([0, 0], -8) };
  const points = [];
  for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) points.push(x + 0.5, y + 0.5);
  cloud.append(frame, points);
  const out = { ...source(), view: createViewportAtLog([0, 0], 0) };
  const projected = projectFernTile(Array.from(cloud.tiles.values())[0], out);
  const { occupied } = cloud.coverage(out);
  assert.equal(projected.length, 2);
  assert.equal(
    occupied.reduce((sum, v) => sum + v, 0),
    1,
  );
});

test("zooming out sheds detail far finer than the screen, finest first", () => {
  const cloud = new FernPointCloud(),
    frame = source();
  const at = (log) => ({ ...frame, view: createViewportAtLog([0, 0], log) });
  const [opening] = cloud.append(frame, [400, 300]);
  const [near] = cloud.append(at(-1), [400, 300]);
  const [fine] = cloud.append(at(-4), [400, 300]);
  const [finest] = cloud.append(at(-9), [400, 300]);
  assert.deepEqual(cloud.prune(frame, 3), [finest.id]);
  assert.deepEqual(cloud.prune(frame, 1), [fine.id]);
  assert(cloud.tiles.has(opening.id) && cloud.tiles.has(near.id));
  assert.equal(cloud.count, 2);
});

test("a zoom round trip stays bounded by the screen, not by how many views it took", () => {
  const matrix = FERN_PRESETS.barnsley.matrix,
    b = fernBounds(matrix);
  const width = 400,
    height = 300,
    cloud = new FernPointCloud();
  const opening = createViewport([b.x, b.y], fernOpeningSpan(b, width, height));
  const visit = (view, burst = 2000) => {
    const request = { view, width, height };
    cloud.prune(request);
    const { occupied } = cloud.coverage(request);
    const walker = createFernWalker(matrix, view, width, height, "chaos", 42, occupied);
    cloud.append(request, walker.step(burst));
  };
  let view = opening;
  visit(view, 60000);
  for (let k = 1; k <= 120; k++) {
    view = zoomViewport(opening, opening.logZoom - k / 15, -0.05, 0.1);
    visit(view);
  }
  const deep = cloud.count;
  for (let k = 120; k >= 0; k--) {
    view = zoomViewport(opening, opening.logZoom - k / 15, -0.05, 0.1);
    visit(view);
  }
  const drawn = Array.from(cloud.tiles.values()).reduce((sum, tile) => {
    const scale = 2 ** (tile.view.logZoom - view.logZoom);
    return sum + fernTileLod(tile.count, scale).count;
  }, 0);
  assert(cloud.tiles.size <= 2048, `${cloud.tiles.size} tiles retained`);
  assert(cloud.count < deep + 8 * width * height, `${cloud.count} points after ${deep}`);
  assert(drawn <= 4 * width * height, `${drawn} dots drawn on a ${width}x${height} screen`);
});

function harness(t) {
  let serial = 0;
  const frames = new Map(),
    uploads = [],
    deletes = [],
    draws = [],
    pointers = [],
    uniforms = {};
  let worker;
  const gl = new Proxy(
    {
      canvas: null,
      getShaderParameter: () => true,
      getProgramParameter: () => true,
      getAttribLocation: () => 0,
      getUniformLocation: (_, name) => name,
      bufferData: (...args) => uploads.push({ type: "allocate", args }),
      bufferSubData: (...args) => uploads.push({ type: "append", args }),
      vertexAttribPointer: (...args) => pointers.push(args),
      deleteBuffer: (x) => deletes.push(x),
      uniform1f: (key, value) => (uniforms[key] = value),
      uniform2f: (key, ...value) => (uniforms[key] = value),
      drawArrays: (_, start, count) =>
        draws.push({ start, count, uniforms: structuredClone(uniforms) }),
    },
    {
      get: (target, key) =>
        key in target
          ? target[key]
          : /^[A-Z_]+$/.test(key)
            ? key
            : key.startsWith("create")
              ? () => ({ id: ++serial })
              : () => {},
    },
  );
  const events = new EventTarget(),
    canvas = new EventTarget();
  Object.assign(canvas, { width: 800, height: 600, style: {}, getContext: () => gl });
  gl.canvas = canvas;
  const saved = Object.fromEntries(
    ["window", "Worker", "requestAnimationFrame", "cancelAnimationFrame"].map((k) => [
      k,
      globalThis[k],
    ]),
  );
  globalThis.window = Object.assign(events, { devicePixelRatio: 1 });
  globalThis.Worker = class {
    messages = [];
    terminated = false;
    constructor() {
      worker = this;
    }
    postMessage(message) {
      this.messages.push(message);
    }
    terminate() {
      this.terminated = true;
    }
  };
  globalThis.requestAnimationFrame = (fn) => {
    const id = ++serial;
    frames.set(id, fn);
    return id;
  };
  globalThis.cancelAnimationFrame = (id) => frames.delete(id);
  t.after(() => {
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete globalThis[k];
      else globalThis[k] = v;
    }
  });
  const initial = source(),
    renderer = new FernViewportRenderer(canvas, {
      ...initial,
      matrix: [],
      method: "chaos",
      color: "#96f78e",
      background: "#252424",
      paused: true,
      onProgress() {},
    });
  const tick = () => {
    const callbacks = [...frames.values()];
    frames.clear();
    for (const fn of callbacks) fn();
  };
  const append = (id, start, points) =>
    worker.onmessage({
      data: {
        type: "points",
        id: 1,
        appends: [
          {
            ...initial,
            id,
            epoch: 1,
            x: 384,
            y: 256,
            start,
            count: start + points.length / 2,
            points: new Float64Array(points),
          },
        ],
        samples: 300000,
        visited: 1,
        resolution: 24,
        count: start + points.length / 2,
        complete: true,
      },
    });
  return { renderer, worker, tick, append, uploads, deletes, draws, frames, pointers };
}

test("GPU camera movement reuses point buffers, keeps dots one pixel and never replaces a frame", (t) => {
  const h = harness(t);
  h.tick();
  h.append(1, 0, [16, 44, 26, 54]);
  h.tick();
  const allocation = h.uploads.length;
  h.renderer.setView(zoomViewport(source().view, source().view.logZoom - 2, 0, 0));
  h.tick();
  assert.equal(h.uploads.length, allocation, "zoom must not upload a replacement point cloud");
  assert.equal(h.deletes.length, 0);
  assert.equal(h.draws.at(-1).uniforms.u_dotSize, 1);
  assert.equal(h.draws.at(-1).uniforms.u_scale, 4);
  assert.equal(h.draws.at(-1).count, 2);
  h.append(1, 2, [30, 60]);
  h.tick();
  assert.equal(h.uploads.at(-1).type, "append");
  assert.equal(h.uploads.at(-1).args[1], 16, "append must start after the existing vertices");
  assert.equal(h.draws.at(-1).count, 3);
  h.renderer.setStyle("#ff0000", "#000000");
  h.tick();
  assert.equal(h.deletes.length, 0);
  assert.equal(h.uploads.length, allocation + 1, "color edit must retain point buffers");
  h.renderer.dispose();
  assert.equal(h.frames.size, 0);
  assert(h.worker.terminated);
});

test("zooming out draws a nested subset of a tile from the same buffer", (t) => {
  const h = harness(t);
  h.tick();
  h.append(
    1,
    0,
    Array.from({ length: 8192 }, (_, i) => (i % 64) + 0.5),
  );
  h.tick();
  assert.equal(h.draws.at(-1).count, 4096);
  assert.equal(h.pointers.at(-1)[4], 8);
  const uploads = h.uploads.length;
  const out = zoomViewport(source().view, source().view.logZoom + 3, 0, 0);
  h.renderer.setView(out);
  h.tick();
  assert.equal(h.uploads.length, uploads, "thinning must not upload");
  assert.equal(h.pointers.at(-1)[4], 16 * 8);
  assert.equal(h.draws.at(-1).count, 32, "half a dot per pixel over an 8 px tile");
  h.renderer.dispose();
});

test("tiles in one frame share one exact camera calculation per paint", (t) => {
  const h = harness(t);
  h.tick();
  h.append(1, 0, [16, 44]);
  h.worker.onmessage({
    data: {
      type: "points",
      id: 1,
      appends: [
        {
          ...source(),
          id: 2,
          epoch: 1,
          x: 448,
          y: 256,
          start: 0,
          count: 1,
          points: new Float64Array([16, 44]),
        },
      ],
      samples: 1,
      visited: 1,
      resolution: 24,
      count: 2,
      complete: true,
    },
  });
  h.tick();
  const [left, right] = h.draws.slice(-2);
  assert.equal(left.uniforms.u_center[0] - right.uniforms.u_center[0], 64);
  h.renderer.dispose();
});

test("deep camera movement immediately reprojects retained points from their original coordinates", (t) => {
  const h = harness(t);
  h.tick();
  h.append(1, 0, [16, 44, 26, 54]);
  h.tick();
  const deep = zoomViewport(source().view, -20, 0, 0);
  h.renderer.setView(deep);
  h.tick();
  assert.deepEqual(Array.from(h.uploads.at(-1).args[1]), [400, 300]);
  h.renderer.setView(moveViewport(deep, 0.25, -0.125));
  h.tick();
  assert.deepEqual(Array.from(h.uploads.at(-1).args[1]), [325, 262.5]);
  assert.equal(h.draws.at(-1).count, 1);
  h.renderer.dispose();
});
