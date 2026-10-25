import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { require } from "../tests/helpers/spatial-gpu-fixtures.mjs";

// Generate a Playwright CLI callback; run it with run-code --filename.
// Measurements include CPU preparation and synchronized GPU completion.
const output = process.argv[2] ?? "/private/tmp/check-romanesco-performance.js";
const baseUrl = process.argv[3] ?? "http://127.0.0.1:56716";
const captures = process.argv[4];
const width = Number(process.env.ROMANESCO_WIDTH ?? 1440);
const height = Number(process.env.ROMANESCO_HEIGHT ?? 1000);
const dpr = Number(process.env.ROMANESCO_DPR ?? 2);
const samples = Number(process.env.ROMANESCO_SAMPLES ?? 5);
for (const [name, value] of Object.entries({ width, height, dpr, samples }))
  if (!Number.isFinite(value) || value <= 0) throw Error(`${name} must be positive`);
const { fixedFromNumber } = require("../../utils/deepZoom/math.ts");
const {
  ROMANESCO_ROOT,
  ROMANESCO_BASE_CHILDREN,
  romanescoPoint,
} = require("../../utils/romanesco.ts");
const tip = romanescoPoint(ROMANESCO_ROOT, [0, 1, 0]);
const baseTip = romanescoPoint(
  ROMANESCO_ROOT,
  romanescoPoint(ROMANESCO_BASE_CHILDREN.at(-1), [0, 1, 0]),
);
const fixtures = [
  { name: "opening", tilt: 65, zoom: 0, target: [0, 0, 0] },
  { name: "close", tilt: 65, zoom: 2, target: [0, 0, 0] },
  { name: "overhead", tilt: 90, zoom: 0, target: [0, 0, 0] },
  { name: "underside", tilt: -70, zoom: 0, target: [0, 0, 0] },
  { name: "tip-detail", tilt: 65, zoom: 6, target: tip },
  { name: "base-detail", tilt: -90, zoom: 4, target: baseTip },
].map(({ target, ...fixture }) => {
  const bits = 160 + Math.ceil(fixture.zoom);
  const parts = {
    config: { rotationX: fixture.tilt, rotationY: 28, autoRotate: false },
    spatialZoom: {
      bits,
      zoom: fixture.zoom,
      target: target.map((value) => fixedFromNumber(value, bits).toString()),
      atmosphereZoom: fixture.zoom,
      atmosphereVelocity: 0,
    },
  };
  const hash = Buffer.from(JSON.stringify({ version: 1, path: "/romanesco", parts })).toString(
    "base64url",
  );
  return {
    ...fixture,
    url: `${baseUrl}/romanesco#view=${hash}`,
    capture: captures ? join(captures, `${fixture.name}.png`) : undefined,
  };
});

async function check(outerPage, { fixtures, width, height, dpr, samples }) {
  const context = await outerPage
    .context()
    .browser()
    .newContext({ viewport: { width, height }, deviceScaleFactor: dpr });
  try {
    const results = [];
    for (const fixture of fixtures) {
      const page = await context.newPage(),
        errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto(fixture.url);
      await page.waitForFunction(
        (zoom) =>
          document.querySelector("[role=alert]")?.textContent ||
          Number(document.querySelector("[data-gpu-spatial-explorer]")?.dataset.renderZoom) ===
            zoom,
        fixture.zoom,
      );
      const alerts = await page.locator("[role=alert]").allTextContents();
      if (alerts.some(Boolean)) throw Error(`${fixture.name}: ${alerts.join(" ")}`);
      const measurement = await page.evaluate(async (samples) => {
        const canvas = document.querySelector("[data-gpu-spatial-explorer]"),
          gl = canvas.getContext("webgl2"),
          pixel = new Uint8Array(4);
        const costs = [];
        for (let i = 0; i < samples + 2; i++) {
          const start = performance.now();
          window.dispatchEvent(new Event("garden:before-export"));
          gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
          if (i >= 2) costs.push(performance.now() - start);
          await new Promise(requestAnimationFrame);
        }
        const sorted = costs.slice().sort((a, b) => a - b),
          debug = gl.getExtension("WEBGL_debug_renderer_info");
        return {
          size: [canvas.width, canvas.height],
          costs,
          medianMs: sorted[Math.floor(sorted.length / 2)],
          p95Ms: sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))],
          error: gl.getError(),
          renderer: debug
            ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL)
            : gl.getParameter(gl.RENDERER),
        };
      }, samples);
      if (fixture.capture)
        await page.locator("[data-gpu-spatial-explorer]").screenshot({ path: fixture.capture });
      if (errors.length || measurement.error)
        throw Error(JSON.stringify({ fixture: fixture.name, errors, measurement }));
      results.push({ name: fixture.name, ...measurement });
      await page.close();
    }
    return {
      passed: true,
      viewport: { width, height, dpr },
      samples,
      timing: "full redraw, synchronized by one-pixel readback",
      results,
    };
  } finally {
    await context.close();
  }
}
writeFileSync(
  output,
  `async page => await (${check.toString()})(page, ${JSON.stringify({ fixtures, width, height, dpr, samples })})`,
);
