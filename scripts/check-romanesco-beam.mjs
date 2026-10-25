import { writeFileSync } from "node:fs";
import { require } from "../tests/helpers/spatial-gpu-fixtures.mjs";

// Generate a Playwright CLI callback comparing exact color and surface bytes.
// Run with run-code --filename; compare accelerated and original traversal.
const output = process.argv[2] ?? "/private/tmp/check-romanesco-beam.js";
const baseUrl = process.argv[3] ?? "http://127.0.0.1:56716";
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

async function check(outerPage, fixtures) {
  const contexts = [],
    views = [];
  try {
    for (const mode of ["baseline", "beam"]) {
      const context = await outerPage
        .context()
        .browser()
        .newContext({ viewport: { width: 640, height: 480 }, deviceScaleFactor: 1 });
      contexts.push(context);
      const page = await context.newPage();
      await page.addInitScript((mode) => {
        const p = WebGL2RenderingContext.prototype,
          get = p.getUniformLocation,
          ui = p.uniform1i,
          uf = p.uniform1f,
          shader = p.shaderSource,
          draw = p.drawArrays,
          locations = new WeakMap();
        p.shaderSource = function (target, source) {
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
            mode === "baseline" && name === "u_useBeam"
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
          const fb = this.getParameter(this.FRAMEBUFFER_BINDING),
            beam = this.getParameter(this.DRAW_BUFFER3) === this.COLOR_ATTACHMENT3;
          if (beam && mode === "baseline") return;
          if (fb && !beam && this.getParameter(this.DRAW_BUFFER1) === this.COLOR_ATTACHMENT1)
            window.romanSurface = fb;
          return draw.apply(this, args);
        };
      }, mode);
      views.push({ mode, page });
    }
    const results = [];
    for (const fixture of fixtures) {
      const snapshots = [];
      for (const { mode, page } of views) {
        await page.setViewportSize(
          fixture.inside ? { width: 320, height: 300 } : { width: 640, height: 480 },
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
        const snapshot = await page.evaluate(() => {
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
          return {
            size: [c.width, c.height],
            color: Array.from(color),
            surface: Array.from(surface),
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
          b = snapshots[1][key],
          examples = [];
        let changedBytes = 0,
          maximum = 0;
        for (let i = 0; i < a.length; i++)
          if (a[i] !== b[i]) {
            changedBytes++;
            maximum = Math.max(maximum, Math.abs(a[i] - b[i]));
            if (examples.length < 8)
              examples.push({
                x: Math.floor(i / 4) % snapshots[0].size[0],
                y: Math.floor(i / 4 / snapshots[0].size[0]),
                channel: i % 4,
                a: a[i],
                b: b[i],
              });
          }
        return { changedBytes, maximum, examples };
      };
      results.push({
        name: fixture.name,
        size: snapshots[0].size,
        color: compare("color"),
        surface: compare("surface"),
      });
    }
    return {
      passed: results.every((r) => !r.color.changedBytes && !r.surface.changedBytes),
      results,
    };
  } finally {
    for (const context of contexts) await context.close();
  }
}

writeFileSync(
  output,
  `async page => await (${check.toString()})(page, ${JSON.stringify(fixtures)})`,
);
