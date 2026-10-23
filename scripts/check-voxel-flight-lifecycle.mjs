import { writeFileSync } from "node:fs";

// Generate a Playwright CLI payload. Run against `next dev`: production builds
// do not replay mount effects and cannot catch the Strict Mode regression.
async function check(page, baseURL) {
  const errors = [];
  page.on("pageerror", (error) => errors.push(String(error)));
  await page.addInitScript(() => {
    window.__voxelLifecycle = [];
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (kind, ...options) {
      const gl = getContext.call(this, kind, ...options);
      if (kind !== "webgl" || this.getAttribute("aria-label") !== "Explore the fractal interior")
        return gl;
      if (!gl || window.__voxelLifecycle.some((record) => record.gl === gl)) return gl;
      const record = { gl, canvas: this, created: 0, deleted: 0, draws: 0, releases: 0 };
      window.__voxelLifecycle.push(record);
      for (const name of ["Buffer", "Texture", "Program", "Shader"]) {
        const create = gl[`create${name}`].bind(gl);
        const destroy = gl[`delete${name}`].bind(gl);
        gl[`create${name}`] = (...args) => {
          const resource = create(...args);
          if (resource) record.created++;
          return resource;
        };
        gl[`delete${name}`] = (resource) => {
          if (resource) record.deleted++;
          return destroy(resource);
        };
      }
      const draw = gl.drawArrays.bind(gl);
      gl.drawArrays = (...args) => {
        record.draws++;
        return draw(...args);
      };
      const getExtension = gl.getExtension.bind(gl);
      gl.getExtension = (name) => {
        const extension = getExtension(name);
        if (name !== "WEBGL_lose_context" || !extension) return extension;
        return {
          loseContext() {
            record.releases++;
            extension.loseContext();
          },
          restoreContext: extension.restoreContext.bind(extension),
        };
      };
      return gl;
    };
  });
  const assert = (condition, message) => {
    if (!condition) throw new Error(message);
  };
  const state = () =>
    page.evaluate(() =>
      window.__voxelLifecycle.map(({ gl, canvas, ...record }) => ({
        ...record,
        connected: canvas.isConnected,
        lost: gl.isContextLost(),
      })),
    );
  const results = [];
  for (const route of ["mosely-snowflake", "menger-sponge", "vicsek-fractal-3d"]) {
    await page.goto(`${baseURL}/${route}`);
    await page.getByRole("button", { name: "Explore inside", exact: true }).click();
    await page.waitForFunction(() => {
      const record = window.__voxelLifecycle[0];
      return record && (record.created >= 10 || record.gl.isContextLost());
    });
    await page.waitForFunction(() => {
      const record = window.__voxelLifecycle[0];
      return record.gl.isContextLost() || record.draws > 0;
    });
    const [mounted] = await state();
    assert(!mounted.lost && mounted.releases === 0, `${route}: effect replay lost the context`);
    assert(mounted.created - mounted.deleted === 5, `${route}: leaked replay resources`);
    assert((await page.locator("output[role=alert]").count()) === 0, `${route}: mount error`);
    const canvas = page.getByLabel("Explore the fractal interior", { exact: true });
    const before = await canvas.evaluate((node) => node.toDataURL());
    const camera = () =>
      page.evaluate(() => {
        const parts = {};
        window.dispatchEvent(
          new CustomEvent("garden:capture-view", { detail: { parts, pending: [] } }),
        );
        return parts.voxelCamera;
      });
    const orientation = await camera();
    await canvas.click();
    await page.waitForFunction(
      () =>
        document.pointerLockElement?.getAttribute("aria-label") === "Explore the fractal interior",
    );
    await page.mouse.move(740, 360);
    assert(
      (await camera()).yaw !== orientation.yaw,
      `${route}: captured mouse did not look without dragging`,
    );
    await canvas.press("w", { delay: 120 });
    await page.waitForFunction((draws) => window.__voxelLifecycle[0].draws > draws, mounted.draws);
    assert(
      before !== (await canvas.evaluate((node) => node.toDataURL())),
      `${route}: frozen pixels`,
    );
    await page.keyboard.press("Escape");
    await page.waitForFunction(() => !document.pointerLockElement);
    assert(
      (await page.getByRole("button", { name: "Back outside", exact: true }).count()) === 1,
      `${route}: Escape left Explore instead of releasing the mouse`,
    );

    if (route === "mosely-snowflake") {
      await canvas.evaluate((node) => {
        const extension = node.getContext("webgl").getExtension("WEBGL_lose_context");
        window.__voxelRestore = extension.restoreContext;
        extension.loseContext();
      });
      await page.locator("output[role=alert]").waitFor();
      await canvas.click();
      assert(
        await page.evaluate(() => !document.pointerLockElement),
        "Failed graphics captured the mouse",
      );
      assert(
        await canvas.evaluate(
          (node) =>
            getComputedStyle(node).opacity === "0" &&
            getComputedStyle(node.parentElement).backgroundColor === "rgb(37, 36, 36)",
        ),
        "Context loss exposed a white background",
      );
      await page.screenshot({ path: "/private/tmp/mosely-context-loss-fallback-after.png" });
      await page.evaluate(() => window.__voxelRestore());
      await page.waitForFunction(() => {
        const record = window.__voxelLifecycle[0];
        return (
          !record.gl.isContextLost() &&
          record.created - record.deleted === 5 &&
          !document.querySelector("output[role=alert]")
        );
      });
      await page.screenshot({ path: "/private/tmp/mosely-development-recovered-after.png" });
      await page.getByRole("button", { name: "Fractal Studio Controls", exact: true }).click();
      await page.getByRole("button", { name: /Snowflake type Airy lattice/ }).click();
      await page.getByRole("option", { name: "Dense lattice", exact: true }).click();
      await page.getByRole("button", { name: "Fractal Studio Controls", exact: true }).click();
      await page.waitForFunction(
        () => window.__voxelLifecycle.length === 2 && window.__voxelLifecycle[1].draws > 0,
      );
      const [old, dense] = await state();
      assert(
        old.lost && !old.connected && old.created === old.deleted,
        "Variant swap leaked old resources",
      );
      assert(
        !dense.lost && dense.releases === 0 && dense.created - dense.deleted === 5,
        "Dense Mosely lost its context during replay",
      );
      await page.screenshot({ path: "/private/tmp/mosely-dense-development-after.png" });
    }
    await page.getByRole("button", { name: "Back outside", exact: true }).click();
    await page.waitForFunction(() => window.__voxelLifecycle.every(({ gl }) => gl.isContextLost()));
    const disposed = await state();
    assert(
      disposed.every((record) => !record.connected && record.created === record.deleted),
      `${route}: unmount leaked resources`,
    );
    // A fresh canvas must still work after releasing the previous context.
    await page.getByRole("button", { name: "Explore inside", exact: true }).click();
    await page.waitForFunction(() => window.__voxelLifecycle.at(-1).draws > 0);
    const reentered = (await state()).at(-1);
    assert(!reentered.lost && reentered.releases === 0, `${route}: re-entry failed`);
    await canvas.click();
    await page.waitForFunction(() => !!document.pointerLockElement);
    // Also verify cleanup when a locked view is unmounted programmatically.
    await page
      .getByRole("button", { name: "Back outside", exact: true })
      .evaluate((button) => button.click());
    await page.waitForFunction(() => !document.pointerLockElement);
    results.push({
      route,
      mounted,
      disposed,
      reentered,
      mouseCapture: true,
      mouseLook: true,
      escapeReleases: true,
      unmountReleases: true,
    });
  }
  assert(errors.length === 0, errors.join("\n"));
  return { passed: true, mode: "development-strict-effects", results, errors };
}
writeFileSync(
  process.argv[2] ?? "/private/tmp/check-voxel-flight-lifecycle.js",
  `async(page)=>await (${check.toString()})(page,${JSON.stringify(process.argv[3] ?? "http://127.0.0.1:1111")})`,
);
