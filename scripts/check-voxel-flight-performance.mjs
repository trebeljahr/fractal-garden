import { writeFileSync } from "node:fs";

// Bounded GPU benchmark. A synchronous pixel readback includes completed GPU
// work; gl.finish alone may only measure command submission in browsers.
async function check(page, baseURL) {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.addInitScript(() => {
    window.__drawCosts = [];
    const get = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (...args) {
      const gl = get.apply(this, args);
      if (
        args[0] !== "webgl" ||
        this.getAttribute("aria-label") !== "Explore the fractal interior" ||
        !gl ||
        gl.__profileWall
      )
        return gl;
      gl.__profileWall = true;
      const draw = gl.drawArrays.bind(gl);
      const names = new Map(),
        values = {};
      const loc = gl.getUniformLocation.bind(gl),
        uni = gl.uniform1f.bind(gl);
      gl.getUniformLocation = (p, n) => {
        const l = loc(p, n);
        names.set(l, n);
        return l;
      };
      gl.uniform1f = (l, v) => {
        values[names.get(l)] = v;
        return uni(l, v);
      };
      gl.drawArrays = (...args) => {
        const start = performance.now();
        const r = draw(...args);
        gl.finish();
        const pixel = new Uint8Array(4);
        gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
        window.__drawCosts.push({
          ms: performance.now() - start,
          width: gl.canvas.width,
          height: gl.canvas.height,
          ...values,
        });
        return r;
      };
      return gl;
    };
  });
  const results = [];
  for (const [name, level, offset, viewLevel] of [
    ["opening", 0, 2.2, 0],
    ["near-wall", 12, 1e-6, 0],
    ["at-wall", 16, 2e-8, 0],
    ["deep-at-wall", 166, 2e-8, 150],
  ]) {
    const one = 1n << 600n;
    const parts = {
      config: { navigation: "explore", iterations: 0, animateIterations: false, autoRotate: false },
      voxelCamera: {
        kind: "voxel-flight",
        bits: 600,
        level,
        viewLevel,
        yaw: 0,
        pitch: 0,
        position: [
          0n,
          0n,
          one +
            (BigInt(Math.round(offset * 1e12)) * one) / (1000000000000n * 3n ** BigInt(viewLevel)),
        ].map((p) => p.toString(16)),
      },
    };
    const hash = await page.evaluate(
      (parts) =>
        "#view=" +
        btoa(JSON.stringify({ version: 1, path: "/vicsek-fractal-3d", parts }))
          .replaceAll("+", "-")
          .replaceAll("/", "_")
          .replaceAll("=", ""),
      parts,
    );
    await page.goto(baseURL + "/vicsek-fractal-3d" + hash);
    await page.waitForFunction(() => window.__drawCosts.length > 0);
    const canvas = page.getByLabel("Explore the fractal interior", { exact: true });
    // Warm and time the same submitted view; finish includes actual GPU work.
    for (let i = 0; i < 4; i++)
      await canvas.evaluate((c) => c.dispatchEvent(new Event("garden:redraw")));
    const costs = await page.evaluate(() => window.__drawCosts.slice(-3));
    await canvas.screenshot({ path: "/private/tmp/flight-performance-" + name + ".png" });
    results.push({ name, costs });
  }
  return { results };
}

writeFileSync(
  process.argv[2] ?? "/private/tmp/check-voxel-flight-performance.js",
  `async(page)=>await (${check.toString()})(page,${JSON.stringify(process.argv[3] ?? "http://127.0.0.1:1111")})`,
);
