import { writeFileSync } from "node:fs";

async function check(page, baseURL, output) {
  const errors = [];
  page.on("pageerror", (error) => errors.push(String(error)));
  const assert = (condition, message) => {
    if (!condition) throw new Error(message);
  };
  const stage = () => page.locator("[data-fractal-stage]");
  const capture = () =>
    page.evaluate(async () => {
      const parts = {},
        pending = [];
      window.dispatchEvent(new CustomEvent("garden:capture-view", { detail: { parts, pending } }));
      await Promise.all(pending);
      return parts;
    });
  const reset = async () => {
    await stage().dblclick({ position: { x: 100, y: 200 } });
    await page.waitForFunction(() => !document.body.hasAttribute("data-fractal-zoom"));
    await page.waitForTimeout(100);
    assert((await stage().getAttribute("data-pattern-zoom")) === "1", "reset zoom");
  };
  const fullCanvas = async () => {
    await page.waitForFunction(() => {
      const rect = document.querySelector("[data-fractal-stage] canvas")?.getBoundingClientRect();
      return rect && rect.top === 0 && rect.bottom === innerHeight && rect.width === innerWidth;
    });
  };
  const inkAtEdges = () =>
    page.waitForFunction(() => {
      const source = document.querySelector("[data-fractal-stage] canvas");
      if (!source?.width || !source.height) return false;
      const strip = document.createElement("canvas");
      strip.width = source.width;
      strip.height = 2;
      const ctx = strip.getContext("2d");
      ctx.drawImage(source, 0, 0, source.width, 1, 0, 0, source.width, 1);
      ctx.drawImage(source, 0, source.height - 1, source.width, 1, 0, 1, source.width, 1);
      const pixels = ctx.getImageData(0, 0, source.width, 2).data;
      const hasInk = (row) => {
        for (let x = 0; x < source.width; x++) {
          const i = (row * source.width + x) * 4;
          if (pixels[i] > 70 && pixels[i + 1] > 70 && pixels[i + 2] > 70) return true;
        }
        return false;
      };
      return hasInk(0) && hasInk(1);
    });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${baseURL}/fractal-canopy`);
  await stage().waitFor();
  await reset();
  const openingRect = await stage().boundingBox();
  const opening = (await capture()).pattern;
  assert(openingRect.y > 0 && openingRect.y + openingRect.height < 900, "opening clears controls");
  await page.screenshot({ path: `${output}/canopy-opening-desktop.png` });
  const anchor = { x: 720, y: 300 };
  await page.mouse.move(anchor.x, anchor.y);
  await page.mouse.wheel(0, -900);
  await fullCanvas();
  await page.waitForTimeout(1000);
  await inkAtEdges();
  await page.waitForTimeout(150);
  const zoomed = (await capture()).pattern;
  const fullRect = await stage().boundingBox();
  const world = (view, rect, key) =>
    Number(view[key]) / 2 ** view.bits +
    (key === "x" ? anchor.x - rect.x - rect.width / 2 : anchor.y - rect.y - rect.height / 2) /
      (view.frame * Math.min(rect.width, rect.height) * view.zoom);
  for (const key of ["x", "y"])
    assert(
      Math.abs(world(opening, openingRect, key) - world(zoomed, fullRect, key)) < 1e-10,
      `cursor anchoring ${key}`,
    );
  await page.screenshot({ path: `${output}/canopy-zoom-desktop.png` });
  await page.mouse.move(700, 450);
  await page.mouse.down();
  await page.mouse.move(760, 420, { steps: 4 });
  await page.mouse.up();
  const panned = (await capture()).pattern;
  assert(panned.x !== zoomed.x && panned.y !== zoomed.y, "drag pans precise camera");
  // Exercise a genuine copied-link load, including both config and camera.
  const parts = await capture();
  const hash = Buffer.from(JSON.stringify({ version: 1, path: "/fractal-canopy", parts })).toString(
    "base64url",
  );
  const fresh = await page.context().newPage();
  await fresh.goto(`${baseURL}/fractal-canopy#view=${hash}`);
  await fresh.waitForFunction(
    () =>
      Number(document.querySelector("[data-fractal-stage]")?.getAttribute("data-pattern-zoom")) > 1,
  );
  await fresh.waitForTimeout(200);
  const restored = await fresh.evaluate(async () => {
    const parts = {},
      pending = [];
    window.dispatchEvent(new CustomEvent("garden:capture-view", { detail: { parts, pending } }));
    await Promise.all(pending);
    return parts.pattern;
  });
  // A restored view already refers to its full-screen frame, so expanding
  // chrome must not apply the takeover adjustment a second time.
  for (const key of ["x", "y", "zoom", "frame", "bits"])
    assert(restored[key] === panned[key], `shared camera ${key}`);
  await fresh.close();
  await reset();
  await page.getByRole("button", { name: "Fractal Studio Controls", exact: true }).click();
  for (const preset of [
    "Broccoli bloom",
    "Triangle tower",
    "Snowflake burst",
    "Sixfold lantern",
    "H-Tree",
    "Classic canopy",
  ]) {
    await page.getByRole("button", { name: /^Starting shape / }).click();
    await page.getByRole("option", { name: preset, exact: true }).click();
    assert((await stage().getAttribute("data-pattern-zoom")) === "1", `${preset} refits`);
  }
  await page.getByRole("button", { name: "Fractal Studio Controls", exact: true }).click();
  // Go past the old finite 64x cap.
  await page.mouse.move(720, 115);
  for (let i = 0; i < 5; i++) {
    await page.mouse.wheel(0, -900);
    await page.waitForTimeout(150);
  }
  assert(Number(await stage().getAttribute("data-pattern-zoom")) > 64, "beyond 64x");
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `${output}/canopy-deep-desktop.png` });
  await reset();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${output}/canopy-opening-phone.png` });
  await page.mouse.move(195, 350);
  await page.mouse.wheel(0, -900);
  await fullCanvas();
  await page.mouse.move(195, 430);
  await page.mouse.down();
  await page.mouse.move(195, 150, { steps: 4 });
  await page.mouse.up();
  await page.waitForTimeout(1000);
  await inkAtEdges();
  await page.screenshot({ path: `${output}/canopy-zoom-phone.png` });
  const beforePinch = Number(await stage().getAttribute("data-pattern-zoom"));
  const touch = await page.context().newCDPSession(page);
  await touch.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [
      { x: 155, y: 400, id: 1 },
      { x: 235, y: 400, id: 2 },
    ],
  });
  await touch.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [
      { x: 125, y: 400, id: 1 },
      { x: 265, y: 400, id: 2 },
    ],
  });
  await touch.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await touch.detach();
  assert(Number(await stage().getAttribute("data-pattern-zoom")) > beforePinch, "two-finger pinch");
  const beforeHide = (await capture()).pattern;
  await page.getByRole("button", { name: "Hide UI", exact: true }).click();
  await page.waitForTimeout(100);
  const afterHide = (await capture()).pattern;
  for (const key of ["x", "y", "frame", "zoom"])
    assert(beforeHide[key] === afterHide[key], `clean view ${key}`);
  await page.getByRole("button", { name: "Show UI", exact: true }).click();
  // Return all the way out using the wheel; whole-tree framing returns.
  await page.mouse.move(195, 350);
  await page.mouse.wheel(0, 10000);
  await page.waitForFunction(() => !document.body.hasAttribute("data-fractal-zoom"));
  assert((await stage().getAttribute("data-pattern-zoom")) === "1", "zoom-out resets");
  assert(errors.length === 0, errors.join("\n"));
  return {
    passed: [
      "opening bounds",
      "cursor anchoring",
      "full-screen zoom",
      "pan",
      "shared link",
      "six presets",
      "beyond 64x",
      "phone",
      "pinch",
      "ink at top/bottom",
      "clean view",
      "reset",
      "zoom out",
    ],
    errors,
  };
}

writeFileSync(
  process.argv[2] ?? "/private/tmp/check-canopy-zoom.js",
  `async(page)=>await (${check.toString()})(page,${JSON.stringify(process.argv[3] ?? "http://127.0.0.1:1111")},${JSON.stringify(process.argv[4] ?? "/private/tmp")})`,
);
