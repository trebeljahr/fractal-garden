import { writeFileSync } from "node:fs";

// Generate a Playwright CLI payload; use next dev to exercise Strict Mode restoration.
async function check(page, baseURL, output) {
  const errors = [];
  page.on("pageerror", (error) => errors.push(String(error)));
  const assert = (condition, message) => {
    if (!condition) throw new Error(message);
  };
  const capture = () =>
    page.evaluate(async () => {
      const parts = {};
      const pending = [];
      window.dispatchEvent(new CustomEvent("garden:capture-view", { detail: { parts, pending } }));
      await Promise.all(pending);
      return parts;
    });
  const drawing = () =>
    page.evaluate(() => {
      const canvas = document.querySelector('[class*="EndlessZoom_layer"] canvas');
      if (!canvas) return null;
      canvas.dispatchEvent(new Event("garden:redraw"));
      const gl = canvas.getContext("webgl");
      const pixels = new Uint8Array(canvas.width * canvas.height * 4);
      gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
      let distance = Infinity;
      let point = null;
      for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
          const i = (y * canvas.width + x) * 4;
          // The Board's blue lines distinguish drawn geometry from its gray backdrop.
          if (pixels[i + 2] <= pixels[i] + 30) continue;
          const next = (x - canvas.width / 2) ** 2 + (y - canvas.height / 2) ** 2;
          if (next >= distance) continue;
          distance = next;
          const rect = canvas.getBoundingClientRect();
          point = {
            x: rect.left + ((x + 0.5) / canvas.width) * rect.width,
            y: rect.top + ((canvas.height - y - 0.5) / canvas.height) * rect.height,
          };
        }
      }
      return { point, width: canvas.width, height: canvas.height };
    });
  const waitForZoom = () =>
    page.waitForFunction(() =>
      document
        .querySelector('[class*="EndlessZoom_status"] span')
        ?.textContent.startsWith("Zoomed "),
    );
  const sameCenter = (a, b, label) => {
    for (const key of ["zoom", "deepX", "deepY", "deepBits", "centerX", "centerY", "startAngle"])
      assert(a[key] === b[key], `${label}: changed ${key}`);
  };
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${baseURL}/l-system/board`);
  await page.getByRole("button", { name: "Pause animation", exact: true }).click();
  await page.getByRole("button", { name: "Fractal Studio Controls", exact: true }).click();
  await page.getByRole("textbox", { name: "Iterations", exact: true }).fill("4");
  await page.getByRole("textbox", { name: "Iterations", exact: true }).press("Enter");
  await page.getByRole("button", { name: "Fractal Studio Controls", exact: true }).click();
  await page.mouse.move(720, 450);
  await page.mouse.wheel(0, -800);
  await waitForZoom();
  for (let step = 0; step < 6; step++) {
    const { point } = await drawing();
    assert(point, "Zoomed Board has no drawn geometry");
    const previous = await page.locator('[class*="EndlessZoom_status"] span').textContent();
    await page.mouse.move(point.x, point.y);
    await page.mouse.wheel(0, -800);
    await page.waitForFunction(
      (text) => document.querySelector('[class*="EndlessZoom_status"] span')?.textContent !== text,
      previous,
    );
  }
  const before = await capture();
  assert(before.curve.zoom > 1000, "Did not reach deep zoom");
  assert(!before.config.animateIterations, "Zoom did not pause growth");
  assert(
    (await page.getByRole("button", { name: /^(Play|Pause) animation$/ }).count()) === 0,
    "Animation toolbar is still available during zoom",
  );
  await page.getByRole("button", { name: "Fractal Studio Controls", exact: true }).click();
  assert(
    (await page.getByRole("switch", { name: /Animate growth/ }).count()) === 0,
    "Growth switch is still available during zoom",
  );
  await page.getByRole("button", { name: "Fractal Studio Controls", exact: true }).click();
  await page.screenshot({ path: `${output}/zoom-with-ui.png` });

  await page.getByRole("button", { name: "Hide UI", exact: true }).click();
  await page.waitForFunction(() => document.body.hasAttribute("data-fractal-clean"));
  await page.waitForFunction(
    (height) =>
      document.querySelector('[class*="EndlessZoom_layer"] canvas')?.clientHeight !== height,
    before.curve.height,
  );
  sameCenter(before.curve, (await capture()).curve, "Hide UI");
  assert((await drawing()).point, "Hide UI lost the fractal");
  await page.screenshot({ path: `${output}/zoom-without-ui.png` });
  await page.getByRole("button", { name: "Show UI", exact: true }).click();
  await page.waitForFunction(() => !document.body.hasAttribute("data-fractal-clean"));
  sameCenter(before.curve, (await capture()).curve, "Show UI");
  await page.setViewportSize({ width: 1000, height: 720 });
  await page.waitForFunction(
    () => document.querySelector('[class*="EndlessZoom_layer"] canvas')?.clientWidth === 1000,
  );
  sameCenter(before.curve, (await capture()).curve, "Resize");
  assert((await drawing()).point, "Resize lost the fractal");

  // Test the real copy action without replacing the user's system clipboard.
  await page.evaluate(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (value) => {
          window.__zoomLink = value;
        },
      },
    });
  });
  await page.getByRole("button", { name: "Copy link", exact: true }).click();
  await page.waitForFunction(() => !!window.__zoomLink);
  const url = await page.evaluate(() => window.__zoomLink);
  await page.goto("about:blank");
  await page.goto(url);
  await waitForZoom();
  sameCenter(before.curve, (await capture()).curve, "Fresh copied link");
  assert((await drawing()).point, "Copied link restored an empty drawing");
  await page.screenshot({ path: `${output}/zoom-restored-link.png` });
  await page.getByRole("button", { name: "Reset Zoom", exact: true }).click();
  await page.getByRole("button", { name: "Play animation", exact: true }).waitFor();
  assert(!(await capture()).curve, "Reset retained zoom state");
  assert(!(await capture()).config.animateIterations, "Reset resumed animation");
  const checkReturnedControls = async () => {
    await page.getByRole("button", { name: "Fractal Studio Controls", exact: true }).click();
    const toggle = page.getByRole("switch", { name: /Animate growth/ });
    await toggle.waitFor();
    const label = await toggle.evaluate(
      (node) => document.getElementById(node.getAttribute("aria-labelledby"))?.textContent,
    );
    const cap = Number(
      label.match(/to (\d+)/)?.[1] ??
        (await page.getByRole("slider", { name: "Iterations", exact: true }).getAttribute("max")),
    );
    assert(
      (await capture()).config.iterations === cap,
      "Return did not restore the animation resolution limit",
    );
    assert(
      (await toggle.getAttribute("aria-checked")) === "false",
      "Returned growth toggle is not paused",
    );
    await page.getByRole("button", { name: "Fractal Studio Controls", exact: true }).click();
  };
  await checkReturnedControls();
  await page.mouse.move(500, 360);
  await page.mouse.wheel(0, -800);
  await waitForZoom();
  await page.mouse.wheel(0, 2000);
  await page.getByRole("button", { name: "Play animation", exact: true }).waitFor();
  assert(!(await capture()).curve, "Full zoom-out retained zoom state");
  await checkReturnedControls();
  await page.getByRole("button", { name: "Play animation", exact: true }).click();
  await page.getByRole("button", { name: "Pause animation", exact: true }).waitFor();
  await page.getByRole("button", { name: "Pause animation", exact: true }).click();

  // These curves change their initial heading with the selected generation.
  // A hash-only restore must use the saved heading before React commits the config.
  for (const route of ["terdragon", "sierpinski-arrowhead"]) {
    const path = `/l-system/${route}`;
    const initialHash = await page.evaluate((path) => {
      const payload = JSON.stringify({ version: 1, path, parts: { config: { iterations: 3 } } });
      return `#view=${btoa(payload).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")}`;
    }, path);
    await page.goto(`${baseURL}${path}${initialHash}`);
    await page.getByRole("button", { name: "Play animation", exact: true }).waitFor();
    await page.getByRole("button", { name: "Fractal Studio Controls", exact: true }).click();
    await page.getByRole("textbox", { name: "Iterations", exact: true }).fill("3");
    await page.getByRole("textbox", { name: "Iterations", exact: true }).press("Enter");
    await page.getByRole("button", { name: "Fractal Studio Controls", exact: true }).click();
    await page.mouse.move(500, 360);
    await page.mouse.wheel(0, -400);
    await waitForZoom();
    const saved = await capture();
    const edge = await page.evaluate(() => ({
      header: document
        .querySelector("[data-fractal-chrome] header, header[data-fractal-chrome]")
        ?.getBoundingClientRect().bottom,
      canvas: document.querySelector('[class*="EndlessZoom_layer"] canvas')?.getBoundingClientRect()
        .top,
    }));
    assert(Math.abs(edge.header - edge.canvas) < 1, `${route}: zoom leaves a gap below the navbar`);
    await page.getByRole("button", { name: "Reset Zoom", exact: true }).click();
    await page.getByRole("button", { name: "Play animation", exact: true }).waitFor();
    await page.getByRole("button", { name: "Fractal Studio Controls", exact: true }).click();
    await page.getByRole("textbox", { name: "Iterations", exact: true }).fill("4");
    await page.getByRole("textbox", { name: "Iterations", exact: true }).press("Enter");
    await page.getByRole("button", { name: "Fractal Studio Controls", exact: true }).click();
    await page.evaluate((parts) => {
      const payload = JSON.stringify({ version: 1, path: location.pathname, parts });
      location.hash = `view=${btoa(payload).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")}`;
    }, saved);
    await waitForZoom();
    const restored = await capture();
    sameCenter(saved.curve, restored.curve, `${route} hash navigation`);
    assert(restored.config.iterations === 3, `${route}: failed to restore generation`);
    assert(!restored.config.animateIterations, `${route}: restored running animation`);
  }
  assert(errors.length === 0, errors.join("\n"));
  return {
    passed: true,
    zoom: before.curve.zoom,
    checks: [
      "takeover",
      "hide/show UI",
      "resize",
      "fresh copied link",
      "paused reset",
      "maximum animation resolution",
      "full zoom-out",
      "navbar edge",
      "resume",
    ],
    errors,
  };
}

writeFileSync(
  process.argv[2] ?? "/private/tmp/check-endless-zoom.js",
  `async(page)=>await (${check.toString()})(page,${JSON.stringify(process.argv[3] ?? "http://127.0.0.1:1111")},${JSON.stringify(process.argv[4] ?? "/private/tmp")})`,
);
