import { writeFileSync } from "node:fs";

// Generate a focused Playwright CLI payload for real input, elapsed-time motion,
// physical fog stability, explicit zoom and saved exploration scale.
async function check(page, baseURL) {
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
  ]) {
    await page.goto(`${baseURL}/${route}`);
    await page.getByRole("button", { name: "Explore inside", exact: true }).click();
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
    await page.goto(`${baseURL}/${route}${hash}`);
    await page.waitForFunction(() => window.__flightMotion.length > 0);
    const canvas = page.getByLabel("Explore the fractal interior", { exact: true });
    const name = passage
      ? `snowflake-passage-${passage}`
      : deep
        ? "deep"
        : slow
          ? "slow-frames"
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
      slow ? 140 : 0,
    );
    if (boost) await page.keyboard.down("Shift");
    await page.keyboard.down("d");
    await page.waitForTimeout(passage ? 450 : slow ? 1100 : 900);
    await page.keyboard.up("d");
    if (boost) await page.keyboard.up("Shift");
    await page.evaluate(() => {
      window.__flightDelay = 0;
    });
    const frames = await page.evaluate(() => window.__flightMotion.filter((f) => f.moving));
    assert(frames.length >= 3, `${name}: insufficient movement samples`);
    let maxSpeedError = 0;
    for (let i = 1; i < frames.length; i++) {
      const before = frames[i - 1],
        after = frames[i];
      const bits = Math.max(before.camera.bits, after.camera.bits);
      const coordinate = (p, sourceBits) => {
        const value = p.startsWith("-") ? -BigInt("0x" + p.slice(1)) : BigInt("0x" + p);
        return value << BigInt(bits - sourceBits);
      };
      const delta = after.camera.position.map(
        (p, axis) =>
          ((Number(
            coordinate(p, after.camera.bits) -
              coordinate(before.camera.position[axis], before.camera.bits),
          ) /
            2 ** bits) *
            3 ** after.camera.viewLevel) /
          2,
      );
      const speed = Math.hypot(...delta) / ((after.time - before.time) / 1000);
      maxSpeedError = Math.max(maxSpeedError, Math.abs(speed - (boost ? 3 : 0.75) / 3 ** passage));
      assert(
        after.camera.viewLevel === parts.voxelCamera.viewLevel,
        `${name}: flight changed exploration scale`,
      );
      const units = 3 ** (after.camera.level - after.camera.viewLevel);
      assert(
        Math.abs(after.u_fogDistanceScale * units - 1 / 32) < 1e-10,
        `${name}: physical fog morphed`,
      );
      assert(Math.abs(after.u_farDistance / units - 32) < 1e-8, `${name}: horizon moved`);
    }
    assert(maxSpeedError < 1e-5, `${name}: nonconstant speed, error ${maxSpeedError}`);
    await page.waitForTimeout(200);
    const stopped = await page.evaluate(() => window.__flightMotion.length);
    await page.waitForTimeout(200);
    assert(
      stopped === (await page.evaluate(() => window.__flightMotion.length)),
      `${name}: atmosphere still morphs after release`,
    );
    await canvas.screenshot({ path: `/private/tmp/stable-flight-${name}-after.png` });
    results.push({
      name,
      samples: frames.length,
      expectedSpeed: (boost ? 3 : 0.75) / 3 ** passage,
      maxSpeedError,
      renderLevels: [...new Set(frames.map((f) => f.camera.level))],
      explorationScale: parts.voxelCamera.viewLevel,
      idleRedraws: 0,
    });
  }
  // A hidden subpixel passage must behave as a wall under real held input.
  for (const variant of ["lighter", "heavier"]) {
    const parts = await capture();
    const one = 1n << 600n,
      scale = 3n ** 10n;
    parts.config.variant = variant;
    parts.voxelCamera = {
      kind: "voxel-flight",
      bits: 600,
      level: 0,
      viewLevel: 0,
      yaw: 0,
      pitch: 0,
      position: [(2n * one) / scale, one - one / scale, one + one / 10000n].map((p) =>
        p.toString(16),
      ),
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
    await page.goto(`${baseURL}/mosely-snowflake${hash}`);
    await page.waitForFunction(() => window.__flightMotion.length > 0);
    const canvas = page.getByLabel("Explore the fractal interior", { exact: true });
    await canvas.focus();
    await page.keyboard.down("w");
    await page.waitForTimeout(250);
    const stopped = await capture();
    const draws = await page.evaluate(() => window.__flightMotion.length);
    await page.waitForTimeout(250);
    await page.keyboard.up("w");
    const z = BigInt("0x" + stopped.voxelCamera.position[2]);
    assert(z > one, `${variant}: entered visible front wall`);
    assert(
      draws === (await page.evaluate(() => window.__flightMotion.length)),
      `${variant}: blocked flight redrew`,
    );
    await page.keyboard.down("s");
    await page.waitForTimeout(100);
    await page.keyboard.up("s");
    const retreat = await capture();
    assert(BigInt("0x" + retreat.voxelCamera.position[2]) > z, `${variant}: could not retreat`);
    results.push({
      name: `${variant}-wall`,
      stoppedOutside: true,
      blockedRedraws: 0,
      retreat: true,
    });
  }
  // Wheel zoom selects the scale explicitly; a copied view must retain it.
  await page.goto(`${baseURL}/menger-sponge`);
  await page.getByRole("button", { name: "Explore inside", exact: true }).click();
  const canvas = page.getByLabel("Explore the fractal interior", { exact: true });
  await canvas.hover();
  await page.mouse.wheel(0, -20);
  await page.waitForFunction(() => window.__flightMotion.at(-1)?.camera.viewLevel > 0);
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
  await page.goto(`${baseURL}/menger-sponge${hash}`);
  await page.waitForFunction(() => window.__flightMotion.length > 0);
  const restored = await capture();
  assert(
    restored.voxelCamera.viewLevel === zoomed.voxelCamera.viewLevel,
    "Saved view lost exploration scale",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await canvas.screenshot({ path: "/private/tmp/stable-flight-phone.png" });
  return {
    passed: true,
    results,
    wheelZoomScale: zoomed.voxelCamera.viewLevel,
    sharedScaleRestored: true,
  };
}
writeFileSync(
  process.argv[2] ?? "/private/tmp/check-voxel-flight-motion.js",
  `async(page)=>await (${check.toString()})(page,${JSON.stringify(process.argv[3] ?? "http://127.0.0.1:1111")})`,
);
