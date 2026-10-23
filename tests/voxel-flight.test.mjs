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
  buildGridFrame,
  flightClearance,
  initialFlightCamera,
  moveFlightCamera,
  serializeFlightCamera,
  restoreFlightCamera,
  keepVoxel,
  PATTERNS,
  flightBasis,
} = require("../utils/voxelZoom/camera.ts");
const { fixedToFloatExp } = require("../utils/deepZoom/math.ts");
const {
  generateMengerSponge,
  generateVicsekFractal3D,
  generateMoselySnowflake,
} = require("../utils/voxelFractals.ts");
const generators = [
  generateMengerSponge,
  generateVicsekFractal3D,
  (n) => generateMoselySnowflake(n, "lighter"),
  (n) => generateMoselySnowflake(n, "heavier"),
];
const occupancy = (frame, p) =>
  frame.levels.every(({ plane, width, digit }) =>
    keepVoxel(
      frame.pattern,
      digit.map((d, i) => (((d + Math.floor((p[i] - plane[i]) / width)) % 3) + 3) % 3),
    ),
  );

test("all four subdivision rules match the existing finite geometry", () => {
  PATTERNS.forEach((pattern, i) => {
    const cubes = generators[i](3),
      occupied = new Set(cubes.map((c) => `${c.gridX},${c.gridY},${c.gridZ}`));
    const camera = initialFlightCamera(),
      frame = { ...buildGridFrame(camera, pattern, 3), pattern };
    for (let x = -13; x <= 13; x++)
      for (let y = -13; y <= 13; y++)
        for (let z = -13; z <= 13; z++) {
          const point = [x / 27, y / 27, z / 27 - 1.6];
          assert.equal(
            occupancy(frame, point),
            occupied.has(`${x},${y},${z}`),
            `${pattern} ${x},${y},${z}`,
          );
        }
  });
});
test("Menger flight crosses the outer bounding box through its empty center tunnel", () => {
  let camera = initialFlightCamera();
  for (let i = 0; i < 60; i++) camera = moveFlightCamera(camera, "menger", [0, 0, 0.7]);
  const [m, e] = fixedToFloatExp(camera.position[2], camera.bits);
  assert.ok(m * 2 ** e < 1, `camera remained outside at ${m * 2 ** e}`);
  assert.ok(buildGridFrame(camera, "menger").clearance > 0);
});
test("flight clips solid faces, grows render precision and keeps its selected scale", () => {
  let camera = initialFlightCamera();
  for (let i = 0; i < 120; i++) camera = moveFlightCamera(camera, "vicsek", [0, 0, 1]);
  const one = 1n << BigInt(camera.bits);
  assert.ok(camera.position[2] > one, "camera remains in empty space before z=1");
  assert.ok(camera.level > 0, "render precision follows the approaching surface");
  assert.equal(camera.viewLevel, 0, "flight scale stays fixed at the wall");
  assert.ok(camera.bits > 160);
  assert.deepEqual(
    restoreFlightCamera(JSON.parse(JSON.stringify(serializeFlightCamera(camera)))),
    camera,
  );
});
test("camera-relative grid planes retain sub-double offsets at deep addresses", () => {
  const bits = 600,
    level = 150,
    one = 1n << 600n;
  const camera = { position: [one, one, one], bits, level, yaw: 0, pitch: 0 };
  const offset = (one * 2n) / (3n ** 150n * 100n);
  const shifted = { ...camera, position: [one + offset, one, one] };
  assert.equal(Number(camera.position[0]) / Number(one), Number(shifted.position[0]) / Number(one));
  const a = buildGridFrame(camera, "menger"),
    b = buildGridFrame(shifted, "menger");
  assert.ok(Math.abs(a.high[0] - b.high[0] - 0.01) < 1e-7);
  assert.ok(a.levels.length < camera.level, "ancestors outside the numerical range are skipped");
  assert.notDeepEqual(a.texture, b.texture);
});
test("flight orientation remains orthonormal and bounded links reject unsafe cameras", () => {
  const { right, up, forward } = flightBasis({ yaw: 1.2, pitch: 0.7 });
  for (const axis of [right, up, forward]) assert.ok(Math.abs(Math.hypot(...axis) - 1) < 1e-12);
  assert.ok(Math.abs(right.reduce((sum, v, i) => sum + v * forward[i], 0)) < 1e-12);
  const saved = serializeFlightCamera(initialFlightCamera());
  for (const bad of [
    { ...saved, bits: 1e9 },
    { ...saved, level: 1.2 },
    { ...saved, level: 255 },
    { ...saved, pitch: 2 },
    { ...saved, viewLevel: NaN },
    { ...saved, viewLevel: 245 },
    { ...saved, position: ["f".repeat(9999), "0", "0"] },
    { ...saved, position: ["1".repeat(100), "0", "0"] },
  ])
    assert.throws(() => restoreFlightCamera(bad));
  assert.deepEqual(
    moveFlightCamera(initialFlightCamera(), "menger", [NaN, 0, 0]),
    initialFlightCamera(),
  );
});

test("safe movement distance never exceeds distance to finite retained geometry", () => {
  for (const [index, pattern] of PATTERNS.entries()) {
    const cubes = generators[index](2);
    for (let sample = 0; sample < 18; sample++) {
      const point = [
        Math.sin(sample * 2.3) * 1.3,
        Math.cos(sample * 1.7) * 1.3,
        Math.sin(sample * 0.7) * 1.3,
      ];
      const camera = initialFlightCamera();
      const one = 1n << BigInt(camera.bits);
      camera.position = point.map((p) => (BigInt(Math.round(p * 1e9)) * one) / 1000000000n);
      const frame = buildGridFrame(camera, pattern, 2);
      const actual =
        Math.min(
          ...cubes.map((cube) =>
            Math.hypot(
              ...point.map((p, axis) =>
                Math.max(Math.abs(p - [cube.x, cube.y, cube.z][axis]) - cube.size / 2, 0),
              ),
            ),
          ),
        ) / 2;
      assert.ok(
        frame.clearance <= actual + 1e-7,
        `${pattern} distance ${frame.clearance} > ${actual}`,
      );
    }
  }
});

test("movement clearance matches the full grid bound without losing tunnel openings", () => {
  for (const pattern of PATTERNS) {
    for (let sample = 0; sample < 80; sample++) {
      const camera = initialFlightCamera(pattern);
      const one = 1n << BigInt(camera.bits);
      camera.position = [
        Math.sin(sample * 2.3) * 1.3,
        Math.cos(sample * 1.7) * 1.3,
        Math.sin(sample * 0.7) * 1.3,
      ].map((p) => (BigInt(Math.round(p * 1e9)) * one) / 1000000000n);
      assert.ok(
        Math.abs(flightClearance(camera, pattern) - buildGridFrame(camera, pattern).clearance) <
          1e-7,
      );
    }
    const one = 1n << 600n,
      scale = 3n ** 150n;
    const camera = {
      position: [one - one / scale, one - one / scale, one + (one * 22n) / (10n * scale)],
      bits: 600,
      level: 150,
      yaw: 0,
      pitch: 0,
    };
    assert.ok(
      Math.abs(flightClearance(camera, pattern) - buildGridFrame(camera, pattern).clearance) < 1e-7,
    );
  }
});

test("boosted movement remains outside a solid surface", () => {
  let camera = initialFlightCamera();
  for (let i = 0; i < 30; i++) camera = moveFlightCamera(camera, "vicsek", [0, 0, 1.6]);
  assert.ok(camera.position[2] > 1n << BigInt(camera.bits));
  assert.ok(camera.level > 0);
});

test("wheel travel stops at the opening distance from every direction", () => {
  const { dollyFlightCamera, atFlightZoomLimit } = require("../utils/voxelZoom/camera.ts");
  const radius = (camera) =>
    Math.hypot(
      ...camera.position.map((p) => {
        const [m, e] = fixedToFloatExp(p, camera.bits);
        return m * 2 ** e;
      }),
    );
  for (const pattern of PATTERNS) {
    const initial = initialFlightCamera(pattern);
    assert.ok(atFlightZoomLimit(initial, pattern));
    assert.deepEqual(dollyFlightCamera(initial, pattern, -3), initial);
    let camera = dollyFlightCamera(initial, pattern, 0.3);
    assert.ok(!atFlightZoomLimit(camera, pattern));
    for (let i = 0; i < 20; i++) camera = dollyFlightCamera(camera, pattern, -3);
    assert.ok(atFlightZoomLimit(camera, pattern));
    assert.ok(radius(camera) <= radius(initial) + 1e-7);
    assert.ok(!atFlightZoomLimit(dollyFlightCamera(camera, pattern, 0.1), pattern));
    // Looking away reverses which wheel direction travels out. The same bound applies.
    camera = { ...initial, yaw: Math.PI };
    assert.deepEqual(dollyFlightCamera(camera, pattern, 3), camera);
    const free = moveFlightCamera(initial, pattern, [0, 0, -1]);
    assert.ok(radius(free) > radius(initial), "keyboard flight remains free");
  }
});

test("height controls move vertically even when looking up or down", () => {
  for (const pitch of [-1.4, 0.8, 1.4]) {
    const camera = { ...initialFlightCamera(), pitch, yaw: 0.7 };
    for (const vertical of [-1, 1]) {
      const moved = moveFlightCamera(camera, "menger", [0, vertical * 0.1, 0]);
      assert.equal(moved.position[0], camera.position[0]);
      assert.equal(moved.position[2], camera.position[2]);
      assert.equal(moved.position[1] > camera.position[1], vertical > 0);
    }
  }
});

const cameraAt = (point, level = 0, viewLevel = level) => {
  const camera = initialFlightCamera();
  const one = 1n << 600n;
  return {
    ...camera,
    bits: 600,
    level,
    viewLevel,
    position: point.map((p) => (BigInt(Math.round(p * 1e12)) * one) / 1000000000000n),
  };
};
const worldDelta = (before, after) =>
  after.position.map((p, axis) => {
    const from = before.position[axis] << BigInt(after.bits - before.bits);
    const [m, e] = fixedToFloatExp(p - from, after.bits);
    return m * 2 ** e;
  });

test("unblocked flight distance is independent of pattern and nearby clearance", () => {
  for (const pattern of PATTERNS) {
    for (const z of [1.000001, 1.1, 3.2]) {
      // Travel along the outside of a face, from a micron away to open space.
      const before = cameraAt([0.4, 0.4, z]);
      const after = moveFlightCamera(before, pattern, [0.1, 0, 0]);
      const delta = worldDelta(before, after);
      assert.ok(Math.abs(delta[0] - 0.2) < 1e-7, `${pattern}, z=${z}: ${delta[0]}`);
      assert.equal(delta[1], 0);
      assert.equal(delta[2], 0);
      assert.equal(after.viewLevel, before.viewLevel);
    }
  }
});

test("render precision cannot change flight speed or the physical path", () => {
  for (const level of [0, 10, 150, 244]) {
    const before = cameraAt([0, 0, 3.2], level, 0);
    const after = moveFlightCamera(before, "menger", [0.1, 0, 0]);
    assert.ok(Math.abs(worldDelta(before, after)[0] - 0.2) < 1e-7);
    assert.equal(after.viewLevel, 0);
  }
});

test("equal simulated time gives equal travel across normal and slow frame rates", () => {
  for (const rate of [4, 10, 30, 60, 120]) {
    const before = cameraAt([0, 0, 3.2]);
    let after = before;
    for (let step = 0; step < rate; step++)
      after = moveFlightCamera(after, "menger", [0.5 / rate, 0, 0]);
    assert.ok(Math.abs(worldDelta(before, after)[0] - 1) < 1e-7, `rate=${rate}`);
  }
});

test("deep flight keeps a constant displacement in the saved exploration scale", () => {
  const one = 1n << 600n,
    scale = 3n ** 150n;
  const before = {
    position: [one + (one * 2n) / scale, 0n, 0n],
    bits: 600,
    level: 150,
    viewLevel: 150,
    yaw: 0,
    pitch: 0,
  };
  const after = moveFlightCamera(before, "menger", [0, 0, 0.1]);
  const delta = after.position[2] - before.position[2];
  const [m, e] = fixedToFloatExp(delta * scale, after.bits);
  assert.ok(Math.abs(m * 2 ** e + 0.2) < 1e-7);
});

test("legacy camera links restore their saved level as exploration scale", () => {
  const saved = serializeFlightCamera(initialFlightCamera());
  delete saved.viewLevel;
  assert.equal(restoreFlightCamera(saved).viewLevel, saved.level);
});

test("large flight segments cannot tunnel through retained front faces", () => {
  const faces = [
    ["menger", 0.8, 0.8],
    ["vicsek", 0, 0],
    ["mosely-light", 0, 0.8],
    ["mosely-heavy", 0, 0.8],
  ];
  for (const [pattern, x, y] of faces) {
    const before = cameraAt([x, y, 3.2]);
    const after = moveFlightCamera(before, pattern, [0, 0, 5]);
    assert.ok(after.position[2] >= 1n << BigInt(after.bits), `${pattern}: crossed the face`);
    assert.ok(
      Math.abs(worldDelta(before, after)[2] + 2.2) < 1e-6,
      `${pattern}: did not reach the face`,
    );
  }
});

test("long travel down a narrow empty tunnel keeps full speed beside its wall", () => {
  const before = cameraAt([1 / 3 - 1e-6, 0, 3.2]);
  const after = moveFlightCamera(before, "menger", [0, 0, 5]);
  assert.ok(Math.abs(worldDelta(before, after)[2] + 10) < 1e-6);
});
