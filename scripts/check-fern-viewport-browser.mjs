import { writeFileSync } from "node:fs";

async function check(page, baseURL, output) {
  let stage = "opening";
  try {
    const errors = [];
    page.on("pageerror", (error) => errors.push(String(error)));
    const assert = (ok, message) => {
      if (!ok) throw new Error(message);
    };
    const canvas = page.locator("[data-fractal-viewport] canvas");
    const ready = () =>
      page.waitForFunction(
        () =>
          document.querySelector("[data-fractal-viewport] canvas")?.dataset.fernComplete === "true",
        { timeout: 30000 },
      );
    const capture = () =>
      page.evaluate(async () => {
        const parts = {},
          pending = [];
        window.dispatchEvent(
          new CustomEvent("garden:capture-view", { detail: { parts, pending } }),
        );
        await Promise.all(pending);
        return parts;
      });
    const state = () => canvas.evaluate((c) => ({ ...c.dataset }));
    const drawing = () =>
      canvas.evaluate((c) => {
        c.dispatchEvent(new Event("garden:redraw"));
        const gl = c.getContext("webgl");
        const pixels = gl
          ? new Uint8Array(c.width * c.height * 4)
          : c.getContext("2d").getImageData(0, 0, c.width, c.height).data;
        if (gl) gl.readPixels(0, 0, c.width, c.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
        let count = 0,
          distance = Infinity,
          point = null;
        const rect = c.getBoundingClientRect();
        for (let y = 0; y < c.height; y++)
          for (let x = 0; x < c.width; x++) {
            const i = (y * c.width + x) * 4;
            if (pixels[i + 1] < pixels[i] + 30) continue;
            count++;
            const screenY = gl ? c.height - 1 - y : y;
            const next = (x - c.width * 0.54) ** 2 + (screenY - c.height * 0.48) ** 2;
            if (next < distance) {
              distance = next;
              point = {
                x: rect.left + ((x + 0.5) * rect.width) / c.width,
                y: rect.top + ((screenY + 0.5) * rect.height) / c.height,
              };
            }
          }
        return { count, point };
      });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${baseURL}/barnsley-fern`);
    await ready();
    const opening = await state();
    assert((await drawing()).count > 10000, "Opening fern missing");
    await page.screenshot({ path: `${output}/fern-opening-desktop.png` });
    for (let k = 0; k < 16; k++) {
      stage = `zoom ${k}`;
      const { point } = await drawing();
      assert(point, `Lost drawing before zoom ${k}`);
      await page.mouse.move(point.x, point.y);
      const old = Number((await state()).fernLogZoom);
      await page.mouse.wheel(0, -600);
      await page.waitForFunction(
        (old) =>
          Number(document.querySelector("[data-fractal-viewport] canvas").dataset.fernLogZoom) >
          old,
        old,
      );
      await ready();
    }
    stage = "deep capture";
    const deep = await state();
    assert(Number(deep.fernLogZoom) > 20, "Zoom stopped near the old 64x limit");
    assert((await drawing()).count > 100, "Deep viewport never reconstructed");
    await page.screenshot({ path: `${output}/fern-deep-desktop.png` });
    stage = "pan";
    const beforePan = (await capture()).viewport;
    const box = await canvas.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 30, box.y + box.height / 2 + 15, { steps: 4 });
    await page.mouse.up();
    await ready();
    assert((await capture()).viewport.x !== beforePan.x, "Pan did not move camera");
    stage = "share restore";
    const saved = await capture();
    const hash =
      "#view=" +
      Buffer.from(JSON.stringify({ version: 1, path: "/barnsley-fern", parts: saved })).toString(
        "base64url",
      );
    await page.goto(`${baseURL}/barnsley-fern${hash}`);
    await ready();
    const restored = (await capture()).viewport;
    assert(
      restored.x === saved.viewport.x &&
        restored.y === saved.viewport.y &&
        restored.logZoom === saved.viewport.logZoom,
      "Shared deep view moved",
    );
    stage = "reset";
    await canvas.dblclick({ position: { x: box.width / 2, y: box.height / 2 } });
    await ready();
    assert(Number((await state()).fernLogZoom) === 0, "Double-click did not reset zoom");
    await page.getByRole("button", { name: "Fractal Studio Controls", exact: true }).click();
    stage = "method";
    await page.getByRole("button", { name: /^Construction method / }).click();
    await page.getByRole("option", { name: "All four maps", exact: true }).click();
    await ready();
    assert((await state()).fernMethod === "deterministic", "Method switch failed");
    assert((await drawing()).count > 10000, "Deterministic fern missing");
    await page.screenshot({ path: `${output}/fern-deterministic-desktop.png` });
    await page.getByRole("button", { name: /^Fern style / }).click();
    await page.getByRole("option", { name: "Fishbone fern", exact: true }).click();
    await ready();
    assert((await drawing()).count > 1000, "Style switch lost drawing");
    await page.getByRole("button", { name: "Fractal Studio Controls", exact: true }).click();
    stage = "lesson";
    const lesson = page.locator('[data-detail-lesson="fern"]');
    await lesson.getByRole("button", { name: "All four maps", exact: true }).click();
    const slider = lesson.getByRole("slider");
    await slider.fill("6");
    assert(
      (await lesson.innerText()).includes("4096 map addresses"),
      "Deterministic lesson count wrong",
    );
    assert(
      (await lesson.locator("svg path").nth(1).getAttribute("d")).split("M").length - 1 === 4096,
      "Lesson generation geometry wrong",
    );
    await lesson.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${output}/fern-lesson-desktop.png` });
    const links = await page
      .locator('[data-fractal-description] a[href^="#"]')
      .evaluateAll((links) =>
        links.filter((a) => !document.getElementById(a.hash.slice(1))).map((a) => a.hash),
      );
    assert(!links.length, `Broken article footnotes ${links}`);
    assert((await page.locator(".katex-error").count()) === 0, "Broken article equation");
    stage = "phone";
    await page.setViewportSize({ width: 390, height: 844 });
    await lesson.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${output}/fern-lesson-phone.png` });
    assert(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      "Phone horizontal overflow",
    );
    await page.goto(`${baseURL}/barnsley-fern`);
    await ready();
    await page.screenshot({ path: `${output}/fern-opening-phone.png` });
    assert((await drawing()).count > 1000, "Phone fern missing");
    assert(!errors.length, `Browser errors: ${errors.join("; ")}`);
    return {
      opening,
      deep,
      checks: [
        "fresh viewport dots",
        "zoom beyond 64x",
        "pan",
        "shared deep view",
        "reset",
        "method switch",
        "style switch",
        "deterministic generation",
        "equations",
        "footnotes",
        "phone layout",
      ],
      errors,
    };
  } catch (error) {
    throw new Error(`${stage}: ${error.message}`);
  }
}
writeFileSync(
  process.argv[2] ?? "/private/tmp/check-fern-viewport.js",
  `async(page)=>await (${check.toString()})(page,${JSON.stringify(process.argv[3] ?? "http://127.0.0.1:54329")},${JSON.stringify(process.argv[4] ?? "/private/tmp")})`,
);
