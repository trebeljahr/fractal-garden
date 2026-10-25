import { writeFileSync } from "node:fs";

// Generate a payload for an isolated Playwright CLI session against a local preview.
async function check(page, baseURL, output) {
  const errors = [];
  page.on("pageerror", (error) => errors.push(String(error)));
  const assert = (ok, message) => {
    if (!ok) throw new Error(message);
  };
  const capture = () =>
    page.evaluate(async () => {
      const parts = {},
        pending = [];
      window.dispatchEvent(new CustomEvent("garden:capture-view", { detail: { parts, pending } }));
      await Promise.all(pending);
      return parts;
    });
  const bounds = () => page.locator("[data-fractal-viewport] canvas").first().boundingBox();
  const results = [];
  for (const [route, key] of [
    ["h-tree", "canvasViewport"],
    ["l-system/dragon-curve", "curve"],
    ["quadratic-koch-3d", "spatialZoom"],
  ]) {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${baseURL}/${route}`);
    await page.locator("[data-fractal-viewport] canvas").first().waitFor();
    await page.waitForTimeout(1500);
    const before = await bounds();
    assert(
      before.x === 0 && before.width === 1440 && before.y + before.height === 900,
      `${route}: surface must reach screen edges`,
    );
    const opening = (await capture())[key];
    await page.mouse.move(720, 430);
    await page.mouse.wheel(0, -700);
    if (key === "spatialZoom") {
      for (let i = 0; i < 6; i++) {
        await page.mouse.wheel(0, -700);
        await page.waitForTimeout(120);
      }
    }
    await page.waitForTimeout(800);
    const zoomed = (await capture())[key];
    assert(
      zoomed &&
        (key === "spatialZoom"
          ? JSON.stringify(zoomed) !== JSON.stringify(opening)
          : zoomed.zoom > 1),
      `${route}: wheel did not move the view`,
    );
    assert(
      JSON.stringify(await bounds()) === JSON.stringify(before),
      `${route}: zoom resized the surface`,
    );
    await page.screenshot({ path: `${output}/${route.replaceAll("/", "-")}-zoom.png` });
    await page.getByRole("button", { name: "Hide UI", exact: true }).click();
    await page.waitForFunction(
      () =>
        document.querySelector("[data-fractal-viewport] canvas")?.getBoundingClientRect().top ===
          0 &&
        document.querySelector("[data-fractal-viewport] canvas")?.getBoundingClientRect().height ===
          innerHeight,
    );
    assert((await bounds()).height === 900, `${route}: clean view does not fill screen`);
    assert((await capture())[key].zoom === zoomed.zoom, `${route}: hide UI reset zoom`);
    await page.getByRole("button", { name: "Show UI", exact: true }).click();
    await page.waitForFunction(() => !document.body.hasAttribute("data-fractal-clean"));
    await page.waitForTimeout(300);
    assert(
      JSON.stringify(await bounds()) === JSON.stringify(before),
      `${route}: showing UI changed surface bounds`,
    );
    assert((await capture())[key].zoom === zoomed.zoom, `${route}: show UI reset zoom`);
    await page.evaluate(() => window.dispatchEvent(new Event("garden:reset-pose")));
    await page.waitForTimeout(500);
    const reset = (await capture())[key];
    assert(!reset || reset.zoom <= 1, `${route}: reset did not restore opening view`);
    await page.setViewportSize({ width: 900, height: 430 });
    await page.waitForTimeout(500);
    const shallow = await bounds();
    assert(
      shallow.width === 900 && shallow.y + shallow.height === 430,
      `${route}: landscape canvas is cropped`,
    );
    await page.screenshot({ path: `${output}/${route.replaceAll("/", "-")}-landscape.png` });
    results.push({ route, before, zoom: zoomed.zoom, shallow });
  }
  assert(errors.length === 0, errors.join("\n"));
  return { results, errors };
}

writeFileSync(
  process.argv[2] ?? "/private/tmp/check-fractal-framing.js",
  `async(page)=>await (${check.toString()})(page,${JSON.stringify(process.argv[3] ?? "http://127.0.0.1:59361")},${JSON.stringify(process.argv[4] ?? "/private/tmp/framing-captures")})`,
);
