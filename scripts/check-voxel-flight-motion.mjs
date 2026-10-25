import { writeFileSync } from "node:fs";

// Generate a focused Playwright CLI payload for real input, elapsed-time motion,
// gradual scale adaptation, automatic approach detail, fog and saved views.
async function check(page, baseURL) {
  page.setDefaultTimeout(10_000);
  const visit = async (url) => {
    await page.goto("about:blank");
    await page.goto(url);
  };
  const enter = async () => {
    const button = page.getByRole("button", { name: "Explore inside", exact: true });
    if (await button.count()) await button.click();
    await page.getByLabel("Explore the fractal interior", { exact: true }).waitFor();
  };
  await page.setViewportSize({ width: 1000, height: 700 });
  await page.addInitScript(() => {
    window.__flightMotion = [];
    window.__flightKeys = new Set();
    window.__flightDelay = 0;
    window.addEventListener("keydown", (event) => window.__flightKeys.add(event.code), true);
    window.addEventListener("keyup", (event) => window.__flightKeys.delete(event.code), true);
    const raf = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = (callback) =>
      raf((time) => {
        window.__flightTime = time;
        callback(time);
      });
    const get = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (...args) {
      const gl = get.apply(this, args);
      if (
        args[0] !== "webgl" ||
        this.getAttribute("aria-label") !== "Explore the fractal interior" ||
        !gl ||
        gl.__motionCheck
      )
        return gl;
      gl.__motionCheck = true;
      const names = new Map(),
        values = {};
      const location = gl.getUniformLocation.bind(gl),
        uniform = gl.uniform1f.bind(gl),
        draw = gl.drawArrays.bind(gl);
      gl.getUniformLocation = (program, name) => {
        const result = location(program, name);
        names.set(result, name);
        return result;
      };
      gl.uniform1f = (at, value) => {
        values[names.get(at)] = value;
        return uniform(at, value);
      };
      gl.drawArrays = (...params) => {
        const parts = {};
        window.dispatchEvent(
          new CustomEvent("garden:capture-view", { detail: { parts, pending: [] } }),
        );
        window.__flightMotion.push({
          ...values,
          camera: parts.voxelCamera,
          time: window.__flightTime,
          pixels: gl.canvas.width * gl.canvas.height,
          moving: window.__flightKeys.has("KeyD"),
          boosted: window.__flightKeys.has("ShiftLeft"),
        });
        const result = draw(...params);
        // Bounded, deliberate slow frames expose discarded elapsed time. No
        // persistent throttling or changes to the user's browser are made.
        const until = performance.now() + window.__flightDelay;
        while (performance.now() < until) {
          /* emulate an expensive frame */
        }
        return result;
      };
      return gl;
    };
  });
  const assert = (ok, message) => {
    if (!ok) throw Error(message);
  };
  const capture = () =>
    page.evaluate(() => {
      const parts = {};
      window.dispatchEvent(
        new CustomEvent("garden:capture-view", { detail: { parts, pending: [] } }),
      );
      return parts;
    });
  const position = (point) =>
    point.map((p) => ((BigInt(Math.round(p * 1e9)) * (1n << 600n)) / 1000000000n).toString(16));
  const navigationLevel = (camera) => camera.navigationLevel ?? camera.viewLevel ?? camera.level;
  const coordinate = (camera, axis, bits = camera.bits) => {
    const p = camera.position[axis];
    const value = p.startsWith("-") ? -BigInt("0x" + p.slice(1)) : BigInt("0x" + p);
    return value << BigInt(bits - camera.bits);
  };
  const localDelta = (before, after, level) => {
    const bits = Math.max(before.bits, after.bits);
    return after.position.map(
      (_, axis) =>
        ((Number(coordinate(after, axis, bits) - coordinate(before, axis, bits)) / 2 ** bits) *
          3 ** level) /
        2,
    );
  };
  const assertFog = (frame, name) => {
    const units =
      3 ** (frame.camera.level - (frame.camera.atmosphereLevel ?? navigationLevel(frame.camera)));
    assert(
      Math.abs(frame.u_fogDistanceScale * units - 1 / 96) < 1e-10,
      `${name}: fog does not follow the damped atmosphere scale`,
    );
    assert(Math.abs(frame.u_farDistance / units - 96) < 1e-7, `${name}: incorrect fog horizon`);
    assert(frame.u_fogDensity === 4, `${name}: incorrect fog density`);
  };
  const assertIdle = async (name) => {
    await page.waitForTimeout(150);
    const draws = await page.evaluate(() => window.__flightMotion.length);
    const before = await capture();
    await page.waitForTimeout(150);
    const after = await capture();
    assert(
      draws === (await page.evaluate(() => window.__flightMotion.length)),
      `${name}: idle redraw`,
    );
    assert(
      JSON.stringify(before.voxelCamera) === JSON.stringify(after.voxelCamera),
      `${name}: camera or navigation scale drifted after release`,
    );
  };
  const results = [];
  for (const [route, deep, slow, boost, passage = 0] of [
    ["menger-sponge", false, false, false],
    ["mosely-snowflake", false, false, false],
    ["vicsek-fractal-3d", false, false, false],
    ["menger-sponge", false, true, false],
    ["menger-sponge", false, false, true],
    ["menger-sponge", true, false, false],
    ["mosely-snowflake", false, false, false, 1],
    ["mosely-snowflake", false, true, false, 2],
    ["mosely-snowflake", false, 650, false],
  ]) {
    await visit(`${baseURL}/${route}`);
    await enter();
    await page.waitForFunction(() => window.__flightMotion.length > 0);
    const parts = await capture();
    const one = 1n << 600n,
      scale = 3n ** 150n;
    parts.config.iterations = 0;
    parts.config.animateIterations = false;
    parts.config.autoRotate = false;
    parts.voxelCamera = {
      kind: "voxel-flight",
      bits: 600,
      level: deep ? 150 : 0,
      viewLevel: deep ? 150 : 0,
      navigationLevel: deep ? 150 : passage,
      yaw: 0,
      pitch: 0,
      position: deep
        ? [one - one / scale, one - one / scale, one + (22n * one) / (10n * scale)].map((p) =>
            p.toString(16),
          )
        : passage
          ? position([0, 1 - 3 ** (1 - passage), 1 - 3 ** (1 - passage)])
          : position([0.4, 0.4, 1.000001]),
    };
    const hash = await page.evaluate(
      ({ route, parts }) =>
        "#view=" +
        btoa(JSON.stringify({ version: 1, path: `/${route}`, parts }))
          .replaceAll("+", "-")
          .replaceAll("/", "_")
          .replaceAll("=", ""),
      { route, parts },
    );
    await visit(`${baseURL}/${route}${hash}`);
    await page.waitForFunction(() => window.__flightMotion.length > 0);
    const canvas = page.getByLabel("Explore the fractal interior", { exact: true });
    const name = passage
      ? `snowflake-passage-${passage}`
      : deep
        ? "deep"
        : slow
          ? `slow-frames-${slow}`
          : boost
            ? "boost"
            : route;
    await canvas.screenshot({ path: `/private/tmp/stable-flight-${name}-before.png` });
    await canvas.focus();
    await page.evaluate(
      (delay) => {
        window.__flightMotion = [];
        window.__flightDelay = delay;
      },
      typeof slow === "number" ? slow : slow ? 140 : 0,
    );
    if (boost) await page.keyboard.down("Shift");
    await page.keyboard.down("d");
    await page.waitForTimeout(typeof slow === "number" ? 2800 : passage ? 450 : slow ? 1100 : 900);
    await page.keyboard.up("d");
    if (boost) await page.keyboard.up("Shift");
    await page.evaluate(() => {
      window.__flightDelay = 0;
    });
    const frames = await page.evaluate(() => window.__flightMotion.filter((f) => f.moving));
    assert(frames.length >= 3, `${name}: insufficient movement samples`);
    let maxSpeedError = 0,
      maxLocalSpeedRatio = 0;
    for (let i = 1; i < frames.length; i++) {
      const before = frames[i - 1],
        after = frames[i];
      const dt = (after.time - before.time) / 1000;
      const beforeLevel = navigationLevel(before.camera),
        afterLevel = navigationLevel(after.camera),
        throttle = boost ? 3 : 0.75;
      const speed = Math.hypot(...localDelta(before.camera, after.camera, afterLevel)) / dt;
      const endpointRatio = 3 ** (afterLevel - beforeLevel);
      const low = throttle * Math.min(1, endpointRatio),
        high = throttle * Math.max(1, endpointRatio);
      // Exact integration of a continuous speed stays between its endpoint
      // speeds. This also permits reaching the surrounding scale mid-frame.
      assert(
        speed >= low - 1e-6 && speed <= high + 1e-6,
        `${name}: displacement disagrees with continuous navigation speed (${speed}, ${low}–${high})`,
      );
      assert(
        beforeLevel - afterLevel <= 0.75 * dt + 1e-6,
        `${name}: outward navigation scale accelerated abruptly`,
      );
      maxLocalSpeedRatio = Math.max(maxLocalSpeedRatio, speed / throttle);
      if (!deep && !passage) maxSpeedError = Math.max(maxSpeedError, Math.abs(speed - throttle));
      assert(
        after.camera.viewLevel === parts.voxelCamera.viewLevel,
        `${name}: keyboard input unexpectedly changed the saved wheel value`,
      );
      assertFog(after, name);
    }
    if (slow)
      assert(
        frames.at(-1).pixels < frames[0].pixels * 0.6,
        `${name}: render workload did not adapt to slow frames`,
      );
    assert(
      maxSpeedError < 1e-5,
      `${name}: speed changed within a uniform passage, error ${maxSpeedError}`,
    );
    if (deep) {
      const first = frames[0],
        second = frames[1];
      const dt = Math.min(0.5, (second.time - first.time) / 1000);
      const speed =
        Math.hypot(...localDelta(first.camera, second.camera, navigationLevel(first.camera))) / dt;
      assert(
        navigationLevel(first.camera) >= 150 - 0.75 * 0.5 &&
          speed >= 0.75 - 1e-6 &&
          speed <= 0.75 * 3 ** (0.75 * dt) + 1e-6,
        `${name}: first motion lost the saved local scale`,
      );
      assert(
        navigationLevel(frames.at(-1).camera) < navigationLevel(first.camera),
        `${name}: scale did not gradually adapt to open surroundings`,
      );
    }
    await assertIdle(name);
    await canvas.screenshot({ path: `/private/tmp/stable-flight-${name}-after.png` });
    results.push({
      name,
      samples: frames.length,
      expectedLocalSpeed: boost ? 3 : 0.75,
      maxSpeedError,
      maxLocalSpeedRatio,
      renderLevels: [...new Set(frames.map((f) => f.camera.level))],
      navigationStart: navigationLevel(frames[0].camera),
      navigationEnd: navigationLevel(frames.at(-1).camera),
      idleRedraws: 0,
    });
  }
  // Held movement alone keeps revealing smaller geometry at a retained face.
  // x=0 is a retained middle child at every depth for both snowflake variants.
  for (const variant of ["lighter", "heavier"]) {
    const parts = await capture();
    const one = 1n << 600n;
    parts.config.variant = variant;
    parts.voxelCamera = {
      kind: "voxel-flight",
      bits: 600,
      level: 0,
      viewLevel: 0,
      navigationLevel: 8,
      yaw: 0,
      pitch: 0,
      position: [0n, (4n * one) / 5n, one + one / 10000n].map((p) => p.toString(16)),
    };
    const hash = await page.evaluate(
      (parts) =>
        "#view=" +
        btoa(
          JSON.stringify({
            version: 1,
            path: "/mosely-snowflake",
            parts,
          }),
        )
          .replaceAll("+", "-")
          .replaceAll("/", "_")
          .replaceAll("=", ""),
      parts,
    );
    await visit(`${baseURL}/mosely-snowflake${hash}`);
    await page.waitForFunction(() => window.__flightMotion.length > 0);
    const canvas = page.getByLabel("Explore the fractal interior", { exact: true });
    await canvas.focus();
    const start = (await capture()).voxelCamera;
    const firstDraw = await page.evaluate(() => window.__flightMotion.length);
    await page.keyboard.down("w");
    await page.waitForTimeout(400);
    const middle = (await capture()).voxelCamera;
    await page.waitForTimeout(400);
    await page.keyboard.up("w");
    const end = (await capture()).voxelCamera;
    const approach = await page.evaluate((index) => window.__flightMotion.slice(index), firstDraw);
    assert(approach.length >= 4, `${variant}: insufficient approach samples`);
    for (const frame of approach) {
      assert(
        coordinate(frame.camera, 2) > 1n << BigInt(frame.camera.bits),
        `${variant}: crossed a retained fractal face`,
      );
      assertFog(frame, variant);
    }
    const gap = (camera) => coordinate(camera, 2, 600) - one;
    assert(
      gap(end) > 0n && gap(end) < gap(middle) && gap(middle) < gap(start),
      `${variant}: approach stalled`,
    );
    assert(
      navigationLevel(middle) > navigationLevel(start) + 0.1 &&
        navigationLevel(end) > navigationLevel(middle) + 0.1,
      `${variant}: held movement did not automatically zoom toward the boundary`,
    );
    assert(
      end.level > start.level && end.level >= middle.level,
      `${variant}: approach did not reveal finer subdivisions`,
    );
    assert(end.viewLevel === 0, `${variant}: approach required wheel zoom`);
    await assertIdle(`${variant}-approach`);
    await page.keyboard.down("s");
    await page.waitForTimeout(100);
    await page.keyboard.up("s");
    const retreat = (await capture()).voxelCamera;
    assert(gap(retreat) > gap(end), `${variant}: could not retreat`);
    await assertIdle(`${variant}-retreat`);
    results.push({
      name: `${variant}-automatic-approach`,
      stayedOutside: true,
      renderLevels: [start.level, middle.level, end.level],
      navigationLevels: [start, middle, end].map(navigationLevel),
      idleRedraws: 0,
      retreat: true,
    });
  }
  // Turning into a close wall changes safety speed, not the whole fog volume.
  await visit(`${baseURL}/menger-sponge`);
  await enter();
  const turnParts = await capture();
  turnParts.voxelCamera = {
    kind: "voxel-flight",
    bits: 600,
    level: 0,
    viewLevel: 0,
    navigationLevel: 0,
    yaw: 0,
    pitch: 0,
    position: position([0.4, 0.4, 1.000001]),
  };
  const turnHash = Buffer.from(
    JSON.stringify({ version: 1, path: "/menger-sponge", parts: turnParts }),
  ).toString("base64url");
  await visit(`${baseURL}/menger-sponge#view=${turnHash}`);
  await page.getByLabel("Explore the fractal interior", { exact: true }).focus();
  await page.evaluate(() => {
    window.__flightMotion = [];
  });
  await page.keyboard.down("w");
  await page.waitForTimeout(200);
  await page.keyboard.up("w");
  const turnFrames = await page.evaluate(() => window.__flightMotion);
  assert(turnFrames.length > 0, "close-wall turn did not render");
  for (const frame of turnFrames) {
    assertFog(frame, "close-wall turn");
    assert(navigationLevel(frame.camera) > 10, "close-wall safety speed was lost");
    assert(
      frame.camera.atmosphereLevel < navigationLevel(frame.camera) - 5,
      "fog flashed to the collision scale",
    );
    assert(coordinate(frame.camera, 2) > 1n << BigInt(frame.camera.bits), "turn crossed the wall");
  }
  await assertIdle("close-wall turn");
  results.push({
    name: "close-wall turn",
    samples: turnFrames.length,
    navigationLevel: navigationLevel(turnFrames.at(-1).camera),
    atmosphereLevel: turnFrames.at(-1).camera.atmosphereLevel,
    stayedOutside: true,
  });
  // Wheel remains an optional dolly; copied views retain the current scale.
  await visit(`${baseURL}/menger-sponge`);
  await enter();
  const canvas = page.getByLabel("Explore the fractal interior", { exact: true });
  await canvas.hover();
  await page.mouse.wheel(0, -20);
  await page.waitForFunction(() => {
    const camera = window.__flightMotion.at(-1)?.camera;
    return camera && (camera.navigationLevel ?? camera.viewLevel) > 0;
  });
  const zoomed = await capture();
  const hash = await page.evaluate(
    (parts) =>
      "#view=" +
      btoa(JSON.stringify({ version: 1, path: "/menger-sponge", parts }))
        .replaceAll("+", "-")
        .replaceAll("/", "_")
        .replaceAll("=", ""),
    zoomed,
  );
  await visit(`${baseURL}/menger-sponge${hash}`);
  await page.waitForFunction(() => window.__flightMotion.length > 0);
  const restored = await capture();
  assert(
    navigationLevel(restored.voxelCamera) === navigationLevel(zoomed.voxelCamera),
    "Saved view lost its continuous navigation scale",
  );
  assert(
    restored.voxelCamera.atmosphereLevel === zoomed.voxelCamera.atmosphereLevel &&
      restored.voxelCamera.atmosphereVelocity === zoomed.voxelCamera.atmosphereVelocity,
    "Saved view lost its damped atmosphere state",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await canvas.screenshot({ path: "/private/tmp/stable-flight-phone.png" });
  return {
    passed: true,
    results,
    wheelZoomScale: navigationLevel(zoomed.voxelCamera),
    sharedScaleRestored: true,
  };
}
writeFileSync(
  process.argv[2] ?? "/private/tmp/check-voxel-flight-motion.js",
  `async(page)=>await (${check.toString()})(page,${JSON.stringify(process.argv[3] ?? "http://127.0.0.1:1111")})`,
);
