import { writeFileSync } from "node:fs";

async function check(page, baseURL, captures, filter) {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.addInitScript(() => {
    window.__spatialWorkers = [];
    const Original = window.Worker;
    window.Worker = class extends Original {
      constructor(url, options) {
        super(url, options);
        window.__spatialWorkers.push(String(url));
      }
    };
  });
  const cases = [
    ["jerusalem-cube", "default"],
    ["quadratic-koch-3d", "default"],
    ["koch-surface", "triangle"],
    ["koch-surface", "tetrahedron"],
    ["sierpinski-tetrahedron", "tetrahedron"],
    ["sierpinski-tetrahedron", "squarePyramid"],
    ["polyhedron-flake", "octahedron"],
    ["polyhedron-flake", "dodecahedron"],
    ["polyhedron-flake", "icosahedron"],
    ["romanesco", "default"],
  ].filter(([path]) => !filter || new RegExp(filter).test(path));
  const errors = [],
    results = [];
  const capture = async () =>
    page.evaluate(async () => {
      const parts = {},
        pending = [];
      window.dispatchEvent(new CustomEvent("garden:capture-view", { detail: { parts, pending } }));
      await Promise.all(pending);
      return parts;
    });
  const opening = async (path, variant) => {
    const hash =
      "#view=" +
      Buffer.from(
        JSON.stringify({
          version: 1,
          path: "/" + path,
          parts: { config: { variant, autoRotate: false } },
        }),
      ).toString("base64url");
    await page.goto(baseURL + "/" + path + hash);
    await page.waitForFunction(
      () => document.querySelector("[data-gpu-spatial-explorer]")?.dataset.renderZoom !== undefined,
    );
    await page.waitForTimeout(100);
  };
  for (const [path, variant] of cases) {
    await opening(path, variant);
    const parts = await capture();
    const status = await page.evaluate(() => {
      const canvas = document.querySelector("[data-gpu-spatial-explorer]"),
        gl = canvas.getContext("webgl2");
      const costs = [];
      for (let i = 0; i < 4; i++) {
        const start = performance.now();
        window.dispatchEvent(new Event("garden:before-export"));
        gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
        costs.push(performance.now() - start);
      }
      return {
        size: [canvas.width, canvas.height],
        costs,
        error: gl.getError(),
        alerts: [...document.querySelectorAll('[role="alert"]')]
          .map((e) => e.textContent)
          .filter(Boolean),
        workers: window.__spatialWorkers,
      };
    });
    if (
      (variant !== "default" && parts.config.variant !== variant) ||
      status.error ||
      status.alerts.length
    )
      errors.push({ path, variant, status, parts });
    if (captures) await page.screenshot({ path: `${captures}/${path}-${variant}.png` });
    results.push({ path, variant, ...status });
  }
  const motion = [];
  const flightPaths = ["jerusalem-cube", "quadratic-koch-3d", "romanesco"].filter(
    (path) => !filter || new RegExp(filter).test(path),
  );
  for (const path of flightPaths) {
    await opening(path, "default");
    const canvas = page.locator("[data-gpu-spatial-explorer]");
    await canvas.click();
    await page.waitForFunction(() => document.pointerLockElement !== null);
    // The pointerlockchange handler clears held keys; let that event finish.
    await page.waitForTimeout(100);
    const before = await capture();
    await page.keyboard.down("w");
    await page.waitForTimeout(1800);
    await page.keyboard.up("w");
    const after = await capture();
    const state = await canvas.evaluate((c) => ({ ...c.dataset, size: [c.width, c.height] }));
    if (JSON.stringify(before.spatialZoom) === JSON.stringify(after.spatialZoom))
      errors.push({ path, stopped: true });
    await page.keyboard.press("Escape");
    await page.waitForFunction(() => document.pointerLockElement === null);
    await page.waitForTimeout(300);
    const settled = await canvas.evaluate((c) => {
      const rect = c.getBoundingClientRect(),
        ratio = devicePixelRatio;
      return {
        actual: [c.width, c.height],
        expected: [Math.round(rect.width * ratio), Math.round(rect.height * ratio)],
      };
    });
    if (JSON.stringify(settled.actual) !== JSON.stringify(settled.expected))
      errors.push({ path, settled });
    if (captures) await page.screenshot({ path: `${captures}/${path}-flight.png` });
    // The saved view restores the same fixed-point eye after remount.
    const hash =
      "#view=" +
      Buffer.from(JSON.stringify({ version: 1, path: "/" + path, parts: after })).toString(
        "base64url",
      );
    await page.goto(baseURL + "/" + path + hash);
    await page.waitForFunction(
      () => document.querySelector("[data-gpu-spatial-explorer]")?.dataset.renderZoom !== undefined,
    );
    const restored = await capture();
    if (JSON.stringify(after.spatialZoom) !== JSON.stringify(restored.spatialZoom))
      errors.push({ path, restore: { after, restored } });
    // Context loss releases input; restoration redraws with rebuilt resources.
    await page.locator("[data-gpu-spatial-explorer]").click();
    await page.evaluate(() => {
      const canvas = document.querySelector("[data-gpu-spatial-explorer]"),
        gl = canvas.getContext("webgl2");
      const ext = gl.getExtension("WEBGL_lose_context");
      window.__gpuRestore = ext;
      ext.loseContext();
    });
    await page.waitForFunction(() => document.pointerLockElement === null);
    await page.evaluate(() => window.__gpuRestore.restoreContext());
    await page.waitForFunction(
      () =>
        !document.querySelector("[data-gpu-spatial-explorer]").getContext("webgl2").isContextLost(),
    );
    await page.waitForTimeout(200);
    const error = await page
      .locator("[data-gpu-spatial-explorer]")
      .evaluate((c) => c.getContext("webgl2").getError());
    if (error) errors.push({ path, contextError: error });
    motion.push({ path, before: before.spatialZoom, after: after.spatialZoom, state, settled });
  }
  const phoneContext = await page
    .context()
    .browser()
    .newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });
  const phone = [];
  try {
    const mobile = await phoneContext.newPage();
    const touch = await phoneContext.newCDPSession(mobile);
    for (const path of flightPaths) {
      await mobile.goto(baseURL + "/" + path);
      await mobile.waitForFunction(
        () =>
          document.querySelector("[data-gpu-spatial-explorer]")?.dataset.renderZoom !== undefined,
      );
      const canvas = mobile.locator("[data-gpu-spatial-explorer]");
      const captureCamera = () =>
        mobile.evaluate(async () => {
          const parts = {},
            pending = [];
          window.dispatchEvent(
            new CustomEvent("garden:capture-view", { detail: { parts, pending } }),
          );
          await Promise.all(pending);
          return parts.spatialZoom;
        });
      const before = await captureCamera();
      const box = await mobile
        .getByRole("button", { name: "Move stick", exact: true })
        .boundingBox();
      if (!box) throw Error("Missing phone flight stick");
      await touch.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [
          {
            x: box.x + box.width / 2,
            y: box.y + box.height / 2 - box.width * 0.25,
          },
        ],
      });
      await mobile.waitForTimeout(600);
      await touch.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      const after = await captureCamera();
      if (JSON.stringify(before) === JSON.stringify(after))
        errors.push({ path, phoneStopped: true });
      const status = await canvas.evaluate((c) => ({
        size: [c.width, c.height],
        error: c.getContext("webgl2").getError(),
        overflow: document.documentElement.scrollWidth > window.innerWidth,
      }));
      if (status.error || status.overflow) errors.push({ path, phone: status });
      if (captures) {
        await mobile.screenshot({ path: `${captures}/${path}-phone.png` });
        const downloaded = mobile.waitForEvent("download");
        await mobile.getByRole("button", { name: "Save image", exact: true }).click();
        const download = await downloaded;
        await download.saveAs(`${captures}/${path}-export.png`);
        if (await download.failure()) errors.push({ path, exportFailed: await download.failure() });
      }
      phone.push({ path, before, after, ...status });
    }
  } finally {
    await phoneContext.close();
  }
  return { passed: errors.length === 0, results, motion, phone, errors };
}
writeFileSync(
  process.argv[2] ?? "/private/tmp/check-spatial-flight-ui.js",
  `async(page)=>await (${check.toString()})(page,${JSON.stringify(process.argv[3] ?? "http://127.0.0.1:55379")},${JSON.stringify(process.argv[4] ?? null)},${JSON.stringify(process.env.SPATIAL_UI_FILTER ?? null)})`,
);
