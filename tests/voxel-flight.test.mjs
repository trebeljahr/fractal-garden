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
  FLIGHT_WALL_MARGIN,
  FLIGHT_NAVIGATION_RATE,
  MAX_VOXEL_DEPTH,
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
test("snowflake Explore starts in an empty interior cavity with room to navigate", () => {
  for (const pattern of ["mosely-light", "mosely-heavy"]) {
    const camera = initialFlightCamera(pattern);
    const one = 1n << BigInt(camera.bits);
    assert.ok(
      camera.position.every((p) => p > -one && p < one),
      pattern,
    );
    assert.ok(flightClearance(camera, pattern) > 0, `${pattern}: starts in retained geometry`);
    const restored = restoreFlightCamera(serializeFlightCamera(camera), pattern);
    assert.deepEqual(
      restored.position,
      camera.position.map((p) => p << BigInt(restored.bits - camera.bits)),
    );
    for (const motion of [
      [0.01, 0, 0],
      [0, 0.01, 0],
      [0, 0, 0.01],
    ]) {
      const moved = moveFlightCamera(camera, pattern, motion);
      assert.notDeepEqual(moved.position, camera.position);
      assert.ok(flightClearance(moved, pattern) > 0);
    }
  }
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
    { ...saved, navigationLevel: NaN },
    { ...saved, navigationLevel: 257 },
    { ...saved, atmosphereLevel: NaN },
    { ...saved, atmosphereLevel: 257 },
    { ...saved, atmosphereVelocity: Infinity },
    { ...saved, atmosphereVelocity: 17 },
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
        Math.abs(
          flightClearance(camera, pattern) -
            buildGridFrame(camera, pattern, MAX_VOXEL_DEPTH).clearance,
        ) < 1e-7,
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
      Math.abs(
        flightClearance(camera, pattern) -
          buildGridFrame(camera, pattern, MAX_VOXEL_DEPTH).clearance,
      ) < 1e-7,
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
    const offset = pattern === "menger" ? 0 : pattern === "vicsek" ? 0.7 : 0.8;
    const initial = initialFlightCamera();
    const one = 1n << BigInt(initial.bits);
    initial.position = [offset, offset, 3.2].map(
      (p) => (BigInt(Math.round(p * 1e9)) * one) / 1000000000n,
    );
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

test("deep flight accelerates smoothly out of the saved navigation scale", () => {
  const one = 1n << 600n,
    scale = 3n ** 150n;
  const before = {
    position: [one + (one * 2n) / scale, 0n, 0n],
    bits: 600,
    level: 150,
    viewLevel: 150,
    navigationLevel: 150,
    yaw: 0,
    pitch: 0,
  };
  const duration = 0.1;
  const after = moveFlightCamera(before, "menger", [0, 0, 0.75 * duration], duration);
  const delta = after.position[2] - before.position[2];
  const [m, e] = fixedToFloatExp(delta * scale, after.bits);
  const acceleration = FLIGHT_NAVIGATION_RATE * Math.log(3);
  const expected = (1.5 * Math.expm1(acceleration * duration)) / acceleration;
  assert.ok(Math.abs(m * 2 ** e + expected) < 1e-7);
  assert.ok(Math.abs(after.navigationLevel - (150 - FLIGHT_NAVIGATION_RATE * duration)) < 1e-10);
  assert.equal(after.viewLevel, 150, "a legacy manual scale does not freeze automatic movement");
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
      Math.abs(worldDelta(before, after)[2] + 2.2 - 2 * FLIGHT_WALL_MARGIN) < 1e-7,
      `${pattern}: did not reach the face`,
    );
  }
});

test("long flight integrates passage speed without crawling beside its wall", () => {
  let reference;
  for (const x of [0, 1 / 3 - 1e-6]) {
    const before = cameraAt([x, 0, 3.2]);
    let after = before;
    for (let frame = 0; frame < 240; frame++)
      after = moveFlightCamera(after, "menger", [0, 0, 0.75 / 30], 1 / 30);
    const travelled = worldDelta(before, after)[2];
    assert.ok(travelled < -4.2, "flight exits the whole passage");
    reference ??= travelled;
    assert.ok(Math.abs(travelled - reference) < 1e-7, "nearby parallel walls do not slow flight");
  }
});

test("view-bounded render grids skip only ancestors constant throughout visible space", () => {
  const one = 1n << 600n,
    scale = 3n ** 150n;
  for (const pattern of PATTERNS) {
    const camera = {
      position:
        pattern === "vicsek"
          ? [one + one / scale, 0n, 0n]
          : pattern.startsWith("mosely")
            ? [one + one / scale, 0n, one - one / scale]
            : [one - one / scale, one - one / scale, one + (one * 22n) / (10n * scale)],
      bits: 600,
      level: 150,
      viewLevel: 150,
      yaw: 0,
      pitch: 0,
    };
    const full = { ...buildGridFrame(camera, pattern, 162), pattern };
    const bounded = { ...buildGridFrame(camera, pattern, 162, 32), pattern };
    assert.ok(
      bounded.levels.length < full.levels.length,
      `${pattern}: invisible ancestor work retained`,
    );
    for (let sample = 0; sample < 100; sample++) {
      const point = [
        Math.sin(sample * 1.7) * 32,
        Math.cos(sample * 2.3) * 32,
        Math.sin(sample * 0.7) * 32,
      ];
      assert.equal(
        occupancy(bounded, point),
        occupancy(full, point),
        `${pattern}: culling changed visible geometry`,
      );
    }
  }
});

const passageCamera = (pattern, depth, viewLevel = 0) => {
  const parent = pattern === "menger" ? [2, 2, 2] : pattern === "vicsek" ? [1, 1, 2] : [1, 2, 2];
  const gap = pattern === "vicsek" || pattern === "mosely-heavy" ? [2, 2, 2] : [1, 1, 1];
  const one = 1n << 600n;
  return {
    ...initialFlightCamera(pattern),
    bits: 600,
    level: depth,
    viewLevel,
    navigationLevel: Math.max(depth, viewLevel),
    yaw: 0,
    pitch: 0,
    position: gap.map((digit, axis) => {
      let coordinate = -one + (BigInt(2 * digit + 1) * one) / 3n;
      for (let i = 1; i < depth; i++)
        coordinate = (coordinate + BigInt(2 * (parent[axis] - 1)) * one) / 3n;
      return coordinate;
    }),
  };
};

test("each smaller recursive passage slows flight by its physical scale", () => {
  for (const pattern of PATTERNS) {
    for (const depth of [1, 2, 4, 7]) {
      const before = passageCamera(pattern, depth);
      const after = moveFlightCamera(before, pattern, [0.03, 0, 0], 0.04);
      assert.ok(
        Math.abs(worldDelta(before, after)[0] * 3 ** depth - 0.06) < 1e-8,
        `${pattern}, ${depth}`,
      );
      assert.equal(after.viewLevel, before.viewLevel);
      const zoomed = passageCamera(pattern, depth, depth + 1);
      const moved = moveFlightCamera(zoomed, pattern, [0.03, 0, 0], 0.04);
      const acceleration = FLIGHT_NAVIGATION_RATE * Math.log(3);
      const expected = (4.5 * Math.log1p(Math.expm1(acceleration * 0.04) / 3)) / acceleration;
      assert.ok(Math.abs(worldDelta(zoomed, moved)[0] * 3 ** (depth + 1) - expected) < 1e-8);
      assert.ok(
        moved.navigationLevel < zoomed.navigationLevel,
        "surroundings release old zoom scale",
      );
    }
  }
});

test("passage speed integrates consistently across entry, exit and slow frames", () => {
  let reference;
  for (const rate of [4, 10, 30, 120]) {
    const before = cameraAt([0, 0, 3.2]);
    let after = before;
    for (let i = 0; i < rate * 6; i++)
      after = moveFlightCamera(after, "menger", [0, 0, 0.75 / rate], 1 / rate);
    const travelled = worldDelta(before, after)[2];
    reference ??= { travelled, navigationLevel: after.navigationLevel };
    assert.ok(travelled < -4.2, "flight crossed entrance and exit");
    assert.ok(Math.abs(travelled - reference.travelled) < 1e-7, `rate=${rate}`);
    assert.ok(Math.abs(after.navigationLevel - reference.navigationLevel) < 1e-10);
  }
});

test("surroundings change travel speed continuously at passage entrances and exits", () => {
  let camera = cameraAt([0, 0, 3.2]);
  const duration = 1 / 60;
  const maximumInwardRate = 3 / Math.log(3);
  let entered = false;
  let exited = false;
  for (let frame = 0; frame < 480; frame++) {
    const before = camera;
    camera = moveFlightCamera(camera, "menger", [0, 0, 0.75 * duration], duration);
    const change = camera.navigationLevel - before.navigationLevel;
    assert.ok(change <= maximumInwardRate * duration + 1e-9, `abrupt slowdown at frame ${frame}`);
    assert.ok(
      change >= -FLIGHT_NAVIGATION_RATE * duration - 1e-9,
      `abrupt acceleration at frame ${frame}`,
    );
    const one = 1n << BigInt(camera.bits);
    if (camera.position[2] < one) entered = true;
    if (camera.position[2] < -one) exited = true;
  }
  assert.ok(entered && exited);
  assert.ok(camera.navigationLevel < 0.25, "open surroundings gradually recover exterior speed");
});

test("elapsed time controls the scale ramp independently of Shift throttle", () => {
  const duration = 0.25;
  const acceleration = FLIGHT_NAVIGATION_RATE * Math.log(3);
  for (const boost of [1, 4]) {
    const before = { ...cameraAt([0, 0, 3.2]), navigationLevel: 4, viewLevel: 4 };
    const after = moveFlightCamera(before, "menger", [0.75 * boost * duration, 0, 0], duration);
    const endScale = 1 / (1 + (3 ** 4 - 1) * Math.exp(-acceleration * duration));
    assert.ok(Math.abs(after.navigationLevel + Math.log(endScale) / Math.log(3)) < 1e-12);
    const expected =
      (1.5 * boost * Math.log1p(3 ** -4 * Math.expm1(acceleration * duration))) / acceleration;
    assert.ok(Math.abs(worldDelta(before, after)[0] - expected) < 1e-9);
  }
});

test("automatic boundary approach follows the same smooth path at every frame rate", () => {
  for (const pattern of ["mosely-light", "mosely-heavy"]) {
    for (const rate of [4, 30, 120]) {
      let camera = {
        ...cameraAt([0, 0.8, 1.2]),
        navigationLevel: -Math.log(0.4) / Math.log(3),
      };
      const before = camera;
      for (let frame = 0; frame < rate * 2; frame++)
        camera = moveFlightCamera(camera, pattern, [0, 0, 0.75 / rate], 1 / rate);
      const [mantissa, exponent] = fixedToFloatExp(
        camera.position[2] - (1n << BigInt(camera.bits)),
        camera.bits,
      );
      const gap = mantissa * 2 ** exponent;
      assert.ok(Math.abs(gap - 0.2 * Math.exp(-6)) < 1e-9, `${pattern}, ${rate} fps`);
      assert.ok(Math.abs(camera.navigationLevel - before.navigationLevel - 6 / Math.log(3)) < 1e-9);
      assert.ok(camera.level > before.level);
    }
  }
});

test("directional approach has the same relative speed at deep recursive scales", () => {
  const one = 1n << 600n;
  for (const depth of [2, 10, 80, 150]) {
    const power = 3n ** BigInt(depth);
    const before = {
      ...cameraAt([0, 0.8, 1]),
      position: [0n, (4n * one) / 5n, one + (2n * one) / (5n * power)],
      level: depth,
      navigationLevel: depth - Math.log(0.8) / Math.log(3),
    };
    const after = moveFlightCamera(before, "mosely-heavy", [0, 0, 0.075], 0.1);
    const [mantissa, exponent] = fixedToFloatExp((after.position[2] - one) * power, after.bits);
    assert.ok(Math.abs(mantissa * 2 ** exponent - 0.4 * Math.exp(-0.3)) < 1e-8, `depth ${depth}`);
    assert.ok(Math.abs(after.navigationLevel - before.navigationLevel - 0.3 / Math.log(3)) < 1e-8);
  }
});

test("snowflake flight refines a tiny opening before entering it", () => {
  const one = 1n << 600n,
    scale = 3n ** 10n;
  for (const pattern of ["mosely-light", "mosely-heavy"]) {
    const before = {
      ...initialFlightCamera(pattern),
      bits: 600,
      level: 0,
      viewLevel: 0,
      navigationLevel: 0,
      yaw: 0,
      pitch: 0,
      position: [(2n * one) / scale, one - one / scale, (32n * one) / 10n],
    };
    const after = moveFlightCamera(before, pattern, [0, 0, 5]);
    assert.ok(after.position[2] > one, `${pattern}: crossed rendered front wall`);
    const retreat = moveFlightCamera(after, pattern, [0, 0, -0.1]);
    assert.ok(retreat.position[2] > after.position[2], "wall contact still permits retreat");
    let entering = after;
    for (let i = 0; i < 12 && entering.position[2] >= one; i++)
      entering = moveFlightCamera(entering, pattern, [0, 0, 5]);
    assert.ok(entering.position[2] < one, `${pattern}: fine opening remained closed`);
    assert.equal(entering.viewLevel, 0, "keyboard flight needs no wheel zoom");
    assert.ok(flightClearance(entering, pattern) > 0, "flight remains in the opening");
  }
});

test("snowflake flight keeps approaching a retained boundary beyond double precision", () => {
  for (const pattern of ["mosely-light", "mosely-heavy"]) {
    // x=0 remains the middle ternary child at every depth. The z=1 face
    // therefore stays retained while the camera reveals smaller subdivisions.
    let camera = cameraAt([0, 0.8, 3.2]);
    for (let step = 0; step < 28; step++) {
      const previous = camera;
      camera = moveFlightCamera(camera, pattern, [0, 0, 0.375], 0.5);
      const one = 1n << BigInt(camera.bits);
      const gap = camera.position[2] - one;
      const previousGap =
        (previous.position[2] - (1n << BigInt(previous.bits))) <<
        BigInt(camera.bits - previous.bits);
      assert.ok(gap > 0n, `${pattern}, step ${step}: crossed a retained wall`);
      assert.ok(gap < previousGap, `${pattern}, step ${step}: approach stopped refining`);
      assert.equal(camera.viewLevel, 0, "automatic detail leaves the selected scale unchanged");
      assert.ok(flightClearance(camera, pattern) > 0);
    }
    assert.ok(camera.level > 30, `${pattern}: fine detail stopped at level ${camera.level}`);
    const one = 1n << BigInt(camera.bits);
    assert.ok(camera.position[2] - one < one / 3n ** 30n);
    const retreat = moveFlightCamera(camera, pattern, [0, 0, -0.1]);
    assert.ok(worldDelta(camera, retreat)[2] > 0, "deep wall contact still permits retreat");
  }
});

test("diagonal boosted flight stops on the near side of a retained face", () => {
  for (const pattern of PATTERNS) {
    const target = pattern === "vicsek" ? [0, 0] : pattern === "menger" ? [0.8, 0.8] : [0, 0.8];
    const before = cameraAt([target[0] - 1 / 300, target[1] - 1 / 300, 1.1]);
    const after = moveFlightCamera(before, pattern, [0.1, 0.1, 3]);
    const one = 1n << BigInt(after.bits);
    assert.ok(after.position[2] > one, pattern);
  }
});

test("forward travel eases into a retained wall instead of snapping to contact", () => {
  const before = cameraAt([0, 0, 3.2]);
  let previousGap = 3.2;
  for (const amount of [1.1 - 1e-12, 1.1, 2]) {
    const after = moveFlightCamera(before, "vicsek", [0, 0, amount], 0.5);
    const gap = 2.2 + worldDelta(before, after)[2];
    assert.ok(
      gap > 2 * FLIGHT_WALL_MARGIN,
      "approach stays visibly away from the collision margin",
    );
    assert.ok(gap <= previousGap);
    previousGap = gap;
  }
});

test("restored subpixel cavities remain navigable without changing the selected scale", () => {
  for (const pattern of PATTERNS) {
    const hidden = passageCamera(pattern, 10);
    const restored = restoreFlightCamera(serializeFlightCamera(hidden), pattern);
    assert.equal(restored.viewLevel, 0);
    assert.ok(moveFlightCamera(restored, pattern, [0.03, 0, 0]).position[0] > restored.position[0]);
  }
});

test("wheel entry into fine snowflake holes first selects sufficient detail", () => {
  const { dollyFlightCamera, FLIGHT_COLLISION_DEPTH } = require("../utils/voxelZoom/camera.ts");
  const one = 1n << 600n,
    scale = 3n ** 10n;
  for (const pattern of ["mosely-light", "mosely-heavy"]) {
    let camera = {
      ...initialFlightCamera(pattern),
      bits: 600,
      level: 0,
      viewLevel: 0,
      navigationLevel: 0,
      yaw: 0,
      pitch: 0,
      position: [(2n * one) / scale, one - one / scale, (32n * one) / 10n],
    };
    for (let i = 0; i < 40 && camera.position[2] >= one; i++)
      camera = dollyFlightCamera(camera, pattern, 1);
    assert.ok(camera.position[2] < one, "zoom can enter a real opening");
    assert.ok(camera.viewLevel + FLIGHT_COLLISION_DEPTH >= 10);
    assert.ok(flightClearance(camera, pattern) > 0, "zoom stays outside retained solid");
  }
});

test("speed recovery eases near the surrounding scale without a final gear change", () => {
  let camera = { ...cameraAt([0, 0, 3.2]), navigationLevel: 1 };
  const dt = 1 / 60;
  let previousRate = Infinity;
  for (let frame = 0; frame < 360; frame++) {
    const before = camera;
    camera = moveFlightCamera(camera, "menger", [0.75 * dt, 0, 0], dt);
    const rate = (before.navigationLevel - camera.navigationLevel) / dt;
    assert.ok(rate > 0 && rate < FLIGHT_NAVIGATION_RATE);
    assert.ok(rate < previousRate, "recovery eases continuously toward cruising speed");
    previousRate = rate;
  }
  assert.ok(camera.navigationLevel < 0.02);
});

test("turning toward a nearby wall brakes safely without flashing the atmosphere", () => {
  const dt = 1 / 60;
  let camera = cameraAt([0.4, 0.4, 1.000001]);
  camera = moveFlightCamera(camera, "menger", [0.75 * dt, 0, 0], dt);
  const before = camera;
  camera = moveFlightCamera(camera, "menger", [0, 0, 0.75 * dt], dt);
  assert.ok(camera.navigationLevel > 11, "nearby wall still applies its safety speed");
  assert.ok(camera.position[2] > 1n << BigInt(camera.bits));
  assert.ok(
    3 ** (camera.atmosphereLevel - before.atmosphereLevel) < 1.01,
    "the fog volume must not copy the abrupt collision scale",
  );
  const retreat = moveFlightCamera(camera, "menger", [0, 0, -0.75 * dt], dt);
  assert.ok(
    retreat.navigationLevel >= camera.navigationLevel - FLIGHT_NAVIGATION_RATE * dt,
    "retreat keeps the actual travel speed, rather than jumping to the fog scale",
  );
  assert.ok(worldDelta(camera, retreat)[2] > 0);
  assert.equal(
    moveFlightCamera(camera, "menger", [0, 0, 0], dt),
    camera,
    "releasing movement freezes fog and camera",
  );
  assert.deepEqual(restoreFlightCamera(serializeFlightCamera(camera), "menger"), camera);
});

test("sustained boosted refinement keeps fog inside the numerical horizon", () => {
  let camera = cameraAt([0.8, 0.8, 1.1]);
  const dt = 1 / 60;
  for (let frame = 0; frame < 600; frame++) {
    camera = moveFlightCamera(camera, "menger", [0, 0, 3 * dt], dt);
    assert.ok(
      camera.navigationLevel - camera.atmosphereLevel < 8,
      "atmosphere must keep up with continuous boosted zoom",
    );
    assert.ok(
      96 * 3 ** (camera.level - camera.atmosphereLevel) < 1e29,
      "numerical clipping must not replace the fog fade",
    );
  }
  assert.ok(camera.level > 100, "boost still refines deeply");
  assert.deepEqual(restoreFlightCamera(serializeFlightCamera(camera), "menger"), camera);
});
