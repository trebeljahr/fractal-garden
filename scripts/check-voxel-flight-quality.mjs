import { writeFileSync } from "node:fs";

// Actual input and draw records require unchanged native resolution under load.
// The Retina context is owned by this callback and closed even on failure.
async function check(page, baseURL, captures) {
  const context = await page
    .context()
    .browser()
    .newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2,
    });
  const view = await context.newPage();
  const errors = [];
  view.on("pageerror", (error) => errors.push(String(error)));
  await context.addInitScript(() => {
    window.__settleFrames = [];
    window.__settleDelay = 0;
    const get = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (...args) {
      const gl = get.apply(this, args);
      if (
        args[0] !== "webgl" ||
        this.getAttribute("aria-label") !== "Explore the fractal interior" ||
        !gl ||
        gl.__settleCheck
      )
        return gl;
      gl.__settleCheck = true;
      const draw = gl.drawArrays.bind(gl);
      gl.drawArrays = (...args) => {
        const result = draw(...args);
        const program = gl.getParameter(gl.CURRENT_PROGRAM);
        const sample = gl.getUniformLocation(program, "u_sampleOffset");
        window.__settleFrames.push({
          width: this.width,
          height: this.height,
          sample: sample ? Array.from(gl.getUniform(program, sample)) : null,
        });
        const until = performance.now() + window.__settleDelay;
        while (performance.now() < until) {
          /* Bounded slow frames must not reduce the actual moving framebuffer. */
        }
        return result;
      };
      return gl;
    };
  });
  const assert = (ok, message) => {
    if (!ok) throw Error(message);
  };
  const state = () =>
    view.evaluate(() => {
      const canvas = document.querySelector('canvas[aria-label="Explore the fractal interior"]');
      const parts = {};
      window.dispatchEvent(
        new CustomEvent("garden:capture-view", { detail: { parts, pending: [] } }),
      );
      return {
        width: canvas.width,
        height: canvas.height,
        displayWidth: canvas.clientWidth,
        displayHeight: canvas.clientHeight,
        draws: window.__settleFrames.length,
        camera: parts.voxelCamera,
      };
    });
  const results = [];
  try {
    for (const [name, route, viewport, interior] of [
      ["mosely-exterior", "mosely-snowflake", { width: 1440, height: 900 }, false],
      ["mosely-interior", "mosely-snowflake", { width: 1440, height: 900 }, true],
      ["menger", "menger-sponge", { width: 1440, height: 900 }, false],
      ["vicsek", "vicsek-fractal-3d", { width: 1440, height: 900 }, false],
      ["phone", "mosely-snowflake", { width: 390, height: 844 }, false],
    ]) {
      await view.setViewportSize(viewport);
      await view.goto("about:blank");
      await view.goto(`${baseURL}/${route}`);
      if (interior) {
        const link = await view
          .getByRole("link", { name: "Explore the Koch snowflake opening", exact: true })
          .getAttribute("href");
        await view.goto(baseURL + link);
      }
      const enter = view.getByRole("button", { name: "Explore inside", exact: true });
      if (await enter.count()) await enter.click();
      const canvas = view.getByLabel("Explore the fractal interior", { exact: true });
      await canvas.waitFor();
      await view.waitForTimeout(350);
      const hide = view.getByRole("button", { name: "Hide UI", exact: true });
      if (await hide.isVisible()) {
        await hide.click();
        await view.waitForFunction(
          () => document.activeElement?.getAttribute("aria-label") === "Show UI",
        );
      }
      await view.waitForFunction(() => {
        const canvas = document.querySelector('canvas[aria-label="Explore the fractal interior"]');
        return (
          canvas &&
          canvas.width === canvas.clientWidth * 2 &&
          canvas.height === canvas.clientHeight * 2
        );
      });
      const initial = await state();
      assert(initial.width === initial.displayWidth * 2, `${name}: initial width is not native`);
      assert(initial.height === initial.displayHeight * 2, `${name}: initial height is not native`);
      await canvas.focus();
      await view.evaluate(() => {
        window.__settleDelay = 65;
      });
      const movementKey = name === "phone" ? "s" : "d";
      await view.keyboard.down(movementKey);
      await view.waitForFunction(
        (start) => window.__settleFrames.length >= start + 5,
        initial.draws,
        { timeout: 15_000 },
      );
      await view.keyboard.up(movementKey);
      await view.evaluate(() => {
        window.__settleDelay = 0;
      });
      const released = await state();
      const frames = await view.evaluate(
        (start) => window.__settleFrames.slice(start),
        initial.draws,
      );
      const movingPixels = Math.min(...frames.map((frame) => frame.width * frame.height));
      assert(
        frames.every((frame) => frame.width === initial.width && frame.height === initial.height),
        `${name}: framebuffer resolution changed during movement`,
      );
      await view.waitForTimeout(180);
      await view.waitForFunction(() => {
        const frame = window.__settleFrames.at(-1);
        return (
          frame &&
          (!frame.sample || (Math.abs(frame.sample[0] - 1 / 3) < 1e-6 && frame.sample[1] === 0))
        );
      });
      const settled = await state();
      assert(
        settled.width === initial.width && settled.height === initial.height,
        `${name}: stationary resolution differs from moving resolution`,
      );
      assert(
        JSON.stringify(settled.camera) === JSON.stringify(released.camera),
        `${name}: camera moved while settling`,
      );
      // At most one queued input frame and nine bounded subpixel samples.
      assert(settled.draws - released.draws <= 10, `${name}: unbounded stationary draws`);
      if (captures) await canvas.screenshot({ path: `${captures}/${name}-settled.png` });
      await view.waitForTimeout(250);
      const idle = await state();
      assert(idle.draws === settled.draws, `${name}: stationary view keeps rendering`);
      assert(
        JSON.stringify(idle.camera) === JSON.stringify(settled.camera),
        `${name}: idle camera drift`,
      );
      await canvas.focus();
      const resumeKey = name === "phone" ? "w" : "a";
      await view.keyboard.down(resumeKey);
      await view.waitForTimeout(100);
      await view.keyboard.up(resumeKey);
      await view.waitForTimeout(300);
      const resumed = await state();
      assert(
        JSON.stringify(resumed.camera) !== JSON.stringify(settled.camera),
        `${name}: motion did not resume`,
      );
      assert(
        resumed.width === initial.width && resumed.height === initial.height,
        `${name}: second release did not refine`,
      );
      results.push({ name, initial, movingPixels, released, settled, idleDraws: 0, resumed: true });
    }
    assert(errors.length === 0, errors.join("\n"));
    return { passed: true, results, errors };
  } finally {
    await context.close();
  }
}

const baseURL = process.argv[3];
if (!baseURL) throw Error("Pass the owned preview URL after the output filename.");
writeFileSync(
  process.argv[2] ?? "/private/tmp/check-voxel-flight-quality.js",
  `async(page)=>await (${check.toString()})(page,${JSON.stringify(baseURL)},${JSON.stringify(process.argv[4] ?? null)})`,
);
