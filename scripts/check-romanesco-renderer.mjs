import { readFileSync, writeFileSync } from "node:fs";
import { require } from "../tests/helpers/spatial-gpu-fixtures.mjs";

// Generate a Playwright CLI callback comparing exact color and surface bytes.
// Run with run-code --filename; compare accelerated and original traversal.
const output = process.argv[2] ?? "/private/tmp/check-romanesco-renderer.js";
const baseUrl = process.argv[3] ?? "http://127.0.0.1:56716";
const baselineSource = process.env.ROMANESCO_BASELINE_SHADER
  ? readFileSync(process.env.ROMANESCO_BASELINE_SHADER, "utf8")
  : null;
const viewport = {
  width: Number(process.env.ROMANESCO_WIDTH ?? 640),
  height: Number(process.env.ROMANESCO_HEIGHT ?? 480),
  dpr: Number(process.env.ROMANESCO_DPR ?? 1),
};
for (const value of Object.values(viewport))
  if (!Number.isFinite(value) || value <= 0) throw Error("Invalid comparison viewport");
const { fixedFromNumber } = require("../../utils/deepZoom/math.ts");
const { ROMANESCO_ROOT, ROMANESCO_RADIUS } = require("../../utils/romanesco.ts");
const { ROMANESCO_UNIFORM_CHILD_CAPACITY } = require("../../utils/spatialGpu/uniformGeometry.ts");
const definitions = [
  { name: "opening", zoom: 0, tilt: 65, yaw: 28 },
  { name: "rotated", zoom: 0, tilt: 24, yaw: 133 },
  { name: "close", zoom: 2, tilt: 65, yaw: 28 },
  { name: "underside", zoom: 0, tilt: -70, yaw: 28 },
  { name: "tip-6", zoom: 6, tilt: 65, yaw: 28, apex: true },
  { name: "deep-80", zoom: 80, tilt: 0, yaw: 0, apex: true },
  { name: "deep-240", zoom: 240, tilt: 0, yaw: 0, apex: true },
  { name: "inside-union", zoom: 0, tilt: 0, yaw: 0, target: [0, 0, -6], inside: true },
  { name: "finite-zero", zoom: 0, tilt: 65, yaw: 28, rank: 0, growth: 1 },
  { name: "growth-1-quarter", zoom: 0, tilt: 65, yaw: 28, rank: 1, growth: 0.25 },
  { name: "growth-2-half", zoom: 0, tilt: 65, yaw: 28, rank: 2, growth: 0.5 },
  {
    // A continuation hull intersects this beam, but its next continuation
    // misses. The retained parent core must survive that empty refinement.
    name: "retained-core-carrier",
    zoom: 4,
    tilt: (Math.atan(ROMANESCO_RADIUS / 2) * 180) / Math.PI,
    yaw: -90,
    target: [
      (ROMANESCO_ROOT.scale * ROMANESCO_RADIUS) / 4,
      ROMANESCO_ROOT.center[1] + ROMANESCO_ROOT.scale / 2,
      0,
    ],
    customTail: true,
  },
];
const fixtures = definitions
  .filter(
    (fixture) =>
      !process.env.ROMANESCO_FILTER || new RegExp(process.env.ROMANESCO_FILTER).test(fixture.name),
  )
  .map((fixture) => {
    const bits = 160 + fixture.zoom;
    let target = (fixture.target ?? [0, 0, 0]).map((value) => fixedFromNumber(value, bits));
    if (fixture.apex) {
      // Keep the addition fixed point: rounding the apex as a double would move
      // a zoom-240 camera far away from the actual construction boundary.
      target = ROMANESCO_ROOT.center.map((value) => fixedFromNumber(value, bits));
      target[1] += fixedFromNumber(ROMANESCO_ROOT.scale, bits);
    }
    const camera = {
      target: target.map(String),
      zoom: fixture.zoom,
      bits,
      atmosphereZoom: fixture.zoom,
      atmosphereVelocity: 0,
    };
    const parts = {
      config: { rotationX: fixture.tilt, rotationY: fixture.yaw, autoRotate: false },
      spatialZoom: camera,
    };
    return {
      ...fixture,
      target: camera.target,
      uniformOrderOffset: ROMANESCO_UNIFORM_CHILD_CAPACITY * 16 * 4,
      url: `${baseUrl}/romanesco#view=${Buffer.from(JSON.stringify({ version: 1, path: "/romanesco", parts })).toString("base64url")}`,
    };
  });
if (!fixtures.length) throw Error("ROMANESCO_FILTER matched no fixtures");

async function check(outerPage, fixtures, viewport, baselineSource) {
  const contexts = [],
    views = [];
  try {
    for (const mode of ["baseline", "accelerated"]) {
      const context = await outerPage
        .context()
        .browser()
        .newContext({
          viewport: { width: viewport.width, height: viewport.height },
          deviceScaleFactor: viewport.dpr,
        });
      contexts.push(context);
      const page = await context.newPage();
      await page.addInitScript(
        ({ mode, baselineSource }) => {
          const p = WebGL2RenderingContext.prototype,
            get = p.getUniformLocation,
            ui = p.uniform1i,
            uf = p.uniform1f,
            shader = p.shaderSource,
            draw = p.drawArrays,
            locations = new WeakMap();
          p.shaderSource = function (target, source) {
            if (mode === "baseline" && baselineSource && source.includes("bool traceNearest(")) {
              const depth = source.match(/#define SPATIAL_STACK_DEPTH (8|12|16|24|40)/)?.[1] ?? 40;
              const seed = source.includes("#define ROMANESCO_SEED_PASS")
                ? "\n#define ROMANESCO_SEED_PASS"
                : "";
              source = baselineSource
                .replace(
                  "#version 300 es",
                  `#version 300 es\n#define SPATIAL_STACK_DEPTH ${depth}${seed}`,
                )
                .replace("uniform int u_kind;", "const int u_kind = 3;");
            }
            const text =
              mode === "baseline"
                ? source
                    .replace(/^#define ROMANESCO_UNIFORM_GEOMETRY.*$/m, "")
                    .replace(/^#define ROMANESCO_DEFER_NORMALS.*$/m, "")
                : source;
            return shader.call(this, target, text);
          };
          p.getUniformLocation = function (...args) {
            const loc = get.apply(this, args);
            if (loc) locations.set(loc, args[1]);
            return loc;
          };
          p.uniform1i = function (loc, value) {
            const name = locations.get(loc),
              override = window.romanOverride;
            return ui.call(
              this,
              loc,
              mode === "baseline" && name === "u_useSeed"
                ? 0
                : override?.customTail && name === "u_childCount"
                  ? 1
                  : override?.customTail && name === "u_childBoundsCount"
                    ? 0
                    : value,
            );
          };
          p.uniform1f = function (loc, value) {
            const name = locations.get(loc),
              override = window.romanOverride;
            return uf.call(
              this,
              loc,
              name === "u_maxRank" && override?.rank !== undefined
                ? override.rank
                : name === "u_growth" && override?.growth !== undefined
                  ? override.growth
                  : value,
            );
          };
          p.drawArrays = function (...args) {
            const fb = this.getParameter(this.FRAMEBUFFER_BINDING);
            if (fb && this.getParameter(this.DRAW_BUFFER1) === this.COLOR_ATTACHMENT1)
              window.romanSurface = fb;
            return draw.apply(this, args);
          };
        },
        { mode, baselineSource },
      );
      views.push({ mode, page });
    }
    const results = [];
    for (const fixture of fixtures) {
      const snapshots = [];
      for (const { mode, page } of views) {
        await page.setViewportSize(
          fixture.inside
            ? { width: 320, height: 300 }
            : { width: viewport.width, height: viewport.height },
        );
        await page.goto(fixture.url);
        await page.waitForFunction(async (expected) => {
          const detail = { parts: {}, pending: [] };
          window.dispatchEvent(new CustomEvent("garden:capture-view", { detail }));
          await Promise.all(detail.pending);
          return (
            detail.parts.spatialZoom?.zoom === expected.zoom &&
            detail.parts.spatialZoom?.target.join(",") === expected.target.join(",") &&
            detail.parts.config?.rotationX === expected.tilt &&
            detail.parts.config?.rotationY === expected.yaw
          );
        }, fixture);
        await page.evaluate((fixture) => {
          window.romanOverride = {
            rank: fixture.rank,
            growth: fixture.growth,
            customTail: fixture.customTail,
          };
          if (fixture.customTail) {
            const gl = document.querySelector("[data-gpu-spatial-explorer]").getContext("webgl2");
            const children = new Float32Array(8 * 16);
            for (let octant = 0; octant < 8; octant++) {
              children.set(
                [0, 0.75, 0, 0, 0.25, 0, 0, 1, 0, 0.25, 0, 0.25, 0, 0, 0.25, 0],
                octant * 16,
              );
            }
            gl.activeTexture(gl.TEXTURE1);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, 4, 8, 0, gl.RGBA, gl.FLOAT, children);
            const uniformBuffer = gl.getIndexedParameter(gl.UNIFORM_BUFFER_BINDING, 0);
            if (uniformBuffer) {
              gl.bindBuffer(gl.UNIFORM_BUFFER, uniformBuffer);
              gl.bufferSubData(gl.UNIFORM_BUFFER, 0, children.subarray(0, 16));
              gl.bufferSubData(gl.UNIFORM_BUFFER, fixture.uniformOrderOffset, new Uint32Array(8));
            }
          }
        }, fixture);
        await page.waitForTimeout(80);
        const snapshot = await page.evaluate(async () => {
          window.dispatchEvent(new Event("garden:before-export"));
          const c = document.querySelector("[data-gpu-spatial-explorer]"),
            gl = c.getContext("webgl2"),
            color = new Uint8Array(c.width * c.height * 4),
            surface = new Uint8Array(color.length);
          gl.readPixels(0, 0, c.width, c.height, gl.RGBA, gl.UNSIGNED_BYTE, color);
          gl.bindFramebuffer(gl.FRAMEBUFFER, window.romanSurface);
          gl.readBuffer(gl.COLOR_ATTACHMENT1);
          gl.readPixels(0, 0, c.width, c.height, gl.RGBA, gl.UNSIGNED_BYTE, surface);
          gl.bindFramebuffer(gl.FRAMEBUFFER, null);
          const hash = async (bytes) =>
            Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)), (value) =>
              value.toString(16).padStart(2, "0"),
            ).join("");
          return {
            size: [c.width, c.height],
            color: await hash(color),
            surface: await hash(surface),
            error: gl.getError(),
            alerts: Array.from(
              document.querySelectorAll("[role=alert]"),
              (a) => a.textContent,
            ).filter(Boolean),
          };
        });
        if (snapshot.error || snapshot.alerts.length)
          throw Error(
            JSON.stringify({
              mode,
              fixture: fixture.name,
              error: snapshot.error,
              alerts: snapshot.alerts,
            }),
          );
        snapshots.push(snapshot);
      }
      const compare = (key) => {
        const a = snapshots[0][key],
          b = snapshots[1][key];
        // Keep full Retina buffers inside their browser contexts. Serializing
        // tens of millions of boxed numbers can exhaust the test driver.
        return { equal: a === b, baselineSha256: a, acceleratedSha256: b };
      };
      results.push({
        name: fixture.name,
        size: snapshots[0].size,
        color: compare("color"),
        surface: compare("surface"),
      });
    }
    return {
      passed: results.every((r) => r.color.equal && r.surface.equal),
      results,
    };
  } finally {
    for (const context of contexts) await context.close();
  }
}

writeFileSync(
  output,
  `async page => await (${check.toString()})(page, ${JSON.stringify(fixtures)}, ${JSON.stringify(viewport)}, ${JSON.stringify(baselineSource)})`,
);
